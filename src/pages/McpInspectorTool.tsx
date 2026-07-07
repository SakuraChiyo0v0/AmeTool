import { useCallback, useMemo, useState } from 'react'
import { Check, Copy, FileJson, Play, ShieldAlert, Trash2 } from 'lucide-react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceSplit } from '../components/ToolPageLayout'

type McpServerType = 'http' | 'sse' | 'stdio' | string
type ProbeStatus = 'idle' | 'running' | 'success' | 'error'

interface McpServerConfig {
  type?: McpServerType
  url?: string
  command?: string
  args?: string[]
  headers?: Record<string, string>
  env?: Record<string, string>
}

interface McpConfig {
  mcpServers?: Record<string, McpServerConfig>
}

interface ProbeCall {
  method: string
  status: ProbeStatus
  summary: string
  result?: any
  error?: string
}

const SAMPLE_CONFIG = `{
  "mcpServers": {
    "mem": {
      "type": "http",
      "url": "http://prod-search-memory.api.xiaomi.net/mcp/claude-code/http",
      "headers": {
        "X-Collection-Key": "sk-KWFaTpXXXXXXXXXXXXXXC436Jn1jX"
      }
    }
  }
}`

function maskSecret(value: string) {
  if (value.length <= 8) return '*'.repeat(value.length)
  return `${value.slice(0, 4)}${'*'.repeat(Math.min(value.length - 8, 16))}${value.slice(-4)}`
}

function isLikelySecret(key: string) {
  return /key|token|secret|authorization|password|cookie/i.test(key)
}

function safeHeaders(headers?: Record<string, string>) {
  return Object.entries(headers || {}).map(([key, value]) => ({
    key,
    value: isLikelySecret(key) ? maskSecret(String(value)) : String(value),
  }))
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return '请求超时或已取消'
    return error.message || '请求失败'
  }
  return String(error)
}

function getProbeHint(error: string) {
  if (/failed to fetch|networkerror|load failed/i.test(error)) {
    return '浏览器无法访问该 MCP 地址，常见原因是 CORS 未放行、HTTPS 页面请求 HTTP 地址、内网地址不可达或服务未启动。'
  }
  if (/401|403|unauthorized|forbidden/i.test(error)) {
    return '鉴权失败，请检查 headers、token 或服务端权限配置。'
  }
  return error
}

