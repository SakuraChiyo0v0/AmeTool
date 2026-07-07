// ============================================================
// CURL 运行工具 · 类型定义
// ============================================================

/** 解析后的 CURL 请求 */
export interface ParsedCurl {
  method: string
  url: string
  headers: Record<string, string>
  body: string | null
  /** 是否使用了 --data-raw / -d 等（用于推断 method） */
  hasBody: boolean
  /** 是否跟随重定向 */
  followRedirects: boolean
  /** 解析时的警告信息 */
  warnings: string[]
  /** 解析错误（致命，无法继续） */
  error?: string
}

/** 变量引用信息 */
export interface VariableRef {
  /** 变量名（不含 $ 和 {}） */
  name: string
  /** 原始文本，如 $LLM_API_KEY 或 ${LLM_API_KEY} */
  raw: string
}

/** 请求/响应日志 */
export interface CurlRequestLog {
  request: {
    method: string
    url: string
    headers: Record<string, string>
    body: string | null
  }
  response: {
    status: number
    statusText: string
    headers: Record<string, string>
    body: unknown
  } | null
  error?: string
  latency?: number
}

/** 执行结果 */
export interface CurlRunResult {
  ok: boolean
  log: CurlRequestLog
}
