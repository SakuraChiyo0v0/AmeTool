import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Command } from 'lucide-react'
import ThemePicker, { type Theme } from './ThemePicker'

const navItems = [
  { to: '/', label: '首页', end: true },
  { to: '/tools', label: '全部工具' },
]

export default function Layout({
  theme,
  setTheme,
}: {
  theme: Theme
  setTheme: (v: Theme) => void
}) {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isToolsPage = location.pathname === '/tools'

  if (isHome) {
    return <Outlet />
  }

  return (
    <>
      <nav className="nav" aria-label="主要导航">
        <div className="nav-left">
          <Link className="brand" to="/" aria-label="WebTool 首页">
            <span className="brand-mark">
              <Command size={17} />
            </span>
            <span>
              WebTool
              <span> · 工具箱</span>
            </span>
          </Link>
          <div className="nav-links">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="nav-actions">
          <ThemePicker theme={theme} setTheme={setTheme} />
        </div>
      </nav>

      <main id="main">
        <Outlet />
      </main>

      {!isToolsPage && (
        <footer>
          <div>
            <span className="brand-mark">
              <Command size={17} />
            </span>
            <strong>WebTool</strong>
          </div>
          <p>简单、干净、即开即用的在线工具集合。</p>
          <Link to="/">返回首页</Link>
        </footer>
      )}
    </>
  )
}
