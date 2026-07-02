import { useState, useMemo, useEffect } from 'react'
import { Calculator, ChevronDown, TrendingUp, PiggyBank, Landmark, Briefcase } from 'lucide-react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

function getThemeColor(variable: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || '#166a52'
}

function useThemeColors() {
  const [colors, setColors] = useState({
    accent: getThemeColor('--accent'),
    muted: getThemeColor('--muted'),
    success: getThemeColor('--success'),
    border: getThemeColor('--border'),
    surface: getThemeColor('--surface'),
    text: getThemeColor('--text'),
  })

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setColors({
        accent: getThemeColor('--accent'),
        muted: getThemeColor('--muted'),
        success: getThemeColor('--success'),
        border: getThemeColor('--border'),
        surface: getThemeColor('--surface'),
        text: getThemeColor('--text'),
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => observer.disconnect()
  }, [])

  return colors
}

interface Preset {
  id: string
  name: string
  icon: typeof PiggyBank
  principal: number
  annualRate: number
  years: number
  compoundFrequency: number
  monthlyInvestment: number
  feeRate: number
  inflationRate: number
}

const presets: Preset[] = [
  {
    id: 'balance',
    name: '余额宝',
    icon: PiggyBank,
    principal: 10000,
    annualRate: 2.5,
    years: 5,
    compoundFrequency: 365,
    monthlyInvestment: 1000,
    feeRate: 0,
    inflationRate: 2.0,
  },
  {
    id: 'bank',
    name: '银行存款',
    icon: Landmark,
    principal: 50000,
    annualRate: 2.25,
    years: 3,
    compoundFrequency: 12,
    monthlyInvestment: 0,
    feeRate: 0,
    inflationRate: 2.0,
  },
  {
    id: 'fund',
    name: '基金定投',
    icon: Briefcase,
    principal: 20000,
    annualRate: 8.0,
    years: 10,
    compoundFrequency: 12,
    monthlyInvestment: 500,
    feeRate: 1.5,
    inflationRate: 2.0,
  },
  {
    id: 'stock',
    name: '股票投资',
    icon: TrendingUp,
    principal: 100000,
    annualRate: 12.0,
    years: 10,
    compoundFrequency: 12,
    monthlyInvestment: 2000,
    feeRate: 0.5,
    inflationRate: 2.0,
  },
]

