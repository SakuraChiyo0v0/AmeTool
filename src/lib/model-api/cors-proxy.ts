// ============================================================
// CORS 代理处理
// ============================================================
// 纯前端 SPA 直接请求第三方 API 会被同源策略拦截。
// 用户可填入代理地址，支持两种模式：
//   1. 前缀模式:  proxy + targetUrl   →  https://proxy.com/https://api.x.com/models
//   2. 占位符模式: proxy 含 {url}      →  https://proxy.com/?url=https://api.x.com/models
// ============================================================

/** 构建经过代理的最终请求 URL */
export function buildProxiedUrl(targetUrl: string, proxyUrl?: string): string {
  if (!proxyUrl) return targetUrl

  const trimmedProxy = proxyUrl.trim()
  if (!trimmedProxy) return targetUrl

  // 占位符模式
  if (trimmedProxy.includes('{url}')) {
    return trimmedProxy.replace('{url}', encodeURIComponent(targetUrl))
  }

  // 前缀模式：直接拼接
  // 确保代理地址和目标 URL 之间只有一个 /
  const proxyEndsSlash = trimmedProxy.endsWith('/')
  const targetStartsSlash = targetUrl.startsWith('/')
  if (proxyEndsSlash && targetStartsSlash) {
    return trimmedProxy + targetUrl.slice(1)
  }
  if (!proxyEndsSlash && !targetStartsSlash) {
    return trimmedProxy + '/' + targetUrl
  }
  return trimmedProxy + targetUrl
}

/** 规范化 Base URL：去除尾部斜杠 */
export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

/** 拼接 Base URL 和路径 */
export function joinUrl(baseUrl: string, path: string): string {
  const base = normalizeBaseUrl(baseUrl)
  const p = path.startsWith('/') ? path : '/' + path
  return base + p
}
