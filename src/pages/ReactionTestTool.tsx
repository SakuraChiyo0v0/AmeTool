import { useState, useRef, useCallback, useEffect } from 'react'
import { Zap, RotateCcw, TrendingDown, History, Trophy } from 'lucide-react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'

type Phase = 'idle' | 'countdown' | 'waiting' | 'ready' | 'result' | 'too-early'

interface AttemptRecord {
  time: number
  timestamp: number
}

const STORAGE_KEY = 'reaction-test-history'
const BEST_KEY = 'reaction-test-best'

function getRating(ms: number): { label: string; color: string; emoji: string } {
  if (ms < 200) return { label: '闪电般的反应！', color: '#f59e0b', emoji: '⚡' }
  if (ms < 250) return { label: '优秀！职业选手水平', color: '#10b981', emoji: '🏆' }
  if (ms < 300) return { label: '非常好！', color: '#22c55e', emoji: '👏' }
  if (ms < 350) return { label: '不错！高于平均', color: '#3b82f6', emoji: '👍' }
  if (ms < 450) return { label: '还行，平均水平', color: '#6366f1', emoji: '😊' }
  if (ms < 550) return { label: '偏慢，继续加油', color: '#f97316', emoji: '💪' }
  return { label: '需要多练习！', color: '#ef4444', emoji: '🫢' }
}

