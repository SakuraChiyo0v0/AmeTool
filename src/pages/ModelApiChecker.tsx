import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Plug,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Search as SearchIcon,
  Copy,
  Check,
  ExternalLink,
  Zap,
  List,
  Wallet,
  AlertTriangle,
  MessageSquare,
  Send,
  X,
  FileJson,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'
import { providerPresets, getProvider } from '../lib/model-api/providers'
import type {
  ProviderPreset,
  CheckerConfig,
  ConnectivityResult,
  ModelListResult,
  BalanceResult,
  StoredConfig,
  RequestResponseLog,
} from '../lib/model-api/types'
import {
  checkConnectivityAndModels,
  checkBalance,
  runFullCheck,
  sendChatMessage,
} from '../lib/model-api/checker'

const STORAGE_KEY = 'model-api-checker-config'

function loadStoredConfig(): StoredConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredConfig) : null
  } catch {
    return null
  }
}

function saveConfig(config: StoredConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    /* localStorage 不可用时静默失败 */
  }
}

function formatDate(timestamp: number): string {
  if (!timestamp) return '-'
  const d = new Date(timestamp * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ============================================================
// 对话消息（UI 状态）
// ============================================================
interface UiChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  error?: boolean
  log?: RequestResponseLog
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  latency?: number
}

let msgIdCounter = 0
function genMsgId(): string {
  return `msg-${++msgIdCounter}-${Date.now()}`
}

// ============================================================
// 厂商图标映射
// ============================================================
const VENDOR_DOMAIN_MAP: Record<string, string> = {
  // 主流 API 提供商
  openai: 'openai.com',
  deepseek: 'deepseek.com',
  zhipu: 'zhipuai.cn',
  bigmodel: 'bigmodel.cn',
  siliconflow: 'siliconflow.cn',
  moonshot: 'moonshot.cn',
  kimi: 'moonshot.cn',
  qwen: 'aliyun.com',
  alibaba: 'aliyun.com',
  dashscope: 'aliyun.com',
  openrouter: 'openrouter.ai',
  lingyiwanwu: 'lingyiwanwu.com',
  '01-ai': '01.ai',
  'lingyi': '01.ai',
  google: 'google.com',
  anthropic: 'anthropic.com',
  claude: 'anthropic.com',
  meta: 'meta.com',
  'meta-llama': 'meta.com',
  mistral: 'mistral.ai',
  cohere: 'cohere.com',
  baidu: 'baidu.com',
  ernie: 'baidu.com',
  minimax: 'minimaxi.com',
  baichuan: 'baichuan-ai.com',
  'step-fun': 'stepfun.com',
  stepfun: 'stepfun.com',
  sensetime: 'sensetime.com',
  sensechat: 'sensetime.com',
  yi: '01.ai',
  // SiliconFlow 上常见的模型所有者
  'deepseek-ai': 'deepseek.com',
  'qwen-org': 'aliyun.com',
  'qwen2': 'aliyun.com',
  internlm: 'internlm.org',
  sharkc: 'sharkai.cn',
}

/** 根据 ownedBy 获取厂商 favicon URL */
function getVendorIconUrl(owner: string): string | null {
  const key = owner.toLowerCase().trim()
  if (!key || key === '未知') return null
  // 精确匹配
  if (VENDOR_DOMAIN_MAP[key]) {
    return `https://www.google.com/s2/favicons?domain=${VENDOR_DOMAIN_MAP[key]}&sz=32`
  }
  // 模糊匹配
  for (const [k, v] of Object.entries(VENDOR_DOMAIN_MAP)) {
    if (key.includes(k) || k.includes(key)) {
      return `https://www.google.com/s2/favicons?domain=${v}&sz=32`
    }
  }
  return null
}

/** 厂商图标组件，加载失败时显示首字母 */
function VendorIcon({ owner, size = 16 }: { owner: string; size?: number }) {
  const [errored, setErrored] = useState(false)
  const iconUrl = useMemo(() => getVendorIconUrl(owner), [owner])

  if (!iconUrl || errored) {
    return (
      <span
        className="mac-vendor-letter"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.56) }}
      >
        {(owner || '?')[0]?.toUpperCase() ?? '?'}
      </span>
    )
  }
  return (
    <img
      src={iconUrl}
      alt={owner}
      width={size}
      height={size}
      className="mac-vendor-icon"
      onError={() => setErrored(true)}
    />
  )
}

