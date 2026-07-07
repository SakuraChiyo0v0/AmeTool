// ============================================================
// CURL 命令解析器
// ============================================================
// 将 curl 命令字符串解析为结构化的 ParsedCurl。
// 支持：跨行续行、单/双引号、转义、-X/-H/-d 等常见参数、
//       短选项连写(-XPOST)、长选项等号(--header="...")、
//       --data-raw / --data / --data-binary / -d 等 body 参数。
// ============================================================

import type { ParsedCurl } from './types'

// ---- 参数标志定义 ----

/** 需要附带值的参数（长选项） */
const LONG_FLAGS_WITH_VALUE: Record<string, string> = {
  '--request': 'method',
  '--header': 'header',
  '--data': 'body',
  '--data-raw': 'body',
  '--data-binary': 'body',
  '--data-ascii': 'body',
  '--form': 'form',
  '--url': 'url',
  '--user': 'auth',
  '--user-agent': 'userAgent',
  '--cookie': 'cookie',
  '--cookie-jar': 'cookieJar',
  '--referer': 'referer',
  '--proxy': 'proxy',
  '--output': 'output',
  '--connect-timeout': 'timeout',
  '--max-time': 'timeout',
  '--resolve': 'resolve',
  '--host': 'host',
}

/** 需要附带值的参数（短选项） */
const SHORT_FLAGS_WITH_VALUE: Record<string, string> = {
  '-X': 'method',
  '-H': 'header',
  '-d': 'body',
  '-u': 'auth',
  '-A': 'userAgent',
  '-b': 'cookie',
  '-e': 'referer',
  '-x': 'proxy',
  '-o': 'output',
  '-m': 'timeout',
}

/** 布尔标志 */
const BOOLEAN_FLAGS = new Set([
  '--location', '-L', '--compressed', '-k', '--insecure',
  '-s', '--silent', '-S', '--show-error', '-v', '--verbose',
  '-i', '--include', '-I', '--head', '-f', '--fail',
  '-G', '--get', '-n', '--netrc', '-N', '--no-buffer',
  '--http1.1', '--http2', '--http3',
])

// ---- Tokenizer ----

interface Token {
  value: string
  quote: 'single' | 'double' | 'none'
}

/**
 * 将 curl 命令字符串拆分为 token 数组。
 * 处理行连接符 `\`、单引号、双引号、转义。
 */
function tokenize(input: string): Token[] {
  // 合并跨行续行：反斜杠 + 换行（及前后空白）
  const merged = input.replace(/\\\s*\n\s*/g, ' ').trim()

  const tokens: Token[] = []
  let i = 0
  const len = merged.length

  while (i < len) {
    // 跳过空白
    while (i < len && (merged[i] === ' ' || merged[i] === '\t')) i++
    if (i >= len) break

    const ch = merged[i]

    if (ch === "'") {
      // 单引号：原样保留，不处理转义
      i++
      let value = ''
      while (i < len && merged[i] !== "'") {
        value += merged[i]
        i++
      }
      i++ // 跳过结尾引号
      tokens.push({ value, quote: 'single' })
    } else if (ch === '"') {
      // 双引号：处理 \" \\ 转义
      i++
      let value = ''
      while (i < len && merged[i] !== '"') {
        if (merged[i] === '\\' && i + 1 < len) {
          const next = merged[i + 1]
          if (next === '"' || next === '\\') {
            value += next
            i += 2
            continue
          }
          // 其他转义序列保留反斜杠
          value += merged[i]
          i++
        } else {
          value += merged[i]
          i++
        }
      }
      i++ // 跳过结尾引号
      tokens.push({ value, quote: 'double' })
    } else {
      // 裸词：遇到空白或引号停止
      let value = ''
      while (i < len && merged[i] !== ' ' && merged[i] !== '\t' && merged[i] !== "'" && merged[i] !== '"') {
        if (merged[i] === '\\' && i + 1 < len) {
          value += merged[i + 1]
          i += 2
        } else {
          value += merged[i]
          i++
        }
      }
      // 可能紧跟引号拼接，如 -H'Content-Type:...'
      // 继续读取引号部分并拼接到当前裸词
      if (i < len && (merged[i] === "'" || merged[i] === '"')) {
        const quoteCh = merged[i]
        if (quoteCh === "'") {
          i++
          while (i < len && merged[i] !== "'") {
            value += merged[i]
            i++
          }
          i++
        } else {
          i++
          while (i < len && merged[i] !== '"') {
            if (merged[i] === '\\' && i + 1 < len) {
              const next = merged[i + 1]
              if (next === '"' || next === '\\') {
                value += next
                i += 2
                continue
              }
              value += merged[i]
              i++
            } else {
              value += merged[i]
              i++
            }
          }
          i++
        }
      }
      tokens.push({ value, quote: 'none' })
    }
  }

  return tokens
}

// ---- Header 解析 ----

function parseHeader(raw: string): { key: string; value: string } | null {
  const idx = raw.indexOf(':')
  if (idx === -1) return null
  const key = raw.slice(0, idx).trim()
  const value = raw.slice(idx + 1).trim()
  if (!key) return null
  return { key, value }
}

// ---- 主解析函数 ----

/**
 * 解析 curl 命令字符串。
 */
