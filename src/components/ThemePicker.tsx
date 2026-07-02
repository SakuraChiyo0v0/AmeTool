import { useState } from 'react'
import { Check, ChevronDown, Palette } from 'lucide-react'

const themes = [
  { id: 'paper', name: 'Paper', note: '温暖编辑风' },
  { id: 'midnight', name: 'Midnight', note: '专注暗色' },
  { id: 'sand', name: 'Sand', note: '人文暖调' },
  { id: 'forest', name: 'Forest', note: '自然沉静' },
  { id: 'cobalt', name: 'Cobalt', note: '精准产品风' },
  { id: 'plum', name: 'Plum', note: '文艺创意' },
] as const

export type Theme = (typeof themes)[number]['id']

export function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem('webtool-theme') as Theme | null
    if (themes.some((t) => t.id === saved)) return saved!
  } catch {
    /* storage may be unavailable */
  }
  return matchMedia('(prefers-color-scheme: dark)').matches
    ? 'midnight'
    : 'paper'
}

function cycleTheme(current: Theme): Theme {
  const idx = themes.findIndex((t) => t.id === current)
  return themes[(idx + 1) % themes.length].id
}

export default function ThemePicker({
  theme,
  setTheme,
}: {
  theme: Theme
  setTheme: (v: Theme) => void
}) {
  const [open, setOpen] = useState(false)
  const current = themes.find((t) => t.id === theme)!

  return (
    <div className="theme-control">
      <button
        className="icon-button"
        aria-label="切换到下一个主题"
        onClick={() => setTheme(cycleTheme(theme))}
      >
        <Palette size={18} />
      </button>
      <button
        className="theme-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(!open)}
      >
        <span className="theme-dot" />
        {current.name}
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="theme-menu" role="listbox" aria-label="选择主题">
          {themes.map((t) => (
            <button
              key={t.id}
              role="option"
              aria-selected={t.id === theme}
              className="theme-option"
              onClick={() => {
                setTheme(t.id)
                setOpen(false)
              }}
            >
              <span className={`theme-swatch swatch-${t.id}`}>
                <i />
                <b />
              </span>
              <span>
                <strong>{t.name}</strong>
                <small>{t.note}</small>
              </span>
              {t.id === theme && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
