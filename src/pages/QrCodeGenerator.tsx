import { useState, useCallback, useEffect, useRef } from 'react'
import { Download, RefreshCw, Trash2 } from 'lucide-react'
import QRCode from 'qrcode'
import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'

export default function QrCodeGenerator() {
  const [input, setInput] = useState('')
  const [size, setSize] = useState(200)
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleGenerate = useCallback(async () => {
    if (!input.trim()) {
      setError('请输入要生成二维码的内容')
      return
    }

    setError('')

    if (canvasRef.current) {
      try {
        await QRCode.toCanvas(canvasRef.current, input.trim(), {
          width: size,
          margin: 4,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        })
      } catch (e) {
        setError('生成二维码失败，请重试')
      }
    }
  }, [input, size])

  const handleDownload = useCallback(() => {
    if (!canvasRef.current || !input.trim()) return

    const link = document.createElement('a')
    link.download = `qrcode-${Date.now()}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }, [input])

  const handleClear = useCallback(() => {
    setInput('')
    setError('')
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
  }, [])

  useEffect(() => {
    if (input.trim() && !error) {
      handleGenerate()
    }
  }, [size])

  return (
    <ToolPageLayout toolId="qrcode">
      <WorkspaceHeader title={error || '二维码生成'}>
        <div className="qrcode-actions">
          <button className="button ghost compact" onClick={handleClear}>
            <Trash2 size={14} /> 清空
          </button>
        </div>
      </WorkspaceHeader>
      <WorkspaceBody>
        <div className="qrcode-tool">
          <div className="qrcode-input-section">
            <div className="section-header">
              <span className="section-title">输入内容</span>
            </div>
            <textarea
              className="qrcode-textarea"
              placeholder="输入文字或链接..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
            />
            <div className="qrcode-hint">
              <span className="char-count">{input.length} 字符</span>
              <span>支持文本、链接等内容</span>
            </div>
          </div>

          <div className="qrcode-controls">
            <div className="size-control">
              <label>二维码尺寸</label>
              <div className="size-slider-row">
                <input
                  type="range"
                  min={100}
                  max={400}
                  step={20}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="size-slider"
                />
                <span className="size-value">{size}px</span>
              </div>
            </div>
            <div className="action-buttons">
              <button className="button primary" onClick={handleGenerate} disabled={!input.trim()}>
                <RefreshCw size={16} /> 生成二维码
              </button>
              <button className="button secondary" onClick={handleDownload} disabled={!input.trim()}>
                <Download size={16} /> 下载
              </button>
            </div>
          </div>

          <div className="qrcode-output-section">
            <div className="section-header">
              <span className="section-title">预览</span>
            </div>
            {error ? (
              <div className="qrcode-error">{error}</div>
            ) : (
              <div className="qrcode-preview">
                <canvas ref={canvasRef} className="qrcode-canvas" />
                {!input.trim() && (
                  <div className="qrcode-placeholder">
                    <p>输入内容后生成二维码</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </WorkspaceBody>
    </ToolPageLayout>
  )
}