export default function ModelApiChecker() {
  // 配置状态
  const [providerId, setProviderId] = useState('deepseek')
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com')
  const [apiKey, setApiKey] = useState('')
  const [proxyUrl, setProxyUrl] = useState('')
  const [showKey, setShowKey] = useState(false)

  // 检测结果
  const [connectivity, setConnectivity] = useState<ConnectivityResult | null>(null)
  const [models, setModels] = useState<ModelListResult | null>(null)
  const [balance, setBalance] = useState<BalanceResult | null>(null)

  // 检测中状态
  const [checkingAll, setCheckingAll] = useState(false)
  const [checkingConn, setCheckingConn] = useState(false)
  const [checkingModels, setCheckingModels] = useState(false)
  const [checkingBalance, setCheckingBalance] = useState(false)

  // 模型列表搜索
  const [modelSearch, setModelSearch] = useState('')
  const [copiedAll, setCopiedAll] = useState(false)
  const [copiedModel, setCopiedModel] = useState<string | null>(null)

  // 供应商分组展开状态（默认全收起，Set 中记录已展开的组）
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // 请求/响应详情弹窗
  const [detailLog, setDetailLog] = useState<RequestResponseLog | null>(null)
  const [detailTitle, setDetailTitle] = useState('')

  // 对话状态
  const [chatModel, setChatModel] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<UiChatMessage[]>([])
  const [chatSending, setChatSending] = useState(false)
  const [chatDropdownOpen, setChatDropdownOpen] = useState(false)
  const [chatDropdownSearch, setChatDropdownSearch] = useState('')
  const [expandedChatGroups, setExpandedChatGroups] = useState<Set<string>>(new Set())
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const chatDropdownRef = useRef<HTMLDivElement>(null)

  // 加载持久化配置
  useEffect(() => {
    const stored = loadStoredConfig()
    if (stored) {
      setProviderId(stored.provider)
      setBaseUrl(stored.baseUrl)
      if (stored.proxyUrl) setProxyUrl(stored.proxyUrl)
    }
  }, [])

  // 提供商切换时自动填充 Base URL
  const handleProviderChange = useCallback((id: string) => {
    setProviderId(id)
    const preset = getProvider(id)
    if (preset && preset.baseUrl) {
      setBaseUrl(preset.baseUrl)
    }
    // 清空之前的检测结果
    setConnectivity(null)
    setModels(null)
    setBalance(null)
  }, [])

  const currentProvider: ProviderPreset | undefined = useMemo(
    () => getProvider(providerId),
    [providerId],
  )

  const config: CheckerConfig = useMemo(
    () => ({ provider: providerId, baseUrl, apiKey, proxyUrl: proxyUrl || undefined }),
    [providerId, baseUrl, apiKey, proxyUrl],
  )

  const persistConfig = useCallback(() => {
    saveConfig({ provider: providerId, baseUrl, proxyUrl: proxyUrl || undefined })
  }, [providerId, baseUrl, proxyUrl])

  // 打开请求/响应详情弹窗
  const openDetail = useCallback((log: RequestResponseLog | undefined, title: string) => {
    if (!log) return
    setDetailLog(log)
    setDetailTitle(title)
  }, [])

  // 一键检测全部
  const handleCheckAll = useCallback(async () => {
    if (!apiKey.trim()) return
    setCheckingAll(true)
    persistConfig()
    setConnectivity(null)
    setModels(null)
    setBalance(null)
    try {
      const result = await runFullCheck(config, currentProvider)
      setConnectivity(result.connectivity)
      setModels(result.models)
      setBalance(result.balance)
    } finally {
      setCheckingAll(false)
    }
  }, [apiKey, config, currentProvider, persistConfig])

  // 仅测连通性
  const handleCheckConn = useCallback(async () => {
    if (!apiKey.trim()) return
    setCheckingConn(true)
    persistConfig()
    setConnectivity(null)
    try {
      const result = await checkConnectivityAndModels(config)
      setConnectivity(result.connectivity)
    } finally {
      setCheckingConn(false)
    }
  }, [apiKey, config, persistConfig])

  // 仅查模型列表
  const handleCheckModels = useCallback(async () => {
    if (!apiKey.trim()) return
    setCheckingModels(true)
    persistConfig()
    setModels(null)
    try {
      const result = await checkConnectivityAndModels(config)
      setModels(result.models)
      // 顺便更新连通性状态
      if (!connectivity || connectivity.status === 'idle') {
        setConnectivity(result.connectivity)
      }
    } finally {
      setCheckingModels(false)
    }
  }, [apiKey, config, persistConfig, connectivity])

  // 仅查余额
  const handleCheckBalance = useCallback(async () => {
    if (!apiKey.trim()) return
    setCheckingBalance(true)
    persistConfig()
    setBalance(null)
    try {
      const result = await checkBalance(config, currentProvider)
      setBalance(result)
    } finally {
      setCheckingBalance(false)
    }
  }, [apiKey, config, currentProvider, persistConfig])

  // 复制全部模型 ID
  const handleCopyAll = useCallback(async () => {
    const ids = models?.data?.models.map((m) => m.id).join('\n')
    if (!ids) return
    try {
      await navigator.clipboard.writeText(ids)
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    } catch {
      /* clipboard 不可用 */
    }
  }, [models])

  // 复制单个模型 ID
  const handleCopyModel = useCallback(async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      setCopiedModel(id)
      setTimeout(() => setCopiedModel(null), 2000)
    } catch {
      /* clipboard 不可用 */
    }
  }, [])

  // 设置对话模型为指定模型 ID
  const handleSetChatModel = useCallback((id: string) => {
    setChatModel(id)
    setChatDropdownOpen(false)
  }, [])

  // 切换模型列表分组展开/收起
  const toggleGroup = useCallback((owner: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(owner)) next.delete(owner)
      else next.add(owner)
      return next
    })
  }, [])

  // 切换对话下拉分组展开/收起
  const toggleChatGroup = useCallback((owner: string) => {
    setExpandedChatGroups((prev) => {
      const next = new Set(prev)
      if (next.has(owner)) next.delete(owner)
      else next.add(owner)
      return next
    })
  }, [])

  // 点击外部关闭对话下拉
  useEffect(() => {
    if (!chatDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (chatDropdownRef.current && !chatDropdownRef.current.contains(e.target as Node)) {
        setChatDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [chatDropdownOpen])

  // 发送对话消息
  const handleSendChat = useCallback(async () => {
    const input = chatInput.trim()
    if (!input || !chatModel || chatSending) return

    const userMsg: UiChatMessage = {
      id: genMsgId(),
      role: 'user',
      content: input,
    }
    const newMessages = [...chatMessages, userMsg]
    setChatMessages(newMessages)
    setChatInput('')
    setChatSending(true)

    // 构建 API 请求的消息列表
    const apiMessages = newMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const result = await sendChatMessage(config, chatModel, apiMessages)
      const assistantMsg: UiChatMessage = {
        id: genMsgId(),
        role: 'assistant',
        content: result.content || result.error || '(空响应)',
        error: !!result.error,
        log: result.log,
        usage: result.usage,
      }
      setChatMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const assistantMsg: UiChatMessage = {
        id: genMsgId(),
        role: 'assistant',
        content: err instanceof Error ? err.message : '未知错误',
        error: true,
      }
      setChatMessages((prev) => [...prev, assistantMsg])
    } finally {
      setChatSending(false)
    }
  }, [chatInput, chatModel, chatSending, chatMessages, config])

  // 清空对话
  const handleClearChat = useCallback(() => {
    setChatMessages([])
  }, [])

  // 对话区自动滚动到底部
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages, chatSending])

  const filteredModels = useMemo(() => {
    const all = models?.data?.models ?? []
    const q = modelSearch.trim().toLowerCase()
    if (!q) return all
    return all.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.ownedBy?.toLowerCase().includes(q),
    )
  }, [models, modelSearch])

  // 按供应商（ownedBy）分组，无 ownedBy 的归入「未知」
  const groupedModels = useMemo(() => {
    const groups: { owner: string; models: typeof filteredModels }[] = []
    const groupMap = new Map<string, typeof filteredModels>()
    for (const m of filteredModels) {
      const owner = m.ownedBy || '未知'
      if (!groupMap.has(owner)) {
        groupMap.set(owner, [])
        groups.push({ owner, models: groupMap.get(owner)! })
      }
      groupMap.get(owner)!.push(m)
    }
    // 供应商名称按字母排序，「未知」排最后
    groups.sort((a, b) => {
      if (a.owner === '未知') return 1
      if (b.owner === '未知') return -1
      return a.owner.localeCompare(b.owner)
    })
    return groups
  }, [filteredModels])

  // 全部模型按供应商分组（用于对话选择器，不受搜索影响）
  const groupedAllModels = useMemo(() => {
    const all = models?.data?.models ?? []
    const groups: { owner: string; models: typeof all }[] = []
    const groupMap = new Map<string, typeof all>()
    for (const m of all) {
      const owner = m.ownedBy || '未知'
      if (!groupMap.has(owner)) {
        groupMap.set(owner, [])
        groups.push({ owner, models: groupMap.get(owner)! })
      }
      groupMap.get(owner)!.push(m)
    }
    groups.sort((a, b) => {
      if (a.owner === '未知') return 1
      if (b.owner === '未知') return -1
      return a.owner.localeCompare(b.owner)
    })
    return groups
  }, [models])

  // 对话下拉中受搜索过滤影响的分组
  const filteredChatGroups = useMemo(() => {
    const q = chatDropdownSearch.trim().toLowerCase()
    if (!q) return groupedAllModels
    return groupedAllModels
      .map((g) => ({
        ...g,
        models: g.models.filter((m) => m.id.toLowerCase().includes(q)),
      }))
      .filter((g) => g.models.length > 0)
  }, [groupedAllModels, chatDropdownSearch])

  const anyChecking = checkingAll || checkingConn || checkingModels || checkingBalance
  const canCheck = apiKey.trim() && baseUrl.trim() && !anyChecking
  const canChat = apiKey.trim() && baseUrl.trim() && chatModel.trim() && !chatSending

  // 对话可用条件：连通性成功且有模型列表
  const chatAvailable = connectivity?.status === 'success' && (models?.data?.models.length ?? 0) > 0

  return (
    <ToolPageLayout toolId="model-api-checker">
      <WorkspaceHeader title="AI 模型 API 检测" />
      <WorkspaceBody>
        <div className="model-api-checker">
          {/* ========== 配置面板 ========== */}
          <div className="mac-config-section">
            <div className="mac-config-grid">
              <div className="mac-field">
                <label className="mac-field-label">提供商</label>
                <select
                  className="mac-select"
                  value={providerId}
                  onChange={(e) => handleProviderChange(e.target.value)}
                >
                  {providerPresets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mac-field mac-field-wide">
                <label className="mac-field-label">Base URL</label>
                <input
                  type="text"
                  className="mac-input"
                  placeholder="https://api.example.com/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  spellCheck={false}
                />
              </div>

              <div className="mac-field mac-field-wide">
                <label className="mac-field-label">
                  API Key
                  <button
                    className="mac-toggle-key"
                    onClick={() => setShowKey(!showKey)}
                    type="button"
                    aria-label={showKey ? '隐藏密钥' : '显示密钥'}
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </label>
                <input
                  type={showKey ? 'text' : 'password'}
                  className="mac-input mac-input-mono"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>

              <div className="mac-field">
                <label className="mac-field-label">代理地址 (可选)</label>
                <input
                  type="text"
                  className="mac-input"
                  placeholder="https://your-proxy.com/"
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </div>

            {currentProvider?.note && (
              <div className="mac-provider-note">
                <AlertTriangle size={13} />
                <span>{currentProvider.note}</span>
                {currentProvider.docsUrl && (
                  <a
                    href={currentProvider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mac-docs-link"
                  >
                    文档 <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}

            <div className="mac-actions">
              <button
                className="button primary"
                onClick={handleCheckAll}
                disabled={!canCheck}
              >
                {checkingAll ? <Loader2 size={16} className="mac-spin" /> : <Zap size={16} />}
                {checkingAll ? '检测中...' : '一键检测全部'}
              </button>
              <button
                className="button secondary"
                onClick={handleCheckConn}
                disabled={!canCheck}
              >
                {checkingConn ? <Loader2 size={14} className="mac-spin" /> : <Plug size={14} />}
                仅测连通
              </button>
              <button
                className="button secondary"
                onClick={handleCheckModels}
                disabled={!canCheck}
              >
                {checkingModels ? <Loader2 size={14} className="mac-spin" /> : <List size={14} />}
                仅查模型
              </button>
              <button
                className="button secondary"
                onClick={handleCheckBalance}
                disabled={!canCheck || !currentProvider?.hasBalance}
              >
                {checkingBalance ? <Loader2 size={14} className="mac-spin" /> : <Wallet size={14} />}
                仅查余额
              </button>
            </div>

            {!apiKey.trim() && (
              <div className="mac-hint">请输入 API Key 后开始检测</div>
            )}
          </div>

          {/* ========== 检测结果 ========== */}
          <div className="mac-results">
            {/* 连通性 */}
            <CheckCard
              title="连通性测试"
              icon={<Plug size={15} />}
              result={connectivity}
              checking={checkingConn || checkingAll}
              onViewLog={(log) => openDetail(log, '连通性测试 · 请求/响应详情')}
            >
              {connectivity?.status === 'success' && (
                <div className="mac-result-success">
                  <CheckCircle2 size={16} className="mac-icon-success" />
                  <span>连通成功</span>
                  <span className="mac-result-meta">
                    {connectivity.httpStatus} OK · 耗时 {connectivity.latency}ms
                  </span>
                </div>
              )}
              {connectivity?.status === 'error' && (
                <div className="mac-result-error">
                  <XCircle size={16} className="mac-icon-error" />
                  <span>检测失败</span>
                  {connectivity.httpStatus && (
                    <span className="mac-result-meta">HTTP {connectivity.httpStatus}</span>
                  )}
                  {connectivity.latency != null && (
                    <span className="mac-result-meta">耗时 {connectivity.latency}ms</span>
                  )}
                </div>
              )}
              {connectivity?.error && (
                <p className="mac-error-detail">{connectivity.error}</p>
              )}
            </CheckCard>

            {/* 模型列表 */}
            <CheckCard
              title="模型列表"
              icon={<List size={15} />}
              result={models}
              checking={checkingModels || checkingAll}
              onViewLog={(log) => openDetail(log, '模型列表 · 请求/响应详情')}
            >
              {models?.status === 'success' && models.data && (
                <div className="mac-models-section">
                  <div className="mac-models-header">
                    <span className="mac-models-count">
                      共 {models.data.total} 个模型
                    </span>
                    <div className="mac-models-controls">
                      <div className="mac-models-search">
                        <SearchIcon size={13} />
                        <input
                          type="text"
                          placeholder="搜索模型..."
                          value={modelSearch}
                          onChange={(e) => setModelSearch(e.target.value)}
                        />
                      </div>
                      <button className="button ghost compact" onClick={handleCopyAll}>
                        {copiedAll ? <Check size={13} /> : <Copy size={13} />}
                        {copiedAll ? '已复制' : '复制全部'}
                      </button>
                    </div>
                  </div>
                  <div className="mac-models-list">
                    {filteredModels.length === 0 ? (
                      <div className="mac-empty">未找到匹配的模型</div>
                    ) : (
                      groupedModels.map((group) => {
                        const isExpanded = expandedGroups.has(group.owner)
                        return (
                          <div key={group.owner} className="mac-model-group">
                            <div
                              className="mac-model-group-header"
                              onClick={() => toggleGroup(group.owner)}
                            >
                              <span className="mac-model-group-toggle">
                                {isExpanded
                                  ? <ChevronDown size={13} />
                                  : <ChevronRight size={13} />}
                                <VendorIcon owner={group.owner} size={16} />
                                <span className="mac-model-group-name">{group.owner}</span>
                              </span>
                              <span className="mac-model-group-count">{group.models.length}</span>
                            </div>
                            {isExpanded && group.models.map((m) => (
                              <div
                                key={m.id}
                                className={`mac-model-item ${chatModel === m.id ? 'mac-model-item-active' : ''}`}
                                onClick={() => handleSetChatModel(m.id)}
                                title="点击设为对话模型"
                              >
                                <span className="mac-model-id">{m.id}</span>
                                {m.created && (
                                  <span className="mac-model-date">{formatDate(m.created)}</span>
                                )}
                                {chatModel === m.id && (
                                  <Check size={12} className="mac-model-copied" />
                                )}
                                {chatModel !== m.id && (
                                  <Copy
                                    size={12}
                                    className="mac-model-copy-btn"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCopyModel(m.id)
                                    }}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div className="mac-models-hint">点击模型设为对话模型 · 点击复制图标复制 ID</div>
                </div>
              )}
              {models?.status === 'error' && (
                <p className="mac-error-detail">{models.error}</p>
              )}
            </CheckCard>

            {/* 余额查询 */}
            <CheckCard
              title="余额查询"
              icon={<Wallet size={15} />}
              result={balance}
              checking={checkingBalance || (checkingAll && currentProvider?.hasBalance === true)}
              onViewLog={(log) => openDetail(log, '余额查询 · 请求/响应详情')}
            >
              {balance?.status === 'success' && balance.data && (
                <div className="mac-balance-section">
                  {balance.data.balance != null && (
                    <div className="mac-balance-main">
                      <span className="mac-balance-label">
                        剩余额度{balance.data.currency ? ` (${balance.data.currency})` : ''}
                      </span>
                      <span className="mac-balance-value">
                        {formatBalance(balance.data.balance)}
                      </span>
                    </div>
                  )}
                  {(balance.data.used != null || balance.data.total != null) && (
                    <div className="mac-balance-detail">
                      {balance.data.used != null && (
                        <span>已用: {formatBalance(balance.data.used)}</span>
                      )}
                      {balance.data.total != null && (
                        <span>总计: {formatBalance(balance.data.total)}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              {balance?.status === 'error' && (
                <p className="mac-error-detail">{balance.error}</p>
              )}
              {currentProvider && !currentProvider.hasBalance && !balance && (
                <div className="mac-balance-unsupported">
                  <AlertTriangle size={14} />
                  <span>该提供商不支持余额查询</span>
                </div>
              )}
            </CheckCard>
          </div>

          {/* ========== 对话测试 ========== */}
          <div className="mac-chat-section">
            <div className="mac-chat-header">
              <span className="mac-chat-title">
                <MessageSquare size={16} />
                对话测试
              </span>
              <div className="mac-chat-controls">
                <div className="mac-chat-dropdown" ref={chatDropdownRef}>
                  <button
                    className="mac-chat-dropdown-trigger"
                    onClick={() => setChatDropdownOpen(!chatDropdownOpen)}
                    disabled={!chatAvailable}
                    type="button"
                  >
                    <span className={`mac-chat-dropdown-label ${!chatModel ? 'mac-chat-dropdown-placeholder' : ''}`}>
                      {chatModel || '选择模型...'}
                    </span>
                    <ChevronDown size={15} className={`mac-chat-dropdown-chevron ${chatDropdownOpen ? 'mac-chat-dropdown-chevron-open' : ''}`} />
                  </button>
                  {chatDropdownOpen && (
                    <div className="mac-chat-dropdown-panel">
                      <div className="mac-chat-dropdown-search">
                        <SearchIcon size={13} />
                        <input
                          type="text"
                          placeholder="搜索模型..."
                          value={chatDropdownSearch}
                          onChange={(e) => setChatDropdownSearch(e.target.value)}
                          autoFocus
                          spellCheck={false}
                        />
                      </div>
                      <div className="mac-chat-dropdown-list">
                        {filteredChatGroups.length === 0 ? (
                          <div className="mac-empty">未找到匹配的模型</div>
                        ) : (
                          filteredChatGroups.map((group) => {
                            const isExpanded = expandedChatGroups.has(group.owner)
                            return (
                              <div key={group.owner} className="mac-chat-dropdown-group">
                                <div
                                  className="mac-chat-dropdown-group-header"
                                  onClick={() => toggleChatGroup(group.owner)}
                                >
                                  {isExpanded
                                    ? <ChevronDown size={12} />
                                    : <ChevronRight size={12} />}
                                  <VendorIcon owner={group.owner} size={14} />
                                  <span className="mac-chat-dropdown-group-name">{group.owner}</span>
                                  <span className="mac-chat-dropdown-group-count">{group.models.length}</span>
                                </div>
                                {isExpanded && group.models.map((m) => (
                                  <div
                                    key={m.id}
                                    className={`mac-chat-dropdown-item ${chatModel === m.id ? 'mac-chat-dropdown-item-active' : ''}`}
                                    onClick={() => handleSetChatModel(m.id)}
                                  >
                                    <span className="mac-chat-dropdown-item-id">{m.id}</span>
                                    {chatModel === m.id && <Check size={13} className="mac-chat-dropdown-item-check" />}
                                  </div>
                                ))}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {chatMessages.length > 0 && (
                  <button className="button ghost compact" onClick={handleClearChat} title="清空对话">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {!chatAvailable && (
              <div className="mac-chat-disabled">
                <AlertTriangle size={14} />
                <span>请先完成连通性检测和模型列表查询后再进行对话测试</span>
              </div>
            )}

            <div className="mac-chat-messages" ref={chatScrollRef}>
              {chatMessages.length === 0 ? (
                <div className="mac-chat-empty">
                  <MessageSquare size={32} />
                  <p>选择模型后发送消息开始对话</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className={`mac-chat-msg mac-chat-msg-${msg.role} ${msg.error ? 'mac-chat-msg-err' : ''}`}>
                    <div className="mac-chat-msg-role">
                      {msg.role === 'user' ? '我' : 'AI'}
                      {msg.latency != null && (
                        <span className="mac-chat-msg-meta">{msg.latency}ms</span>
                      )}
                      {msg.usage?.totalTokens != null && (
                        <span className="mac-chat-msg-meta">{msg.usage.totalTokens} tokens</span>
                      )}
                    </div>
                    <div className="mac-chat-msg-content">{msg.content}</div>
                    {msg.log && (
                      <button
                        className="mac-chat-msg-log-btn"
                        onClick={() => openDetail(msg.log, '对话 · 请求/响应详情')}
                        title="查看请求/响应详情"
                      >
                        <FileJson size={12} />
                        请求/响应
                      </button>
                    )}
                  </div>
                ))
              )}
              {chatSending && (
                <div className="mac-chat-msg mac-chat-msg-assistant mac-chat-msg-loading">
                  <div className="mac-chat-msg-role">AI</div>
                  <div className="mac-chat-msg-content">
                    <Loader2 size={16} className="mac-spin" /> 正在思考...
                  </div>
                </div>
              )}
            </div>

            <div className="mac-chat-input-area">
              <textarea
                className="mac-chat-input"
                placeholder={chatAvailable ? '输入消息... (Ctrl+Enter 发送)' : '请先完成检测'}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    handleSendChat()
                  }
                }}
                rows={2}
                disabled={!chatAvailable}
                spellCheck={false}
              />
              <button
                className="button primary"
                onClick={handleSendChat}
                disabled={!canChat || !chatInput.trim()}
              >
                {chatSending ? <Loader2 size={15} className="mac-spin" /> : <Send size={15} />}
                发送
              </button>
            </div>
          </div>
        </div>
      </WorkspaceBody>

      {/* ========== 请求/响应详情弹窗 ========== */}
      {detailLog && (
        <RequestDetailModal
          log={detailLog}
          title={detailTitle}
          onClose={() => setDetailLog(null)}
        />
      )}
    </ToolPageLayout>
  )
}

// ============================================================
// 检测结果卡片
// ============================================================
function CheckCard({
  title,
  icon,
  result,
  checking,
  onViewLog,
  children,
}: {
  title: string
  icon: React.ReactNode
  result: { status: string; log?: RequestResponseLog } | null
  checking: boolean
  onViewLog: (log: RequestResponseLog) => void
  children?: React.ReactNode
}) {
  const statusClass = result
    ? result.status === 'success'
      ? 'mac-card-success'
      : result.status === 'error'
        ? 'mac-card-error'
        : ''
    : ''

  return (
    <div className={`mac-result-card ${statusClass}`}>
      <div className="mac-result-card-header">
        <span className="mac-result-card-title">
          {icon}
          {title}
        </span>
        <div className="mac-result-card-actions">
          {result?.log && !checking && (
            <button
              className="mac-log-btn"
              onClick={() => onViewLog(result.log!)}
              title="查看请求/响应详情"
            >
              <FileJson size={13} />
              请求/响应
            </button>
          )}
          {checking && <Loader2 size={14} className="mac-spin" />}
          {!checking && result?.status === 'success' && (
            <CheckCircle2 size={14} className="mac-icon-success" />
          )}
          {!checking && result?.status === 'error' && (
            <XCircle size={14} className="mac-icon-error" />
          )}
        </div>
      </div>
      <div className="mac-result-card-body">
        {checking && !result ? <div className="mac-skeleton" /> : children}
      </div>
    </div>
  )
}

// ============================================================
// 请求/响应详情弹窗
// ============================================================
function RequestDetailModal({
  log,
  title,
  onClose,
}: {
  log: RequestResponseLog
  title: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const text = formatLogAsText(log)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard 不可用 */
    }
  }, [log])

  // 点击遮罩关闭
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  return (
    <div className="mac-modal-overlay" onClick={handleOverlayClick}>
      <div className="mac-modal">
        <div className="mac-modal-header">
          <span className="mac-modal-title">
            <FileJson size={16} />
            {title}
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
          {/* 请求部分 */}
          <div className="mac-modal-section">
            <div className="mac-modal-section-title">请求</div>
            <div className="mac-modal-kv">
              <span className="mac-modal-k">Method</span>
              <span className="mac-modal-v mac-modal-v-mono">{log.request.method}</span>
            </div>
            <div className="mac-modal-kv">
              <span className="mac-modal-k">URL</span>
              <span className="mac-modal-v mac-modal-v-mono mac-modal-v-break">{log.request.url}</span>
            </div>
            {Object.entries(log.request.headers).length > 0 && (
              <>
                <div className="mac-modal-kv">
                  <span className="mac-modal-k">Headers</span>
                </div>
                <pre className="mac-modal-pre">
                  {Object.entries(log.request.headers)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join('\n')}
                </pre>
              </>
            )}
            {log.request.body && (
              <>
                <div className="mac-modal-kv">
                  <span className="mac-modal-k">Body</span>
                </div>
                <pre className="mac-modal-pre">{formatJson(log.request.body)}</pre>
              </>
            )}
          </div>

          {/* 响应部分 */}
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
                {Object.entries(log.response.headers).length > 0 && (
                  <>
                    <div className="mac-modal-kv">
                      <span className="mac-modal-k">Headers</span>
                    </div>
                    <pre className="mac-modal-pre">
                      {Object.entries(log.response.headers)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join('\n')}
                    </pre>
                  </>
                )}
                <div className="mac-modal-kv">
                  <span className="mac-modal-k">Body</span>
                </div>
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

// ============================================================
// 辅助函数
// ============================================================

function formatBalance(val: number): string {
  if (val >= 10000) return val.toFixed(0)
  if (val >= 100) return val.toFixed(2)
  return val.toFixed(4)
}

/** 格式化 JSON 字符串 */
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

/** 将日志格式化为纯文本（用于复制） */
function formatLogAsText(log: RequestResponseLog): string {
  const lines: string[] = []
  lines.push('=== 请求 ===')
  lines.push(`Method: ${log.request.method}`)
  lines.push(`URL: ${log.request.url}`)
  lines.push('Headers:')
  for (const [k, v] of Object.entries(log.request.headers)) {
    lines.push(`  ${k}: ${v}`)
  }
  if (log.request.body) {
    lines.push('Body:')
    lines.push(formatJson(log.request.body))
  }
  lines.push('')
  lines.push('=== 响应 ===')
  if (log.response) {
    lines.push(`Status: ${log.response.status} ${log.response.statusText}`)
    lines.push('Headers:')
    for (const [k, v] of Object.entries(log.response.headers)) {
      lines.push(`  ${k}: ${v}`)
    }
    lines.push('Body:')
    lines.push(formatJson(log.response.body))
  } else {
    lines.push(`错误: ${log.error || '无响应'}`)
  }
  return lines.join('\n')
}
