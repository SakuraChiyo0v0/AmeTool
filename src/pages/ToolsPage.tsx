import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  ChevronLeft,
  LayoutGrid,
  Grid3X3,
  List,
  Flame,
} from 'lucide-react'
import {
  toolCategories,
  toolRegistry,
  getToolsByCategory,
  getSubCategories,
  searchTools,
} from '../tools/registry'
import type { ToolSubCategory } from '../tools/registry'
import { useToolVisits } from '../hooks/useToolVisits'
export type ViewMode = 'card' | 'compact' | 'list'
export type SortMode = 'default' | 'hot'

export default function ToolsPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [sortMode, setSortMode] = useState<SortMode>('default')
  const { getVisitCount, loading: visitsLoading } = useToolVisits()

  const subcategories = getSubCategories(activeCategory)

  const viewModes: { mode: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
    { mode: 'card', label: '卡片', icon: LayoutGrid },
    { mode: 'compact', label: '紧凑', icon: Grid3X3 },
    { mode: 'list', label: '列表', icon: List },
  ]

  const sortModes: { mode: SortMode; label: string; icon: typeof Flame }[] = [
    { mode: 'default', label: '默认', icon: List },
    { mode: 'hot', label: '热度', icon: Flame },
  ]

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId)
    setActiveSubcategory(null)
  }

  const filteredTools = useMemo(() => {
    let tools = getToolsByCategory(activeCategory, activeSubcategory ?? undefined)
    if (searchQuery) {
      tools = searchTools(searchQuery)
    }
    const availableTools = tools.filter((t) => t.status === 'available')
    
    if (sortMode === 'hot') {
      return [...availableTools].sort((a, b) => {
        const visitsA = getVisitCount(a.id)
        const visitsB = getVisitCount(b.id)
        return visitsB - visitsA
      })
    }
    
    return availableTools
  }, [activeCategory, activeSubcategory, searchQuery, sortMode, getVisitCount])

  const currentCategory = toolCategories.find((cat) => cat.id === activeCategory)
  const availableCount = filteredTools.length
  const totalCount = getToolsByCategory(activeCategory).length

  return (
    <div className="tools-page">
      <div className={`tools-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <nav className="category-nav">
          {toolCategories.map((cat) => (
            <button
              key={cat.id}
              className={`category-item ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat.id)}
              title={cat.name}
            >
              <cat.icon size={16} />
              <span>{cat.name}</span>
            </button>
          ))}
        </nav>
      </div>
      <button
        className="sidebar-ear-toggle"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        <ChevronLeft className="ear-icon" size={14} />
      </button>

      <div className="tools-main">
        <div className="tools-header">
          <div className="header-title">
            <h1>{currentCategory?.name || '全部工具'}</h1>
            <p>共 {totalCount} 个工具，{availableCount} 个可用</p>
            {subcategories.length > 0 && (
              <div className="subcategory-nav">
                <button
                  className={`subcategory-chip ${!activeSubcategory ? 'active' : ''}`}
                  onClick={() => setActiveSubcategory(null)}
                >
                  全部
                </button>
                {subcategories.map((sub) => (
                  <button
                    key={sub.id}
                    className={`subcategory-chip ${activeSubcategory === sub.id ? 'active' : ''}`}
                    onClick={() => setActiveSubcategory(sub.id)}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="tools-header-actions">
            <div className="sort-mode-selector">
              {sortModes.map((item) => (
                <button
                  key={item.mode}
                  className={`sort-mode-btn ${sortMode === item.mode ? 'active' : ''}`}
                  onClick={() => setSortMode(item.mode)}
                  title={item.label}
                  aria-label={`按${item.label}排序`}
                >
                  <item.icon size={14} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            <div className="view-mode-selector">
              {viewModes.map((item) => (
                <button
                  key={item.mode}
                  className={`view-mode-btn ${viewMode === item.mode ? 'active' : ''}`}
                  onClick={() => setViewMode(item.mode)}
                  title={item.label}
                  aria-label={`切换到${item.label}模式`}
                >
                  <item.icon size={16} />
                </button>
              ))}
            </div>
            <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="搜索工具，支持多个关键词"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
            </div>
          </div>
        </div>

        {filteredTools.length > 0 ? (
          <div className={`tools-grid tools-grid--${viewMode}`}>
            {filteredTools.map((tool) => {
              const isAvailable = tool.status === 'available'
              return (
                <Link
                  key={tool.id}
                  to={isAvailable ? `/${tool.id}` : '#'}
                  className={`tool-card ${isAvailable ? '' : 'coming-soon'}`}
                  onClick={(e) => {
                    if (!isAvailable) e.preventDefault()
                  }}
                >
                  <div className="tool-card-icon">
                    <tool.icon size={viewMode === 'compact' ? 18 : 22} />
                  </div>
                  <div className="tool-card-content">
                    <h3>{tool.name}</h3>
                    {viewMode !== 'compact' && (
                      <p>{tool.description}</p>
                    )}
                    {tool.tags && tool.tags.length > 0 && viewMode !== 'compact' && (
                      <div className="tool-card-tags">
                        {tool.tags.slice(0, viewMode === 'list' ? 5 : 3).map((tag) => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {!isAvailable && (
                    <span className="coming-soon-badge">即将上线</span>
                  )}
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Search size={40} style={{ color: 'var(--muted)' }} />
            <h3>未找到匹配的工具</h3>
            <p>尝试其他关键词，或浏览全部工具。</p>
          </div>
        )}
      </div>
    </div>
  )
}
