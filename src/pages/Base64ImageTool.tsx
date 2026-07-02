import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'
import { Upload, Copy, Check, Download, Trash2, Image, FileImage } from 'lucide-react'

// ============================================================
// 两种模式
// ============================================================
type TabMode = 'toBase64' | 'toImage'

// ============================================================
// 组件
// ============================================================
export default function Base64ImageTool() {
  const [tab, setTab] = useState<TabMode>('toBase64')

  // ===== 图片 → Base64 =====
  const [dragOver, setDragOver] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [fileMeta, setFileMeta] = useState({ name: '', size: '', width: 0, height: 0, mime: '' })
  const [base64Full, setBase64Full] = useState('')
  const [base64Raw, setBase64Raw] = useState('')
  const [withPrefix, setWithPrefix] = useState(true)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ===== Base64 → 图片 =====
  const [b64Input, setB64Input] = useState('')
  const [decodedUrl, setDecodedUrl] = useState('')
  const [decodeError, setDecodeError] = useState('')
  const [decodedSize, setDecodedSize] = useState({ width: 0, height: 0 })
  const [decodedMime, setDecodedMime] = useState('')

  // ---- 处理文件 → Base64 ----
  const processFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setBase64Full(result)
      setPreviewUrl(result)

      const raw = result.split(',')[1] || ''
      setBase64Raw(raw)

      const sizeBytes = file.size
      const sizeStr = sizeBytes >= 1024 * 1024
        ? `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`
        : sizeBytes >= 1024
          ? `${(sizeBytes / 1024).toFixed(1)} KB`
          : `${sizeBytes} B`

      setFileMeta({
        name: file.name,
        size: sizeStr,
        width: 0,
        height: 0,
        mime: file.type || '未知',
      })

      const img = new window.Image()
      img.onload = () => {
        setFileMeta((prev) => ({
          ...prev,
          width: img.naturalWidth,
          height: img.naturalHeight,
        }))
        URL.revokeObjectURL(img.src)
      }
      img.src = URL.createObjectURL(file)
    }
    reader.readAsDataURL(file)
  }, [])

  // ---- 拖拽 ----
  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); setDragOver(false) }
  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      processFile(file)
    }
  }

  // ---- 文件选择 ----
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  // ---- 复制 ----
  const handleCopy = async () => {
    const text = withPrefix ? base64Full : base64Raw
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ---- 清除 ----
  const handleClear = () => {
    setPreviewUrl('')
    setBase64Full('')
    setBase64Raw('')
    setFileMeta({ name: '', size: '', width: 0, height: 0, mime: '' })
    setCopied(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ---- 解码 Base64 → 图片 ----
  const handleDecode = useCallback(() => {
    setDecodeError('')
    setDecodedUrl('')

    let input = b64Input.trim()
    if (!input) {
      setDecodeError('请输入 Base64 字符串')
      return
    }

    let mimeType = 'image/png'
    let rawBase64 = input

    const dataUriMatch = input.match(/^data:(image\/[\w+-]+);base64,(.+)$/i)
    if (dataUriMatch) {
      mimeType = dataUriMatch[1].toLowerCase()
      rawBase64 = dataUriMatch[2]
    }

    if (!/^[A-Za-z0-9+/=]+$/.test(rawBase64)) {
      setDecodeError('无效的 Base64 字符串，请检查输入（仅允许 A-Z、a-z、0-9、+、/、= 字符）')
      return
    }

    // 补齐 padding
    while (rawBase64.length % 4 !== 0) rawBase64 += '='

    const uri = dataUriMatch ? input : `data:${mimeType};base64,${rawBase64}`

    const img = new window.Image()
    img.onload = () => {
      setDecodedUrl(uri)
      setDecodedSize({ width: img.naturalWidth, height: img.naturalHeight })
      setDecodedMime(mimeType)
    }
    img.onerror = () => {
      setDecodeError('无法将 Base64 解码为有效图片，请检查输入是否正确')
    }
    img.src = uri
  }, [b64Input])

  // ---- 下载 ----
  const handleDownload = () => {
    if (!decodedUrl) return
    const ext = decodedMime.split('/')[1] || 'png'
    const a = document.createElement('a')
    a.href = decodedUrl
    a.download = `decoded.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // ========================================================
  // 渲染
  // ========================================================
  return (
    <ToolPageLayout toolId="base64-image">
      <WorkspaceHeader title="Base64 图片转换">
        <div className="b64i-tabs">
          <button
            className={`b64i-tab ${tab === 'toBase64' ? 'b64i-tab--active' : ''}`}
            onClick={() => setTab('toBase64')}
          >
            <Image size={16} />
            图片 → Base64
          </button>
          <button
            className={`b64i-tab ${tab === 'toImage' ? 'b64i-tab--active' : ''}`}
            onClick={() => setTab('toImage')}
          >
            <FileImage size={16} />
            Base64 → 图片
          </button>
        </div>
      </WorkspaceHeader>

      <WorkspaceBody>
        {/* ======== Tab 1：图片 → Base64 ======== */}
        {tab === 'toBase64' && (
          <div className="b64i-panel">
            {/* 上传区 */}
            <div
              className={`b64i-drop ${dragOver ? 'b64i-drop--over' : ''} ${previewUrl ? 'b64i-drop--has' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !previewUrl && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                hidden
              />

              {previewUrl ? (
                <div className="b64i-preview">
                  <img src={previewUrl} alt="preview" className="b64i-preview-img" />
                  <div className="b64i-preview-actions">
                    <button
                      className="button secondary small"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                    >
                      更换图片
                    </button>
                    <button
                      className="button secondary small"
                      onClick={(e) => { e.stopPropagation(); handleClear() }}
                    >
                      <Trash2 size={14} /> 清除
                    </button>
                  </div>
                </div>
              ) : (
                <div className="b64i-drop-empty">
                  <Upload size={44} strokeWidth={1.5} />
                  <p className="b64i-drop-title">拖拽图片到此处，或点击上传</p>
                  <p className="b64i-drop-hint">支持 JPG / PNG / WebP / GIF / SVG / BMP / ICO 等格式</p>
                </div>
              )}
            </div>

            {/* 文件信息 */}
            {fileMeta.name && (
              <div className="b64i-meta">
                <span><strong>文件：</strong>{fileMeta.name}</span>
                <span><strong>大小：</strong>{fileMeta.size}</span>
                <span><strong>尺寸：</strong>{fileMeta.width} × {fileMeta.height}</span>
                <span><strong>类型：</strong>{fileMeta.mime}</span>
              </div>
            )}

            {/* Base64 输出 */}
            {base64Full && (
              <div className="b64i-output">
                <div className="b64i-output-top">
                  <span className="b64i-output-label">Base64 编码结果</span>
                  <label className="b64i-toggle">
                    <input
                      type="checkbox"
                      checked={withPrefix}
                      onChange={(e) => setWithPrefix(e.target.checked)}
                    />
                    <span>带 data: 前缀</span>
                  </label>
                  <button
                    className={`button small ${copied ? 'button--copied' : 'primary'}`}
                    onClick={handleCopy}
                  >
                    {copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}
                  </button>
                </div>
                <textarea
                  className="b64i-textarea"
                  readOnly
                  value={withPrefix ? base64Full : base64Raw}
                  rows={8}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
                <p className="b64i-count">
                  共 {(withPrefix ? base64Full : base64Raw).length.toLocaleString()} 个字符
                  {base64Raw && (
                    <span>（原始 Base64 约 {Math.ceil(base64Raw.length * 0.75 / 1024)} KB）</span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ======== Tab 2：Base64 → 图片 ======== */}
        {tab === 'toImage' && (
          <div className="b64i-panel">
            {/* 输入区 */}
            <div className="b64i-input">
              <label className="b64i-input-label">粘贴 Base64 编码字符串</label>
              <textarea
                className="b64i-textarea"
                placeholder={`粘贴 Base64 字符串到此处...\n支持纯 Base64 或 data:image/xxx;base64,... 格式`}
                value={b64Input}
                onChange={(e) => { setB64Input(e.target.value); setDecodeError('') }}
                rows={6}
              />
              <div className="b64i-input-bottom">
                <button className="button primary" onClick={handleDecode} disabled={!b64Input.trim()}>
                  解码为图片
                </button>
                {b64Input && (
                  <button
                    className="button secondary"
                    onClick={() => { setB64Input(''); setDecodedUrl(''); setDecodeError(''); setDecodedSize({ width: 0, height: 0 }) }}
                  >
                    清空
                  </button>
                )}
              </div>
              {decodeError && <p className="b64i-error">{decodeError}</p>}
            </div>

            {/* 结果预览 */}
            {decodedUrl && (
              <div className="b64i-result">
                <div className="b64i-output-top">
                  <span className="b64i-output-label">解码结果</span>
                  <span className="b64i-result-meta">
                    {decodedSize.width} × {decodedSize.height}
                    <span className="b64i-result-mime">{decodedMime}</span>
                  </span>
                  <button className="button small primary" onClick={handleDownload}>
                    <Download size={14} /> 下载图片
                  </button>
                </div>
                <div className="b64i-result-img-wrap">
                  <img src={decodedUrl} alt="decoded" className="b64i-result-img" />
                </div>
              </div>
            )}
          </div>
        )}
      </WorkspaceBody>
    </ToolPageLayout>
  )
}
