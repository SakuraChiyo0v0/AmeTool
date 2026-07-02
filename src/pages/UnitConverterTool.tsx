import { useState, useCallback, useEffect } from 'react'
import { ArrowLeftRight, Trash2 } from 'lucide-react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'

interface Unit {
  id: string
  name: string
  symbol: string
}

interface Category {
  id: string
  name: string
  units: Unit[]
}

const categories: Category[] = [
  {
    id: 'length',
    name: '长度',
    units: [
      { id: 'km', name: '千米', symbol: 'km' },
      { id: 'm', name: '米', symbol: 'm' },
      { id: 'cm', name: '厘米', symbol: 'cm' },
      { id: 'mm', name: '毫米', symbol: 'mm' },
      { id: 'um', name: '微米', symbol: 'μm' },
      { id: 'nm', name: '纳米', symbol: 'nm' },
      { id: 'inch', name: '英寸', symbol: 'in' },
      { id: 'foot', name: '英尺', symbol: 'ft' },
      { id: 'yard', name: '码', symbol: 'yd' },
      { id: 'mile', name: '英里', symbol: 'mi' },
      { id: 'nautical-mile', name: '海里', symbol: 'nmi' },
    ],
  },
  {
    id: 'weight',
    name: '重量',
    units: [
      { id: 'kg', name: '千克', symbol: 'kg' },
      { id: 'g', name: '克', symbol: 'g' },
      { id: 'mg', name: '毫克', symbol: 'mg' },
      { id: 'ton', name: '吨', symbol: 't' },
      { id: 'ct', name: '克拉', symbol: 'ct' },
      { id: 'pound', name: '磅', symbol: 'lb' },
      { id: 'ounce', name: '盎司', symbol: 'oz' },
      { id: 'carat', name: '盎司(金衡)', symbol: 'oz t' },
    ],
  },
  {
    id: 'temperature',
    name: '温度',
    units: [
      { id: 'celsius', name: '摄氏度', symbol: '°C' },
      { id: 'fahrenheit', name: '华氏度', symbol: '°F' },
      { id: 'kelvin', name: '开尔文', symbol: 'K' },
      { id: 'rankine', name: '兰氏度', symbol: '°R' },
    ],
  },
  {
    id: 'area',
    name: '面积',
    units: [
      { id: 'm2', name: '平方米', symbol: 'm²' },
      { id: 'km2', name: '平方千米', symbol: 'km²' },
      { id: 'cm2', name: '平方厘米', symbol: 'cm²' },
      { id: 'mm2', name: '平方毫米', symbol: 'mm²' },
      { id: 'acre', name: '英亩', symbol: 'ac' },
      { id: 'hectare', name: '公顷', symbol: 'ha' },
      { id: 'sqft', name: '平方英尺', symbol: 'sq ft' },
      { id: 'sqin', name: '平方英寸', symbol: 'sq in' },
    ],
  },
  {
    id: 'volume',
    name: '体积',
    units: [
      { id: 'l', name: '升', symbol: 'L' },
      { id: 'ml', name: '毫升', symbol: 'mL' },
      { id: 'm3', name: '立方米', symbol: 'm³' },
      { id: 'cm3', name: '立方厘米', symbol: 'cm³' },
      { id: 'gal', name: '加仑(美)', symbol: 'gal' },
      { id: 'galuk', name: '加仑(英)', symbol: 'gal UK' },
      { id: 'quart', name: '夸脱', symbol: 'qt' },
      { id: 'pint', name: '品脱', symbol: 'pt' },
      { id: 'cup', name: '杯', symbol: 'cup' },
      { id: 'tbsp', name: '汤匙', symbol: 'tbsp' },
      { id: 'tsp', name: '茶匙', symbol: 'tsp' },
    ],
  },
  {
    id: 'speed',
    name: '速度',
    units: [
      { id: 'kmh', name: '千米/小时', symbol: 'km/h' },
      { id: 'ms', name: '米/秒', symbol: 'm/s' },
      { id: 'mph', name: '英里/小时', symbol: 'mph' },
      { id: 'knot', name: '节', symbol: 'kn' },
      { id: 'mach', name: '马赫', symbol: 'Mach' },
    ],
  },
  {
    id: 'time',
    name: '时间',
    units: [
      { id: 'year', name: '年', symbol: 'yr' },
      { id: 'month', name: '月', symbol: 'mo' },
      { id: 'week', name: '周', symbol: 'wk' },
      { id: 'day', name: '天', symbol: 'd' },
      { id: 'hour', name: '小时', symbol: 'h' },
      { id: 'minute', name: '分钟', symbol: 'min' },
      { id: 'second', name: '秒', symbol: 's' },
      { id: 'ms-time', name: '毫秒', symbol: 'ms' },
      { id: 'us', name: '微秒', symbol: 'μs' },
      { id: 'ns', name: '纳秒', symbol: 'ns' },
    ],
  },
  {
    id: 'data',
    name: '数据',
    units: [
      { id: 'b', name: '字节', symbol: 'B' },
      { id: 'kb', name: '千字节', symbol: 'KB' },
      { id: 'mb', name: '兆字节', symbol: 'MB' },
      { id: 'gb', name: '吉字节', symbol: 'GB' },
      { id: 'tb', name: '太字节', symbol: 'TB' },
      { id: 'pb', name: '拍字节', symbol: 'PB' },
      { id: 'eb', name: '艾字节', symbol: 'EB' },
    ],
  },
  {
    id: 'power',
    name: '功率',
    units: [
      { id: 'w', name: '瓦特', symbol: 'W' },
      { id: 'kw', name: '千瓦', symbol: 'kW' },
      { id: 'mw', name: '兆瓦', symbol: 'MW' },
      { id: 'hp', name: '马力', symbol: 'hp' },
      { id: 'ps', name: '公制马力', symbol: 'PS' },
      { id: 'btu', name: '英热单位/小时', symbol: 'BTU/h' },
    ],
  },
  {
    id: 'energy',
    name: '能量',
    units: [
      { id: 'j', name: '焦耳', symbol: 'J' },
      { id: 'kj', name: '千焦', symbol: 'kJ' },
      { id: 'kcal', name: '千卡', symbol: 'kcal' },
      { id: 'wh', name: '瓦时', symbol: 'Wh' },
      { id: 'kwh', name: '千瓦时', symbol: 'kWh' },
      { id: 'mwh', name: '兆瓦时', symbol: 'MWh' },
      { id: 'btu-energy', name: '英热单位', symbol: 'BTU' },
    ],
  },
  {
    id: 'pressure',
    name: '压力',
    units: [
      { id: 'pa', name: '帕斯卡', symbol: 'Pa' },
      { id: 'kpa', name: '千帕', symbol: 'kPa' },
      { id: 'mpa', name: '兆帕', symbol: 'MPa' },
      { id: 'bar', name: '巴', symbol: 'bar' },
      { id: 'atm', name: '标准大气压', symbol: 'atm' },
      { id: 'psi', name: '磅/平方英寸', symbol: 'psi' },
      { id: 'mmhg', name: '毫米汞柱', symbol: 'mmHg' },
    ],
  },
  {
    id: 'force',
    name: '力',
    units: [
      { id: 'n', name: '牛顿', symbol: 'N' },
      { id: 'kn', name: '千牛', symbol: 'kN' },
      { id: 'lbf', name: '磅力', symbol: 'lbf' },
      { id: 'kgf', name: '千克力', symbol: 'kgf' },
      { id: 'dyn', name: '达因', symbol: 'dyn' },
    ],
  },
  {
    id: 'frequency',
    name: '频率',
    units: [
      { id: 'hz', name: '赫兹', symbol: 'Hz' },
      { id: 'khz', name: '千赫', symbol: 'kHz' },
      { id: 'mhz', name: '兆赫', symbol: 'MHz' },
      { id: 'ghz', name: '吉赫', symbol: 'GHz' },
      { id: 'thz', name: '太赫', symbol: 'THz' },
      { id: 'rpm', name: '转/分钟', symbol: 'rpm' },
    ],
  },
  {
    id: 'angle',
    name: '角度',
    units: [
      { id: 'deg', name: '度', symbol: '°' },
      { id: 'rad', name: '弧度', symbol: 'rad' },
      { id: 'grad', name: '梯度', symbol: 'grad' },
      { id: 'arcmin', name: '角分', symbol: "'" },
      { id: 'arcsec', name: '角秒', symbol: '"' },
    ],
  },
]

