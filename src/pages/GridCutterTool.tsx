import { useRef, useState, useCallback, useEffect } from 'react'
import { Download, Trash2, Upload, Image } from 'lucide-react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceSplit } from '../components/ToolPageLayout'

type GridSize = 2 | 3 | 4 | 5

interface Cell {
  x: number
  y: number
  w: number
  h: number
  index: number
}

function calcCells(
  n: GridSize,
  naturalW: number,
  naturalH: number,
  displayW: number,
  displayH: number,
): Cell[] {
  const cells: Cell[] = []
  const scaleX = displayW / naturalW
  const scaleY = displayH / naturalH

  const baseW = Math.floor(naturalW / n)
  const baseH = Math.floor(naturalH / n)
  const remW = naturalW % n
  const remH = naturalH % n

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      // x position: sum of previous cols, first `remW` cols get +1 extra
      const srcX = col * baseW + Math.min(col, remW)
      const srcY = row * baseH + Math.min(row, remH)
      const srcW = baseW + (col < remW ? 1 : 0)
      const srcH = baseH + (row < remH ? 1 : 0)

      cells.push({
        x: Math.round(srcX * scaleX),
        y: Math.round(srcY * scaleY),
        w: Math.round(srcW * scaleX),
        h: Math.round(srcH * scaleY),
        index: row * n + col + 1,
      })
    }
  }
  return cells
}

const GRID_OPTIONS: { value: GridSize; label: string }[] = [
  { value: 2, label: '2×2' },
  { value: 3, label: '3×3' },
  { value: 4, label: '4×4' },
  { value: 5, label: '5×5' },
]

