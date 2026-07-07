// ============================================================
// 变量提取 / 注入 / 持久化管理
// ============================================================

import type { ParsedCurl, VariableRef } from './types'

const STORAGE_KEY = 'curl-runner-variables'

// 变量正则：匹配 $VAR 或 ${VAR}
// VAR 由字母/数字/下划线组成，必须以字母或下划线开头
const VAR_PATTERN = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g

/**
 * 从已解析的 CURL 中提取所有变量引用。
 * 扫描 url、headers、body。
 */
export function extractVariablesFromCurl(parsed: ParsedCurl): VariableRef[] {
  const texts: string[] = [parsed.url]
  for (const v of Object.values(parsed.headers)) {
    texts.push(v)
  }
  if (parsed.body) {
    texts.push(parsed.body)
  }
  const combined = texts.join('\n')
  return extractVariables(combined)
}

/**
 * 从文本中提取变量引用（去重，保持出现顺序）。
 */
export function extractVariables(text: string): VariableRef[] {
  const seen = new Set<string>()
  const refs: VariableRef[] = []
  let match: RegExpExecArray | null
  // 重置 lastIndex（全局正则复用安全）
  VAR_PATTERN.lastIndex = 0
  while ((match = VAR_PATTERN.exec(text)) !== null) {
    const name = match[1] || match[2]
    if (name && !seen.has(name)) {
      seen.add(name)
      refs.push({ name, raw: match[0] })
    }
  }
  return refs
}

/**
 * 将文本中的 $VAR / ${VAR} 替换为实际值。
 * 未提供值的变量替换为空字符串。
 */
export function injectVariables(text: string, variables: Record<string, string>): string {
  if (!text) return text
  return text.replace(VAR_PATTERN, (full, braced, plain) => {
    const name = braced || plain
    const value = variables[name]
    return value !== undefined ? value : ''
  })
}

// ============================================================
// 全局变量持久化
// ============================================================

/** 从 localStorage 加载变量 */
export function loadVariables(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const result: Record<string, string> = {}
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string') result[k] = v
      }
      return result
    }
    return {}
  } catch {
    return {}
  }
}

/** 保存变量到 localStorage */
export function saveVariables(vars: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vars))
  } catch {
    /* localStorage 不可用时静默失败 */
  }
}

/** 清空所有变量 */
export function clearVariables(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * 合并变量：将新变量并入已有变量库（新值覆盖旧值，仅保留非空值）。
 */
export function mergeVariables(
  existing: Record<string, string>,
  updates: Record<string, string>,
): Record<string, string> {
  const result = { ...existing }
  for (const [k, v] of Object.entries(updates)) {
    if (v && v.trim()) {
      result[k] = v
    }
  }
  return result
}