function convertLength(value: number, from: string, to: string): number {
  const base = { km: 0.001, m: 1, cm: 0.01, mm: 0.001, um: 0.000001, nm: 0.000000001, inch: 0.0254, foot: 0.3048, yard: 0.9144, mile: 1609.34, 'nautical-mile': 1852 }
  return (value * (base[from as keyof typeof base] || 1)) / (base[to as keyof typeof base] || 1)
}

function convertWeight(value: number, from: string, to: string): number {
  const base = { kg: 1, g: 0.001, mg: 0.000001, ton: 1000, ct: 0.0002, pound: 0.453592, ounce: 0.0283495, carat: 0.0311035 }
  return (value * (base[from as keyof typeof base] || 1)) / (base[to as keyof typeof base] || 1)
}

function convertTemperature(value: number, from: string, to: string): number {
  if (from === to) return value
  if (from === 'celsius') {
    if (to === 'fahrenheit') return (value * 9) / 5 + 32
    if (to === 'kelvin') return value + 273.15
    if (to === 'rankine') return (value + 273.15) * 9 / 5
  }
  if (from === 'fahrenheit') {
    if (to === 'celsius') return ((value - 32) * 5) / 9
    if (to === 'kelvin') return ((value - 32) * 5) / 9 + 273.15
    if (to === 'rankine') return value + 459.67
  }
  if (from === 'kelvin') {
    if (to === 'celsius') return value - 273.15
    if (to === 'fahrenheit') return ((value - 273.15) * 9) / 5 + 32
    if (to === 'rankine') return value * 9 / 5
  }
  if (from === 'rankine') {
    if (to === 'celsius') return (value - 491.67) * 5 / 9
    if (to === 'fahrenheit') return value - 459.67
    if (to === 'kelvin') return value * 5 / 9
  }
  return value
}

