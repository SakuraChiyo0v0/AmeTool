import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'

// ============================================================
// 键盘布局定义（物理按键 code → 显示标签 & 宽度）
// ============================================================

interface KeyDef {
  code: string
  label: string
  width?: number // 相对于标准键的宽度倍数
}

const KEYBOARD_ROWS: KeyDef[][] = [
  // Fn row
  [
    { code: 'Escape', label: 'Esc' },
    { code: '', label: '', width: 0.5 },
    { code: 'F1', label: 'F1' },
    { code: 'F2', label: 'F2' },
    { code: 'F3', label: 'F3' },
    { code: 'F4', label: 'F4' },
    { code: '', label: '', width: 0.5 },
    { code: 'F5', label: 'F5' },
    { code: 'F6', label: 'F6' },
    { code: 'F7', label: 'F7' },
    { code: 'F8', label: 'F8' },
    { code: '', label: '', width: 0.5 },
    { code: 'F9', label: 'F9' },
    { code: 'F10', label: 'F10' },
    { code: 'F11', label: 'F11' },
    { code: 'F12', label: 'F12' },
    { code: '', label: '', width: 0.5 },
    { code: 'PrintScreen', label: 'PrtSc' },
    { code: 'ScrollLock', label: 'ScrLk' },
    { code: 'Pause', label: 'Pause' },
  ],
  // Num row
  [
    { code: 'Backquote', label: '`' },
    { code: 'Digit1', label: '1' },
    { code: 'Digit2', label: '2' },
    { code: 'Digit3', label: '3' },
    { code: 'Digit4', label: '4' },
    { code: 'Digit5', label: '5' },
    { code: 'Digit6', label: '6' },
    { code: 'Digit7', label: '7' },
    { code: 'Digit8', label: '8' },
    { code: 'Digit9', label: '9' },
    { code: 'Digit0', label: '0' },
    { code: 'Minus', label: '-' },
    { code: 'Equal', label: '=' },
    { code: 'Backspace', label: '←', width: 2 },
  ],
  // QWERTY top
  [
    { code: 'Tab', label: 'Tab', width: 1.5 },
    { code: 'KeyQ', label: 'Q' },
    { code: 'KeyW', label: 'W' },
    { code: 'KeyE', label: 'E' },
    { code: 'KeyR', label: 'R' },
    { code: 'KeyT', label: 'T' },
    { code: 'KeyY', label: 'Y' },
    { code: 'KeyU', label: 'U' },
    { code: 'KeyI', label: 'I' },
    { code: 'KeyO', label: 'O' },
    { code: 'KeyP', label: 'P' },
    { code: 'BracketLeft', label: '[' },
    { code: 'BracketRight', label: ']' },
    { code: 'Backslash', label: '\\', width: 1.5 },
  ],
  // Home row
  [
    { code: 'CapsLock', label: 'Caps', width: 1.75 },
    { code: 'KeyA', label: 'A' },
    { code: 'KeyS', label: 'S' },
    { code: 'KeyD', label: 'D' },
    { code: 'KeyF', label: 'F' },
    { code: 'KeyG', label: 'G' },
    { code: 'KeyH', label: 'H' },
    { code: 'KeyJ', label: 'J' },
    { code: 'KeyK', label: 'K' },
    { code: 'KeyL', label: 'L' },
    { code: 'Semicolon', label: ';' },
    { code: 'Quote', label: "'" },
    { code: 'Enter', label: 'Enter', width: 2.25 },
  ],
  // Bottom row
  [
    { code: 'ShiftLeft', label: 'Shift', width: 2.25 },
    { code: 'KeyZ', label: 'Z' },
    { code: 'KeyX', label: 'X' },
    { code: 'KeyC', label: 'C' },
    { code: 'KeyV', label: 'V' },
    { code: 'KeyB', label: 'B' },
    { code: 'KeyN', label: 'N' },
    { code: 'KeyM', label: 'M' },
    { code: 'Comma', label: ',' },
    { code: 'Period', label: '.' },
    { code: 'Slash', label: '/' },
    { code: 'ShiftRight', label: 'Shift', width: 2.75 },
  ],
  // Modifier row
  [
    { code: 'ControlLeft', label: 'Ctrl', width: 1.5 },
    { code: 'MetaLeft', label: 'Win', width: 1.25 },
    { code: 'AltLeft', label: 'Alt', width: 1.25 },
    { code: 'Space', label: 'Space', width: 6 },
    { code: 'AltRight', label: 'Alt', width: 1.25 },
    { code: 'MetaRight', label: 'Win', width: 1.25 },
    { code: 'ContextMenu', label: 'Menu', width: 1.25 },
    { code: 'ControlRight', label: 'Ctrl', width: 1.5 },
  ],
]

