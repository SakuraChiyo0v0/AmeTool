import { useCallback, useMemo, useState } from 'react'
import { Check, Copy, Dices, RefreshCw, Trash2 } from 'lucide-react'
import ToolPageLayout, { WorkspaceBody, WorkspaceHeader } from '../components/ToolPageLayout'

type NumberType = 'integer' | 'decimal'
type SortMode = 'none' | 'asc' | 'desc'
type Separator = 'newline' | 'comma' | 'space' | 'semicolon'

interface RandomOptions {
  min: number
  max: number
  count: number
  type: NumberType
  decimals: number
  allowDuplicate: boolean
  sortMode: SortMode
  step: number
  separator: Separator
  seed: string
}

const DEFAULT_OPTIONS: RandomOptions = {
  min: 1,
  max: 100,
  count: 10,
  type: 'integer',
  decimals: 2,
  allowDuplicate: true,
  sortMode: 'none',
  step: 1,
  separator: 'newline',
  seed: '',
}

const separatorMap: Record<Separator, string> = {
  newline: '\n',
  comma: ', ',
  space: ' ',
  semicolon: '; ',
}

function createSeededRandom(seed: string) {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return () => {
    hash += 0x6d2b79f5
    let value = hash
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getIntegerPool(min: number, max: number, step: number) {
  const start = Math.ceil(min)
  const end = Math.floor(max)
  const safeStep = Math.max(1, Math.floor(step))
  const pool: number[] = []

  for (let value = start; value <= end; value += safeStep) {
    pool.push(value)
  }

  return pool
}

function generateRandomNumbers(options: RandomOptions) {
  const min = Math.min(options.min, options.max)
  const max = Math.max(options.min, options.max)
  const count = clampNumber(Math.floor(options.count), 1, 1000)
  const random = options.seed ? createSeededRandom(options.seed) : Math.random
  const values: number[] = []

  if (options.type === 'integer') {
    const pool = getIntegerPool(min, max, options.step)
    if (pool.length === 0) return []

    if (options.allowDuplicate) {
      for (let i = 0; i < count; i++) {
        values.push(pool[Math.floor(random() * pool.length)])
      }
    } else {
      const shuffled = [...pool]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      values.push(...shuffled.slice(0, count))
    }
  } else {
    const decimals = clampNumber(Math.floor(options.decimals), 0, 12)
    const factor = 10 ** decimals
    const seen = new Set<number>()
    const maxAttempts = count * 50

    for (let attempts = 0; values.length < count && attempts < maxAttempts; attempts++) {
      const raw = min + random() * (max - min)
      const value = Math.round(raw * factor) / factor
      if (!options.allowDuplicate && seen.has(value)) continue
      seen.add(value)
      values.push(value)
    }
  }

  if (options.sortMode === 'asc') return values.sort((a, b) => a - b)
  if (options.sortMode === 'desc') return values.sort((a, b) => b - a)
  return values
}

function formatValue(value: number, type: NumberType, decimals: number) {
  if (type === 'integer') return String(value)
  return value.toFixed(decimals).replace(/\.?0+$/, '')
}

export default function RandomNumberTool() {
  const [options, setOptions] = useState<RandomOptions>(DEFAULT_OPTIONS)
  const [results, setResults] = useState<number[]>(() => generateRandomNumbers(DEFAULT_OPTIONS))
  const [history, setHistory] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const maxUniqueCount = useMemo(() => {
    if (options.type !== 'integer') return null
    const min = Math.min(options.min, options.max)
    const max = Math.max(options.min, options.max)
    return getIntegerPool(min, max, options.step).length
  }, [options.min, options.max, options.step, options.type])

  const resultText = useMemo(() => {
    return results
      .map((value) => formatValue(value, options.type, options.decimals))
      .join(separatorMap[options.separator])
  }, [options.decimals, options.separator, options.type, results])

  const stats = useMemo(() => {
    if (results.length === 0) return null
    const sum = results.reduce((total, value) => total + value, 0)
    return {
      min: Math.min(...results),
      max: Math.max(...results),
      average: sum / results.length,
      unique: new Set(results).size,
    }
  }, [results])

  const updateOption = useCallback(<K extends keyof RandomOptions>(key: K, value: RandomOptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }))
  }, [])

  const generate = useCallback(() => {
    const nextResults = generateRandomNumbers(options)
    const nextText = nextResults
      .map((value) => formatValue(value, options.type, options.decimals))
      .join(separatorMap[options.separator])

    setResults(nextResults)
    setCopied(false)
    if (nextText) {
      setHistory((prev) => [nextText, ...prev.filter((item) => item !== nextText)].slice(0, 6))
    }
  }, [options])

  const copyResult = useCallback(async () => {
    if (!resultText) return
    await navigator.clipboard.writeText(resultText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [resultText])

  const reset = useCallback(() => {
    setOptions(DEFAULT_OPTIONS)
    setResults(generateRandomNumbers(DEFAULT_OPTIONS))
    setCopied(false)
  }, [])

  const uniqueWarning = !options.allowDuplicate && maxUniqueCount !== null && options.count > maxUniqueCount

  return (
    <ToolPageLayout toolId="random-number">
      <WorkspaceHeader title={results.length > 0 ? `已生成 ${results.length} 个随机数` : '随机数生成'}>
        <button className="button ghost compact" onClick={reset}>
          <Trash2 size={14} /> 重置
        </button>
      </WorkspaceHeader>
      <WorkspaceBody>
        <div className="random-tool">
          <div className="random-result-card">
            <div className="random-result-header">
              <div>
                <span className="section-title">生成结果</span>
                <p>支持复制、排序、去重和固定种子复现。</p>
              </div>
              <div className="action-buttons">
                <button className="button secondary" onClick={copyResult} disabled={!resultText}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? '已复制' : '复制'}
                </button>
                <button className="button primary" onClick={generate}>
                  <RefreshCw size={16} /> 生成
                </button>
              </div>
            </div>
            <textarea className="random-output" value={resultText} readOnly placeholder="点击生成随机数" />
            {stats && (
              <div className="random-stats">
                <span>最小：{formatValue(stats.min, options.type, options.decimals)}</span>
                <span>最大：{formatValue(stats.max, options.type, options.decimals)}</span>
                <span>平均：{formatValue(stats.average, 'decimal', 4)}</span>
                <span>唯一值：{stats.unique}</span>
              </div>
            )}
          </div>

          <div className="random-settings">
            <div className="format-card">
              <label>数字类型</label>
              <div className="random-segmented">
                <button className={options.type === 'integer' ? 'active' : ''} onClick={() => updateOption('type', 'integer')}>整数</button>
                <button className={options.type === 'decimal' ? 'active' : ''} onClick={() => updateOption('type', 'decimal')}>小数</button>
              </div>
            </div>

            <div className="format-card random-range-grid">
              <label>范围设置</label>
              <div className="format-input-group">
                <span>最小值</span>
                <input className="format-input" type="number" step="any" value={options.min} onChange={(e) => updateOption('min', Number(e.target.value))} />
              </div>
              <div className="format-input-group">
                <span>最大值</span>
                <input className="format-input" type="number" step="any" value={options.max} onChange={(e) => updateOption('max', Number(e.target.value))} />
              </div>
            </div>

            <div className="format-card random-range-grid">
              <label>数量与精度</label>
              <div className="format-input-group">
                <span>生成数量</span>
                <input className="format-input" type="number" min={1} max={1000} value={options.count} onChange={(e) => updateOption('count', clampNumber(Number(e.target.value), 1, 1000))} />
              </div>
              {options.type === 'integer' ? (
                <div className="format-input-group">
                  <span>整数步长</span>
                  <input className="format-input" type="number" min={1} value={options.step} onChange={(e) => updateOption('step', Math.max(1, Number(e.target.value) || 1))} />
                </div>
              ) : (
                <div className="format-input-group">
                  <span>小数位数</span>
                  <input className="format-input" type="number" min={0} max={12} value={options.decimals} onChange={(e) => updateOption('decimals', clampNumber(Number(e.target.value), 0, 12))} />
                </div>
              )}
            </div>

            <div className="format-card random-options-card">
              <label>高级设置</label>
              <label className="option-label">
                <input type="checkbox" checked={options.allowDuplicate} onChange={() => updateOption('allowDuplicate', !options.allowDuplicate)} />
                <span>允许重复结果</span>
              </label>
              {uniqueWarning && <p className="random-warning">当前范围内唯一整数不足 {options.count} 个，将只生成 {maxUniqueCount} 个。</p>}
              <div className="format-input-group">
                <span>排序方式</span>
                <select className="indent-select" value={options.sortMode} onChange={(e) => updateOption('sortMode', e.target.value as SortMode)}>
                  <option value="none">不排序</option>
                  <option value="asc">从小到大</option>
                  <option value="desc">从大到小</option>
                </select>
              </div>
              <div className="format-input-group">
                <span>结果分隔</span>
                <select className="indent-select" value={options.separator} onChange={(e) => updateOption('separator', e.target.value as Separator)}>
                  <option value="newline">换行</option>
                  <option value="comma">逗号</option>
                  <option value="space">空格</option>
                  <option value="semicolon">分号</option>
                </select>
              </div>
              <div className="format-input-group">
                <span>随机种子（可选）</span>
                <input className="format-input" value={options.seed} onChange={(e) => updateOption('seed', e.target.value)} placeholder="相同种子会生成相同序列" />
              </div>
            </div>
          </div>

          {history.length > 0 && (
            <div className="random-history">
              <div className="section-header">
                <span className="section-title">最近生成</span>
                <Dices size={16} />
              </div>
              {history.map((item, index) => (
                <button key={`${item}-${index}`} onClick={() => navigator.clipboard.writeText(item)} title="点击复制该记录">
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </WorkspaceBody>
    </ToolPageLayout>
  )
}