function convertArea(value: number, from: string, to: string): number {
  const base = { m2: 1, km2: 1000000, cm2: 0.0001, mm2: 0.000001, acre: 4046.86, hectare: 10000, sqft: 0.092903, sqin: 0.00064516 }
  return (value * (base[from as keyof typeof base] || 1)) / (base[to as keyof typeof base] || 1)
}

function convertVolume(value: number, from: string, to: string): number {
  const base = { l: 1, ml: 0.001, m3: 1000, cm3: 0.001, gal: 3.78541, galuk: 4.54609, quart: 0.946353, pint: 0.473176, cup: 0.236588, tbsp: 0.0147868, tsp: 0.00492892 }
  return (value * (base[from as keyof typeof base] || 1)) / (base[to as keyof typeof base] || 1)
}

function convertSpeed(value: number, from: string, to: string): number {
  const base = { kmh: 1, ms: 3.6, mph: 1.60934, knot: 1.852, mach: 1225.04 }
  return (value * (base[from as keyof typeof base] || 1)) / (base[to as keyof typeof base] || 1)
}

function convertTime(value: number, from: string, to: string): number {
  const base = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60, second: 1, 'ms-time': 0.001, us: 0.000001, ns: 0.000000001 }
  return (value * (base[from as keyof typeof base] || 1)) / (base[to as keyof typeof base] || 1)
}

