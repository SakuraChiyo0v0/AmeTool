// ============================================================
// AI 模型 API 检测工具 · 类型定义
// ============================================================

/** 检测项类型 */
export type CheckType = 'connectivity' | 'models' | 'balance' | 'chat'

/** 检测状态 */
export type CheckStatus = 'idle' | 'checking' | 'success' | 'error'

/** 请求详情 */
export interface RequestDetail {
  method: string
  url: string
  headers: Record<string, string>
  body?: string | null
}

/** 响应详情 */
export interface ResponseDetail {
  status: number
  statusText: string
  headers: Record<string, string>
  body: unknown | null
}

/** 请求/响应日志 */
export interface RequestResponseLog {
  request: RequestDetail
  response: ResponseDetail | null
  error?: string
}

/** 单项检测结果基类 */
export interface CheckResult {
  status: CheckStatus
  httpStatus?: number
  latency?: number
  error?: string
  timestamp: number
  log?: RequestResponseLog
}

/** 连通性结果 */
export interface ConnectivityResult extends CheckResult {
  data?: {
    reachable: boolean
    authValid: boolean
  }
}

/** 模型信息 */
export interface ModelInfo {
  id: string
  ownedBy?: string
  created?: number
}

/** 模型列表结果 */
export interface ModelListResult extends CheckResult {
  data?: {
    models: ModelInfo[]
    total: number
  }
}

/** 余额结果 */
export interface BalanceResult extends CheckResult {
  data?: {
    balance?: number
    currency?: string
    used?: number
    total?: number
    raw?: unknown
  }
}

/** 余额查询配置 */
export interface BalanceConfig {
  endpoint: string
  method: 'GET' | 'POST'
  fields: {
    balance?: string
    currency?: string
    used?: string
    total?: string
  }
}

/** 提供商预设 */
export interface ProviderPreset {
  id: string
  name: string
  baseUrl: string
  hasBalance: boolean
  balanceConfig?: BalanceConfig
  docsUrl?: string
  note?: string
}

/** 检测器配置 */
export interface CheckerConfig {
  provider: string
  baseUrl: string
  apiKey: string
  proxyUrl?: string
}

/** 持久化配置（不含 API Key） */
export interface StoredConfig {
  provider: string
  baseUrl: string
  proxyUrl?: string
}

// ============================================================
// 对话相关类型
// ============================================================

/** 对话消息 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** 对话结果 */
export interface ChatResult {
  content: string
  model: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  log: RequestResponseLog
  error?: string
}
