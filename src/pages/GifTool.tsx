import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, Download, ChevronLeft, ChevronRight, Play, Pause, Film, Scissors, Zap, Rewind, PackageOpen } from 'lucide-react'
import { parseGIF, decompressFrames } from 'gifuct-js'
import { encodeGif, type GifFrame } from '../lib/gif-encode'
import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'

// ============================================================
// 类型
// ============================================================

type TabId = 'split' | 'video' | 'speed'

interface ParsedFrame {
  imageData: ImageData
  delay: number
}

interface GifInfo {
  frames: ParsedFrame[]
  rawFrames: ReturnType<typeof decompressFrames>
}

// ============================================================
// 工具函数
// ============================================================

async function parseGifFile(file: File): Promise<GifInfo> {
  const buffer = await file.arrayBuffer()
  const gif = parseGIF(buffer)
  const rawFrames = decompressFrames(gif, true)
  const frames: ParsedFrame[] = rawFrames.map((f: any) => {
    const w = f.dims.width
    const h = f.dims.height
    const clamped = new Uint8ClampedArray(w * h * 4)
    // patch is already RGBA when buildPatch=true
    if (f.patch.length === w * h * 4) {
      clamped.set(f.patch)
    } else {
      // indexed → RGBA fallback
      for (let i = 0; i < f.patch.length; i++) {
        const idx = f.patch[i]
        const color = gif.gct?.[idx] ?? [0, 0, 0]
        clamped[i * 4] = color[0]
        clamped[i * 4 + 1] = color[1]
        clamped[i * 4 + 2] = color[2]
        clamped[i * 4 + 3] = 255
      }
    }
    const imageData = new ImageData(clamped, w, h)
    return { imageData, delay: f.delay || 10 }
  })
  return { frames, rawFrames }
}