interface CalculationResult {
  finalAmount: number
  totalPrincipal: number
  totalInterest: number
  totalFees: number
  realReturnRate: number
  annualizedReturnRate: number
  yearlyBreakdown: {
    year: number
    startAmount: number
    endAmount: number
    interest: number
    contribution: number
  }[]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

export default function CompoundCalculator() {
  const [principal, setPrincipal] = useState(10000)
  const [annualRate, setAnnualRate] = useState(5.0)
  const [years, setYears] = useState(10)
  const [compoundFrequency, setCompoundFrequency] = useState(12)
  const [monthlyInvestment, setMonthlyInvestment] = useState(500)
  const [feeRate, setFeeRate] = useState(0)
  const [inflationRate, setInflationRate] = useState(2.0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const themeColors = useThemeColors()

  const applyPreset = (preset: Preset) => {
    setPrincipal(preset.principal)
    setAnnualRate(preset.annualRate)
    setYears(preset.years)
    setCompoundFrequency(preset.compoundFrequency)
    setMonthlyInvestment(preset.monthlyInvestment)
    setFeeRate(preset.feeRate)
    setInflationRate(preset.inflationRate)
  }

  const calculation: CalculationResult = useMemo(() => {
    const yearlyBreakdown: CalculationResult['yearlyBreakdown'] = []
    let currentAmount = principal
    let totalFees = 0
    const totalPrincipal = principal + monthlyInvestment * 12 * years

    for (let year = 1; year <= years; year++) {
      const startAmount = currentAmount
      let yearInterest = 0
      let yearContribution = 0

      for (let month = 0; month < 12; month++) {
        if (monthlyInvestment > 0) {
          const fee = monthlyInvestment * (feeRate / 100)
          totalFees += fee
          currentAmount += monthlyInvestment - fee
          yearContribution += monthlyInvestment
        }

        const ratePerPeriod = annualRate / 100 / compoundFrequency
        const periodsPerMonth = compoundFrequency / 12
        for (let p = 0; p < periodsPerMonth; p++) {
          const interest = currentAmount * ratePerPeriod
          yearInterest += interest
          currentAmount += interest
        }
      }

      yearlyBreakdown.push({
        year,
        startAmount,
        endAmount: currentAmount,
        interest: yearInterest,
        contribution: yearContribution,
      })
    }

    const totalInterest = currentAmount - totalPrincipal + totalFees
    const realReturnRate = ((1 + annualRate / 100) / (1 + inflationRate / 100) - 1) * 100
    const annualizedReturnRate = (Math.pow(currentAmount / principal, 1 / years) - 1) * 100

    return {
      finalAmount: currentAmount,
      totalPrincipal,
      totalInterest,
      totalFees,
      realReturnRate,
      annualizedReturnRate,
      yearlyBreakdown,
    }
  }, [principal, annualRate, years, compoundFrequency, monthlyInvestment, feeRate, inflationRate])

  const compoundLabels: Record<number, string> = {
    1: '年复利',
    4: '季复利',
    12: '月复利',
    365: '日复利',
  }

  const lineChartData = useMemo(() => {
    const labels = calculation.yearlyBreakdown.map((item) => `第${item.year}年`)
    const endAmounts = calculation.yearlyBreakdown.map((item) => item.endAmount)
    const totalPrincipalOverYears = calculation.yearlyBreakdown.map((_, i) => {
      return principal + monthlyInvestment * 12 * (i + 1)
    })

    return {
      labels,
      datasets: [
        {
          label: '资产总值',
          data: endAmounts,
          borderColor: themeColors.accent,
          backgroundColor: `${themeColors.accent}20`,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: themeColors.accent,
          pointBorderColor: themeColors.surface,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: '累计投入',
          data: totalPrincipalOverYears,
          borderColor: themeColors.muted,
          backgroundColor: 'transparent',
          fill: false,
          borderDash: [5, 5],
          tension: 0.4,
          pointBackgroundColor: themeColors.muted,
          pointBorderColor: themeColors.surface,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    }
  }, [calculation.yearlyBreakdown, principal, monthlyInvestment, themeColors])

  const barChartData = useMemo(() => {
    const labels = calculation.yearlyBreakdown.map((item) => `第${item.year}年`)
    const contributions = calculation.yearlyBreakdown.map((item) => item.contribution)
    const interests = calculation.yearlyBreakdown.map((item) => item.interest)

    return {
      labels,
      datasets: [
        {
          label: '当年投入',
          data: contributions,
          backgroundColor: themeColors.border,
          borderRadius: 4,
        },
        {
          label: '当年收益',
          data: interests,
          backgroundColor: themeColors.success,
          borderRadius: 4,
        },
      ],
    }
  }, [calculation.yearlyBreakdown, themeColors])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12 },
          color: themeColors.text,
        },
      },
      tooltip: {
        backgroundColor: themeColors.surface,
        titleColor: themeColors.text,
        bodyColor: themeColors.text,
        borderColor: themeColors.border,
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${formatCurrency(context.raw)}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: themeColors.muted },
      },
      y: {
        beginAtZero: true,
        grid: { color: themeColors.border },
        ticks: {
          color: themeColors.muted,
          callback: (value: any) => {
            if (value >= 10000) {
              return `${(value / 10000).toFixed(1)}万`
            }
            return value
          },
        },
      },
    },
  }), [themeColors])

  return (
    <ToolPageLayout toolId="compound-calculator">
      <WorkspaceHeader title="复利计算">
        <button
          className="button ghost compact"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <ChevronDown size={14} style={{ transform: showAdvanced ? 'rotate(180deg)' : undefined }} />
          {showAdvanced ? '收起高级设置' : '展开高级设置'}
        </button>
      </WorkspaceHeader>
      <WorkspaceBody>
        <div className="compound-calc">
          <div className="preset-row">
            {presets.map((preset) => (
              <button
                key={preset.id}
                className="preset-chip"
                onClick={() => applyPreset(preset)}
              >
                <preset.icon size={16} />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>

          <div className="input-section">
            <div className="input-grid">
              <div className="calc-input-group">
                <label>初始本金</label>
                <div className="calc-input-wrapper">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={principal}
                    onChange={(e) => setPrincipal(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                  />
                  <span className="input-unit">元</span>
                </div>
              </div>
              <div className="calc-input-group">
                <label>年化收益率</label>
                <div className="calc-input-wrapper">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={annualRate}
                    onChange={(e) => setAnnualRate(Math.max(0, Math.min(100, Number(e.target.value))))}
                    placeholder="0"
                  />
                  <span className="input-unit">%</span>
                </div>
              </div>
              <div className="calc-input-group">
                <label>投资年限</label>
                <div className="calc-input-wrapper">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    value={years}
                    onChange={(e) => setYears(Math.max(1, Math.min(50, Number(e.target.value))))}
                    placeholder="1"
                  />
                  <span className="input-unit">年</span>
                </div>
              </div>
              <div className="calc-input-group">
                <label>每月定投</label>
                <div className="calc-input-wrapper">
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={monthlyInvestment}
                    onChange={(e) => setMonthlyInvestment(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                  />
                  <span className="input-unit">元</span>
                </div>
              </div>
            </div>

            <button
              className="advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <ChevronDown size={14} style={{ transform: showAdvanced ? 'rotate(180deg)' : undefined }} />
              {showAdvanced ? '收起高级设置' : '展开高级设置'}
            </button>

            {showAdvanced && (
              <div className="advanced-row">
                <div className="calc-input-group">
                  <label>复利频率</label>
                  <select
                    value={compoundFrequency}
                    onChange={(e) => setCompoundFrequency(Number(e.target.value))}
                  >
                    <option value={1}>年复利</option>
                    <option value={4}>季复利</option>
                    <option value={12}>月复利</option>
                    <option value={365}>日复利</option>
                  </select>
                </div>
                <div className="calc-input-group">
                  <label>手续费率</label>
                  <div className="calc-input-wrapper">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={feeRate}
                      onChange={(e) => setFeeRate(Math.max(0, Math.min(10, Number(e.target.value))))}
                    />
                    <span className="input-unit">%</span>
                  </div>
                </div>
                <div className="calc-input-group">
                  <label>预期通胀率</label>
                  <div className="calc-input-wrapper">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.1}
                      value={inflationRate}
                      onChange={(e) => setInflationRate(Math.max(0, Math.min(20, Number(e.target.value))))}
                    />
                    <span className="input-unit">%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="result-section">
            <div className="result-card">
              <div className="result-main">
                <div>
                  <span className="result-label">最终金额</span>
                  <span className="result-value">{formatCurrency(calculation.finalAmount)}</span>
                </div>
                <div className="result-summary">
                  <div className="result-summary-item">
                    <span className="summary-label">总投入</span>
                    <span className="summary-value">{formatCurrency(calculation.totalPrincipal)}</span>
                  </div>
                  <div className="result-summary-item profit">
                    <span className="summary-label">总收益</span>
                    <span className="summary-value">{formatCurrency(calculation.totalInterest)}</span>
                  </div>
                </div>
              </div>
              <div className="result-details">
                <div className="result-detail">
                  <span>手续费</span>
                  <span>{formatCurrency(calculation.totalFees)}</span>
                </div>
                <div className="result-detail">
                  <span>实际收益率</span>
                  <span>{formatPercent(calculation.realReturnRate)}</span>
                </div>
                <div className="result-detail">
                  <span>年化收益率</span>
                  <span className="profit">{formatPercent(calculation.annualizedReturnRate)}</span>
                </div>
                <div className="result-detail">
                  <span>复利频率</span>
                  <span>{compoundLabels[compoundFrequency]}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="charts-row">
            <div className="chart-section">
              <h4 className="section-title">资产增长趋势</h4>
              <div className="chart-container">
                <Line data={lineChartData} options={chartOptions} />
              </div>
            </div>
            <div className="chart-section">
              <h4 className="section-title">年度投入与收益</h4>
              <div className="chart-container">
                <Bar data={barChartData} options={chartOptions} />
              </div>
            </div>
          </div>

          <div className="table-section">
            <button
              className="table-toggle"
              onClick={() => setShowTable(!showTable)}
            >
              <ChevronDown size={14} style={{ transform: showTable ? 'rotate(180deg)' : undefined }} />
              {showTable ? '收起明细' : '查看年度收益明细'}
            </button>
            {showTable && (
              <div className="yearly-table">
                <table>
                  <thead>
                    <tr>
                      <th>年份</th>
                      <th>年初金额</th>
                      <th>年投入</th>
                      <th>年收益</th>
                      <th>年末金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculation.yearlyBreakdown.map((item) => (
                      <tr key={item.year}>
                        <td>第 {item.year} 年</td>
                        <td>{formatCurrency(item.startAmount)}</td>
                        <td>{formatCurrency(item.contribution)}</td>
                        <td className="profit">{formatCurrency(item.interest)}</td>
                        <td>{formatCurrency(item.endAmount)}</td>
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