import { useState, useCallback, useEffect } from 'react'
import { Copy, RefreshCw, Check } from 'lucide-react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'

const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
}

function generatePassword(length: number, options: { uppercase: boolean; lowercase: boolean; numbers: boolean; symbols: boolean }): string {
  let chars = ''
  const required: string[] = []

  if (options.uppercase) {
    chars += CHAR_SETS.uppercase
    required.push(CHAR_SETS.uppercase[Math.floor(Math.random() * CHAR_SETS.uppercase.length)])
  }
  if (options.lowercase) {
    chars += CHAR_SETS.lowercase
    required.push(CHAR_SETS.lowercase[Math.floor(Math.random() * CHAR_SETS.lowercase.length)])
  }
  if (options.numbers) {
    chars += CHAR_SETS.numbers
    required.push(CHAR_SETS.numbers[Math.floor(Math.random() * CHAR_SETS.numbers.length)])
  }
  if (options.symbols) {
    chars += CHAR_SETS.symbols
    required.push(CHAR_SETS.symbols[Math.floor(Math.random() * CHAR_SETS.symbols.length)])
  }

  if (!chars) {
    chars = CHAR_SETS.lowercase
  }

  let password = required.join('')
  const remainingLength = length - required.length

  for (let i = 0; i < remainingLength; i++) {
    password += chars[Math.floor(Math.random() * chars.length)]
  }

  return password.split('').sort(() => Math.random() - 0.5).join('')
}

export default function PasswordTool() {
  const [password, setPassword] = useState('')
  const [length, setLength] = useState(16)
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  })
  const [copied, setCopied] = useState(false)

  const generate = useCallback(() => {
    setPassword(generatePassword(length, options))
    setCopied(false)
  }, [length, options])

  const handleCopy = useCallback(async () => {
    if (!password) return
    await navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [password])

  const toggleOption = useCallback((key: keyof typeof options) => {
    const newOptions = { ...options, [key]: !options[key] }
    const hasAnyOption = Object.values(newOptions).some(v => v)
    if (hasAnyOption) {
      setOptions(newOptions)
    }
  }, [options])

  useEffect(() => {
    generate()
  }, [])

  return (
    <ToolPageLayout toolId="password">
      <WorkspaceHeader title={password || '密码生成'} />
      <WorkspaceBody>
        <div className="password-tool">
          <div className="password-display">
            <input
              type="text"
              className="password-input"
              value={password}
              readOnly
              placeholder="点击生成按钮创建密码"
            />
            <button className="button secondary" onClick={handleCopy} disabled={!password}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>

          <div className="password-controls">
            <div className="length-control">
              <label>密码长度</label>
              <div className="length-row">
                <input
                  type="range"
                  min={4}
                  max={64}
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="length-slider"
                />
                <span className="length-value">{length}</span>
              </div>
            </div>

            <div className="options-grid">
              <label className="option-label">
                <input
                  type="checkbox"
                  checked={options.uppercase}
                  onChange={() => toggleOption('uppercase')}
                />
                <span>大写字母 (A-Z)</span>
              </label>
              <label className="option-label">
                <input
                  type="checkbox"
                  checked={options.lowercase}
                  onChange={() => toggleOption('lowercase')}
                />
                <span>小写字母 (a-z)</span>
              </label>
              <label className="option-label">
                <input
                  type="checkbox"
                  checked={options.numbers}
                  onChange={() => toggleOption('numbers')}
                />
                <span>数字 (0-9)</span>
              </label>
              <label className="option-label">
                <input
                  type="checkbox"
                  checked={options.symbols}
                  onChange={() => toggleOption('symbols')}
                />
                <span>特殊字符 (!@#$)</span>
              </label>
            </div>
          </div>

          <button className="button primary" onClick={generate}>
            <RefreshCw size={16} /> 生成密码
          </button>
        </div>
      </WorkspaceBody>
    </ToolPageLayout>
  )
}