import { useRef, useState, useCallback, useEffect } from 'react'
import { Download, Trash2, Upload, Scissors, Plus, X, RefreshCw, Image } from 'lucide-react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceSplit } from '../components/ToolPageLayout'

// ============================================================
// Types
// ============================================================
interface Rect {
  x: number
  y: number
  w: number
  h: number
  col: number
  row: number
}

interface CutLine {
  type: 'h' | 'v'
  pos: number
}

// ============================================================
// Color helpers
// ============================================================
function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0]
  const dg = a[1] - b[1]
  const db = a[2] - b[2]
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function getPixel(
  data: Uint8ClampedArray,
  w: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const i = (y * w + x) * 4
  return [data[i], data[i + 1], data[i + 2], data[i + 3]]
}

// ============================================================
// Detection algorithm
// ============================================================
function detectBackgroundColor(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  edgeSample = 3,
): [number, number, number] {
  const samples: [number, number, number][] = []
  const step = Math.max(1, Math.min(w, h) / 20) >> 0

  for (let x = 0; x < w; x += step) {
    for (let i = 0; i < edgeSample; i++) {
      samples.push(getPixel(data, w, x, i).slice(0, 3) as [number, number, number])
      samples.push(getPixel(data, w, x, h - 1 - i).slice(0, 3) as [number, number, number])
    }
  }
  for (let y = 0; y < h; y += step) {
    for (let i = 0; i < edgeSample; i++) {
      samples.push(getPixel(data, w, i, y).slice(0, 3) as [number, number, number])
      samples.push(getPixel(data, w, w - 1 - i, y).slice(0, 3) as [number, number, number])
    }
  }

  if (samples.length === 0) return [255, 255, 255]

  const avg = [0, 0, 0]
  for (const s of samples) {
    avg[0] += s[0]; avg[1] += s[1]; avg[2] += s[2]
  }
  avg[0] = Math.round(avg[0] / samples.length)
  avg[1] = Math.round(avg[1] / samples.length)
  avg[2] = Math.round(avg[2] / samples.length)
  return avg as [number, number, number]
}

function buildProjections(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  bg: [number, number, number],
  threshold: number,
): { rowProjection: number[]; colProjection: number[] } {
  const rowProj = new Array(h).fill(0)
  const colProj = new Array(w).fill(0)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = getPixel(data, w, x, y)
      if (a < 128) continue
      const dist = colorDistance([r, g, b], bg)
      if (dist > threshold) {
        rowProj[y]++
        colProj[x]++
      }
    }
  }
  return { rowProjection: rowProj, colProjection: colProj }
}

function findGaps(
  projection: number[],
  minBlankWidth: number,
  totalPixels: number,
  gapThreshold = 0.02,
): Array<{ start: number; end: number }> {
  const gaps: Array<{ start: number; end: number }> = []
  const len = projection.length
  let i = 0

  while (i < len) {
    // find a pixel column/row that is "mostly background"
    const threshold = Math.max(5, totalPixels * gapThreshold)
    if (projection[i] < threshold) {
      const start = i
      while (i < len && projection[i] < threshold) i++
      const end = i - 1
      if (end - start + 1 >= minBlankWidth) {
        gaps.push({ start, end })
      }
    } else {
      i++
    }
  }
  return gaps
}

function findContentRegions(
  projection: number[],
  minBlankWidth: number,
  totalPixels: number,
  gapThreshold = 0.02,
): Array<{ start: number; end: number }> {
  const threshold = Math.max(5, totalPixels * gapThreshold)
  const len = projection.length
  const regions: Array<{ start: number; end: number }> = []
  let i = 0

  while (i < len) {
    if (projection[i] >= threshold) {
      const start = i
      while (i < len && projection[i] >= threshold) i++
      const end = i - 1
      regions.push({ start, end })
    } else {
      i++
    }
  }
  return regions
}

function mergeCloseRegions(
  regions: Array<{ start: number; end: number }>,
  minGap: number,
): Array<{ start: number; end: number }> {
  if (regions.length <= 1) return regions
  const merged: Array<{ start: number; end: number }> = [regions[0]]
  for (let i = 1; i < regions.length; i++) {
    const prev = merged[merged.length - 1]
    if (regions[i].start - prev.end <= minGap) {
      merged[merged.length - 1] = { start: prev.start, end: regions[i].end }
    } else {
      merged.push(regions[i])
    }
  }
  return merged
}