export function parseCurl(raw: string): ParsedCurl {
  const warnings: string[] = []

  if (!raw || !raw.trim()) {
    return {
      method: 'GET',
      url: '',
      headers: {},
      body: null,
      hasBody: false,
      followRedirects: false,
      warnings,
      error: '请输入 curl 命令',
    }
  }

  const tokens = tokenize(raw)
  if (tokens.length === 0) {
    return {
      method: 'GET',
      url: '',
      headers: {},
      body: null,
      hasBody: false,
      followRedirects: false,
      warnings,
      error: '无法解析输入',
    }
  }

  // 跳过开头的 curl
  let startIdx = 0
  if (tokens[0].value.toLowerCase() === 'curl') {
    startIdx = 1
  }

  let method: string | null = null
  let url: string | null = null
  const headers: Record<string, string> = {}
  let body: string | null = null
  let hasBody = false
  let followRedirects = false

  // 辅助参数（-u / -A / -b / -e 转成 header）
  let auth: string | null = null
  let userAgent: string | null = null
  let cookie: string | null = null
  let referer: string | null = null

  let i = startIdx
  while (i < tokens.length) {
    const token = tokens[i]
    const val = token.value

    // 长选项
    if (val.startsWith('--')) {
      // --flag=value 形式
      const eqIdx = val.indexOf('=')
      if (eqIdx !== -1) {
        const flag = val.slice(0, eqIdx)
        const flagValue = val.slice(eqIdx + 1)
        const kind = LONG_FLAGS_WITH_VALUE[flag]
        if (kind) {
          applyValue(kind, flagValue)
        } else if (!BOOLEAN_FLAGS.has(flag)) {
          warnings.push(`忽略未识别的参数: ${flag}`)
        }
        i++
        continue
      }

      const kind = LONG_FLAGS_WITH_VALUE[val]
      if (kind) {
        // 取下一个 token 作为值
        if (i + 1 < tokens.length) {
          applyValue(kind, tokens[i + 1].value)
          i += 2
        } else {
          warnings.push(`参数 ${val} 缺少值`)
          i++
        }
        continue
      }

      if (BOOLEAN_FLAGS.has(val)) {
        if (val === '--location' || val === '-L') followRedirects = true
        i++
        continue
      }

      // 未识别的长选项，忽略
      warnings.push(`忽略未识别的参数: ${val}`)
      i++
      continue
    }

    // 短选项
    if (val.startsWith('-') && val.length > 1 && val !== '-') {
      const flag = val.slice(0, 2) // -X, -H, -d ...
      const kind = SHORT_FLAGS_WITH_VALUE[flag]

      if (kind) {
        if (val.length > 2) {
          // 连写形式：-XPOST
          applyValue(kind, val.slice(2))
          i++
        } else if (i + 1 < tokens.length) {
          applyValue(kind, tokens[i + 1].value)
          i += 2
        } else {
          warnings.push(`参数 ${flag} 缺少值`)
          i++
        }
        continue
      }

      // 布尔短选项，可能是组合 -sL
      if (BOOLEAN_FLAGS.has(val)) {
        if (val.includes('L')) followRedirects = true
        i++
        continue
      }

      // 未识别短选项，忽略
      warnings.push(`忽略未识别的参数: ${val}`)
      i++
      continue
    }

    // 非 flag token → URL（取第一个）
    if (url === null) {
      url = val
    } else {
      warnings.push(`忽略多余的位置参数: ${val}`)
    }
    i++
  }

  // 辅助参数转 header
  if (auth) {
    headers['Authorization'] = `Basic ${btoa(auth)}`
  }
  if (userAgent) {
    headers['User-Agent'] = userAgent
  }
  if (cookie) {
    headers['Cookie'] = cookie
  }
  if (referer) {
    headers['Referer'] = referer
  }

  // 推断 method
  let finalMethod: string = method || (hasBody ? 'POST' : 'GET')
  finalMethod = finalMethod.toUpperCase()

  // 校验 URL
  if (!url) {
    return {
      method: finalMethod,
      url: '',
      headers,
      body,
      hasBody,
      followRedirects,
      warnings,
      error: '未找到请求 URL',
    }
  }

  return {
    method: finalMethod,
    url,
    headers,
    body,
    hasBody,
    followRedirects,
    warnings,
  }

  // ---- 内部：应用参数值 ----
  function applyValue(kind: string, value: string) {
    switch (kind) {
      case 'method':
        method = value
        break
      case 'header': {
        const h = parseHeader(value)
        if (h) {
          headers[h.key] = h.value
        } else {
          warnings.push(`无法解析 header: ${value}`)
        }
        break
      }
      case 'body':
        // --data / -d 中 @前缀表示读文件，浏览器不支持
        if (value.startsWith('@')) {
          warnings.push(`不支持从文件读取 body (@${value.slice(1)})，已忽略`)
        } else {
          body = value
          hasBody = true
          // 如果没有显式 Content-Type，--data 默认 application/x-www-form-urlencoded
          // 但 --data-raw 不一定。这里不强制设置，保留用户 header。
        }
        break
      case 'url':
        if (url === null) url = value
        break
      case 'auth':
        auth = value
        break
      case 'userAgent':
        userAgent = value
        break
      case 'cookie':
        cookie = value
        break
      case 'referer':
        referer = value
        break
      // 其他参数忽略
    }
  }
}
