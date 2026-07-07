import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Terminal,
  Play,
  Loader2,
  Copy,
  Check,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileJson,
  X,
  Save,
  Variable,
  KeyRound,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Wand2,
} from 'lucide-react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'
import { parseCurl } from '../lib/curl-runner/parser'
import {
  extractVariablesFromCurl,
  injectVariables,
  loadVariables,
  saveVariables,
  clearVariables,
  mergeVariables,
} from '../lib/curl-runner/variables'
import { executeCurl } from '../lib/curl-runner/runner'
import type { ParsedCurl, CurlRunResult, CurlRequestLog } from '../lib/curl-runner/types'

// 敏感变量名关键词
const SENSITIVE_KEYWORDS = ['key', 'token', 'secret', 'password', 'pwd', 'auth', 'credential']

function isSensitiveVar(name: string): boolean {
  const lower = name.toLowerCase()
  return SENSITIVE_KEYWORDS.some((kw) => lower.includes(kw))
}

/** 格式化 JSON */
function formatJson(val: unknown): string {
  if (val == null) return '(空)'
  if (typeof val === 'string') {
    try {
      return JSON.stringify(JSON.parse(val), null, 2)
    } catch {
      return val
    }
  }
  try {
    return JSON.stringify(val, null, 2)
  } catch {
    return String(val)
  }
}

const SAMPLE_CURL = `curl --location --request POST 'https://api.llm.mioffice.cn/v1/chat/completions' \\
--header "Authorization: Bearer $LLM_API_KEY" \\
--header "Content-Type: application/json" \\
--data-raw '{
"model": "xiaomi/mimo-v2.5",
"messages": [
{
"role": "system",
"content": "You are MiMo, an AI assistant developed by Xiaomi."
},
{
"role": "user",
"content": "hello"
}
],
"max_completion_tokens": 1024
}'`

