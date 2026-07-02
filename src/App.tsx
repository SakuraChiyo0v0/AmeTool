import { useEffect, useState, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { initialTheme, type Theme } from './components/ThemePicker'
import { availableTools } from './tools/registry'
import Home from './pages/Home'
import ToolsPage from './pages/ToolsPage'

export default function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('webtool-theme', theme)
    } catch {
      /* graceful fallback */
    }
  }, [theme])

  return (
    <Routes>
      <Route element={<Layout theme={theme} setTheme={setTheme} />}>
        <Route index element={<Home />} />
        <Route path="tools" element={<ToolsPage />} />
        {availableTools.map((tool) => {
          const Component = tool.component
          if (!Component) return null
          return (
            <Route
              key={tool.id}
              path={tool.id}
              element={
                <Suspense
                  fallback={
                    <div className="page tool-page">
                      <div className="empty-state">
                        <h3>加载中...</h3>
                      </div>
                    </div>
                  }
                >
                  <Component />
                </Suspense>
              }
            />
          )
        })}
      </Route>
    </Routes>
  )
}
