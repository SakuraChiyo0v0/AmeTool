import { type ReactNode, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getTool } from '../tools/registry'
import { useToolVisits } from '../hooks/useToolVisits'

export default function ToolPageLayout({
  toolId,
  children,
}: {
  toolId: string
  children: ReactNode
}) {
  const tool = getTool(toolId)
  const { incrementVisit } = useToolVisits()

  useEffect(() => {
    incrementVisit(toolId)
  }, [toolId, incrementVisit])

  if (!tool) {
    return (
      <div className="page">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> 返回工具箱
        </Link>
        <div className="empty-state">
          <h3>工具未找到</h3>
          <p>toolId="{toolId}" 未在 registry 中注册。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tool-page">
      <header className="tool-page-header">
        <div className="tool-page-header-icon">
          <tool.icon size={20} />
        </div>
        <div className="tool-page-header-content">
          <p className="eyebrow">{tool.eyebrow}</p>
          <h1>{tool.name}</h1>
          <p>{tool.description}</p>
        </div>
      </header>

      <div className="tool-workspace">{children}</div>
    </div>
  )
}

export function WorkspaceHeader({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <div className="tool-workspace-header">
      <span>{title}</span>
      {children}
    </div>
  )
}

export function WorkspaceBody({ children }: { children: ReactNode }) {
  return <div className="tool-workspace-body">{children}</div>
}

export function WorkspaceSplit({
  left,
  right,
  leftWidth = '50%',
}: {
  left: ReactNode
  right: ReactNode
  leftWidth?: string
}) {
  return (
    <div className="tool-workspace-split" style={{ '--left-width': leftWidth } as React.CSSProperties}>
      <div className="tool-workspace-split-left">{left}</div>
      <div className="tool-workspace-split-right">{right}</div>
    </div>
  )
}
