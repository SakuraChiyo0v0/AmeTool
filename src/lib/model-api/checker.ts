import type {
  CheckerConfig,
  ConnectivityResult,
  ModelListResult,
  BalanceResult,
  ModelInfo,
  RequestDetail,
  ResponseDetail,
  RequestResponseLog,
  ChatMessage,
  ChatResult,
} from './types'
import type { ProviderPreset } from './types'
import { buildProxiedUrl, joinUrl } from './cors-proxy'

// ============================================================
// 检测核心逻辑
// ============================================================

const REQUEST_TIMEOUT = 15000 // 15s 超时

/** 带超时的 fetch 封装 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout = REQUEST_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** 构建请求头 */
function buildHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

/** 掩码敏感请求头（用于日志展示） */
function maskHeaders(headers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'authorization') {
      result[key] = value.replace(/(Bearer\s+).+/, '$1***')
    } else {
      result[key] = value
    }
  }
  return result
}

/** 从 Response 中提取响应头 */
function extractResponseHeaders(response: Response): Record<string, string> {
  const result: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    result[key] = value
  })
  return result
}

/** 判断是否为 CORS / 网络错误 */
function isNetworkError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return false
  if (err instanceof TypeError) return true // fetch 网络错误
  return false
}

/** 安全读取 JSON 响应 */
async function safeJson(response: Response): Promise<unknown | null> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

// ============================================================
// 连通性 + 模型列表（共用 GET /models 请求）
// ============================================================

interface ModelsFetchResult {
  connectivity: ConnectivityResult
  models: ModelListResult
}

/**
 * 执行 GET /models 请求，同时产出连通性和模型列表结果。
 * 这样一次请求即可完成两项检测。
 */
export async function checkConnectivityAndModels(
  config: CheckerConfig,
): Promise<ModelsFetchResult> {
  const now = Date.now()
  const targetUrl = joinUrl(config.baseUrl, '/models')
  const url = buildProxiedUrl(targetUrl, config.proxyUrl)
  const headers = buildHeaders(config.apiKey)

  const requestDetail: RequestDetail = {
    method: 'GET',
    url,
    headers: maskHeaders(headers),
    body: null,
  }

  const connResult: ConnectivityResult = { status: 'checking', timestamp: now }
  const modelResult: ModelListResult = { status: 'checking', timestamp: now }

  try {
    const start = performance.now()
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers,
    })
    const latency = Math.round(performance.now() - start)

    const responseHeaders = extractResponseHeaders(response)
    const json = await safeJson(response)

    const responseDetail: ResponseDetail = {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: json,
    }
    const log: RequestResponseLog = { request: requestDetail, response: responseDetail }
    connResult.log = log
    modelResult.log = log

    connResult.httpStatus = response.status
    connResult.latency = latency
    modelResult.httpStatus = response.status
    modelResult.latency = latency

    if (response.ok) {
      // 成功：解析模型列表
      const models = parseModels(json)

      connResult.status = 'success'
      connResult.data = { reachable: true, authValid: true }

      modelResult.status = 'success'
      modelResult.data = { models, total: models.length }
    } else if (response.status === 401) {
      connResult.status = 'error'
      connResult.data = { reachable: true, authValid: false }
      connResult.error = 'API Key 无效或已过期（401 Unauthorized）'

      modelResult.status = 'error'
      modelResult.error = 'API Key 无效，无法获取模型列表'
    } else if (response.status === 403) {
      connResult.status = 'error'
      connResult.data = { reachable: true, authValid: false }
      connResult.error = '权限不足（403 Forbidden），该 Key 可能无权访问此接口'

      modelResult.status = 'error'
      modelResult.error = '权限不足，无法获取模型列表'
    } else if (response.status === 404) {
      connResult.status = 'error'
      connResult.data = { reachable: false, authValid: false }
      connResult.error = '接口地址不存在（404），请检查 Base URL 是否正确'

      modelResult.status = 'error'
      modelResult.error = '接口地址不存在，无法获取模型列表'
    } else {
      const msg = extractErrorMessage(json) || `HTTP ${response.status}`
      connResult.status = 'error'
      connResult.data = { reachable: true, authValid: false }
      connResult.error = msg

      modelResult.status = 'error'
      modelResult.error = msg
    }
  } catch (err) {
    const isNet = isNetworkError(err)
    const errorMsg = err instanceof DOMException && err.name === 'AbortError'
      ? `请求超时（${REQUEST_TIMEOUT / 1000}s）`
      : isNet
        ? '网络请求失败，可能是 CORS 跨域拦截或地址不可达。请尝试配置代理地址后重试。'
        : err instanceof Error ? err.message : '未知错误'

    const log: RequestResponseLog = { request: requestDetail, response: null, error: errorMsg }
    connResult.log = log
    modelResult.log = log

    connResult.status = 'error'
    connResult.error = errorMsg
    connResult.data = { reachable: false, authValid: false }

    modelResult.status = 'error'
    modelResult.error = errorMsg
  }

  return { connectivity: connResult, models: modelResult }
}

