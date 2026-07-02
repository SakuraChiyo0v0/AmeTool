import { useState, useCallback } from 'react'
import { Delete } from 'lucide-react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'

type Op = '+' | '-' | '×' | '÷' | null

function calculate(a: number, b: number, op: Op): number {
  switch (op) {
    case '+': return a + b
    case '-': return a - b
    case '×': return a * b
    case '÷': return b !== 0 ? a / b : NaN
    default: return b
  }
}

function formatNumber(n: number): string {
  if (isNaN(n) || !isFinite(n)) return 'Error'
  const s = n.toPrecision(12)
  return parseFloat(s).toString()
}

const buttons = [
  ['C', '±', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '='],
] as const

export default function CalculatorPage() {
  const [display, setDisplay] = useState('0')
  const [prevValue, setPrevValue] = useState(0)
  const [operator, setOperator] = useState<Op>(null)
  const [waiting, setWaiting] = useState(false)
  const [expression, setExpression] = useState('')

  const handleNumber = useCallback((num: string) => {
    if (waiting) { setDisplay(num); setWaiting(false) }
    else setDisplay((prev) => {
      if (prev === '0' && num !== '.') return num
      if (num === '.' && prev.includes('.')) return prev
      if (prev.replace(/[.-]/g, '').length >= 12) return prev
      return prev + num
    })
  }, [waiting])

  const handleOperator = useCallback((op: Op) => {
    const current = parseFloat(display)
    if (operator && !waiting) {
      const result = calculate(prevValue, current, operator)
      setDisplay(formatNumber(result))
      setPrevValue(result)
    } else { setPrevValue(current) }
    setExpression(`${formatNumber(prevValue || current)} ${op ?? ''}`)
    setOperator(op)
    setWaiting(true)
  }, [display, operator, prevValue, waiting])

  const handleEquals = useCallback(() => {
    if (!operator) return
    const current = parseFloat(display)
    const result = calculate(prevValue, current, operator)
    setExpression(`${formatNumber(prevValue)} ${operator} ${formatNumber(current)} =`)
    setDisplay(formatNumber(result))
    setPrevValue(result)
    setOperator(null)
    setWaiting(true)
  }, [display, operator, prevValue])

  const handleClear = useCallback(() => {
    setDisplay('0'); setPrevValue(0); setOperator(null); setWaiting(false); setExpression('')
  }, [])

  const handleToggleSign = useCallback(() => {
    setDisplay((prev) => prev === '0' ? prev : prev.startsWith('-') ? prev.slice(1) : '-' + prev)
  }, [])

  const handlePercent = useCallback(() => {
    setDisplay(formatNumber(parseFloat(display) / 100))
  }, [display])

  const handleDelete = useCallback(() => {
    setDisplay((prev) => prev.length <= 1 || prev === 'Error' ? '0' : prev.slice(0, -1))
  }, [])

  const handleButton = useCallback((btn: string) => {
    switch (btn) {
      case 'C': return handleClear()
      case '±': return handleToggleSign()
      case '%': return handlePercent()
      case '+': return handleOperator('+')
      case '-': return handleOperator('-')
      case '×': return handleOperator('×')
      case '÷': return handleOperator('÷')
      case '=': return handleEquals()
      default: return handleNumber(btn)
    }
  }, [handleClear, handleToggleSign, handlePercent, handleOperator, handleEquals, handleNumber])

  const getBtnClass = (btn: string) => {
    if (btn === '=') return 'calc-btn equals'
    if (['+', '-', '×', '÷'].includes(btn)) return 'calc-btn op'
    if (btn === '0') return 'calc-btn zero'
    return 'calc-btn'
  }

  return (
    <ToolPageLayout toolId="calculator">
      <WorkspaceHeader title="标准模式" />
      <WorkspaceBody>
        <div className="calculator">
          <div className="calc-display">
            <div className="calc-expression">{expression}</div>
            <div className="calc-result" style={{ fontSize: display.length > 10 ? 28 : 42 }}>{display}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <button className="button ghost compact" onClick={handleDelete} aria-label="删除最后一位">
              <Delete size={16} /> 退格
            </button>
          </div>
          <div className="calc-grid">
            {buttons.flat().map((btn) => (
              <button key={btn} className={getBtnClass(btn)} onClick={() => handleButton(btn)}>{btn}</button>
            ))}
          </div>
        </div>
      </WorkspaceBody>
    </ToolPageLayout>
  )
}