export default function GridCutterTool() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [gridSize, setGridSize] = useState<GridSize>(3)
  const [cells, setCells] = useState<Cell[]>([])
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 })
  const [isExporting, setIsExporting] = useState(false)

  const MAX_DISPLAY = 700

  const handleFile = useCallback(
    (file: File, gs: GridSize) => {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new window.Image()
        img.onload = () => {
          setImage(img)

          const nw = img.naturalWidth
          const nh = img.naturalHeight
          let dw = nw, dh = nh
          if (nw > MAX_DISPLAY || nh > MAX_DISPLAY) {
            const ratio = Math.min(MAX_DISPLAY / nw, MAX_DISPLAY / nh)
            dw = Math.round(nw * ratio)
            dh = Math.round(nh * ratio)
          }
          setDisplaySize({ w: dw, h: dh })
          setCells(calcCells(gs, nw, nh, dw, dh))
        }
        img.src = reader.result as string
      }
      reader.readAsDataURL(file)
    },
    [],
  )

  // Recalc cells when gridSize changes
  useEffect(() => {
    if (!image) return
    const nw = image.naturalWidth
    const nh = image.naturalHeight
    let dw = nw, dh = nh
    if (nw > MAX_DISPLAY || nh > MAX_DISPLAY) {
      const ratio = Math.min(MAX_DISPLAY / nw, MAX_DISPLAY / nh)
      dw = Math.round(nw * ratio)
      dh = Math.round(nh * ratio)
    }
    setCells(calcCells(gridSize, nw, nh, dw, dh))
  }, [gridSize, image])

  const handleGridSizeChange = (gs: GridSize) => {
    setGridSize(gs)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFile(file, gridSize)
  }

  const handleClear = () => {
    setImage(null)
    setCells([])
    setDisplaySize({ w: 0, h: 0 })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Draw preview overlay
  useEffect(() => {
    if (!image || cells.length === 0 || !previewCanvasRef.current) return
    const canvas = previewCanvasRef.current
    canvas.width = displaySize.w
    canvas.height = displaySize.h
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    const fontSize = Math.max(10, Math.min(18, canvas.width / (gridSize * 12)))
    ctx.font = `bold ${fontSize}px 'Manrope', 'PingFang SC', sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (const cell of cells) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(cell.x + 0.5, cell.y + 0.5, cell.w - 1, cell.h - 1)

      const badgeR = Math.max(8, fontSize * 0.6)
      const bx = cell.x + cell.w / 2
      const by = cell.y + cell.h / 2

      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
      ctx.beginPath()
      ctx.arc(bx, by, badgeR + 2, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.fillText(`${cell.index}`, bx, by)
    }
  }, [image, cells, displaySize, gridSize])

  // Download single
  const handleDownloadSingle = (index: number) => {
    if (!image) return
    const cell = cells[index]
    const scaleX = image.naturalWidth / displaySize.w
    const scaleY = image.naturalHeight / displaySize.h

    const offCanvas = document.createElement('canvas')
    offCanvas.width = Math.round(cell.w * scaleX)
    offCanvas.height = Math.round(cell.h * scaleY)
    const ctx = offCanvas.getContext('2d')!
    ctx.drawImage(
      image,
      cell.x * scaleX, cell.y * scaleY,
      cell.w * scaleX, cell.h * scaleY,
      0, 0, offCanvas.width, offCanvas.height,
    )

    offCanvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `grid_${gridSize}x${gridSize}_${String(index + 1).padStart(2, '0')}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  // Download all ZIP
  const handleDownloadAll = async () => {
    if (!image || cells.length === 0) return
    setIsExporting(true)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const scaleX = image.naturalWidth / displaySize.w
      const scaleY = image.naturalHeight / displaySize.h

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i]
        const offCanvas = document.createElement('canvas')
        offCanvas.width = Math.round(cell.w * scaleX)
        offCanvas.height = Math.round(cell.h * scaleY)
        const ctx = offCanvas.getContext('2d')!
        ctx.drawImage(
          image,
          cell.x * scaleX, cell.y * scaleY,
          cell.w * scaleX, cell.h * scaleY,
          0, 0, offCanvas.width, offCanvas.height,
        )
        const blob = await new Promise<Blob>((resolve) => offCanvas.toBlob((b) => resolve(b!), 'image/png'))
        zip.file(`grid_${String(i + 1).padStart(2, '0')}.png`, blob)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `grid_${gridSize}x${gridSize}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('ZIP 导出失败，请重试。')
    } finally {
      setIsExporting(false)
    }
  }

  const cellPerSide = Math.ceil(image ? image.naturalWidth / gridSize : 0)
  const cellPerSideH = Math.ceil(image ? image.naturalHeight / gridSize : 0)
  const totalCells = gridSize * gridSize

  return (
    <ToolPageLayout toolId="grid-cutter">
      <WorkspaceHeader title={image ? `${gridSize}×${gridSize} 切图预览` : '未选择文件'}>
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
            onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click() }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file, gridSize) }}
            />
            <Upload size={40} style={{ color: 'var(--muted)' }} />
            <p>点击或拖拽图片到此处上传</p>
            <small>支持 JPG、PNG、WebP 等格式，选择网格模式后自动切分</small>
          </div>
        </div>
      ) : (
        <WorkspaceSplit
          leftWidth="55%"
          left={
            <div className="grid-cutter-preview">
              <div className="grid-cutter-mode-row">
                {GRID_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`grid-cutter-mode-chip ${gridSize === opt.value ? 'active' : ''}`}
                    onClick={() => handleGridSizeChange(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="grid-cutter-canvas-wrap">
                <canvas ref={previewCanvasRef} className="grid-cutter-canvas" />
              </div>
              <div className="info-row">
                <span>原始尺寸</span>
                <b>{image.naturalWidth} × {image.naturalHeight}</b>
              </div>
              <div className="info-row">
                <span>切分方式</span>
                <b>{gridSize} 列 × {gridSize} 行 = {totalCells} 张</b>
              </div>
              <div className="info-row">
                <span>每格约</span>
                <b>{cellPerSide} × {cellPerSideH} px</b>
              </div>
            </div>
          }
          right={
            <div className="grid-cutter-controls">
              <div className="grid-cutter-section">
                <h4 className="splitter-section-title">
                  <Image size={15} /> 单张下载
                </h4>
                <div
                  className="grid-cutter-list"
                  style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
                >
                  {cells.map((_, i) => (
                    <button
                      key={i}
                      className="grid-cutter-cell-btn"
                      onClick={() => handleDownloadSingle(i)}
                    >
                      <Image size={14} />
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid-cutter-section">
                <h4 className="splitter-section-title">
                  <Download size={15} /> 批量导出
                </h4>
                <button
                  className="button primary full"
                  onClick={handleDownloadAll}
                  disabled={isExporting}
                >
                  <Download size={17} />
                  {isExporting ? '正在打包...' : `ZIP 打包下载全部 ${totalCells} 张`}
                </button>
              </div>
            </div>
          }
        />
      )}
    </ToolPageLayout>
  )
}
