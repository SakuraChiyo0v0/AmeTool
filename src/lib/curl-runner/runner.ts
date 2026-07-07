// ============================================================
// 请求执行器
// ============================================================

import type { ParsedCurl, CurlRunResult, CurlRequestLog } from './types'
import { injectVariables } from './variables'

const REQUEST_TIMEOUT = 30000 // 30s

/** 带超时的 fetch */
async function fetchWithTimeout(url: string, options: RequestInit, timeout = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** 提取响应头 */
function extractHeaders(response: Response): Record<string, string> {
  const result: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    result[key] = value
  })
  return result
}

/** 安全读取响应体 */
async function readBody(response: Response): Promise<unknown> {
  const ct = response.headers.get('content-type') || ''
  // JSON
  if (ct.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return await response.text()
    }
  }
  // 文本类
  if (
    ct.startsWith('text/') ||
    ct.includes('xml') ||
    ct.includes('javascript') ||
    ct.includes('svg')
  ) {
    return await response.text()
  }
  // 其他：尝试 JSON，失败则返回文本
  const text = await response.text()
  if (text) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
  return null
}

/** 掩码敏感 header（用于日志展示） */
function maskHeaders(headers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    const lk = key.toLowerCase()
    if (lk === 'authorization' || lk === 'cookie' || lk === 'set-cookie' || lk.includes('key') || lk.includes('token') || lk.includes('secret')) {
      // 保留前缀 + 掩码
      if (value.length > 8) {
        result[key] = value.slice(0, 6) + '***' + value.slice(-2)
      } else {
        result[key] = '***'
      }
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * 执行注入变量后的请求。
 * @param parsed 解析后的 CURL
 * @param variables 变量值映射
 */
export async function executeCurl(
  parsed: ParsedCurl,
  variables: Record<string, string>,
): Promise<CurlRunResult> {
  // 注入变量
  const url = injectVariables(parsed.url, variables)
  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(parsed.headers)) {
    headers[key] = injectVariables(value, variables)
  }
  const body = parsed.body ? injectVariables(parsed.body, variables) : null

  const requestDetail = {
    method: parsed.method,
    url,
    headers: maskHeaders(headers),
    body,
  }

  try {
    const fetchOptions: RequestInit = {
      method: parsed.method,
      headers,
    }
    // GET / HEAD 不带 body
    if (body && parsed.method !== 'GET' && parsed.method !== 'HEAD') {
      fetchOptions.body = body
    }

    const start = performance.now()
    const response = await fetchWithTimeout(url, fetchOptions)
    const latency = Math.round(performance.now() - start)

    const responseHeaders = extractHeaders(response)
    const responseBody = await readBody(response)

    const log: CurlRequestLog = {
      request: requestDetail,
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
      },
      latency,
    }

    return { ok: response.ok, log }
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === 'AbortError'
    const isNet = err instanceof TypeError
    const errorMsg = isAbort
      ? `请求超时（${REQUEST_TIMEOUT / 1000}s）`
      : isNet
        ? '网络请求失败，可能是 CORS 跨域拦截或地址不可达。浏览器直接请求第三方 API 受同源策略限制，如遇 CORS 错误属于正常现象。'
        : err instanceof Error
          ? err.message
          : '未知错误'

    const log: CurlRequestLog = {
      request: requestDetail,
      response: null,
      error: errorMsg,
    }

    return { ok: false, log }
  }
}
