import { Link } from 'react-router-dom'
import { ArrowRight, Command, Sparkles } from 'lucide-react'

export default function Home() {
  return (
    <div className="home-hero">
      <div className="home-nav">
        <span className="home-brand">
          <Command size={18} />
          <span>WebTool</span>
        </span>
      </div>

      <div className="home-content">
        <div className="home-kicker">
          <span>设计驱动</span>
          <span>简洁实用</span>
        </div>
        <h1 className="home-title">
          在线工具箱
          <br />
          <span>让工作更高效</span>
        </h1>
        <p className="home-desc">
          精心打磨的在线工具集合，涵盖图片处理、编码转换、文本编辑等多个领域。
          无需下载安装，即开即用。
        </p>
        <div className="home-features">
          <div className="feature-item">
            <span className="feature-dot" />
            <span>纯前端运行，数据安全</span>
          </div>
          <div className="feature-item">
            <span className="feature-dot" />
            <span>响应式设计，多端适配</span>
          </div>
          <div className="feature-item">
            <span className="feature-dot" />
            <span>无广告干扰，专注工作</span>
          </div>
        </div>
        <Link className="home-cta" to="/tools">
          开始使用
          <ArrowRight size={18} />
        </Link>
      </div>

      <div className="home-decoration">
        <div className="floating-icon">
          <Sparkles size={20} />
        </div>
        <div className="floating-icon delay-1">
          <Command size={18} />
        </div>
        <div className="floating-icon delay-2">
          <Sparkles size={16} />
        </div>
      </div>
    </div>
  )
}
