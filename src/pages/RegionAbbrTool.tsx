import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'

// ============================================================
// 数据
// ============================================================

interface Region {
  name: string
  abbr: string
  type: '省' | '自治区' | '直辖市' | '特别行政区'
  capital: string
}

const REGIONS: Region[] = [
  // ---- 23 个省 ----
  { name: '河北省', abbr: '冀', type: '省', capital: '石家庄' },
  { name: '山西省', abbr: '晋', type: '省', capital: '太原' },
  { name: '辽宁省', abbr: '辽', type: '省', capital: '沈阳' },
  { name: '吉林省', abbr: '吉', type: '省', capital: '长春' },
  { name: '黑龙江省', abbr: '黑', type: '省', capital: '哈尔滨' },
  { name: '江苏省', abbr: '苏', type: '省', capital: '南京' },
  { name: '浙江省', abbr: '浙', type: '省', capital: '杭州' },
  { name: '安徽省', abbr: '皖', type: '省', capital: '合肥' },
  { name: '福建省', abbr: '闽', type: '省', capital: '福州' },
  { name: '江西省', abbr: '赣', type: '省', capital: '南昌' },
  { name: '山东省', abbr: '鲁', type: '省', capital: '济南' },
  { name: '河南省', abbr: '豫', type: '省', capital: '郑州' },
  { name: '湖北省', abbr: '鄂', type: '省', capital: '武汉' },
  { name: '湖南省', abbr: '湘', type: '省', capital: '长沙' },
  { name: '广东省', abbr: '粤', type: '省', capital: '广州' },
  { name: '海南省', abbr: '琼', type: '省', capital: '海口' },
  { name: '四川省', abbr: '川 / 蜀', type: '省', capital: '成都' },
  { name: '贵州省', abbr: '贵 / 黔', type: '省', capital: '贵阳' },
  { name: '云南省', abbr: '云 / 滇', type: '省', capital: '昆明' },
  { name: '陕西省', abbr: '陕 / 秦', type: '省', capital: '西安' },
  { name: '甘肃省', abbr: '甘 / 陇', type: '省', capital: '兰州' },
  { name: '青海省', abbr: '青', type: '省', capital: '西宁' },
  { name: '台湾省（中国台湾）', abbr: '台', type: '省', capital: '台北' },
  // ---- 5 个自治区 ----
  { name: '内蒙古自治区', abbr: '蒙', type: '自治区', capital: '呼和浩特' },
  { name: '广西壮族自治区', abbr: '桂', type: '自治区', capital: '南宁' },
  { name: '西藏自治区', abbr: '藏', type: '自治区', capital: '拉萨' },
  { name: '宁夏回族自治区', abbr: '宁', type: '自治区', capital: '银川' },
  { name: '新疆维吾尔自治区', abbr: '新', type: '自治区', capital: '乌鲁木齐' },
  // ---- 4 个直辖市 ----
  { name: '北京市', abbr: '京', type: '直辖市', capital: '-' },
  { name: '天津市', abbr: '津', type: '直辖市', capital: '-' },
  { name: '上海市', abbr: '沪 / 申', type: '直辖市', capital: '-' },
  { name: '重庆市', abbr: '渝', type: '直辖市', capital: '-' },
  // ---- 2 个特别行政区 ----
  { name: '香港特别行政区（中国香港）', abbr: '港', type: '特别行政区', capital: '-' },
  { name: '澳门特别行政区（中国澳门）', abbr: '澳', type: '特别行政区', capital: '-' },
]

const TYPE_FILTERS = [
  { label: '全部', value: 'all', count: 34 },
  { label: '省', value: '省', count: 23 },
  { label: '自治区', value: '自治区', count: 5 },
  { label: '直辖市', value: '直辖市', count: 4 },
  { label: '特别行政区', value: '特别行政区', count: 2 },
]

const TYPE_CLASS: Record<string, string> = {
  '省': 'region-tag-province',
  '自治区': 'region-tag-autonomous',
  '直辖市': 'region-tag-municipality',
  '特别行政区': 'region-tag-sar',
}

// ============================================================
// 组件
// ============================================================

export default function RegionAbbrTool() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = useMemo(() => {
    let list = REGIONS
    if (typeFilter !== 'all') {
      list = list.filter((r) => r.type === typeFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.abbr.toLowerCase().includes(q) ||
          r.capital.toLowerCase().includes(q),
      )
    }
    return list
  }, [search, typeFilter])

  return (
    <ToolPageLayout toolId="region-abbr">
      <WorkspaceHeader title="各省市区简称速查">
        <span className="region-count-badge">{filtered.length} / {REGIONS.length}</span>
      </WorkspaceHeader>
      <WorkspaceBody>
        <div className="region-tool">
          {/* 搜索框 */}
          <div className="region-search-box">
            <Search size={16} className="region-search-icon" />
            <input
              type="text"
              className="region-search-input"
              placeholder={'搜索省份名称、简称或省会，如 冀 / 广东 / 南京 ...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              spellCheck={false}
            />
          </div>

          {/* 类型筛选 */}
          <div className="region-filter-row">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`region-filter-chip ${typeFilter === f.value ? 'active' : ''}`}
                onClick={() => setTypeFilter(f.value)}
              >
                {f.label}
                <span className="region-filter-chip-count">{f.count}</span>
              </button>
            ))}
          </div>

          {/* 数据表格 */}
          <div className="region-table-wrap">
            <table className="region-table">
              <thead>
                <tr>
                  <th className="col-num">#</th>
                  <th className="col-name">名称</th>
                  <th className="col-abbr">简称</th>
                  <th className="col-type">类型</th>
                  <th className="col-capital">省会 / 首府</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="region-empty">
                      未找到匹配结果
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr key={r.name}>
                      <td className="col-num">{i + 1}</td>
                      <td className="col-name">{r.name}</td>
                      <td className="col-abbr">
                        <span className="region-abbr-code">{r.abbr}</span>
                      </td>
                      <td className="col-type">
                        <span className={`region-type-tag ${TYPE_CLASS[r.type] || ''}`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="col-capital">{r.capital}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 底部使用提示 */}
          <div className="region-footer-hint">
            提示：支持浏览器 <kbd>Ctrl</kbd> + <kbd>F</kbd> 快捷搜索；适用于地图制作、地址标准化、行政区划查询、数据标签处理、考试复习记忆等场景。
          </div>
        </div>
      </WorkspaceBody>
    </ToolPageLayout>
  )
}
