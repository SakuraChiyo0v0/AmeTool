import { useState, useCallback } from 'react'
import { Copy, Trash2, Check, FileJson } from 'lucide-react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceSplit } from '../components/ToolPageLayout'

export default function JsonFormatter() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [indent, setIndent] = useState(2)

  const validateJson = useCallback((text: string): boolean => {
    if (!text.trim()) return true
    try {
      JSON.parse(text)
      return true
    } catch {
      return false
    }
  }, [])

  const handleFormat = useCallback(() => {
    if (!input.trim()) {
      setOutput('')
      setError('')
      return
    }
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed, null, indent))
      setError('')
    } catch (e: any) {
      setOutput('')
      setError(`JSON 语法错误: ${e.message}`)
    }
  }, [input, indent])

  const handleMinify = useCallback(() => {
    if (!input.trim()) {
      setOutput('')
      setError('')
      return
    }
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed))
      setError('')
    } catch (e: any) {
      setOutput('')
      setError(`JSON 语法错误: ${e.message}`)
    }
  }, [input])

  const handleCopy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [output])

  const handleClear = useCallback(() => {
    setInput('')
    setOutput('')
    setError('')
  }, [])

  const isValid = validateJson(input)

  return (
    <ToolPageLayout toolId="json-formatter">
      <WorkspaceHeader title={isValid && input.trim() ? '有效 JSON' : error || '输入 JSON'}>
        <div className="json-actions">
          <button className="button ghost compact" onClick={handleClear}>
            <Trash2 size={14} /> 清空
          </button>
        </div>
      </WorkspaceHeader>
      <WorkspaceSplit leftWidth="50%" left={
        <div className="json-input-section">
          <div className="section-header">
            <span className="section-title">输入</span>
            {input.trim() && (
              <span className={`validation-badge ${isValid ? 'valid' : 'invalid'}`}>
                {isValid ? '✓ 有效' : '✗ 语法错误'}
              </span>
            )}
          </div>
          <textarea
            className="json-textarea"
            placeholder="在此输入 JSON 文本..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
          />
          <div className="json-controls">
            <div className="indent-control">
              <label>缩进空格数</label>
              <select
                value={indent}
                onChange={(e) => setIndent(Number(e.target.value))}
                className="indent-select"
              >
                <option value={2}>2 空格</option>
                <option value={4}>4 空格</option>
                <option value={8}>8 空格</option>
              </select>
            </div>
            <div className="action-buttons">
              <button className="button primary" onClick={handleFormat} disabled={!input.trim()}>
                <FileJson size={16} /> 格式化
              </button>
              <button className="button secondary" onClick={handleMinify} disabled={!input.trim()}>
                <FileJson size={16} /> 压缩
              </button>
            </div>
          </div>
        </div>
      } right={
        <div className="json-output-section">
          <div className="section-header">
            <span className="section-title">输出</span>
            {output && (
              <button className="button ghost compact copy-btn" onClick={handleCopy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? '已复制' : '复制'}
              </button>
            )}
          </div>
          {error ? (
            <div className="json-error">{error}</div>
          ) : (
            <textarea
              className="json-textarea"
              placeholder="格式化后的 JSON 将显示在这里..."
              value={output}
              readOnly
              spellCheck={false}
            />
          )}
        </div>
      } />
    </ToolPageLayout>
  )
}