// Numpad (平面数组，用 CSS Grid 布局)
const NUMPAD_CELLS: KeyDef[] = [
  { code: 'NumLock', label: 'NumLk' },
  { code: 'NumpadDivide', label: '/' },
  { code: 'NumpadMultiply', label: '*' },
  { code: 'NumpadSubtract', label: '-' },
  { code: 'Numpad7', label: '7' },
  { code: 'Numpad8', label: '8' },
  { code: 'Numpad9', label: '9' },
  { code: 'NumpadAdd', label: '+' },
  { code: 'Numpad4', label: '4' },
  { code: 'Numpad5', label: '5' },
  { code: 'Numpad6', label: '6' },
  { code: 'Numpad1', label: '1' },
  { code: 'Numpad2', label: '2' },
  { code: 'Numpad3', label: '3' },
  { code: 'NumpadEnter', label: 'Enter' },
  { code: 'Numpad0', label: '0' },
  { code: 'NumpadDecimal', label: '.' },
]

const getNumpadStyle = (code: string): React.CSSProperties => {
  switch (code) {
    case 'NumpadAdd': return { gridRow: 'span 2' }
    case 'NumpadEnter': return { gridRow: 'span 2' }
    case 'Numpad0': return { gridColumn: 'span 2' }
    default: return {}
  }
}

// Nav cluster (平面数组，用 CSS Grid 布局)
const NAV_CELLS: KeyDef[] = [
  { code: 'Insert', label: 'Ins' },
  { code: 'Home', label: 'Home' },
  { code: 'PageUp', label: 'PgUp' },
  { code: 'Delete', label: 'Del' },
  { code: 'End', label: 'End' },
  { code: 'PageDown', label: 'PgDn' },
  { code: 'ArrowUp', label: '↑' },
  { code: 'ArrowLeft', label: '←' },
  { code: 'ArrowDown', label: '↓' },
  { code: 'ArrowRight', label: '→' },
]

const getNavStyle = (code: string): React.CSSProperties => {
  if (code === 'ArrowUp') return { gridColumn: 2 }
  return {}
}

// ============================================================
// Mouse buttons
// ============================================================
interface MouseBtn {
  code: string
  label: string
  button: number
}

const MOUSE_BUTTONS: MouseBtn[] = [
  { code: 'MouseLeft', label: '左键', button: 0 },
  { code: 'MouseMiddle', label: '中键', button: 1 },
  { code: 'MouseRight', label: '右键', button: 2 },
  { code: 'MouseBack', label: '侧前', button: 3 },
  { code: 'MouseForward', label: '侧后', button: 4 },
]

// ============================================================
// 状态管理
// ============================================================
type KeyState = 'idle' | 'pressed' | 'released'

interface KeyStatus {
  state: KeyState
  count: number
}

function createInitialStatus(): KeyStatus {
  return { state: 'idle', count: 0 }
}