function convertData(value: number, from: string, to: string): number {
  const base = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024, tb: 1024 * 1024 * 1024 * 1024, pb: 1024 * 1024 * 1024 * 1024 * 1024, eb: 1024 * 1024 * 1024 * 1024 * 1024 * 1024 }
  return (value * (base[from as keyof typeof base] || 1)) / (base[to as keyof typeof base] || 1)
}

function convertPower(value: number, from: string, to: string): number {
  const base = { w: 1, kw: 1000, mw: 1000000, hp: 745.7, ps: 735.5, btu: 0.293071 }
  return (value * (base[from as keyof typeof base] || 1)) / (base[to as keyof typeof base] || 1)
}

function convertEnergy(value: number, from: string, to: string): number {
  const base = { j: 1, kj: 1000, kcal: 4184, wh: 3600, kwh: 3600000, mwh: 3600000000, 'btu-energy': 1055.06 }
  return (value * (base[from as keyof typeof base] || 1)) / (base[to as keyof typeof base] || 1)
}

function convertPressure(value: number, from: string, to: string): number {
  const base = { pa: 1, kpa: 1000, mpa: 1000000, bar: 100000, atm: 101325, psi: 6894.76, mmhg: 133.322 }
  return (value * (base[from as keyof typeof base] || 1)) / (base[to as keyof typeof base] || 1)
}

function convertForce(value: number, from: string, to: string): number {
  const base = { n: 1, kn: 1000, lbf: 4.44822, kgf: 9.80665, dyn: 0.00001 }
  return (value * (base[from as keyof typeof base] || 1)) / (base[to as keyof typeof base] || 1)
}

function convertFrequency(value: number, from: string, to: string): number {
  const base = { hz: 1, khz: 1000, mhz: 1000000, ghz: 1000000000, thz: 1000000000000, rpm: 0.0166667 }
  return (value * (base[from as keyof typeof base] || 1)) / (base[to as keyof typeof base] || 1)
}

function convertAngle(value: number, from: string, to: string): number {
  if (from === to) return value
  const pi = Math.PI
  if (from === 'deg') {
    if (to === 'rad') return value * pi / 180
    if (to === 'grad') return value * 100 / 90
    if (to === 'arcmin') return value * 60
    if (to === 'arcsec') return value * 3600
  }
  if (from === 'rad') {
    if (to === 'deg') return value * 180 / pi
    if (to === 'grad') return value * 200 / pi
    if (to === 'arcmin') return value * 180 / pi * 60
    if (to === 'arcsec') return value * 180 / pi * 3600
  }
  if (from === 'grad') {
    if (to === 'deg') return value * 90 / 100
    if (to === 'rad') return value * pi / 200
    if (to === 'arcmin') return value * 90 / 100 * 60
    if (to === 'arcsec') return value * 90 / 100 * 3600
  }
  if (from === 'arcmin') {
    if (to === 'deg') return value / 60
    if (to === 'rad') return value / 60 * pi / 180
    if (to === 'grad') return value / 60 * 100 / 90
    if (to === 'arcsec') return value * 60
  }
  if (from === 'arcsec') {
    if (to === 'deg') return value / 3600
    if (to === 'rad') return value / 3600 * pi / 180
    if (to === 'grad') return value / 3600 * 100 / 90
    if (to === 'arcmin') return value / 60
  }
  return value
}

function convert(value: number, from: string, to: string, category: string): number {
  if (from === to) return value
  switch (category) {
    case 'length': return convertLength(value, from, to)
    case 'weight': return convertWeight(value, from, to)
    case 'temperature': return convertTemperature(value, from, to)
    case 'area': return convertArea(value, from, to)
    case 'volume': return convertVolume(value, from, to)
    case 'speed': return convertSpeed(value, from, to)
    case 'time': return convertTime(value, from, to)
    case 'data': return convertData(value, from, to)
    case 'power': return convertPower(value, from, to)
    case 'energy': return convertEnergy(value, from, to)
    case 'pressure': return convertPressure(value, from, to)
    case 'force': return convertForce(value, from, to)
    case 'frequency': return convertFrequency(value, from, to)
    case 'angle': return convertAngle(value, from, to)
    default: return value
  }
}