// ============================================================
// Main component
// ============================================================
export default function ImageSplitterTool() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  // Parameters
  const [threshold, setThreshold] = useState(30)
  const [minBlankWidth, setMinBlankWidth] = useState(15)
  const [margin, setMargin] = useState(5)
  const [minImageSize, setMinImageSize] = useState(40)
  const [gapThreshold, setGapThreshold] = useState(0.02)

  // Detection results
  const [rects, setRects] = useState<Rect[]>([])
  const [rows, setRows] = useState(0)
  const [cols, setCols] = useState(0)
  const [bgColor, setBgColor] = useState<[number, number, number]>([255, 255, 255])
  const [detected, setDetected] = useState(false)

  // Interaction state
  const [dragging, setDragging] = useState<{
    rectIndex: number
    startX: number
    startY: number
    origRect: Rect
  } | null>(null)
  const [selectedRect, setSelectedRect] = useState<number | null>(null)
  const [cutLines, setCutLines] = useState<CutLine[]>([])
  const [showCutLines, setShowCutLines] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Image display size on canvas
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 })

  const MAX_DISPLAY = 800

  // Calculate display size
  const calcDisplaySize = useCallback((img: HTMLImageElement) => {
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    if (nw <= MAX_DISPLAY && nh <= MAX_DISPLAY) {
      return { w: nw, h: nh }
    }
    const ratio = Math.min(MAX_DISPLAY / nw, MAX_DISPLAY / nh)
    return { w: Math.round(nw * ratio), h: Math.round(nh * ratio) }
  }, [])

  // Run detection
  const runDetection = useCallback(
    (img: HTMLImageElement, params: {
      threshold: number
      minBlankWidth: number
      margin: number
      minImageSize: number
      gapThreshold: number
    }) => {
      const { w: dw, h: dh } = calcDisplaySize(img)
      setDisplaySize({ w: dw, h: dh })

      const offCanvas = document.createElement('canvas')
      offCanvas.width = dw
      offCanvas.height = dh
      const octx = offCanvas.getContext('2d')!
      octx.drawImage(img, 0, 0, dw, dh)
      const imageData = octx.getImageData(0, 0, dw, dh)
      const data = imageData.data

      // 1. Detect background color
      const bg = detectBackgroundColor(data, dw, dh)
      setBgColor(bg)

      // 2. Build projections
      const { rowProjection, colProjection } = buildProjections(data, dw, dh, bg, params.threshold)

      // 3. Find content regions
      const totalPixels = Math.max(dw, dh)
      let rowRegions = findContentRegions(rowProjection, params.minBlankWidth, totalPixels, params.gapThreshold)
      let colRegions = findContentRegions(colProjection, params.minBlankWidth, totalPixels, params.gapThreshold)

      // 4. Merge close regions
      rowRegions = mergeCloseRegions(rowRegions, params.minBlankWidth / 2)
      colRegions = mergeCloseRegions(colRegions, params.minBlankWidth / 2)

      // 5. Filter by min size
      rowRegions = rowRegions.filter((r) => r.end - r.start + 1 >= params.minImageSize)
      colRegions = colRegions.filter((r) => r.end - r.start + 1 >= params.minImageSize)

      const detectedRows = rowRegions.length
      const detectedCols = colRegions.length

      setRows(detectedRows)
      setCols(detectedCols)

      // 6. Generate rectangles
      const newRects: Rect[] = []
      for (let ri = 0; ri < detectedRows; ri++) {
        for (let ci = 0; ci < detectedCols; ci++) {
          let x = colRegions[ci].start - params.margin
          let y = rowRegions[ri].start - params.margin
          let w = colRegions[ci].end - colRegions[ci].start + 1 + params.margin * 2
          let h = rowRegions[ri].end - rowRegions[ri].start + 1 + params.margin * 2

          // Clamp
          if (x < 0) x = 0
          if (y < 0) y = 0
          if (x + w > dw) w = dw - x
          if (y + h > dh) h = dh - y

          newRects.push({ x, y, w, h, col: ci, row: ri })
        }
      }

      setRects(newRects)
      setDetected(true)
      setSelectedRect(null)
      setCutLines([])
    },
    [calcDisplaySize],
  )

  // Re-run when params change (debounce)
  const paramsRef = useRef({ threshold, minBlankWidth, margin, minImageSize, gapThreshold })
  paramsRef.current = { threshold, minBlankWidth, margin, minImageSize, gapThreshold }

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleParamChange = useCallback(() => {
    if (!image || !detected) return
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      runDetection(image, paramsRef.current)
    }, 200)
  }, [image, detected, runDetection])

  useEffect(() => {
    handleParamChange()
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [threshold, minBlankWidth, margin, minImageSize, gapThreshold, handleParamChange])

  // Draw preview
  useEffect(() => {
    if (!image || !detected || !previewCanvasRef.current) return
    const canvas = previewCanvasRef.current
    const { w, h } = displaySize
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(image, 0, 0, w, h)

    // Draw cut lines
    if (showCutLines) {
      ctx.strokeStyle = '#FF4444'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      for (const line of cutLines) {
        ctx.beginPath()
        if (line.type === 'h') {
          ctx.moveTo(0, line.pos)
          ctx.lineTo(w, line.pos)
        } else {
          ctx.moveTo(line.pos, 0)
          ctx.lineTo(line.pos, h)
        }
        ctx.stroke()
      }
      ctx.setLineDash([])
    }

    // Draw rects
    const fontHeight = Math.max(12, Math.min(24, w / 30))
    ctx.font = `bold ${fontHeight}px 'Manrope', 'PingFang SC', sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let i = 0; i < rects.length; i++) {
      const r = rects[i]
      const isSelected = selectedRect === i

      // Fill overlay
      ctx.fillStyle = isSelected ? 'rgba(0, 200, 100, 0.18)' : 'rgba(255, 50, 50, 0.08)'
      ctx.fillRect(r.x, r.y, r.w, r.h)

      // Border
      ctx.strokeStyle = isSelected ? '#00C864' : '#FF3232'
      ctx.lineWidth = isSelected ? 3 : 2
      ctx.strokeRect(r.x, r.y, r.w, r.h)

      // Number badge
      const badgeR = Math.max(14, fontHeight * 0.65)
      const bx = r.x + badgeR + 2
      const by = r.y + badgeR + 2

      ctx.fillStyle = isSelected ? '#00C864' : '#FF3232'
      ctx.beginPath()
      ctx.arc(bx, by, badgeR, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#FFFFFF'
      ctx.fillText(`${i + 1}`, bx, by)
    }
  }, [image, detected, displaySize, rects, selectedRect, showCutLines, cutLines])

  // Image loading
  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new window.Image()
        img.onload = () => {
          setImage(img)
          setDetected(false)
          setSelectedRect(null)
          setCutLines([])
          // Auto-run detection
          runDetection(img, {
            threshold,
            minBlankWidth,
            margin,
            minImageSize,
            gapThreshold,
          })
        }
        img.src = reader.result as string
      }
      reader.readAsDataURL(file)
    },
    [runDetection, threshold, minBlankWidth, margin, minImageSize, gapThreshold],
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  const handleClear = () => {
    setImage(null)
    setDetected(false)
    setRects([])
    setRows(0)
    setCols(0)
    setSelectedRect(null)
    setCutLines([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Canvas interaction - select & drag
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!detected || rects.length === 0) return
    const pos = getCanvasPos(e)

    // Check if clicking a rect
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i]
      if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
        setSelectedRect(i)
        setDragging({
          rectIndex: i,
          startX: pos.x,
          startY: pos.y,
          origRect: { ...r },
        })
        return
      }
    }
    setSelectedRect(null)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) return
    const pos = getCanvasPos(e)
    const dx = pos.x - dragging.startX
    const dy = pos.y - dragging.startY

    setRects((prev) => {
      const next = [...prev]
      const r = { ...next[dragging.rectIndex] }
      r.x = dragging.origRect.x + dx
      r.y = dragging.origRect.y + dy
      // Clamp
      r.x = Math.max(0, Math.min(r.x, displaySize.w - r.w))
      r.y = Math.max(0, Math.min(r.y, displaySize.h - r.h))
      next[dragging.rectIndex] = r
      return next
    })
  }

  const handleCanvasMouseUp = () => {
    setDragging(null)
  }

  // Delete selected rect
  const handleDeleteRect = () => {
    if (selectedRect === null) return
    setRects((prev) => prev.filter((_, i) => i !== selectedRect))
    setSelectedRect(null)
  }

  // Add cut line
  const handleAddCutLine = (type: 'h' | 'v') => {
    // Add at center position
    const pos = type === 'h' ? Math.round(displaySize.h / 2) : Math.round(displaySize.w / 2)
    setCutLines((prev) => [...prev, { type, pos }])
    setShowCutLines(true)
  }

  // Apply cut lines to split rects
  const handleApplyCutLines = () => {
    if (cutLines.length === 0) return

    let currentRects = rects.map((r) => ({ ...r }))

    for (const line of cutLines) {
      const newRects: Rect[] = []
      for (const r of currentRects) {
        if (line.type === 'h') {
          // Horizontal cut
          if (line.pos > r.y + 10 && line.pos < r.y + r.h - 10) {
            newRects.push(
              { ...r, h: line.pos - r.y },
              { ...r, y: line.pos, h: r.y + r.h - line.pos },
            )
          } else {
            newRects.push(r)
          }
        } else {
          // Vertical cut
          if (line.pos > r.x + 10 && line.pos < r.x + r.w - 10) {
            newRects.push(
              { ...r, w: line.pos - r.x },
              { ...r, x: line.pos, w: r.x + r.w - line.pos },
            )
          } else {
            newRects.push(r)
          }
        }
      }
      currentRects = newRects
    }

    // Re-number
    setRects(currentRects.map((r, i) => ({ ...r, col: 0, row: i })))
    setCutLines([])
    setShowCutLines(false)
    setSelectedRect(null)
  }

  // Download single
  const handleDownloadSingle = (index: number) => {
    if (!image) return
    const r = rects[index]
    // Scale from display coords to original coords
    const scaleX = image.naturalWidth / displaySize.w
    const scaleY = image.naturalHeight / displaySize.h

    const offCanvas = document.createElement('canvas')
    offCanvas.width = Math.round(r.w * scaleX)
    offCanvas.height = Math.round(r.h * scaleY)
    const ctx = offCanvas.getContext('2d')!
    ctx.drawImage(
      image,
      r.x * scaleX,
      r.y * scaleY,
      r.w * scaleX,
      r.h * scaleY,
      0,
      0,
      offCanvas.width,
      offCanvas.height,
    )

    offCanvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cut_${index + 1}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  // Download all as ZIP
  const handleDownloadAll = async () => {
    if (!image || rects.length === 0) return
    setIsExporting(true)
    try {
      // Dynamic import JSZip
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      const scaleX = image.naturalWidth / displaySize.w
      const scaleY = image.naturalHeight / displaySize.h

      for (let i = 0; i < rects.length; i++) {
        const r = rects[i]
        const offCanvas = document.createElement('canvas')
        offCanvas.width = Math.round(r.w * scaleX)
        offCanvas.height = Math.round(r.h * scaleY)
        const ctx = offCanvas.getContext('2d')!
        ctx.drawImage(
          image,
          r.x * scaleX,
          r.y * scaleY,
          r.w * scaleX,
          r.h * scaleY,
          0,
          0,
          offCanvas.width,
          offCanvas.height,
        )

        const blob = await new Promise<Blob>((resolve) => {
          offCanvas.toBlob((b) => resolve(b!), 'image/png')
        })
        zip.file(`cut_${String(i + 1).padStart(2, '0')}.png`, blob)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'cut_images.zip'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('ZIP 导出失败，请重试。')
    } finally {
      setIsExporting(false)
    }
  }

  // Display natural dimensions
  const imageInfo = image
    ? {
        naturalW: image.naturalWidth,
        naturalH: image.naturalHeight,
        displayW: displaySize.w,
        displayH: displaySize.h,
      }
    : null

  return (
    <ToolPageLayout toolId="image-splitter">
      <WorkspaceHeader title={image ? `已加载图片 (${rects.length} 个小图)` : '未选择文件'}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {image && rects.length > 0 && (
            <>
              <span className="splitter-badge">
                {cols}×{rows}
              </span>
              <button
                className="button ghost compact"
                onClick={handleClear}
              >
                <Trash2 size={14} /> 清除
              </button>
            </>
          )}
        </div>
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
            <small>支持 JPG、PNG、WebP 等格式，自动识别拼图布局</small>
          </div>
        </div>
      ) : (
        <WorkspaceSplit
          leftWidth="58%"
          left={
            <div className="splitter-preview-area">
              <div className="splitter-canvas-wrap">
                <canvas
                  ref={previewCanvasRef}
                  className="splitter-canvas"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  style={{ cursor: dragging ? 'grabbing' : selectedRect !== null ? 'grab' : 'default' }}
                />
                {!detected && (
                  <div className="splitter-canvas-loading">
                    <RefreshCw size={24} className="splitter-spin" />
                    <p>正在分析图片...</p>
                  </div>
                )}
              </div>

              {imageInfo && (
                <div className="splitter-info-grid">
                  <div className="info-row">
                    <span>原始尺寸</span>
                    <b>{imageInfo.naturalW} × {imageInfo.naturalH}</b>
                  </div>
                  <div className="info-row">
                    <span>检测到</span>
                    <b>{rects.length} 个小图</b>
                  </div>
                  <div className="info-row">
                    <span>布局</span>
                    <b>{cols} 列 × {rows} 行</b>
                  </div>
                  <div className="info-row">
                    <span>背景色</span>
                    <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        className="splitter-bg-swatch"
                        style={{ background: `rgb(${bgColor.join(',')})` }}
                      />
                      rgb({bgColor.join(',')})
                    </b>
                  </div>
                </div>
              )}
            </div>
          }
          right={
            <div className="splitter-control-panel">
              {/* Parameters */}
              <div className="splitter-section">
                <h4 className="splitter-section-title">
                  <Scissors size={15} /> 识别参数
                </h4>
                <div className="controls">
                  <div className="control-group">
                    <label>
                      识别阈值 <span>{threshold}</span>
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={120}
                      step={1}
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                    />
                    <small className="control-hint">数值越低，浅色线条也会被识别</small>
                  </div>
                  <div className="control-group">
                    <label>
                      最小空白宽度 <span>{minBlankWidth}px</span>
                    </label>
                    <input
                      type="range"
                      min={3}
                      max={80}
                      step={1}
                      value={minBlankWidth}
                      onChange={(e) => setMinBlankWidth(Number(e.target.value))}
                    />
                    <small className="control-hint">防止内部空隙被误判为分隔线</small>
                  </div>
                  <div className="control-group">
                    <label>
                      外扩边距 <span>{margin}px</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      step={1}
                      value={margin}
                      onChange={(e) => setMargin(Number(e.target.value))}
                    />
                    <small className="control-hint">裁剪框向外扩展的像素数</small>
                  </div>
                  <div className="control-group">
                    <label>
                      最小图片尺寸 <span>{minImageSize}px</span>
                    </label>
                    <input
                      type="range"
                      min={20}
                      max={200}
                      step={5}
                      value={minImageSize}
                      onChange={(e) => setMinImageSize(Number(e.target.value))}
                    />
                    <small className="control-hint">过滤过小的误识别区域</small>
                  </div>
                  <div className="control-group">
                    <label>
                      空白灵敏度 <span>{gapThreshold.toFixed(2)}</span>
                    </label>
                    <input
                      type="range"
                      min={0.005}
                      max={0.15}
                      step={0.005}
                      value={gapThreshold}
                      onChange={(e) => setGapThreshold(Number(e.target.value))}
                    />
                    <small className="control-hint">前景像素占比阈值，越小越敏感</small>
                  </div>
                </div>
              </div>

              {/* Manual tools */}
              {rects.length > 0 && (
                <div className="splitter-section">
                  <h4 className="splitter-section-title">
                    <Plus size={15} /> 手动修正
                  </h4>
                  <div className="splitter-manual-tools">
                    <div className="splitter-manual-row">
                      <button
                        className="button ghost compact"
                        onClick={() => handleAddCutLine('v')}
                      >
                        + 竖向切割线
                      </button>
                      <button
                        className="button ghost compact"
                        onClick={() => handleAddCutLine('h')}
                      >
                        + 横向切割线
                      </button>
                    </div>
                    {cutLines.length > 0 && (
                      <>
                        <div className="splitter-cut-lines-list">
                          {cutLines.map((line, i) => (
                            <div key={i} className="splitter-cut-line-item">
                              <span>
                                {line.type === 'h' ? '横向' : '竖向'}切割线 @ {line.pos}px
                              </span>
                              <button
                                className="splitter-mini-remove"
                                onClick={() => {
                                  setCutLines((prev) => prev.filter((_, j) => j !== i))
                                  if (cutLines.length === 1) setShowCutLines(false)
                                }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          className="button primary compact full"
                          onClick={handleApplyCutLines}
                        >
                          应用切割线
                        </button>
                      </>
                    )}
                    <button
                      className="button ghost compact danger full"
                      onClick={handleDeleteRect}
                      disabled={selectedRect === null}
                    >
                      <Trash2 size={14} /> 删除选中框
                    </button>
                    <p className="splitter-hint-text">
                      提示：点击红框选中，拖拽可移动位置
                    </p>
                  </div>
                </div>
              )}

              {/* Export */}
              {rects.length > 0 && (
                <div className="splitter-section">
                  <h4 className="splitter-section-title">
                    <Download size={15} /> 批量导出
                  </h4>
                  <div className="splitter-export-actions">
                    <button
                      className="button primary full"
                      onClick={handleDownloadAll}
                      disabled={isExporting}
                    >
                      <Download size={17} />
                      {isExporting ? '正在打包...' : `ZIP 打包下载全部 (${rects.length} 张)`}
                    </button>
                    {selectedRect !== null && (
                      <button
                        className="button secondary full"
                        onClick={() => handleDownloadSingle(selectedRect)}
                      >
                        <Image size={17} />
                        下载选中图片 (第 {selectedRect + 1} 张)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          }
        />
      )}
    </ToolPageLayout>
  )
}