function loadHistory(): AttemptRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveHistory(records: AttemptRecord[]) {
  const trimmed = records.slice(0, 20)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

function loadBest(): number | null {
  try {
    const raw = localStorage.getItem(BEST_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return null
}

function saveBest(ms: number) {
  localStorage.setItem(BEST_KEY, JSON.stringify(ms))
}

export default function ReactionTestTool() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [countdownNum, setCountdownNum] = useState(3)
  const [reactionTime, setReactionTime] = useState(0)
  const [history, setHistory] = useState<AttemptRecord[]>(loadHistory)
  const [bestTime, setBestTime] = useState<number | null>(loadBest)
  const [attemptCount, setAttemptCount] = useState(0)

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const startTime = useRef(0)
  const randomDelay = useRef(0)

  const clearAllTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const reset = useCallback(() => {
    clearAllTimers()
    setPhase('idle')
    setCountdownNum(3)
    setReactionTime(0)
  }, [clearAllTimers])

  const handleResult = useCallback((time: number) => {
    setReactionTime(time)
    setPhase('result')

    const newRecord: AttemptRecord = { time, timestamp: Date.now() }
    const newHistory = [newRecord, ...history].slice(0, 20)
    setHistory(newHistory)
    saveHistory(newHistory)

    if (bestTime === null || time < bestTime) {
      setBestTime(time)
      saveBest(time)
    }

    setAttemptCount((c) => c + 1)
  }, [history, bestTime])

  const handleEarly = useCallback(() => {
    clearAllTimers()
    setPhase('too-early')
  }, [clearAllTimers])

  const startCountdown = useCallback(() => {
    setPhase('countdown')
    const delays = [1000, 2000, 3000]

    delays.forEach((delay, i) => {
      const t = setTimeout(() => {
        setCountdownNum(2 - i)
      }, delay)
      timers.current.push(t)
    })

    // After countdown, enter waiting phase
    const t = setTimeout(() => {
      setPhase('waiting')
      // Random delay between 1500ms and 5000ms
      const delay = Math.random() * 3500 + 1500
      randomDelay.current = delay

      const readyTimer = setTimeout(() => {
        setPhase('ready')
        startTime.current = performance.now()
      }, delay)
      timers.current.push(readyTimer)
    }, 3500) // 3 seconds countdown + small buffer
    timers.current.push(t)
  }, [])

  const handleClick = useCallback(() => {
    if (phase === 'ready') {
      const endTime = performance.now()
      const reactionTime = Math.round(endTime - startTime.current)
      clearAllTimers()
      handleResult(reactionTime)
    } else if (phase === 'waiting' || phase === 'countdown') {
      handleEarly()
    }
  }, [phase, clearAllTimers, handleResult, handleEarly])

  // Keyboard support: space bar to start / click
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (phase === 'idle' || phase === 'result' || phase === 'too-early') {
          startCountdown()
        } else if (phase === 'ready' || phase === 'waiting' || phase === 'countdown') {
          handleClick()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, startCountdown, handleClick])

  // Cleanup on unmount
  useEffect(() => () => clearAllTimers(), [clearAllTimers])

  const avgTime = history.length > 0
    ? Math.round(history.reduce((a, b) => a + b.time, 0) / history.length)
    : null

  const rating = phase === 'result' ? getRating(reactionTime) : null

  const renderTestArea = () => {
    switch (phase) {
      case 'idle':
        return (
          <div
            onClick={startCountdown}
            className="reaction-area reaction-idle"
            role="button"
            tabIndex={0}
            aria-label="开始反应测试"
          >
            <div className="reaction-inner">
              <Zap size={48} className="reaction-icon" />
              <h2 className="reaction-title">反应速度测试</h2>
              <p className="reaction-subtitle">点击屏幕或按空格键开始</p>
              <p className="reaction-hint">当屏幕变绿时尽快点击！</p>
            </div>
          </div>
        )
      case 'countdown':
        return (
          <div className="reaction-area reaction-countdown">
            <div className="reaction-inner">
              <span className="countdown-number" key={countdownNum}>
                {countdownNum}
              </span>
              <p className="countdown-label">准备...</p>
            </div>
          </div>
        )
      case 'waiting':
        return (
          <div
            onClick={handleClick}
            className="reaction-area reaction-waiting"
            role="button"
            tabIndex={0}
            aria-label="等待绿色"
          >
            <div className="reaction-inner">
              <span className="waiting-text">等待绿色...</span>
              <p className="waiting-hint">不要提前点击！</p>
            </div>
          </div>
        )
      case 'ready':
        return (
          <div
            onClick={handleClick}
            className="reaction-area reaction-go"
            role="button"
            tabIndex={0}
            aria-label="立即点击"
          >
            <div className="reaction-inner">
              <span className="go-text">点击！</span>
            </div>
          </div>
        )
      case 'too-early':
        return (
          <div
            onClick={startCountdown}
            className="reaction-area reaction-early"
            role="button"
            tabIndex={0}
            aria-label="重新开始"
          >
            <div className="reaction-inner">
              <span className="early-title">太早了！</span>
              <p className="early-subtitle">在屏幕变绿之前不要点击</p>
              <button className="button primary" onClick={(e) => { e.stopPropagation(); startCountdown() }}>
                <RotateCcw size={16} /> 再来一次
              </button>
            </div>
          </div>
        )
      case 'result':
        return (
          <div className="reaction-area reaction-result" style={{ '--rating-color': rating?.color } as React.CSSProperties}>
            <div className="reaction-inner">
              <div className="result-main">
                <span className="result-time">{reactionTime}<span className="result-unit">ms</span></span>
                <span className="result-rating" style={{ color: rating?.color }}>
                  {rating?.emoji} {rating?.label}
                </span>
              </div>
              <div className="result-actions">
                <button className="button primary" onClick={(e) => { e.stopPropagation(); startCountdown() }}>
                  <RotateCcw size={16} /> 再来一次
                </button>
                <button className="button secondary" onClick={(e) => { e.stopPropagation(); reset() }}>
                  返回
                </button>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <ToolPageLayout toolId="reaction-test">
      <WorkspaceHeader title="反应速度测试" />
      <WorkspaceBody>
        <div className="reaction-tool">
          {renderTestArea()}

          {/* Stats Panel */}
          <div className="reaction-stats">
            <div className="stats-row">
              <div className="stat-item">
                <Trophy size={18} className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-label">最快记录</span>
                  <span className="stat-value">{bestTime !== null ? `${bestTime} ms` : '--'}</span>
                </div>
              </div>
              <div className="stat-item">
                <TrendingDown size={18} className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-label">平均时间</span>
                  <span className="stat-value">{avgTime !== null ? `${avgTime} ms` : '--'}</span>
                </div>
              </div>
              <div className="stat-item">
                <History size={18} className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-label">测试次数</span>
                  <span className="stat-value">{attemptCount}</span>
                </div>
              </div>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="history-section">
                <h4 className="history-title">最近记录</h4>
                <div className="history-list">
                  {history.slice(0, 10).map((record, i) => {
                    const r = getRating(record.time)
                    return (
                      <div key={i} className="history-item">
                        <span className="history-rank">#{i + 1}</span>
                        <span className="history-time">{record.time} ms</span>
                        <span className="history-rating" style={{ color: r.color }}>{r.emoji}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="reaction-legend">
            <span className="legend-title">评级参考：</span>
            <div className="legend-items">
              <span style={{ color: '#f59e0b' }}>⚡ &lt;200ms 极快</span>
              <span style={{ color: '#10b981' }}>🏆 200-250ms 优秀</span>
              <span style={{ color: '#22c55e' }}>👏 250-300ms 非常好</span>
              <span style={{ color: '#3b82f6' }}>👍 300-350ms 不错</span>
              <span style={{ color: '#6366f1' }}>😊 350-450ms 平均</span>
              <span style={{ color: '#f97316' }}>💪 450-550ms 偏慢</span>
              <span style={{ color: '#ef4444' }}>🫢 &gt;550ms 需练习</span>
            </div>
          </div>
        </div>
      </WorkspaceBody>
    </ToolPageLayout>
  )
}