function formatNumber(value: number): string {
  if (Math.abs(value) < 0.000001 && value !== 0) {
    return value.toExponential(6)
  }
  if (Math.abs(value) > 1000000000) {
    return value.toExponential(6)
  }
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 10 }).replace(/\.?0+$/, '')
}

export default function UnitConverterTool() {
  const [category, setCategory] = useState('length')
  const [fromUnit, setFromUnit] = useState('m')
  const [toUnit, setToUnit] = useState('cm')
  const [inputValue, setInputValue] = useState('')
  const [outputValue, setOutputValue] = useState('')
  const [rawResult, setRawResult] = useState<number | null>(null)

  const currentCategory = categories.find((c) => c.id === category) || categories[0]

  const handleConvert = useCallback(() => {
    const numValue = parseFloat(inputValue)
    if (isNaN(numValue)) {
      setOutputValue('')
      setRawResult(null)
      return
    }
    const result = convert(numValue, fromUnit, toUnit, category)
    setRawResult(result)
    setOutputValue(formatNumber(result))
  }, [inputValue, fromUnit, toUnit, category])

  const handleSwap = useCallback(() => {
    setFromUnit(toUnit)
    setToUnit(fromUnit)
    if (rawResult !== null) {
      setInputValue(String(rawResult))
    }
    setOutputValue(inputValue)
  }, [fromUnit, toUnit, inputValue, rawResult])

  const handleClear = useCallback(() => {
    setInputValue('')
    setOutputValue('')
  }, [])

  const handleCategoryChange = useCallback((newCategory: string) => {
    setCategory(newCategory)
    const newCat = categories.find((c) => c.id === newCategory) || categories[0]
    setFromUnit(newCat.units[0].id)
    setToUnit(newCat.units[1]?.id || newCat.units[0].id)
    setInputValue('')
    setOutputValue('')
  }, [])

  useEffect(() => {
    handleConvert()
  }, [handleConvert])

  return (
    <ToolPageLayout toolId="unit-converter">
      <WorkspaceHeader title={outputValue || '单位换算'}>
        <div className="unit-actions">
          <button className="button ghost compact" onClick={handleClear}>
            <Trash2 size={14} /> 清空
          </button>
        </div>
      </WorkspaceHeader>
      <WorkspaceBody>
        <div className="unit-converter">
          <div className="category-selector">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-chip ${category === cat.id ? 'active' : ''}`}
                onClick={() => handleCategoryChange(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="converter-body">
            <div className="input-group">
              <span className="group-label">从</span>
              <input
                type="number"
                className="unit-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="输入数值"
                step="any"
              />
              <select
                className="unit-select"
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value)}
              >
                {currentCategory.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.symbol})
                  </option>
                ))}
              </select>
            </div>

            <button className="swap-button" onClick={handleSwap} title="交换单位">
              <ArrowLeftRight size={18} />
            </button>

            <div className="input-group">
              <span className="group-label">到</span>
              <input
                type="text"
                className="unit-input result"
                value={outputValue}
                readOnly
                placeholder="结果"
              />
              <select
                className="unit-select"
                value={toUnit}
                onChange={(e) => setToUnit(e.target.value)}
              >
                {currentCategory.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {inputValue && outputValue && (
            <div className="conversion-formula">
              <span>{inputValue} {currentCategory.units.find((u) => u.id === fromUnit)?.symbol}</span>
              <span>=</span>
              <span>{outputValue} {currentCategory.units.find((u) => u.id === toUnit)?.symbol}</span>
            </div>
          )}
        </div>
      </WorkspaceBody>
    </ToolPageLayout>
  )
}