/** 解析 OpenAI 兼容格式的模型列表响应 */
function parseModels(json: unknown): ModelInfo[] {
  if (!json || typeof json !== 'object') return []
  const obj = json as Record<string, unknown>
  const data = obj.data
  if (!Array.isArray(data)) return []

  return data
    .filter((item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null,
    )
    .map((item) => ({
      id: String(item.id ?? ''),
      ownedBy: item.owned_by != null ? String(item.owned_by) : undefined,
      created: typeof item.created === 'number' ? item.created : undefined,
    }))
    .filter((m) => m.id)
    .sort((a, b) => a.id.localeCompare(b.id))
}

// ============================================================
// 余额查询
// ============================================================

/**
 * 查询账户余额。
 * 根据提供商预设中的端点和字段解析规则进行请求和解析。
 */
export async function checkBalance(
  config: CheckerConfig,
  provider: ProviderPreset | undefined,
): Promise<BalanceResult> {
  const now = Date.now()
  const result: BalanceResult = { status: 'checking', timestamp: now }

  if (!provider || !provider.hasBalance || !provider.balanceConfig) {
    result.status = 'error'
    result.error = '该提供商不支持余额查询'
    return result
  }

  const { endpoint, method, fields } = provider.balanceConfig
  const targetUrl = joinUrl(config.baseUrl, endpoint)
  const url = buildProxiedUrl(targetUrl, config.proxyUrl)
  const headers = buildHeaders(config.apiKey)

  const requestDetail: RequestDetail = {
    method,
    url,
    headers: maskHeaders(headers),
    body: null,
  }

  try {
    const start = performance.now()
    const response = await fetchWithTimeout(url, {
      method,
      headers,
    })
    result.httpStatus = response.status
    result.latency = Math.round(performance.now() - start)

    const responseHeaders = extractResponseHeaders(response)
    const json = await safeJson(response)

    const responseDetail: ResponseDetail = {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: json,
    }
    result.log = { request: requestDetail, response: responseDetail }

    if (!response.ok) {
      const msg = extractErrorMessage(json) || `HTTP ${response.status}`
      result.status = 'error'
      result.error = msg
      return result
    }

    result.status = 'success'
    result.data = parseBalance(json, fields)
  } catch (err) {
    const isNet = isNetworkError(err)
    const errorMsg = err instanceof DOMException && err.name === 'AbortError'
      ? `请求超时（${REQUEST_TIMEOUT / 1000}s）`
      : isNet
        ? '网络请求失败，可能是 CORS 跨域拦截。请尝试配置代理地址后重试。'
        : err instanceof Error ? err.message : '未知错误'

    result.status = 'error'
    result.error = errorMsg
    result.log = { request: requestDetail, response: null, error: errorMsg }
  }

  return result
}

/** 从 JSON 中按点分路径提取值 */
function getValueByPath(obj: unknown, path: string): unknown {
  if (!obj || !path) return undefined
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    // 支持数组索引，如 balance_infos.0.total_balance
    if (Array.isArray(current)) {
      const idx = parseInt(part, 10)
      if (isNaN(idx) || idx < 0 || idx >= current.length) return undefined
      current = current[idx]
    } else if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return current
}

/** 解析余额响应 */
function parseBalance(
  json: unknown,
  fields: { balance?: string; currency?: string; used?: string; total?: string },
): BalanceResult['data'] {
  const balance = fields.balance ? toNumber(getValueByPath(json, fields.balance)) : undefined
  const used = fields.used ? toNumber(getValueByPath(json, fields.used)) : undefined
  const total = fields.total ? toNumber(getValueByPath(json, fields.total)) : undefined
  const currency = fields.currency ? String(getValueByPath(json, fields.currency) ?? '') : undefined

  return { balance, used, total, currency, raw: json }
}

/** 安全转换为数字 */
function toNumber(val: unknown): number | undefined {
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const n = parseFloat(val)
    return isNaN(n) ? undefined : n
  }
  return undefined
}

