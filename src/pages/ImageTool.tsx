import { useRef, useState, useCallback } from 'react'
import { Download, Trash2, Upload } from 'lucide-react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceSplit } from '../components/ToolPageLayout'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function ImageTool() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [fileName, setFileName] = useState('')
  const [originalSize, setOriginalSize] = useState(0)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [quality, setQuality] = useState(80)
  const [scale, setScale] = useState(100)
  const [outputSize, setOutputSize] = useState(0)

  const processImage = useCallback(
    (img: HTMLImageElement | null, q: number, s: number) => {
      if (!img || !canvasRef.current) return
      const canvas = canvasRef.current
      const w = Math.round((img.naturalWidth * s) / 100)
      const h = Math.round((img.naturalHeight * s) / 100)
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          if (blob) setOutputSize(blob.size)
        },
        'image/jpeg',
        q / 100,
      )
    },
    [],
  )

  const handleFile = (file: File) => {
    setFileName(file.name)
    setOriginalSize(file.size)
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        setImage(img)
        setWidth(img.naturalWidth)
        setHeight(img.naturalHeight)
        setScale(100)
        processImage(img, quality, 100)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  const handleQualityChange = (q: number) => {
    setQuality(q)
    processImage(image, q, scale)
  }

  const handleScaleChange = (s: number) => {
    setScale(s)
    setWidth(Math.round((image!.naturalWidth * s) / 100))
    setHeight(Math.round((image!.naturalHeight * s) / 100))
    processImage(image, quality, s)
  }

  const handleDownload = () => {
    if (!canvasRef.current) return
    canvasRef.current.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const base = fileName.replace(/\.[^.]+$/, '')
      a.href = url
      a.download = `${base}_${width}x${height}.jpg`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/jpeg')
  }

  const handleClear = () => {
    setImage(null)
    setFileName('')
    setOriginalSize(0)
    setOutputSize(0)
    setWidth(0)
    setHeight(0)
    setQuality(80)
    setScale(100)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <ToolPageLayout toolId="image">
      <WorkspaceHeader title={image ? fileName : '未选择文件'}>
        {image && (
          <button className="button ghost compact" onClick={handleClear}>
            <Trash2 size={14} /> 清除
          </button>
        )}
      </WorkspaceHeader>
      {!image ? (
        <div className="tool-workspace-body">
          <div
            className="upload-zone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fileInputRef.current?.click()
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
            <Upload size={40} style={{ color: 'var(--muted)' }} />
            <p>点击或拖拽图片到此处上传</p>
            <small>支持 JPG、PNG、WebP、GIF、SVG 等格式</small>
          </div>
        </div>
      ) : (
        <WorkspaceSplit leftWidth="55%" left={
          <div className="preview-area">
            <img src={image.src} alt="预览" className="preview-image" />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div className="info-row">
              <span>原始尺寸</span>
              <b>{image.naturalWidth} × {image.naturalHeight}</b>
            </div>
            <div className="info-row">
              <span>原始大小</span>
              <b>{formatSize(originalSize)}</b>
            </div>
            <div className="info-row"><span>输出尺寸</span><b>{width} × {height}</b></div>
            <div className="info-row"><span>预估大小</span><b>{formatSize(outputSize)}</b></div>
          </div>
        } right={
          <div className="control-panel">
            <div className="controls">
              <div className="control-group">
                <label>缩放比例 <span>{scale}%</span></label>
                <input type="range" min={10} max={200} step={5} value={scale}
                  onChange={(e) => handleScaleChange(Number(e.target.value))} />
              </div>
              <div className="control-group">
                <label>输出宽度</label>
                <input type="number" value={width}
                  onChange={(e) => {
                    const w = Number(e.target.value)
                    if (w > 0 && image) handleScaleChange(Math.round((w / image.naturalWidth) * 100))
                  }} />
              </div>
              <div className="control-group">
                <label>压缩质量 <span>{quality}%</span></label>
                <input type="range" min={10} max={100} step={5} value={quality}
                  onChange={(e) => handleQualityChange(Number(e.target.value))} />
              </div>
              <div className="control-group">
                <label>输出高度</label>
                <input type="number" value={height}
                  onChange={(e) => {
                    const h = Number(e.target.value)
                    if (h > 0 && image) handleScaleChange(Math.round((h / image.naturalHeight) * 100))
                  }} />
              </div>
            </div>

            <div className="tool-actions">
              <button className="button primary" onClick={handleDownload}>
                <Download size={17} /> 下载处理后的图片
              </button>
            </div>
          </div>
        } />
      )}
    </ToolPageLayout>
  )
}