function frameToCanvas(frame: ParsedFrame, canvas: HTMLCanvasElement) {
  canvas.width = frame.imageData.width
  canvas.height = frame.imageData.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(frame.imageData, 0, 0)
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// 加载 gif 文件为 object URL
function loadGifObjectUrl(file: File): string {
  return URL.createObjectURL(file)
}

// ============================================================
// Tab 组件
// ============================================================

function TabBar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  const tabs: { id: TabId; icon: React.ReactNode; label: string }[] = [
    { id: 'split', icon: <Scissors size={14} />, label: '帧拆分' },
    { id: 'video', icon: <Film size={14} />, label: '视频转GIF' },
    { id: 'speed', icon: <Zap size={14} />, label: '变速 & 倒放' },
  ]
  return (
    <div className="gif-tab-bar">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`gif-tab ${active === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ---- 帧拆分 ----

function SplitTab() {
  const fileRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const [gifUrl, setGifUrl] = useState<string | null>(null)
  const [gifInfo, setGifInfo] = useState<GifInfo | null>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [loading, setLoading] = useState(false)
  const [zipping, setZipping] = useState(false)

  const loadGif = useCallback(async (file: File) => {
    setLoading(true)
    try {
      const url = loadGifObjectUrl(file)
      setGifUrl(url)
      const info = await parseGifFile(file)
      setGifInfo(info)
      setCurrentFrame(0)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (gifInfo && canvasRef.current) {
      frameToCanvas(gifInfo.frames[currentFrame], canvasRef.current)
    }
  }, [gifInfo, currentFrame])

  // 实时 GIF 预览（逐帧动画）
  useEffect(() => {
    if (!gifInfo || !previewCanvasRef.current) return
    const canvas = previewCanvasRef.current
    const ctx = canvas.getContext('2d')!
    let frameIdx = 0
    let timer: number

    function render() {
      if (!gifInfo) return
      const f = gifInfo.frames[frameIdx % gifInfo.frames.length]
      canvas.width = f.imageData.width
      canvas.height = f.imageData.height
      ctx.putImageData(f.imageData, 0, 0)
      frameIdx++
      timer = window.setTimeout(render, f.delay * 10)
    }
    render()
    return () => clearTimeout(timer)
  }, [gifInfo])

  const downloadFrame = useCallback(async () => {
    if (!canvasRef.current || !gifInfo) return
    const blob = await canvasToBlob(canvasRef.current)
    downloadBlob(blob, `frame-${currentFrame + 1}.png`)
  }, [gifInfo, currentFrame])

  const downloadAllAsZip = useCallback(async () => {
    if (!gifInfo) return
    setZipping(true)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const tempCanvas = document.createElement('canvas')
      for (let i = 0; i < gifInfo.frames.length; i++) {
        frameToCanvas(gifInfo.frames[i], tempCanvas)
        const blob = await canvasToBlob(tempCanvas)
        zip.file(`frame-${String(i + 1).padStart(3, '0')}.png`, blob)
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(zipBlob, 'gif-frames.zip')
    } catch { /* ignore */ }
    setZipping(false)
  }, [gifInfo])

  const navPrev = useCallback(() => {
    if (!gifInfo) return
    setCurrentFrame((p) => (p - 1 + gifInfo.frames.length) % gifInfo.frames.length)
  }, [gifInfo])

  const navNext = useCallback(() => {
    if (!gifInfo) return
    setCurrentFrame((p) => (p + 1) % gifInfo.frames.length)
  }, [gifInfo])

  return (
    <div className="gif-split">
      {/* 上传 */}
      {!gifUrl && (
        <div className="gif-upload-area" onClick={() => fileRef.current?.click()}>
          <Upload size={32} className="gif-upload-icon" />
          <p className="gif-upload-title">上传 GIF 文件</p>
          <p className="gif-upload-hint">点击或拖拽上传</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/gif"
            className="gif-file-input"
            onChange={(e) => e.target.files?.[0] && loadGif(e.target.files[0])}
          />
        </div>
      )}

      {loading && (
        <div className="gif-loading">
          <div className="gif-spinner" />
          <span>解析中...</span>
        </div>
      )}

      {gifInfo && gifUrl && (
        <>
          {/* 实时预览 */}
          <div className="gif-preview-section">
            <div className="gif-preview-label">实时预览</div>
            <canvas ref={previewCanvasRef} className="gif-preview-canvas" />
          </div>

          {/* 帧导航 */}
          <div className="gif-frame-nav">
            <button className="button secondary compact" onClick={navPrev}>
              <ChevronLeft size={14} /> 上一帧
            </button>
            <span className="gif-frame-info">
              帧 {currentFrame + 1} / {gifInfo.frames.length}　｜　
              {gifInfo.frames[currentFrame].delay * 10} ms
            </span>
            <button className="button secondary compact" onClick={navNext}>
              下一帧 <ChevronRight size={14} />
            </button>
          </div>

          {/* 单帧大图 */}
          <div className="gif-current-frame">
            <canvas ref={canvasRef} className="gif-frame-canvas" />
          </div>

          {/* 操作按钮 */}
          <div className="gif-actions">
            <button className="button primary" onClick={downloadFrame}>
              <Download size={14} /> 下载当前帧 (PNG)
            </button>
            <button className="button secondary" onClick={downloadAllAsZip} disabled={zipping}>
              <PackageOpen size={14} /> {zipping ? '打包中...' : `下载全部 ${gifInfo.frames.length} 帧 (ZIP)`}
            </button>
            <button className="button ghost" onClick={() => { setGifUrl(null); setGifInfo(null) }}>
              重新上传
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ---- 视频转 GIF ----

const FPS_OPTIONS = [5, 8, 10, 12, 15, 20]
const MAX_WIDTH_OPTIONS = [160, 240, 320, 480, 640]

function VideoTab() {
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [fps, setFps] = useState(10)
  const [maxWidth, setMaxWidth] = useState(320)
  const [progress, setProgress] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultSize, setResultSize] = useState('')

  const loadVideo = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    setResultUrl(null)
  }, [])

  const convert = useCallback(async () => {
    if (!videoRef.current || !videoUrl) return
    setProcessing(true)
    setProgress(0)
    try {
      const video = videoRef.current
      video.currentTime = 0
      await new Promise<void>((resolve) => { video.onseeked = () => resolve(); video.onseeked = null })

      const ratio = maxWidth / video.videoWidth
      const w = maxWidth
      const h = Math.round(video.videoHeight * ratio)
      const duration = video.duration
      const frameInterval = 1 / fps
      const totalFrames = Math.floor(duration / frameInterval)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!

      const frames: GifFrame[] = []
      for (let i = 0; i < totalFrames; i++) {
        video.currentTime = i * frameInterval
        await new Promise<void>((resolve) => { video.onseeked = () => resolve(); video.onseeked = null })
        ctx.drawImage(video, 0, 0, w, h)
        const imageData = ctx.getImageData(0, 0, w, h)
        frames.push({ imageData, delay: Math.round(100 / fps) })
        setProgress(Math.round(((i + 1) / totalFrames) * 100))
      }

      const gifData = encodeGif(frames, { repeat: 0 })
      const blob = new Blob([gifData], { type: 'image/gif' })
      const url = URL.createObjectURL(blob)
      setResultUrl(url)
      setResultSize((blob.size / 1024).toFixed(1) + ' KB')
    } catch { /* ignore */ }
    setProcessing(false)
  }, [videoUrl, fps, maxWidth])

  const downloadResult = useCallback(() => {
    if (!resultUrl) return
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = 'converted.gif'
    a.click()
  }, [resultUrl])

  return (
    <div className="gif-video">
      {!videoUrl ? (
        <div className="gif-upload-area" onClick={() => fileRef.current?.click()}>
          <Film size={32} className="gif-upload-icon" />
          <p className="gif-upload-title">上传视频文件</p>
          <p className="gif-upload-hint">支持 MP4 / WebM / MOV</p>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="gif-file-input"
            onChange={(e) => e.target.files?.[0] && loadVideo(e.target.files[0])}
          />
        </div>
      ) : (
        <>
          <div className="gif-preview-section">
            <div className="gif-preview-label">视频预览</div>
            <video ref={videoRef} src={videoUrl} controls className="gif-video-preview" />
          </div>

          <div className="gif-settings">
            <div className="gif-setting">
              <label>帧率 (FPS)</label>
              <div className="gif-chip-row">
                {FPS_OPTIONS.map((f) => (
                  <button key={f} className={`gif-chip ${fps === f ? 'active' : ''}`} onClick={() => setFps(f)}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="gif-setting">
              <label>最大宽度</label>
              <div className="gif-chip-row">
                {MAX_WIDTH_OPTIONS.map((w) => (
                  <button key={w} className={`gif-chip ${maxWidth === w ? 'active' : ''}`} onClick={() => setMaxWidth(w)}>
                    {w}px
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="gif-actions">
            <button className="button primary" onClick={convert} disabled={processing}>
              {processing ? `处理中 ${progress}%` : '开始转换'}
            </button>
            <button className="button ghost" onClick={() => { setVideoUrl(null); setResultUrl(null) }}>
              重新上传
            </button>
          </div>

          {processing && (
            <div className="gif-progress-bar">
              <div className="gif-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}

          {resultUrl && (
            <div className="gif-result">
              <div className="gif-preview-label">转换结果 ({resultSize})</div>
              <img src={resultUrl} alt="Result" className="gif-result-img" />
              <button className="button primary" onClick={downloadResult}>
                <Download size={14} /> 下载 GIF
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---- 变速 & 倒放 ----

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]

function SpeedTab() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [gifUrl, setGifUrl] = useState<string | null>(null)
  const [gifInfo, setGifInfo] = useState<GifInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [reverse, setReverse] = useState(false)
  const [appliedSpeed, setAppliedSpeed] = useState(1)
  const [appliedReverse, setAppliedReverse] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultSize, setResultSize] = useState('')
  const [processing, setProcessing] = useState(false)

  const loadGif = useCallback(async (file: File) => {
    setLoading(true)
    try {
      const url = loadGifObjectUrl(file)
      setGifUrl(url)
      const info = await parseGifFile(file)
      setGifInfo(info)
      setResultUrl(null)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const process = useCallback(async () => {
    if (!gifInfo) return
    setProcessing(true)
    try {
      let frames = [...gifInfo.frames]
      if (appliedReverse) frames = frames.reverse()
      const modified = frames.map((f) => ({
        imageData: f.imageData,
        delay: Math.max(1, Math.round(f.delay / appliedSpeed)),
      }))
      const data = encodeGif(modified, { repeat: 0 })
      const blob = new Blob([data], { type: 'image/gif' })
      const url = URL.createObjectURL(blob)
      setResultUrl(url)
      setResultSize((blob.size / 1024).toFixed(1) + ' KB')
    } catch { /* ignore */ }
    setProcessing(false)
  }, [gifInfo, appliedSpeed, appliedReverse])

  useEffect(() => {
    if (gifInfo) process()
  }, [gifInfo, appliedSpeed, appliedReverse])

  const downloadResult = useCallback(() => {
    if (!resultUrl) return
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = reverse ? 'reversed.gif' : `speed-${speed}x.gif`
    a.click()
  }, [resultUrl, speed, reverse])

  const apply = useCallback(() => {
    setAppliedSpeed(speed)
    setAppliedReverse(reverse)
  }, [speed, reverse])

  return (
    <div className="gif-speed">
      {!gifUrl ? (
        <div className="gif-upload-area" onClick={() => fileRef.current?.click()}>
          <Upload size={32} className="gif-upload-icon" />
          <p className="gif-upload-title">上传 GIF 文件</p>
          <p className="gif-upload-hint">支持任意 GIF 动图</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/gif"
            className="gif-file-input"
            onChange={(e) => e.target.files?.[0] && loadGif(e.target.files[0])}
          />
        </div>
      ) : (
        <>
          {loading ? (
            <div className="gif-loading"><div className="gif-spinner" /><span>解析中...</span></div>
          ) : (
            <>
              <div className="gif-preview-section">
                <div className="gif-preview-label">原始 GIF</div>
                <img src={gifUrl} alt="Original" className="gif-result-img" />
              </div>

              <div className="gif-settings">
                <div className="gif-setting">
                  <label>变速倍率</label>
                  <div className="gif-speed-slider">
                    <input
                      type="range"
                      min={0}
                      max={7}
                      value={SPEED_OPTIONS.indexOf(speed)}
                      onChange={(e) => setSpeed(SPEED_OPTIONS[Number(e.target.value)])}
                      className="gif-slider"
                    />
                    <span className="gif-speed-value">{speed}x</span>
                  </div>
                  <div className="gif-chip-row">
                    {SPEED_OPTIONS.map((s) => (
                      <button
                        key={s}
                        className={`gif-chip ${speed === s ? 'active' : ''}`}
                        onClick={() => setSpeed(s)}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="gif-setting">
                  <label>倒放</label>
                  <button
                    className={`gif-toggle ${reverse ? 'active' : ''}`}
                    onClick={() => setReverse(!reverse)}
                  >
                    <Rewind size={14} /> {reverse ? '已开启倒放' : '关闭倒放'}
                  </button>
                </div>
              </div>

              <div className="gif-actions">
                <button className="button primary" onClick={apply}>
                  应用设置
                </button>
                <button className="button ghost" onClick={() => { setGifUrl(null); setGifInfo(null); setResultUrl(null) }}>
                  重新上传
                </button>
              </div>

              {processing && (
                <div className="gif-loading"><div className="gif-spinner" /><span>处理中...</span></div>
              )}

              {resultUrl && (
                <div className="gif-result">
                  <div className="gif-preview-label">
                    处理结果 ({resultSize}) — {appliedSpeed}x {appliedReverse ? '· 倒放' : ''}
                  </div>
                  <img src={resultUrl} alt="Result" className="gif-result-img" />
                  <button className="button primary" onClick={downloadResult}>
                    <Download size={14} /> 下载 GIF
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ============================================================
// 主组件
// ============================================================

export default function GifTool() {
  const [tab, setTab] = useState<TabId>('split')

  const tabLabels: Record<TabId, string> = {
    split: '帧拆分',
    video: '视频转GIF',
    speed: '变速 & 倒放',
  }

  return (
    <ToolPageLayout toolId="gif-tool">
      <WorkspaceHeader title={`GIF工具 · ${tabLabels[tab]}`} />
      <WorkspaceBody>
        <div className="gif-tool">
          <TabBar active={tab} onChange={setTab} />
          <div className="gif-tab-content">
            {tab === 'split' && <SplitTab />}
            {tab === 'video' && <VideoTab />}
            {tab === 'speed' && <SpeedTab />}
          </div>
        </div>
      </WorkspaceBody>
    </ToolPageLayout>
  )
}