/** 从错误响应中提取错误信息 */
function extractErrorMessage(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null
  const obj = json as Record<string, unknown>
  // OpenAI 风格: { error: { message: "..." } }
  if (obj.error && typeof obj.error === 'object') {
    const err = obj.error as Record<string, unknown>
    if (typeof err.message === 'string') return err.message
  }
  // 直接 message 字段
  if (typeof obj.message === 'string') return obj.message
  // { error: "string" }
  if (typeof obj.error === 'string') return obj.error
  return null
}

// ============================================================
// 对话测试
// ============================================================

/**
 * 发送对话消息，调用 /chat/completions 端点。
 */
export async function sendChatMessage(
  config: CheckerConfig,
  model: string,
  messages: ChatMessage[],
): Promise<ChatResult> {
  const targetUrl = joinUrl(config.baseUrl, '/chat/completions')
  const url = buildProxiedUrl(targetUrl, config.proxyUrl)
  const headers = buildHeaders(config.apiKey)

  const requestBody = JSON.stringify({
    model,
    messages,
    stream: false,
  })

  const requestDetail: RequestDetail = {
    method: 'POST',
    url,
    headers: maskHeaders(headers),
    body: requestBody,
  }

  try {
    const start = performance.now()
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: requestBody,
    })
    const latency = Math.round(performance.now() - start)

    const responseHeaders = extractResponseHeaders(response)
    const json = await safeJson(response)

    const responseDetail: ResponseDetail = {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: json,
    }
    const log: RequestResponseLog = { request: requestDetail, response: responseDetail }

    if (!response.ok) {
      const msg = extractErrorMessage(json) || `HTTP ${response.status}`
      return {
        content: '',
        model,
        log,
        error: msg,
      }
    }

    // 解析 OpenAI 兼容格式
    const obj = json as Record<string, unknown> | null
    const choices = obj?.choices as unknown[] | undefined
    const firstChoice = choices?.[0] as Record<string, unknown> | undefined
    const message = firstChoice?.message as Record<string, unknown> | undefined
    const content = typeof message?.content === 'string' ? message.content : ''

    const usage = obj?.usage as Record<string, unknown> | undefined

    return {
      content,
      model,
      log: {
        ...log,
        response: {
          ...responseDetail,
          // 追加耗时到响应体展示
          body: json,
        },
      },
      usage: usage
        ? {
            promptTokens: typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : undefined,
            completionTokens: typeof usage.completion_tokens === 'number' ? usage.completion_tokens : undefined,
            totalTokens: typeof usage.total_tokens === 'number' ? usage.total_tokens : undefined,
          }
        : undefined,
    }
  } catch (err) {
    const isNet = isNetworkError(err)
    const errorMsg = err instanceof DOMException && err.name === 'AbortError'
      ? `请求超时（${REQUEST_TIMEOUT / 1000}s）`
      : isNet
        ? '网络请求失败，可能是 CORS 跨域拦截或地址不可达。请尝试配置代理地址后重试。'
        : err instanceof Error ? err.message : '未知错误'

    return {
      content: '',
      model,
      log: { request: requestDetail, response: null, error: errorMsg },
      error: errorMsg,
    }
  }
}

// ============================================================
// 一键全部检测
// ============================================================

export interface FullCheckResult {
  connectivity: ConnectivityResult
  models: ModelListResult
  balance: BalanceResult
}

/** 执行全部三项检测（连通性和模型列表共用一次请求） */
export async function runFullCheck(
  config: CheckerConfig,
  provider: ProviderPreset | undefined,
  options: { includeBalance?: boolean } = {},
): Promise<FullCheckResult> {
  const { includeBalance = true } = options

  // 连通性 + 模型列表（一次请求）
  const { connectivity, models } = await checkConnectivityAndModels(config)

  // 余额查询（独立请求，仅在连通成功且需要时执行）
  let balance: BalanceResult = { status: 'idle', timestamp: Date.now() }
  if (includeBalance) {
    if (connectivity.status === 'success' && provider?.hasBalance) {
      balance = await checkBalance(config, provider)
    } else if (!provider?.hasBalance) {
      balance = { status: 'error', timestamp: Date.now(), error: '该提供商不支持余额查询' }
    } else {
      balance = {
        status: 'error',
        timestamp: Date.now(),
        error: '连通性测试未通过，跳过余额查询',
      }
    }
  }

  return { connectivity, models, balance }
}
