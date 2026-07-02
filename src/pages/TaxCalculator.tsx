import { useState, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'

// 综合所得个人所得税税率表（年度）
const TAX_BRACKETS = [
  { max: 36000, rate: 0.03, quickDeduction: 0 },
  { max: 144000, rate: 0.10, quickDeduction: 2520 },
  { max: 300000, rate: 0.20, quickDeduction: 16920 },
  { max: 420000, rate: 0.25, quickDeduction: 31920 },
  { max: 660000, rate: 0.30, quickDeduction: 52920 },
  { max: 960000, rate: 0.35, quickDeduction: 85920 },
  { max: Infinity, rate: 0.45, quickDeduction: 181920 },
]

// 年终奖适用月度税率表
const BONUS_TAX_BRACKETS = [
  { max: 3000, rate: 0.03, quickDeduction: 0 },
  { max: 12000, rate: 0.10, quickDeduction: 210 },
  { max: 25000, rate: 0.20, quickDeduction: 1410 },
  { max: 35000, rate: 0.25, quickDeduction: 2660 },
  { max: 55000, rate: 0.30, quickDeduction: 4410 },
  { max: 80000, rate: 0.35, quickDeduction: 7160 },
  { max: Infinity, rate: 0.45, quickDeduction: 15160 },
]

const HOUSING_RENT_OPTIONS = [
  { value: 1500, label: '直辖市/省会城市 (1500元/月)' },
  { value: 1100, label: '市辖区人口>100万 (1100元/月)' },
  { value: 800, label: '市辖区人口≤100万 (800元/月)' },
] as const

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function calcTax(taxableIncome: number): { tax: number; bracketIndex: number } {
  if (taxableIncome <= 0) return { tax: 0, bracketIndex: 0 }
  for (let i = 0; i < TAX_BRACKETS.length; i++) {
    const b = TAX_BRACKETS[i]
    if (taxableIncome <= b.max) {
      return { tax: taxableIncome * b.rate - b.quickDeduction, bracketIndex: i }
    }
  }
  return { tax: 0, bracketIndex: 0 }
}

function calcBonusTax(bonus: number): number {
  const monthlyAvg = bonus / 12
  for (const b of BONUS_TAX_BRACKETS) {
    if (monthlyAvg <= b.max) {
      return bonus * b.rate - b.quickDeduction
    }
  }
  return 0
}

interface DeductionConfig {
  childrenEducation: number
  continuingEducation: boolean
  housingLoanInterest: boolean
  housingRent: number
  elderlySupport: number
  infantCare: number
}

interface MonthlyDetail {
  month: number
  cumulativeSalary: number
  cumulativeTaxable: number
  cumulativeTax: number
  monthlyTax: number
  afterTaxIncome: number
}

interface CalculationResult {
  annualSalary: number
  socialInsurance: number
  standardDeduction: number
  specialDeductions: number
  taxableIncome: number
  annualTax: number
  bonusTax: number
  totalTax: number
  afterTaxIncome: number
  effectiveRate: number
  bracketIndex: number
  monthlyBreakdown: MonthlyDetail[]
}

function calculate(options: {
  monthlySalary: number
  socialInsuranceRate: number
  socialInsuranceCeiling: number
  bonus: number
  deductionConfig: DeductionConfig
}): CalculationResult {
  const { monthlySalary, socialInsuranceRate, socialInsuranceCeiling, bonus, deductionConfig } = options

  // 三险一金（月度）
  const socialInsuranceBase = Math.min(monthlySalary, socialInsuranceCeiling)
  const monthlySocialInsurance = socialInsuranceBase * (socialInsuranceRate / 100)

  // 年度薪资
  const annualSalary = monthlySalary * 12
  const annualSocialInsurance = monthlySocialInsurance * 12

  // 标准减除费用 60000/年
  const standardDeduction = 60000

  // 专项附加扣除（年度）
  let annualSpecialDeductions = 0
  annualSpecialDeductions += deductionConfig.childrenEducation * 2000 * 12
  annualSpecialDeductions += deductionConfig.continuingEducation ? 400 * 12 : 0
  annualSpecialDeductions += deductionConfig.housingLoanInterest ? 1000 * 12 : 0
  annualSpecialDeductions += deductionConfig.housingRent * 12
  annualSpecialDeductions += deductionConfig.elderlySupport * 12
  annualSpecialDeductions += deductionConfig.infantCare * 2000 * 12

  // 应纳税所得额
  const taxableIncome = Math.max(0, annualSalary - standardDeduction - annualSocialInsurance - annualSpecialDeductions)

  // 年度个税
  const { tax: annualTax, bracketIndex } = calcTax(taxableIncome)

  // 年终奖个税（单独计税）
  const bonusTax = bonus > 0 ? calcBonusTax(bonus) : 0

  // 总计
  const totalTax = annualTax + bonusTax
  const afterTaxIncome = annualSalary - annualSocialInsurance - totalTax + bonus

  // 有效税率
  const effectiveRate = (annualSalary + bonus) > 0 ? totalTax / (annualSalary + bonus) : 0

  // 月度明细
  const monthlyCumulativeDeduction = standardDeduction / 12 + annualSocialInsurance / 12 + annualSpecialDeductions / 12
  const monthlyBreakdown: MonthlyDetail[] = []
  let cumulativeSalary = 0
  let cumulativeTax = 0

  for (let m = 1; m <= 12; m++) {
    cumulativeSalary += monthlySalary
    const cumulativeTaxableIncome = Math.max(0, cumulativeSalary - monthlyCumulativeDeduction * m)
    const { tax: cumulativeTaxSoFar } = calcTax(cumulativeTaxableIncome)
    const monthlyTax = cumulativeTaxSoFar - cumulativeTax
    cumulativeTax = cumulativeTaxSoFar
    monthlyBreakdown.push({
      month: m,
      cumulativeSalary,
      cumulativeTaxable: cumulativeTaxableIncome,
      cumulativeTax: cumulativeTaxSoFar,
      monthlyTax,
      afterTaxIncome: monthlySalary - monthlySocialInsurance - monthlyTax,
    })
  }

  return {
    annualSalary,
    socialInsurance: annualSocialInsurance,
    standardDeduction,
    specialDeductions: annualSpecialDeductions,
    taxableIncome,
    annualTax,
    bonusTax,
    totalTax,
    afterTaxIncome,
    effectiveRate,
    bracketIndex,
    monthlyBreakdown,
  }
}

export default function TaxCalculator() {
  const [monthlySalary, setMonthlySalary] = useState(15000)
  const [socialInsuranceRate, setSocialInsuranceRate] = useState(22.5)
  const [socialInsuranceCeiling, setSocialInsuranceCeiling] = useState(30000)
  const [bonus, setBonus] = useState(0)
  const [showDeductions, setShowDeductions] = useState(false)
  const [viewMode, setViewMode] = useState<'annual' | 'monthly'>('annual')
  const [showMonthly, setShowMonthly] = useState(false)
  const [deductionConfig, setDeductionConfig] = useState<DeductionConfig>({
    childrenEducation: 0,
    continuingEducation: false,
    housingLoanInterest: false,
    housingRent: 0,
    elderlySupport: 0,
    infantCare: 0,
  })

  const result = useMemo(() => calculate({
    monthlySalary,
    socialInsuranceRate,
    socialInsuranceCeiling,
    bonus,
    deductionConfig,
  }), [monthlySalary, socialInsuranceRate, socialInsuranceCeiling, bonus, deductionConfig])

  const updateDeduction = <K extends keyof DeductionConfig>(key: K, value: DeductionConfig[K]) => {
    setDeductionConfig((prev) => ({ ...prev, [key]: value }))
  }

  const divisor = viewMode === 'monthly' ? 12 : 1

  return (
    <ToolPageLayout toolId="tax-calculator">
      <WorkspaceHeader title="个税计算">
        <button
          className="button ghost compact"
          onClick={() => setShowDeductions(!showDeductions)}
        >
          <ChevronDown size={14} style={{ transform: showDeductions ? 'rotate(180deg)' : undefined }} />
          {showDeductions ? '收起专项扣除' : '展开专项扣除'}
        </button>
      </WorkspaceHeader>
      <WorkspaceBody>
        <div className="compound-calc">
          <div className="input-section">
            <div className="input-grid">
              <div className="calc-input-group">
                <label>税前月薪</label>
                <div className="calc-input-wrapper">
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                  />
                  <span className="input-unit">元</span>
                </div>
              </div>
              <div className="calc-input-group">
                <label>五险一金比例</label>
                <div className="calc-input-wrapper">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.1}
                    value={socialInsuranceRate}
                    onChange={(e) => setSocialInsuranceRate(Math.max(0, Math.min(50, Number(e.target.value))))}
                    placeholder="0"
                  />
                  <span className="input-unit">%</span>
                </div>
              </div>
              <div className="calc-input-group">
                <label>五险一金基数上限</label>
                <div className="calc-input-wrapper">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={socialInsuranceCeiling}
                    onChange={(e) => setSocialInsuranceCeiling(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                  />
                  <span className="input-unit">元</span>
                </div>
              </div>
              <div className="calc-input-group">
                <label>年终奖</label>
                <div className="calc-input-wrapper">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={bonus}
                    onChange={(e) => setBonus(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                  />
                  <span className="input-unit">元</span>
                </div>
              </div>
            </div>

            <button
              className="advanced-toggle"
              onClick={() => setShowDeductions(!showDeductions)}
            >
              <ChevronDown size={14} style={{ transform: showDeductions ? 'rotate(180deg)' : undefined }} />
              {showDeductions ? '收起专项附加扣除' : '展开专项附加扣除'}
            </button>

            {showDeductions && (
              <div className="advanced-row">
                <div className="calc-input-group">
                  <label>子女教育（每子女 2000元/月）</label>
                  <select
                    value={deductionConfig.childrenEducation}
                    onChange={(e) => updateDeduction('childrenEducation', Number(e.target.value))}
                  >
                    <option value={0}>0 个子女</option>
                    <option value={1}>1 个子女</option>
                    <option value={2}>2 个子女</option>
                    <option value={3}>3 个子女</option>
                  </select>
                </div>
                <div className="calc-input-group">
                  <label>婴幼儿照护（每孩 2000元/月）</label>
                  <select
                    value={deductionConfig.infantCare}
                    onChange={(e) => updateDeduction('infantCare', Number(e.target.value))}
                  >
                    <option value={0}>0 个婴幼儿</option>
                    <option value={1}>1 个婴幼儿</option>
                    <option value={2}>2 个婴幼儿</option>
                  </select>
                </div>
                <div className="calc-input-group">
                  <label>继续教育（400元/月）</label>
                  <select
                    value={deductionConfig.continuingEducation ? 1 : 0}
                    onChange={(e) => updateDeduction('continuingEducation', Number(e.target.value) === 1)}
                  >
                    <option value={0}>否</option>
                    <option value={1}>是</option>
                  </select>
                </div>
                <div className="calc-input-group">
                  <label>住房贷款利息（1000元/月）</label>
                  <select
                    value={deductionConfig.housingLoanInterest ? 1 : 0}
                    onChange={(e) => updateDeduction('housingLoanInterest', Number(e.target.value) === 1)}
                  >
                    <option value={0}>否</option>
                    <option value={1}>是</option>
                  </select>
                </div>
                <div className="calc-input-group">
                  <label>住房租金</label>
                  <select
                    value={deductionConfig.housingRent}
                    onChange={(e) => updateDeduction('housingRent', Number(e.target.value))}
                  >
                    <option value={0}>无</option>
                    {HOUSING_RENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="calc-input-group">
                  <label>赡养老人（3000元/月/人）</label>
                  <select
                    value={deductionConfig.elderlySupport}
                    onChange={(e) => updateDeduction('elderlySupport', Number(e.target.value))}
                  >
                    <option value={0}>无</option>
                    <option value={3000}>独生子女 (3000元/月)</option>
                    <option value={1500}>非独生子女 (1500元/月)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="result-section">
            <div className="result-card">
              <div className="result-main">
                <div className="result-main-top">
                  <div>
                    <span className="result-label">
                      {viewMode === 'annual' ? '年度' : '月度'}应纳税额
                    </span>
                    <span className="result-value">{formatCurrency(result.totalTax / divisor)}</span>
                  </div>
                  <div className="view-toggle">
                    <button
                      className={`view-toggle-btn ${viewMode === 'annual' ? 'active' : ''}`}
                      onClick={() => setViewMode('annual')}
                    >
                      年度
                    </button>
                    <button
                      className={`view-toggle-btn ${viewMode === 'monthly' ? 'active' : ''}`}
                      onClick={() => setViewMode('monthly')}
                    >
                      月度
                    </button>
                  </div>
                </div>
                <div className="result-summary">
                  <div className="result-summary-item">
                    <span className="summary-label">税后收入</span>
                    <span className="summary-value">{formatCurrency(result.afterTaxIncome / divisor)}</span>
                  </div>
                  <div className="result-summary-item profit">
                    <span className="summary-label">有效税率</span>
                    <span className="summary-value">{formatPercent(result.effectiveRate)}</span>
                  </div>
                </div>
              </div>
              <div className="result-details">
                <div className="result-detail">
                  <span>薪资</span>
                  <span>{formatCurrency(result.annualSalary / divisor)}</span>
                </div>
                <div className="result-detail">
                  <span>五险一金</span>
                  <span>{formatCurrency(result.socialInsurance / divisor)}</span>
                </div>
                <div className="result-detail">
                  <span>基本减除</span>
                  <span>{formatCurrency(result.standardDeduction / divisor)}</span>
                </div>
                <div className="result-detail">
                  <span>专项附加扣除</span>
                  <span>{formatCurrency(result.specialDeductions / divisor)}</span>
                </div>
                <div className="result-detail">
                  <span>应纳税所得额</span>
                  <span>{formatCurrency(result.taxableIncome / divisor)}</span>
                </div>
                <div className="result-detail">
                  <span>适用税率</span>
                  <span className="profit">{formatPercent(TAX_BRACKETS[result.bracketIndex].rate)}</span>
                </div>
                {result.bonusTax > 0 && (
                  <div className="result-detail">
                    <span>年终奖个税</span>
                    <span>{formatCurrency(result.bonusTax)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="table-section">
            <button
              className="table-toggle"
              onClick={() => setShowMonthly(!showMonthly)}
            >
              <ChevronDown size={14} style={{ transform: showMonthly ? 'rotate(180deg)' : undefined }} />
              {showMonthly ? '收起月度明细' : '查看月度个税明细'}
            </button>
            {showMonthly && (
              <div className="yearly-table">
                <table>
                  <thead>
                    <tr>
                      <th>月份</th>
                      <th>累计薪资</th>
                      <th>累计应纳税所得额</th>
                      <th>累计个税</th>
                      <th>当月个税</th>
                      <th>税后到手</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.monthlyBreakdown.map((item) => (
                      <tr key={item.month}>
                        <td>{item.month} 月</td>
                        <td>{formatCurrency(item.cumulativeSalary)}</td>
                        <td>{formatCurrency(item.cumulativeTaxable)}</td>
                        <td>{formatCurrency(item.cumulativeTax)}</td>
                        <td className="profit">{formatCurrency(item.monthlyTax)}</td>
                        <td>{formatCurrency(item.afterTaxIncome)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </WorkspaceBody>
    </ToolPageLayout>
  )
}