// ============================================================
// 组件
// ============================================================
export default function KeyTester() {
  const [keyStatus, setKeyStatus] = useState<Record<string, KeyStatus>>({})
  const [mouseStatus, setMouseStatus] = useState<Record<string, KeyStatus>>({})
  const [eventLog, setEventLog] = useState<string[]>([])
  const [lastEvent, setLastEvent] = useState('')

  // 用 ref 追踪当前按下的键，避免闭包问题
  const activeKeysRef = useRef<Set<string>>(new Set())

  // 更新状态
  const updateKeyState = useCallback((code: string, isPress: boolean) => {
    const nowDown = activeKeysRef.current
    if (isPress) {
      nowDown.add(code)
    } else {
      nowDown.delete(code)
    }

    setKeyStatus((prev) => {
      const current = prev[code] ?? createInitialStatus()
      const newState: KeyState = isPress ? 'pressed' : 'released'
      return {
        ...prev,
        [code]: {
          state: newState,
          count: current.count + (isPress ? 1 : 0),
        },
      }
    })
  }, [])

  const updateMouseState = useCallback((code: string, isPress: boolean) => {
    setMouseStatus((prev) => {
      const current = prev[code] ?? createInitialStatus()
      const newState: KeyState = isPress ? 'pressed' : 'released'
      return {
        ...prev,
        [code]: {
          state: newState,
          count: current.count + (isPress ? 1 : 0),
        },
      }
    })
  }, [])

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      updateKeyState(e.code, true)
      setLastEvent(`↓ ${e.code}${e.key ? ` (${e.key})` : ''}`)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      updateKeyState(e.code, false)
      setLastEvent(`↑ ${e.code}${e.key ? ` (${e.key})` : ''}`)
    }

    const opts: AddEventListenerOptions = { capture: true, passive: false }
    window.addEventListener('keydown', handleKeyDown as EventListener, opts)
    window.addEventListener('keyup', handleKeyUp as EventListener, opts)
    return () => {
      window.removeEventListener('keydown', handleKeyDown as EventListener, opts)
      window.removeEventListener('keyup', handleKeyUp as EventListener, opts)
    }
  }, [updateKeyState])

  // 鼠标事件
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const btn = MOUSE_BUTTONS.find((b) => b.button === e.button)
      if (btn) {
        updateMouseState(btn.code, true)
        setLastEvent(`↓ ${btn.label}`)
      }
    }
    const handleMouseUp = (e: MouseEvent) => {
      const btn = MOUSE_BUTTONS.find((b) => b.button === e.button)
      if (btn) {
        updateMouseState(btn.code, false)
        setLastEvent(`↑ ${btn.label}`)
      }
    }

    window.addEventListener('mousedown', handleMouseDown, true)
    window.addEventListener('mouseup', handleMouseUp, true)
    return () => {
      window.removeEventListener('mousedown', handleMouseDown, true)
      window.removeEventListener('mouseup', handleMouseUp, true)
    }
  }, [updateMouseState])

  // 事件日志（最近20条）
  useEffect(() => {
    if (!lastEvent) return
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    setEventLog((prev) => {
      const next = [`${timestamp}  ${lastEvent}`, ...prev]
      if (next.length > 20) next.pop()
      return next
    })
  }, [lastEvent])

  // 清除记录
  const clearAll = useCallback(() => {
    setKeyStatus({})
    setMouseStatus({})
    setEventLog([])
    setLastEvent('')
  }, [])

  // 渲染单个按键
  const renderKey = (def: KeyDef, status: KeyStatus | undefined) => {
    if (!def.code) {
      return <div className="kt-key kt-key--spacer" style={def.width ? { flex: def.width } : undefined} />
    }

    const st = status ?? createInitialStatus()
    return (
      <div
        className={`kt-key kt-key--${st.state}`}
        style={def.width ? { flex: def.width } : undefined}
        title={`${def.code}${st.count > 0 ? ` · 按压 ${st.count} 次` : ''}`}
        data-code={def.code}
      >
        <span className="kt-key-label">{def.label}</span>
        {st.count > 0 && <span className="kt-key-count">{st.count}</span>}
      </div>
    )
  }

  // 预计算已触发的键的状态
  const allKeyCodes = useMemo(() => {
    const codes: string[] = []
    KEYBOARD_ROWS.forEach((row) => row.forEach((k) => { if (k.code) codes.push(k.code) }))
    NUMPAD_CELLS.forEach((k) => { if (k.code) codes.push(k.code) })
    NAV_CELLS.forEach((k) => { if (k.code) codes.push(k.code) })
    return codes
  }, [])

  const totalPresses = useMemo(() => {
    let count = 0
    allKeyCodes.forEach((c) => { count += keyStatus[c]?.count ?? 0 })
    MOUSE_BUTTONS.forEach((b) => { count += mouseStatus[b.code]?.count ?? 0 })
    return count
  }, [keyStatus, mouseStatus, allKeyCodes])

  const activeCount = useMemo(() => {
    let count = 0
    allKeyCodes.forEach((c) => { if (keyStatus[c]?.state === 'pressed') count++ })
    MOUSE_BUTTONS.forEach((b) => { if (mouseStatus[b.code]?.state === 'pressed') count++ })
    return count
  }, [keyStatus, mouseStatus, allKeyCodes])

  return (
    <ToolPageLayout toolId="key-tester">
      <WorkspaceHeader title="键盘 & 鼠标检测">
        <button className="button secondary" onClick={clearAll} style={{ fontSize: '0.8rem' }}>
          清除记录
        </button>
      </WorkspaceHeader>

      <WorkspaceBody>
        <div className="key-tester">
          {/* 状态栏 */}
          <div className="kt-stats">
            <div className="kt-stat">
              <span className="kt-stat-value">{totalPresses}</span>
              <span className="kt-stat-label">总按压次数</span>
            </div>
            <div className="kt-stat">
              <span className="kt-stat-value">{activeCount}</span>
              <span className="kt-stat-label">当前按住</span>
            </div>
          </div>

          {/* 图例 */}
          <div className="kt-legend">
            <div className="kt-legend-item">
              <span className="kt-legend-dot kt-legend-dot--idle" />
              <span>未按</span>
            </div>
            <div className="kt-legend-item">
              <span className="kt-legend-dot kt-legend-dot--pressed" />
              <span>按中</span>
            </div>
            <div className="kt-legend-item">
              <span className="kt-legend-dot kt-legend-dot--released" />
              <span>按过</span>
            </div>
          </div>

          {/* 主体：键盘 + 侧边区域 */}
          <div className="kt-main">
            {/* 左侧：主键盘 */}
            <div className="kt-keyboard">
              {KEYBOARD_ROWS.map((row, ri) => (
                <div className="kt-row" key={ri}>
                  {row.map((def) => renderKey(def, keyStatus[def.code]))}
                </div>
              ))}
            </div>

            {/* 右侧：小键盘 + 导航键 */}
            <div className="kt-right-block">
              {/* Numpad */}
              <div className="kt-numpad">
                <div className="kt-section-label">小键盘</div>
                <div className="kt-numpad-grid">
                  {NUMPAD_CELLS.map((def) => {
                    const st = keyStatus[def.code] ?? createInitialStatus()
                    return (
                      <div
                        key={def.code}
                        className={`kt-key kt-key--${st.state}`}
                        style={getNumpadStyle(def.code)}
                        title={`${def.code}${st.count > 0 ? ` · 按压 ${st.count} 次` : ''}`}
                      >
                        <span className="kt-key-label">{def.label}</span>
                        {st.count > 0 && <span className="kt-key-count">{st.count}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 导航键区 */}
              <div className="kt-nav-keys">
                <div className="kt-section-label">导航</div>
                <div className="kt-nav-grid">
                  {NAV_CELLS.map((def) => {
                    const st = keyStatus[def.code] ?? createInitialStatus()
                    return (
                      <div
                        key={def.code}
                        className={`kt-key kt-key--${st.state}`}
                        style={getNavStyle(def.code)}
                        title={`${def.code}${st.count > 0 ? ` · 按压 ${st.count} 次` : ''}`}
                      >
                        <span className="kt-key-label">{def.label}</span>
                        {st.count > 0 && <span className="kt-key-count">{st.count}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 鼠标检测区 */}
          <div className="kt-section-label" style={{ marginTop: '24px' }}>鼠标</div>
          <div className="kt-mouse-area">
            {MOUSE_BUTTONS.map((btn) => {
              const st = mouseStatus[btn.code] ?? createInitialStatus()
              return (
                <div
                  key={btn.code}
                  className={`kt-mouse-btn kt-mouse-btn--${st.state}`}
                  title={`${btn.label}${st.count > 0 ? ` · 按压 ${st.count} 次` : ''}`}
                >
                  <span className="kt-mouse-btn-label">{btn.label}</span>
                  {st.count > 0 && <span className="kt-mouse-btn-count">{st.count}</span>}
                </div>
              )
            })}
          </div>

          {/* 事件日志 */}
          <div className="kt-section-label" style={{ marginTop: '24px' }}>事件日志（最近20条）</div>
          <div className="kt-log">
            {eventLog.length === 0 ? (
              <div className="kt-log-empty">点击键盘或鼠标开始记录...</div>
            ) : (
              eventLog.map((entry, i) => (
                <div key={i} className={`kt-log-entry ${entry.startsWith('↓') ? 'kt-log--down' : 'kt-log--up'}`}>
                  {entry}
                </div>
              ))
            )}
          </div>
        </div>
      </WorkspaceBody>
    </ToolPageLayout>
  )
}
