import { useState, useCallback, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360
  s /= 100
  l /= 100

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

function isValidHex(hex: string): boolean {
  return /^#?[a-f\d]{6}$/i.test(hex)
}

const presetColors = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#FFC0CB', '#A52A2A', '#808080', '#008000', '#000080',
  '#800000', '#008080', '#FF6347', '#00CED1', '#FFD700',
]

export default function ColorPickerTool() {
  const [hex, setHex] = useState('#3B82F6')
  const [rgb, setRgb] = useState({ r: 59, g: 130, b: 246 })
  const [hsl, setHsl] = useState({ h: 217, s: 91, l: 60 })
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)

  useEffect(() => {
    const rgbValue = hexToRgb(hex)
    if (rgbValue) {
      setRgb(rgbValue)
      setHsl(rgbToHsl(rgbValue.r, rgbValue.g, rgbValue.b))
    }
  }, [hex])

  const handleHexChange = useCallback((value: string) => {
    if (isValidHex(value)) {
      setHex(value.startsWith('#') ? value : '#' + value)
    }
  }, [])

  const handleRgbChange = useCallback((key: 'r' | 'g' | 'b', value: number) => {
    const newRgb = { ...rgb, [key]: Math.max(0, Math.min(255, value)) }
    setRgb(newRgb)
    setHex(rgbToHex(newRgb.r, newRgb.g, newRgb.b))
  }, [rgb])

  const handleHslChange = useCallback((key: 'h' | 's' | 'l', value: number) => {
    const newHsl = { ...hsl, [key]: key === 'h' ? Math.max(0, Math.min(360, value)) : Math.max(0, Math.min(100, value)) }
    setHsl(newHsl)
    const newRgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l)
    setRgb(newRgb)
    setHex(rgbToHex(newRgb.r, newRgb.g, newRgb.b))
  }, [hsl])

  const copyToClipboard = useCallback(async (text: string, format: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedFormat(format)
    setTimeout(() => setCopiedFormat(null), 2000)
  }, [])

  const getContrastColor = useCallback(() => {
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
    return luminance > 0.5 ? '#000000' : '#FFFFFF'
  }, [rgb])

  return (
    <ToolPageLayout toolId="color-picker">
      <WorkspaceHeader title={hex} />
      <WorkspaceBody>
        <div className="color-picker">
          <div className="color-preview" style={{ backgroundColor: hex }}>
            <div className="color-info" style={{ color: getContrastColor() }}>
              <span className="color-name">当前颜色</span>
              <span className="color-hex">{hex}</span>
            </div>
          </div>

          <div className="preset-colors">
            {presetColors.map((color) => (
              <button
                key={color}
                className="preset-color"
                style={{ backgroundColor: color }}
                onClick={() => setHex(color)}
                title={color}
              />
            ))}
          </div>

          <div className="color-formats">
            <div className="format-card">
              <label>HEX</label>
              <div className="format-input-group">
                <input
                  type="text"
                  value={hex}
                  onChange={(e) => handleHexChange(e.target.value)}
                  className="format-input"
                />
                <button
                  className="copy-button"
                  onClick={() => copyToClipboard(hex, 'hex')}
                >
                  {copiedFormat === 'hex' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div className="format-card">
              <label>RGB</label>
              <div className="rgb-inputs">
                {(['r', 'g', 'b'] as const).map((key) => (
                  <div key={key} className="rgb-input-group">
                    <input
                      type="number"
                      min={0}
                      max={255}
                      value={rgb[key]}
                      onChange={(e) => handleRgbChange(key, Number(e.target.value))}
                      className="rgb-input"
                    />
                    <span className="rgb-label">{key.toUpperCase()}</span>
                  </div>
                ))}
              </div>
              <button
                className="copy-button"
                onClick={() => copyToClipboard(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, 'rgb')}
              >
                {copiedFormat === 'rgb' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>

            <div className="format-card">
              <label>HSL</label>
              <div className="hsl-inputs">
                {(['h', 's', 'l'] as const).map((key) => (
                  <div key={key} className="hsl-input-group">
                    <input
                      type="number"
                      min={key === 'h' ? 0 : 0}
                      max={key === 'h' ? 360 : 100}
                      value={hsl[key]}
                      onChange={(e) => handleHslChange(key, Number(e.target.value))}
                      className="hsl-input"
                    />
                    <span className="hsl-label">{key.toUpperCase()}</span>
                  </div>
                ))}
              </div>
              <button
                className="copy-button"
                onClick={() => copyToClipboard(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'hsl')}
              >
                {copiedFormat === 'hsl' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="color-sliders">
            <div className="slider-row">
              <label>Hue</label>
              <input
                type="range"
                min={0}
                max={360}
                value={hsl.h}
                onChange={(e) => handleHslChange('h', Number(e.target.value))}
                className="hue-slider"
                style={{ background: 'linear-gradient(to right, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)' }}
              />
              <span>{hsl.h}°</span>
            </div>
            <div className="slider-row">
              <label>Saturation</label>
              <input
                type="range"
                min={0}
                max={100}
                value={hsl.s}
                onChange={(e) => handleHslChange('s', Number(e.target.value))}
                className="sat-slider"
                style={{ background: `linear-gradient(to right, hsl(${hsl.h}, 0%, ${hsl.l}%), hsl(${hsl.h}, 100%, ${hsl.l}%))` }}
              />
              <span>{hsl.s}%</span>
            </div>
            <div className="slider-row">
              <label>Lightness</label>
              <input
                type="range"
                min={0}
                max={100}
                value={hsl.l}
                onChange={(e) => handleHslChange('l', Number(e.target.value))}
                className="light-slider"
                style={{ background: `linear-gradient(to right, hsl(${hsl.h}, ${hsl.s}%, 0%), hsl(${hsl.h}, ${hsl.s}%, 50%), hsl(${hsl.h}, ${hsl.s}%, 100%))` }}
              />
              <span>{hsl.l}%</span>
            </div>
          </div>
        </div>
      </WorkspaceBody>
    </ToolPageLayout>
  )
}
