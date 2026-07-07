import { useState, useMemo, useCallback } from 'react'
import { Search, Trash2, Lightbulb, ShieldCheck, ShieldX } from 'lucide-react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'
import idArea from '../data/id-area.json'

// 身份证校验算法常量
const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const CHECK_CODES = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

interface IdCardResult {
  valid: boolean
  errors: string[]
  address: string
  province: string
  city: string
  district: string
  birthDate: string
  gender: string
  genderCode: string
  age: number | null
  expectedCheckCode: string
  actualCheckCode: string
  weightedSum: number
  remainder: number
}

const areaData = idArea as {
  provinces: Record<string, string>
  cities: Record<string, string>
  districts: Record<string, string>
}

function formatDate(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

function validateIdCard(id: string): IdCardResult {
  const result: IdCardResult = {
    valid: false,
    errors: [],
    address: '',
    province: '',
    city: '',
    district: '',
    birthDate: '',
    gender: '',
    genderCode: '',
    age: null,
    expectedCheckCode: '',
    actualCheckCode: '',
    weightedSum: 0,
    remainder: 0,
  }

  const clean = id.trim().toUpperCase()

  if (clean.length !== 18) {
    result.errors.push(`长度必须为 18 位，当前为 ${clean.length} 位`)
  }

  if (!/^\d{17}[\dX]$/.test(clean)) {
    result.errors.push('前 17 位必须为数字，第 18 位为数字或 X')
  }

  // 解析归属地
  const provinceCode = clean.slice(0, 2)
  const cityCode = clean.slice(0, 4)
  const districtCode = clean.slice(0, 6)

  result.province = areaData.provinces[provinceCode] || ''
  result.city = areaData.cities[cityCode] || ''
  result.district = areaData.districts[districtCode] || ''

  if (!result.province) {
    result.errors.push('身份证前 2 位省份代码无效')
  }
  if (!result.city) {
    result.errors.push('身份证前 4 位城市代码无效')
  }
  if (!result.district) {
    result.errors.push('身份证前 6 位区县代码无效')
  }

  const parts = [result.province, result.city, result.district].filter(Boolean)
  result.address = parts.join('')

  // 解析出生日期
  const birthStr = clean.slice(6, 14)
  if (/^\d{8}$/.test(birthStr)) {
    const year = Number(birthStr.slice(0, 4))
    const month = Number(birthStr.slice(4, 6))
    const day = Number(birthStr.slice(6, 8))
    const birthDate = new Date(year, month - 1, day)
    const now = new Date()

    if (
      birthDate.getFullYear() !== year ||
      birthDate.getMonth() + 1 !== month ||
      birthDate.getDate() !== day
    ) {
      result.errors.push(`出生日期 ${formatDate(birthStr)} 不存在`)
    } else if (birthDate > now) {
      result.errors.push('出生日期不能晚于今天')
    } else {
      result.birthDate = formatDate(birthStr)
      result.age = Math.max(0, now.getFullYear() - year - (now.getMonth() * 100 + now.getDate() < (month - 1) * 100 + day ? 1 : 0))
    }
  }

  // 解析性别
  const genderCode = clean.slice(16, 17)
  if (/^\d$/.test(genderCode)) {
    const g = Number(genderCode)
    result.genderCode = genderCode
    result.gender = g % 2 === 1 ? '男' : '女'
  }

  // 校验码计算
  if (/^\d{17}/.test(clean)) {
    let sum = 0
    for (let i = 0; i < 17; i++) {
      sum += Number(clean[i]) * WEIGHTS[i]
    }
    result.weightedSum = sum
    result.remainder = sum % 11
    result.expectedCheckCode = CHECK_CODES[result.remainder]
  }

  result.actualCheckCode = clean.slice(17, 18)

  if (result.expectedCheckCode && result.actualCheckCode && result.expectedCheckCode !== result.actualCheckCode) {
    result.errors.push(`校验码错误，应为 ${result.expectedCheckCode}，当前为 ${result.actualCheckCode}`)
  }

  if (result.errors.length === 0 && clean.length === 18) {
    result.valid = true
  }

  return result
}

export default function IdCardTool() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<IdCardResult | null>(null)
  const [touched, setTouched] = useState(false)

  const exampleId = '11010519491231002X'

  const handleQuery = useCallback(() => {
    setTouched(true)
    if (!input.trim()) return
    setResult(validateIdCard(input))
  }, [input])

  const handleClear = useCallback(() => {
    setInput('')
    setResult(null)
    setTouched(false)
  }, [])

  const handleExample = useCallback(() => {
    setInput(exampleId)
    setTouched(true)
    setResult(validateIdCard(exampleId))
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase()
    if (/^[\dX]*$/.test(value) && value.length <= 18) {
      setInput(value)
    }
  }

  // 加权因子表和校验码表是固定值
  const factorTable = useMemo(() => {
    return WEIGHTS.map((w, i) => ({ position: i + 1, factor: w }))
  }, [])

  const checkCodeTable = useMemo(() => {
    return CHECK_CODES.map((code, i) => ({ remainder: i, checkCode: code }))
  }, [])

  return (
    <ToolPageLayout toolId="id-card">
      <WorkspaceHeader title="身份证信息查询" />
      <WorkspaceBody>
        <div className="id-card-tool">
          {/* 输入区 */}
          <div className="id-card-input-section">
            <input
              type="text"
              className="id-card-input"
              value={input}
              onChange={handleInputChange}
              placeholder="请输入 18 位身份证号码"
              maxLength={18}
            />
            <div className="id-card-actions">
              <button className="button primary" onClick={handleQuery}>
                <Search size={16} /> 查询校验
              </button>
              <button className="button secondary" onClick={handleExample}>
                <Lightbulb size={16} /> 查看示例
              </button>
              <button className="button danger" onClick={handleClear}>
                <Trash2 size={16} /> 清空
              </button>
            </div>
          </div>

          {/* 查询结果 - 常驻显示 */}
          <div className="id-card-result-section">
            <h3 className="id-card-section-title">身份证查询结果</h3>

            {result ? (
              <>
                <div className={`id-card-valid-badge ${result.valid ? 'valid' : 'invalid'}`}>
                  {result.valid ? <ShieldCheck size={16} /> : <ShieldX size={16} />}
                  <span>合法：{result.valid ? '是' : '否'}</span>
                </div>

                {!result.valid && result.errors.length > 0 && (
                  <div className="id-card-errors">
                    {result.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="id-card-valid-badge pending">
                <ShieldCheck size={16} />
                <span>合法：等待查询</span>
              </div>
            )}

            <div className="id-card-info-grid">
              <div className="id-card-info-card">
                <span className="id-card-info-label">归属地</span>
                <span className="id-card-info-value">{result?.address || '—'}</span>
              </div>
              <div className="id-card-info-card">
                <span className="id-card-info-label">省份</span>
                <span className="id-card-info-value">{result?.province || '—'}</span>
              </div>
              <div className="id-card-info-card">
                <span className="id-card-info-label">城市</span>
                <span className="id-card-info-value">{result?.city || '—'}</span>
              </div>
              <div className="id-card-info-card">
                <span className="id-card-info-label">区域</span>
                <span className="id-card-info-value">{result?.district || '—'}</span>
              </div>
              <div className="id-card-info-card">
                <span className="id-card-info-label">出生日</span>
                <span className="id-card-info-value">{result?.birthDate || '—'}</span>
              </div>
              <div className="id-card-info-card">
                <span className="id-card-info-label">性别</span>
                <span className="id-card-info-value">{result?.gender || '—'}</span>
              </div>
              <div className="id-card-info-card">
                <span className="id-card-info-label">年龄</span>
                <span className="id-card-info-value">{result?.age != null ? `${result.age} 岁` : '—'}</span>
              </div>
            </div>

            {/* 校验详情 - 常驻显示 */}
            <div className="id-card-verify-detail">
              <h4 className="id-card-detail-title">校验详情</h4>
              <div className="id-card-detail-row">
                <span>加权求和：</span>
                <strong>{result?.weightedSum || '—'}</strong>
              </div>
              <div className="id-card-detail-row">
                <span>除以 11 余数：</span>
                <strong>{result ? result.remainder : '—'}</strong>
              </div>
              <div className="id-card-detail-row">
                <span>预期校验码：</span>
                <strong>{result?.expectedCheckCode || '—'}</strong>
              </div>
              <div className="id-card-detail-row">
                <span>实际校验码：</span>
                <strong>{result?.actualCheckCode || '—'}</strong>
              </div>
            </div>
          </div>

          {/* 加权因子表 */}
          <div className="id-card-tables">
            <div className="id-card-table-section">
              <h4 className="id-card-table-title">加权因子表</h4>
              <div className="id-card-table-wrap">
                <table className="id-card-table">
                  <thead>
                    <tr>
                      <th>位置序号</th>
                      {factorTable.map((row) => (
                        <th key={row.position}>{row.position}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>加权因子</td>
                      {factorTable.map((row) => (
                        <td key={row.position}>{row.factor}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 校验码表 */}
            <div className="id-card-table-section">
              <h4 className="id-card-table-title">校验码表</h4>
              <div className="id-card-table-wrap">
                <table className="id-card-table">
                  <thead>
                    <tr>
                      <th>余数</th>
                      {checkCodeTable.map((row) => (
                        <th key={row.remainder}>{row.remainder}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>校验码</td>
                      {checkCodeTable.map((row) => (
                        <td key={row.remainder}>{row.checkCode}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 说明 */}
          <div className="id-card-disclaimer">
            <p>本工具仅根据身份证号码编码规则进行本地解析，不涉及任何联网查询，也不会存储或上传任何个人信息。</p>
          </div>
        </div>
      </WorkspaceBody>
    </ToolPageLayout>
  )
}
