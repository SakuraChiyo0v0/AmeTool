import { useState, useCallback } from 'react'
import { Download, Copy, Check, Search, ExternalLink } from 'lucide-react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'

const AVATAR_SIZES = [
  { label: '40 × 40', value: 40 },
  { label: '100 × 100', value: 100 },
  { label: '140 × 140', value: 140 },
  { label: '640 × 640', value: 640 },
]

export default function QqAvatarTool() {
  const [qqInput, setQqInput] = useState('')
  const [submittedQq, setSubmittedQq] = useState('')
  const [spec, setSpec] = useState(100)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const avatarUrl = submittedQq
    ? `https://q2.qlogo.cn/headimg_dl?dst_uin=${submittedQq}&spec=${spec}`
    : ''

  const handleFetch = useCallback(() => {
    const num = qqInput.trim()
    if (!num) {
      setError('请输入QQ号')
      return
    }
    if (!/^\d{4,12}$/.test(num)) {
      setError('QQ号格式不正确，请输入 4-12 位纯数字')
      return
    }
    setError('')
    setImgLoaded(false)
    setImgError(false)
    setSubmittedQq(num)
  }, [qqInput])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleFetch()
      }
    },
    [handleFetch],
  )

  const handleDownload = useCallback(async () => {
    if (!avatarUrl) return
    setDownloading(true)
    try {
      const response = await fetch(avatarUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `qq-avatar-${submittedQq}-${spec}.jpg`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      // CORS 降级：在新标签页打开
      window.open(avatarUrl, '_blank')
    } finally {
      setDownloading(false)
    }
  }, [avatarUrl, submittedQq, spec])

  const handleCopyUrl = useCallback(async () => {
    if (!avatarUrl) return
    try {
      await navigator.clipboard.writeText(avatarUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard 不可用时静默失败 */
    }
  }, [avatarUrl])

  const handleSizeChange = useCallback((value: number) => {
    setSpec(value)
    setImgLoaded(false)
    setImgError(false)
  }, [])

  return (
    <ToolPageLayout toolId="qq-avatar">
      <WorkspaceHeader title={error || 'QQ头像获取'}>
        <div className="qq-avatar-actions">
          <button
            className="button secondary compact"
            onClick={handleDownload}
            disabled={!avatarUrl || imgError}
          >
            <Download size={14} /> 下载
          </button>
          <button
            className="button ghost compact"
            onClick={handleCopyUrl}
            disabled={!avatarUrl}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '已复制' : '复制链接'}
          </button>
        </div>
      </WorkspaceHeader>
      <WorkspaceBody>
        <div className="qq-avatar-tool">
          <div className="qq-avatar-input-section">
            <div className="section-header">
              <span className="section-title">输入QQ号</span>
            </div>
            <div className="qq-avatar-input-row">
              <input
                type="text"
                className="qq-avatar-input"
                placeholder="请输入QQ号"
                value={qqInput}
                onChange={(e) => setQqInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={handleKeyDown}
                maxLength={12}
                spellCheck={false}
                inputMode="numeric"
              />
              <button className="button primary" onClick={handleFetch} disabled={!qqInput.trim()}>
                <Search size={16} /> 获取头像
              </button>
            </div>
            <div className="qq-avatar-hint">
              <span>仅支持纯数字QQ号，4-12位</span>
            </div>
          </div>

          <div className="qq-avatar-controls">
            <div className="qq-avatar-size-control">
              <label>头像尺寸</label>
              <div className="qq-avatar-size-options">
                {AVATAR_SIZES.map((s) => (
                  <button
                    key={s.value}
                    className={`qq-avatar-size-chip ${spec === s.value ? 'active' : ''}`}
                    onClick={() => handleSizeChange(s.value)}
                    disabled={!submittedQq}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="qq-avatar-output-section">
            <div className="section-header">
              <span className="section-title">预览</span>
              {avatarUrl && !imgError && (
                <a
                  href={avatarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="qq-avatar-open-link"
                >
                  <ExternalLink size={12} /> 新标签打开
                </a>
              )}
            </div>
            {error ? (
              <div className="qq-avatar-error">{error}</div>
            ) : (
              <div className="qq-avatar-preview">
                {avatarUrl && !imgError ? (
                  <>
                    <img
                      src={avatarUrl}
                      alt={`QQ ${submittedQq} 头像`}
                      className="qq-avatar-img"
                      onLoad={() => setImgLoaded(true)}
                      onError={() => {
                        setImgError(true)
                        setImgLoaded(false)
                      }}
                      style={{ opacity: imgLoaded ? 1 : 0.3 }}
                    />
                    {!imgLoaded && (
                      <div className="qq-avatar-loading">
                        <div className="qq-avatar-spinner" />
                        <span>加载中...</span>
                      </div>
                    )}
                  </>
                ) : imgError ? (
                  <div className="qq-avatar-placeholder">
                    <p>头像加载失败</p>
                    <small>该QQ号可能不存在或未设置头像</small>
                  </div>
                ) : (
                  <div className="qq-avatar-placeholder">
                    <p>输入QQ号后获取头像</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {avatarUrl && !imgError && imgLoaded && (
            <div className="qq-avatar-url-box">
              <span className="qq-avatar-url-label">图片直链</span>
              <code className="qq-avatar-url">{avatarUrl}</code>
            </div>
          )}
        </div>
      </WorkspaceBody>
    </ToolPageLayout>
  )
}