export default function CurlRunner() {
  // 输入
  const [curlInput, setCurlInput] = useState('')

  // 解析结果
  const [parsed, setParsed] = useState<ParsedCurl | null>(null)

  // 当前命令的变量值（用户输入）
  const [varValues, setVarValues] = useState<Record<string, string>>({})

  // 全局变量库
  const [globalVars, setGlobalVars] = useState<Record<string, string>>({})

  // 敏感变量显隐
  const [visibleVars, setVisibleVars] = useState<Set<string>>(new Set())

  // 执行状态
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<CurlRunResult | null>(null)

  // 复制状态
  const [copied, setCopied] = useState(false)

  // 折叠状态
  const [showRequestPreview, setShowRequestPreview] = useState(false)
  const [showGlobalVars, setShowGlobalVars] = useState(false)

  // 请求详情弹窗
  const [detailLog, setDetailLog] = useState<CurlRequestLog | null>(null)

  // 加载全局变量
  useEffect(() => {
    setGlobalVars(loadVariables())
  }, [])

  // 解析 curl（输入变化时）
  const doParse = useCallback((input: string) => {
    if (!input.trim()) {
      setParsed(null)
      setVarValues({})
      return
    }
    const result = parseCurl(input)
    setParsed(result)
    // 提取变量，从全局变量库注入默认值
    if (!result.error) {
      const vars = extractVariablesFromCurl(result)
      const initial: Record<string, string> = {}
      for (const ref of vars) {
        initial[ref.name] = globalVars[ref.name] ?? ''
      }
      setVarValues(initial)
    } else {
      setVarValues({})
    }
  }, [globalVars])

  // 防抖解析
  const parseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleInputChange = useCallback((value: string) => {
    setCurlInput(value)
    if (parseTimer.current) clearTimeout(parseTimer.current)
    parseTimer.current = setTimeout(() => doParse(value), 300)
  }, [doParse])

  // 当前命令的变量列表
  const currentVars = useMemo(() => {
    if (!parsed || parsed.error) return []
    return extractVariablesFromCurl(parsed)
  }, [parsed])

  // 已填写的变量（用于注入）
  const effectiveVars = useMemo(() => {
    const v: Record<string, string> = {}
    for (const ref of currentVars) {
      v[ref.name] = varValues[ref.name] ?? ''
    }
    return v
  }, [currentVars, varValues])

  // 注入变量后的预览请求
  const previewRequest = useMemo(() => {
    if (!parsed || parsed.error) return null
    return {
      method: parsed.method,
      url: injectVariables(parsed.url, effectiveVars),
      headers: Object.fromEntries(
        Object.entries(parsed.headers).map(([k, v]) => [k, injectVariables(v, effectiveVars)]),
      ),
      body: parsed.body ? injectVariables(parsed.body, effectiveVars) : null,
    }
  }, [parsed, effectiveVars])

  // 是否有变量缺失值
  const hasMissingVars = useMemo(() => {
    return currentVars.some((ref) => !varValues[ref.name]?.trim())
  }, [currentVars, varValues])

  // 切换敏感变量显隐
  const toggleVarVisible = useCallback((name: string) => {
    setVisibleVars((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  // 执行请求
  const handleRun = useCallback(async () => {
    if (!parsed || parsed.error || running) return
    setRunning(true)
    setResult(null)
    try {
      // 保存本次填写的非空变量到全局
      const newGlobal = mergeVariables(globalVars, effectiveVars)
      setGlobalVars(newGlobal)
      saveVariables(newGlobal)

      const res = await executeCurl(parsed, effectiveVars)
      setResult(res)
    } finally {
      setRunning(false)
    }
  }, [parsed, running, globalVars, effectiveVars])

  // 保存当前变量到全局
  const handleSaveVars = useCallback(() => {
    const newGlobal = mergeVariables(globalVars, effectiveVars)
    setGlobalVars(newGlobal)
    saveVariables(newGlobal)
  }, [globalVars, effectiveVars])

  // 删除单个全局变量
  const handleDeleteGlobalVar = useCallback((name: string) => {
    const next = { ...globalVars }
    delete next[name]
    setGlobalVars(next)
    saveVariables(next)
  }, [globalVars])

  // 清空全局变量
  const handleClearGlobalVars = useCallback(() => {
    clearVariables()
    setGlobalVars({})
  }, [])

  // 复制响应
  const handleCopyResponse = useCallback(async () => {
    if (!result?.log.response?.body) return
    try {
      await navigator.clipboard.writeText(formatJson(result.log.response.body))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard 不可用 */
    }
  }, [result])

  // 加载示例
  const handleLoadSample = useCallback(() => {
    handleInputChange(SAMPLE_CURL)
  }, [handleInputChange])

  const canRun = parsed && !parsed.error && !running && !hasMissingVars
  const allVarsFilled = currentVars.length > 0 && !hasMissingVars

  return (
    <ToolPageLayout toolId="curl-runner">
      <WorkspaceHeader title="CURL 请求工具">
        <button className="button ghost compact" onClick={handleLoadSample} title="加载示例">
          <Wand2 size={14} />
          示例
        </button>
      </WorkspaceHeader>
      <WorkspaceBody>
        <div className="curl-runner">
          {/* ========== CURL 输入区 ========== */}
          <div className="cr-input-section">
            <div className="cr-input-header">
              <span className="cr-input-title">
                <Terminal size={15} />
                CURL 命令
              </span>
              <span className="cr-input-hint">
                粘贴 curl 命令，自动识别 $VAR / ${'${VAR}'} 变量
              </span>
            </div>
            <textarea
              className="cr-textarea"
              placeholder={`curl --location --request POST 'https://api.example.com/v1/chat' \\\n--header "Authorization: Bearer $API_KEY" \\\n--header "Content-Type: application/json" \\\n--data-raw '{"model":"gpt-4","messages":[...]}'`}
              value={curlInput}
              onChange={(e) => handleInputChange(e.target.value)}
              spellCheck={false}
              rows={8}
            />
            {parsed?.error && (
              <div className="cr-parse-error">
                <AlertTriangle size={14} />
                <span>{parsed.error}</span>
              </div>
            )}
            {parsed && !parsed.error && parsed.warnings.length > 0 && (
              <div className="cr-warnings">
                {parsed.warnings.map((w, idx) => (
                  <div key={idx} className="cr-warning-item">
                    <AlertTriangle size={12} />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========== 变量输入区 ========== */}
          {currentVars.length > 0 && (
            <div className="cr-vars-section">
              <div className="cr-vars-header">
                <span className="cr-vars-title">
                  <Variable size={15} />
                  变量 ({currentVars.length})
                </span>
                <div className="cr-vars-actions">
                  {allVarsFilled && (
                    <button className="button ghost compact" onClick={handleSaveVars} title="保存到全局变量库">
                      <Save size={13} />
                      保存变量
                    </button>
                  )}
                </div>
              </div>
              <div className="cr-vars-grid">
                {currentVars.map((ref) => {
                  const sensitive = isSensitiveVar(ref.name)
                  const visible = visibleVars.has(ref.name) || !sensitive
                  const hasGlobal = ref.name in globalVars && !!globalVars[ref.name]
                  return (
                    <div key={ref.name} className="cr-var-field">
                      <label className="cr-var-label">
                        <KeyRound size={12} className={hasGlobal ? 'cr-var-icon-saved' : 'cr-var-icon'} />
                        <span className="cr-var-name">{ref.name}</span>
                        {hasGlobal && <span className="cr-var-badge">已保存</span>}
                        {sensitive && (
                          <button
                            className="cr-var-toggle"
                            onClick={() => toggleVarVisible(ref.name)}
                            type="button"
                            title={visible ? '隐藏' : '显示'}
                          >
                            {visible ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        )}
                      </label>
                      <input
                        type={visible ? 'text' : 'password'}
                        className="cr-var-input"
                        placeholder={`输入 ${ref.name} 的值`}
                        value={varValues[ref.name] ?? ''}
                        onChange={(e) =>
                          setVarValues((prev) => ({ ...prev, [ref.name]: e.target.value }))
                        }
                        spellCheck={false}
                        autoComplete="off"
                      />
                    </div>
                  )
                })}
              </div>
              {hasMissingVars && (
                <div className="cr-vars-hint">
                  <AlertTriangle size={12} />
                  <span>请填写所有变量后再发送请求（空值将替换为空字符串）</span>
                </div>
              )}
            </div>
          )}

          {/* ========== 全局变量库 ========== */}
          <div className="cr-global-section">
            <div
              className="cr-global-header"
              onClick={() => setShowGlobalVars(!showGlobalVars)}
            >
              <span className="cr-global-title">
                {showGlobalVars ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Variable size={14} />
                全局变量库 ({Object.keys(globalVars).length})
              </span>
              <span className="cr-global-hint">换 curl 时同名变量自动注入</span>
            </div>
            {showGlobalVars && (
              <div className="cr-global-body">
                {Object.keys(globalVars).length === 0 ? (
                  <div className="cr-global-empty">暂无已保存的变量。填写变量后点击「保存变量」即可持久化。</div>
                ) : (
                  <>
                    <div className="cr-global-list">
                      {Object.entries(globalVars).map(([name, value]) => {
                        const sensitive = isSensitiveVar(name)
                        const visible = visibleVars.has(`g-${name}`) || !sensitive
                        return (
                          <div key={name} className="cr-global-item">
                            <span className="cr-global-item-name">{name}</span>
                            <span className="cr-global-item-value">
                              {visible ? value : '•'.repeat(Math.min(value.length, 20))}
                            </span>
                            <div className="cr-global-item-actions">
                              {sensitive && (
                                <button
                                  className="cr-global-item-btn"
                                  onClick={() => toggleVarVisible(`g-${name}`)}
                                  type="button"
                                  title={visible ? '隐藏' : '显示'}
                                >
                                  {visible ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                              )}
                              <button
                                className="cr-global-item-btn cr-global-item-del"
                                onClick={() => handleDeleteGlobalVar(name)}
                                type="button"
                                title="删除"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <button className="button ghost compact cr-global-clear" onClick={handleClearGlobalVars}>
                      <RotateCcw size={12} />
                      清空全部
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ========== 请求预览 ========== */}
          {parsed && !parsed.error && (
            <div className="cr-preview-section">
              <div
                className="cr-preview-header"
                onClick={() => setShowRequestPreview(!showRequestPreview)}
              >
                <span className="cr-preview-title">
                  {showRequestPreview ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  请求预览
                </span>
                <span className="cr-preview-method">
                  <span className={`cr-method-tag cr-method-${parsed.method.toLowerCase()}`}>
                    {parsed.method}
                  </span>
                  <code className="cr-preview-url">{parsed.url}</code>
                </span>
              </div>
              {showRequestPreview && previewRequest && (
                <div className="cr-preview-body">
                  <div className="cr-preview-row">
                    <span className="cr-preview-k">URL</span>
                    <code className="cr-preview-v">{previewRequest.url}</code>
                  </div>
                  <div className="cr-preview-row">
                    <span className="cr-preview-k">Method</span>
                    <code className="cr-preview-v">{previewRequest.method}</code>
                  </div>
                  {Object.entries(previewRequest.headers).length > 0 && (
                    <div className="cr-preview-row">
                      <span className="cr-preview-k">Headers</span>
                      <pre className="cr-preview-pre">
                        {Object.entries(previewRequest.headers)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join('\n')}
                      </pre>
                    </div>
                  )}
                  {previewRequest.body && (
                    <div className="cr-preview-row">
                      <span className="cr-preview-k">Body</span>
                      <pre className="cr-preview-pre">{formatJson(previewRequest.body)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========== 执行按钮 ========== */}
          {parsed && !parsed.error && (
            <div className="cr-actions">
              <button
                className="button primary"
                onClick={handleRun}
                disabled={!canRun}
              >
                {running ? <Loader2 size={16} className="cr-spin" /> : <Play size={16} />}
                {running ? '请求中...' : '发送请求'}
              </button>
            </div>
          )}

          {/* ========== 响应结果 ========== */}
          {result && (
            <div className="cr-result-section">
              <div className="cr-result-header">
                <span className="cr-result-title">
                  {result.ok ? (
                    <CheckCircle2 size={16} className="cr-icon-success" />
                  ) : (
                    <XCircle size={16} className="cr-icon-error" />
                  )}
                  响应结果
                </span>
                <div className="cr-result-actions">
                  {result.log.latency != null && (
                    <span className="cr-result-meta">耗时 {result.log.latency}ms</span>
                  )}
                  {result.log.response && (
                    <>
                      <span className={`cr-result-status ${result.ok ? 'cr-status-ok' : 'cr-status-err'}`}>
                        {result.log.response.status} {result.log.response.statusText}
                      </span>
                      <button
                        className="button ghost compact"
                        onClick={() => setDetailLog(result.log)}
                        title="查看请求/响应详情"
                      >
                        <FileJson size={13} />
                        详情
                      </button>
                      {result.log.response.body != null && (
                        <button className="button ghost compact" onClick={handleCopyResponse}>
                          {copied ? <Check size={13} /> : <Copy size={13} />}
                          {copied ? '已复制' : '复制'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="cr-result-body">
                {result.log.response ? (
                  <>
                    {Object.keys(result.log.response.headers).length > 0 && (
                      <div className="cr-result-block">
                        <div className="cr-result-block-title">响应头</div>
                        <pre className="cr-result-pre cr-result-headers">
                          {Object.entries(result.log.response.headers)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join('\n')}
                        </pre>
                      </div>
                    )}
                    <div className="cr-result-block">
                      <div className="cr-result-block-title">响应体</div>
                      <pre className="cr-result-pre">{formatJson(result.log.response.body)}</pre>
                    </div>
                  </>
                ) : (
                  <div className="cr-result-error">
                    <XCircle size={16} />
                    <span>{result.log.error || '请求失败，无响应'}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </WorkspaceBody>

      {/* ========== 请求/响应详情弹窗 ========== */}
      {detailLog && (
        <DetailModal log={detailLog} onClose={() => setDetailLog(null)} />
      )}
    </ToolPageLayout>
  )
}

// ============================================================
// 请求/响应详情弹窗
// ============================================================
function DetailModal({ log, onClose }: { log: CurlRequestLog; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const text = [
      '=== 请求 ===',
      `Method: ${log.request.method}`,
      `URL: ${log.request.url}`,
      'Headers:',
      ...Object.entries(log.request.headers).map(([k, v]) => `  ${k}: ${v}`),
      log.request.body ? `Body:\n${formatJson(log.request.body)}` : '',
      '',
      '=== 响应 ===',
      log.response
        ? `Status: ${log.response.status} ${log.response.statusText}\nHeaders:\n${Object.entries(log.response.headers).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\nBody:\n${formatJson(log.response.body)}`
        : `错误: ${log.error || '无响应'}`,
    ].filter(Boolean).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }, [log])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  return (
    <div className="mac-modal-overlay" onClick={handleOverlayClick}>
      <div className="mac-modal">
        <div className="mac-modal-header">
          <span className="mac-modal-title">
            <FileJson size={16} />
            请求/响应详情
          </span>
          <div className="mac-modal-actions">
            <button className="button ghost compact" onClick={handleCopy} title="复制全部">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '已复制' : '复制'}
            </button>
            <button className="mac-modal-close" onClick={onClose} title="关闭">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="mac-modal-body">
          {/* 请求 */}
          <div className="mac-modal-section">
            <div className="mac-modal-section-title">
              请求
              {log.latency != null && <span className="mac-modal-status mac-modal-status-ok">{log.latency}ms</span>}
            </div>
            <div className="mac-modal-kv">
              <span className="mac-modal-k">Method</span>
              <span className="mac-modal-v mac-modal-v-mono">{log.request.method}</span>
            </div>
            <div className="mac-modal-kv">
              <span className="mac-modal-k">URL</span>
              <span className="mac-modal-v mac-modal-v-mono mac-modal-v-break">{log.request.url}</span>
            </div>
            {Object.keys(log.request.headers).length > 0 && (
              <>
                <div className="mac-modal-kv"><span className="mac-modal-k">Headers</span></div>
                <pre className="mac-modal-pre">
                  {Object.entries(log.request.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}
                </pre>
              </>
            )}
            {log.request.body && (
              <>
                <div className="mac-modal-kv"><span className="mac-modal-k">Body</span></div>
                <pre className="mac-modal-pre">{formatJson(log.request.body)}</pre>
              </>
            )}
          </div>
          {/* 响应 */}
          <div className="mac-modal-section">
            <div className="mac-modal-section-title">
              响应
              {log.response && (
                <span className={`mac-modal-status ${log.response.status < 400 ? 'mac-modal-status-ok' : 'mac-modal-status-err'}`}>
                  {log.response.status} {log.response.statusText}
                </span>
              )}
            </div>
            {log.response ? (
              <>
                {Object.keys(log.response.headers).length > 0 && (
                  <>
                    <div className="mac-modal-kv"><span className="mac-modal-k">Headers</span></div>
                    <pre className="mac-modal-pre">
                      {Object.entries(log.response.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}
                    </pre>
                  </>
                )}
                <div className="mac-modal-kv"><span className="mac-modal-k">Body</span></div>
                <pre className="mac-modal-pre">{formatJson(log.response.body)}</pre>
              </>
            ) : (
              <div className="mac-modal-error">
                <XCircle size={14} />
                <span>{log.error || '无响应（网络错误）'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