async function callMcp(url: string, headers: Record<string, string>, method: string, params?: any) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
      signal: controller.signal,
    })

    const text = await response.text()
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text || response.statusText}`)
    }

    const payload = parseMcpResponse(text)
    if (payload?.error) {
      throw new Error(payload.error.message || JSON.stringify(payload.error))
    }
    return payload?.result ?? payload
  } finally {
    window.clearTimeout(timeout)
  }
}

function parseMcpResponse(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('data:')) {
    const dataLine = trimmed
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('data:'))
    return dataLine ? JSON.parse(dataLine.slice(5).trim()) : null
  }
  return JSON.parse(trimmed)
}

function describeCall(method: string, result: any) {
  if (method === 'initialize') {
    const name = result?.serverInfo?.name || '未知服务'
    const version = result?.serverInfo?.version ? ` v${result.serverInfo.version}` : ''
    return `${name}${version}，协议 ${result?.protocolVersion || '未知'}`
  }
  if (method === 'tools/list') return `发现 ${result?.tools?.length || 0} 个工具接口`
  if (method === 'resources/list') return `发现 ${result?.resources?.length || 0} 个资源`
  if (method === 'prompts/list') return `发现 ${result?.prompts?.length || 0} 个提示模板`
  return '请求成功'
}

export default function McpInspectorTool() {
  const [input, setInput] = useState(SAMPLE_CONFIG)
  const [selectedName, setSelectedName] = useState('')
  const [probeCalls, setProbeCalls] = useState<ProbeCall[]>([])
  const [probing, setProbing] = useState(false)
  const [copied, setCopied] = useState(false)

  const parsed = useMemo(() => {
    try {
      const config = JSON.parse(input) as McpConfig
      const servers = Object.entries(config.mcpServers || {})
      return { config, servers, error: '' }
    } catch (error) {
      return { config: null, servers: [], error: normalizeError(error) }
    }
  }, [input])

  const activeName = selectedName || parsed.servers[0]?.[0] || ''
  const activeServer = parsed.servers.find(([name]) => name === activeName)?.[1]
  const safeHeaderList = safeHeaders(activeServer?.headers)
  const canProbe = Boolean(activeServer?.url && ['http', 'sse'].includes(activeServer.type || 'http'))

  const serverSummary = useMemo(() => {
    if (!activeServer) return ''
    return JSON.stringify({
      name: activeName,
      type: activeServer.type || 'http',
      url: activeServer.url || '',
      command: activeServer.command || '',
      args: activeServer.args || [],
      headers: Object.fromEntries(safeHeaderList.map((item) => [item.key, item.value])),
      envKeys: Object.keys(activeServer.env || {}),
    }, null, 2)
  }, [activeName, activeServer, safeHeaderList])

  const runProbe = useCallback(async () => {
    if (!activeServer?.url) return
    const methods: Array<{ method: string; params?: any }> = [
      {
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'AmeTool MCP Inspector', version: '1.0.0' },
        },
      },
      { method: 'tools/list' },
      { method: 'resources/list' },
      { method: 'prompts/list' },
    ]

    setProbing(true)
    setProbeCalls(methods.map(({ method }) => ({ method, status: 'idle', summary: '等待探测' })))

    for (const { method, params } of methods) {
      setProbeCalls((prev) => prev.map((item) => item.method === method ? { ...item, status: 'running', summary: '请求中...' } : item))
      try {
        const result = await callMcp(activeServer.url, activeServer.headers || {}, method, params)
        setProbeCalls((prev) => prev.map((item) => item.method === method ? {
          method,
          status: 'success',
          summary: describeCall(method, result),
          result,
        } : item))
      } catch (error) {
        const message = getProbeHint(normalizeError(error))
        setProbeCalls((prev) => prev.map((item) => item.method === method ? {
          method,
          status: 'error',
          summary: message,
          error: message,
        } : item))
      }
    }

    setProbing(false)
  }, [activeServer])

  const copySummary = useCallback(async () => {
    if (!serverSummary) return
    await navigator.clipboard.writeText(serverSummary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [serverSummary])

  const clearInput = useCallback(() => {
    setInput('')
    setSelectedName('')
    setProbeCalls([])
  }, [])

  return (
    <ToolPageLayout toolId="mcp-inspector">
      <WorkspaceHeader title={parsed.error ? 'MCP 配置解析失败' : activeName ? `MCP：${activeName}` : 'MCP 探测'}>
        <button className="button ghost compact" onClick={clearInput}>
          <Trash2 size={14} /> 清空
        </button>
      </WorkspaceHeader>
      <WorkspaceSplit leftWidth="45%" left={
        <div className="mcp-input-section">
          <div className="section-header">
            <span className="section-title">MCP JSON 配置</span>
            {parsed.error ? <span className="validation-badge invalid">JSON 错误</span> : <span className="validation-badge valid">已解析</span>}
          </div>
          <textarea
            className="json-textarea mcp-config-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setProbeCalls([])
            }}
            placeholder="粘贴包含 mcpServers 的 JSON 配置"
            spellCheck={false}
          />
          <div className="json-controls mcp-controls">
            <div className="indent-control">
              <label>服务器</label>
              <select className="indent-select" value={activeName} onChange={(e) => setSelectedName(e.target.value)} disabled={parsed.servers.length === 0}>
                {parsed.servers.map(([name]) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div className="action-buttons">
              <button className="button secondary" onClick={copySummary} disabled={!serverSummary}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? '已复制' : '复制摘要'}
              </button>
              <button className="button primary" onClick={runProbe} disabled={!canProbe || probing}>
                <Play size={16} /> {probing ? '探测中' : '开始探测'}
              </button>
            </div>
          </div>
          {parsed.error && <div className="json-error">{parsed.error}</div>}
          {activeServer?.type === 'stdio' && (
            <div className="mcp-warning"><ShieldAlert size={16} /> stdio MCP 需要本地进程，浏览器页面只能解析配置，不能直接启动探测。</div>
          )}
        </div>
      } right={
        <div className="mcp-output-section">
          {activeServer ? (
            <>
              <div className="mcp-overview-card">
                <div className="section-header">
                  <span className="section-title">基础信息</span>
                  <FileJson size={16} />
                </div>
                <div className="mcp-info-grid">
                  <div><span>名称</span><b>{activeName}</b></div>
                  <div><span>类型</span><b>{activeServer.type || 'http'}</b></div>
                  <div className="wide"><span>地址</span><code>{activeServer.url || activeServer.command || '-'}</code></div>
                  <div><span>Header 数</span><b>{safeHeaderList.length}</b></div>
                  <div><span>环境变量</span><b>{Object.keys(activeServer.env || {}).length}</b></div>
                </div>
              </div>

              {safeHeaderList.length > 0 && (
                <div className="mcp-overview-card">
                  <span className="section-title">Headers（敏感值已脱敏）</span>
                  <div className="mcp-header-list">
                    {safeHeaderList.map((item) => <code key={item.key}>{item.key}: {item.value}</code>)}
                  </div>
                </div>
              )}

              <div className="mcp-overview-card">
                <span className="section-title">接口探测结果</span>
                {probeCalls.length === 0 ? (
                  <p className="mcp-empty">点击“开始探测”后会尝试 initialize、tools/list、resources/list、prompts/list。</p>
                ) : (
                  <div className="mcp-probe-list">
                    {probeCalls.map((call) => (
                      <div key={call.method} className={`mcp-probe-item ${call.status}`}>
                        <div>
                          <b>{call.method}</b>
                          <span>{call.summary}</span>
                        </div>
                        {call.result && <pre>{JSON.stringify(call.result, null, 2)}</pre>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>等待 MCP 配置</h3>
              <p>粘贴包含 mcpServers 的 JSON 后，将自动展示服务详情。</p>
            </div>
          )}
        </div>
      } />
    </ToolPageLayout>
  )
}
