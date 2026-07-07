import { lazy, type ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Calculator,
  Image,
  FileText,
  FileJson,
  Key,
  Palette,
  QrCode,
  TrendingUp,
  Wrench,
  Landmark,
  Search,
  UserCircle,
  Keyboard,
  Zap,
  Globe,
  ArrowLeftRight,
  Contact,
  FileCode2,
  Film,
  Dices,
  ServerCog,
  Plug,
  Code2,
  Terminal,
} from 'lucide-react'

// ============================================================
// 工具分类 & 子分类
// ============================================================
export interface ToolSubCategory {
  id: string
  name: string
}

export interface ToolCategory {
  id: string
  name: string
  icon: LucideIcon
  subcategories: ToolSubCategory[]
}

export const toolCategories: ToolCategory[] = [
  { id: 'all', name: '全部工具', icon: Wrench, subcategories: [] },
  { id: 'image', name: '图片工具', icon: Image, subcategories: [
    { id: 'edit', name: '编辑处理' },
    { id: 'split', name: '切片切割' },
  ]},
  { id: 'text', name: '文本工具', icon: FileText, subcategories: [
    { id: 'format', name: '格式化' },
  ]},
  { id: 'calculator', name: '数学计算', icon: Calculator, subcategories: [
    { id: 'basic', name: '基础计算' },
    { id: 'unit', name: '单位换算' },
    { id: 'finance', name: '理财计算' },
  ]},
  { id: 'color', name: '颜色工具', icon: Palette, subcategories: [
    { id: 'picker', name: '取色工具' },
  ]},
  { id: 'qrcode', name: '二维码', icon: QrCode, subcategories: [
    { id: 'generate', name: '生成' },
  ]},
  { id: 'security', name: '安全工具', icon: Key, subcategories: [
    { id: 'password', name: '密码工具' },
  ]},
  { id: 'query', name: '查询工具', icon: Search, subcategories: [
    { id: 'avatar', name: '头像获取' },
    { id: 'region', name: '行政速查' },
    { id: 'idcard', name: '身份证查询' },
    { id: 'ascii', name: '编码参考' },
    { id: 'gif', name: 'GIF工具' },
  ]},
  { id: 'debug', name: '调试工具', icon: Keyboard, subcategories: [
    { id: 'tester', name: '硬件检测' },
    { id: 'reaction', name: '反应测试' },
    { id: 'protocol', name: '协议探测' },
  ]},
  { id: 'dev', name: '开发工具', icon: Code2, subcategories: [
    { id: 'api', name: 'API 检测' },
    { id: 'curl', name: 'CURL 请求' },
  ]},
]

// ============================================================
// 工具状态
// ============================================================
export type ToolStatus = 'available' | 'coming-soon'

// ============================================================
// 工具定义
// ============================================================
export interface ToolDefinition {
  id: string
  name: string
  description: string
  eyebrow: string
  status: ToolStatus
  icon: LucideIcon
  category: string
  subcategory?: string
  tags?: string[]
  component?: ComponentType
}

// ============================================================
// 工具注册表
// ============================================================
export const toolRegistry: ToolDefinition[] = [
  {
    id: 'image',
    name: '图片处理',
    description: '上传图片，调整尺寸、压缩质量，一键下载。',
    eyebrow: 'Image Tool',
    status: 'available',
    icon: Image,
    category: 'image',
    subcategory: 'edit',
    tags: ['图片', '压缩', '缩放'],
    component: lazy(() => import('../pages/ImageTool')),
  },
  {
    id: 'grid-cutter',
    name: '九宫格切图',
    description: '上传任意尺寸图片，支持 2×2 / 3×3 / 4×4 / 5×5 网格切分，单张下载和 ZIP 打包下载，适合朋友圈和小红书发图。',
    eyebrow: 'Grid Cutter',
    status: 'available',
    icon: Image,
    category: 'image',
    subcategory: 'split',
    tags: ['九宫格', '切图', '3x3', '朋友圈'],
    component: lazy(() => import('../pages/GridCutterTool')),
  },
  {
    id: 'image-splitter',
    name: 'AI 图片智能切割',
    description: '上传AI拼图大图，自动识别每张小图区域并批量切割导出，支持阈值调节、手动修正、ZIP打包下载。',
    eyebrow: 'Image Splitter',
    status: 'available',
    icon: Image,
    category: 'image',
    subcategory: 'split',
    tags: ['AI拼图', '切割', '切图', '拆分', '批量导出'],
    component: lazy(() => import('../pages/ImageSplitterTool')),
  },
  {
    id: 'calculator',
    name: '在线计算器',
    description: '简洁的标准计算器，支持四则运算、百分比、小数运算和撤销操作。',
    eyebrow: 'Calculator',
    status: 'available',
    icon: Calculator,
    category: 'calculator',
    subcategory: 'basic',
    tags: ['计算', '四则运算'],
    component: lazy(() => import('../pages/Calculator')),
  },
  {
    id: 'json-formatter',
    name: 'JSON 格式化',
    description: '将压缩的 JSON 文本格式化美化，支持自定义缩进和压缩功能，一键复制结果。',
    eyebrow: 'JSON Formatter',
    status: 'available',
    icon: FileJson,
    category: 'text',
    subcategory: 'format',
    tags: ['JSON', '格式化', '压缩'],
    component: lazy(() => import('../pages/JsonFormatter')),
  },
  {
    id: 'compound-calculator',
    name: '复利计算器',
    description: '计算复利收益，支持快速预设（余额宝、银行存款、基金定投、股票投资），显示年度收益明细。',
    eyebrow: 'Compound Calculator',
    status: 'available',
    icon: TrendingUp,
    category: 'calculator',
    subcategory: 'finance',
    tags: ['复利', '投资', '理财'],
    component: lazy(() => import('../pages/CompoundCalculator')),
  },
  {
    id: 'tax-calculator',
    name: '个税计算器',
    description: '根据税前月薪、五险一金及专项附加扣除，计算个人所得税和税后收入，支持年终奖计税及月度明细。',
    eyebrow: 'Tax Calculator',
    status: 'available',
    icon: Landmark,
    category: 'calculator',
    subcategory: 'finance',
    tags: ['个税', '个人所得税', '薪资', '税后', '年终奖'],
    component: lazy(() => import('../pages/TaxCalculator')),
  },
  {
    id: 'password',
    name: '密码生成',
    description: '生成高强度随机密码，支持自定义长度和字符类型，一键复制。',
    eyebrow: 'Password',
    status: 'available',
    icon: Key,
    category: 'security',
    subcategory: 'password',
    tags: ['密码', '安全'],
    component: lazy(() => import('../pages/PasswordTool')),
  },
  {
    id: 'color-picker',
    name: '颜色选择器',
    description: '可视化颜色选择，支持 RGB/HEX/HSL 格式转换和复制，快速获取颜色代码。',
    eyebrow: 'Color Picker',
    status: 'available',
    icon: Palette,
    category: 'color',
    subcategory: 'picker',
    tags: ['颜色', '取色'],
    component: lazy(() => import('../pages/ColorPickerTool')),
  },
  {
    id: 'unit-converter',
    name: '单位换算',
    description: '支持长度、重量、温度、面积、体积、速度、时间、数据、功率、能量、压力、力、频率、角度等14种单位类型的相互转换。',
    eyebrow: 'Unit Converter',
    status: 'available',
    icon: Calculator,
    category: 'calculator',
    subcategory: 'unit',
    tags: ['长度', '重量', '温度', '面积', '体积', '速度', '时间', '数据', '功率', '能量', '压力', '力', '频率', '角度'],
    component: lazy(() => import('../pages/UnitConverterTool')),
  },
  {
    id: 'random-number',
    name: '随机数生成',
    description: '生成整数或小数随机序列，支持数量、范围、去重、排序、步长、小数位、分隔符和随机种子复现。',
    eyebrow: 'Random Number',
    status: 'available',
    icon: Dices,
    category: 'calculator',
    subcategory: 'basic',
    tags: ['随机数', '随机', '数字', '抽样', '整数', '小数'],
    component: lazy(() => import('../pages/RandomNumberTool')),
  },
  {
    id: 'qrcode',
    name: '二维码生成',
    description: '输入文字或链接，一键生成二维码并下载。',
    eyebrow: 'QR Code',
    status: 'available',
    icon: QrCode,
    category: 'qrcode',
    subcategory: 'generate',
    tags: ['二维码', '生成'],
    component: lazy(() => import('../pages/QrCodeGenerator')),
  },
  {
    id: 'qq-avatar',
    name: 'QQ头像获取',
    description: '输入QQ号，快速获取对应QQ头像，支持多种尺寸预览、下载和复制直链。',
    eyebrow: 'QQ Avatar',
    status: 'available',
    icon: UserCircle,
    category: 'query',
    subcategory: 'avatar',
    tags: ['QQ', '头像', '头像获取', '查询'],
    component: lazy(() => import('../pages/QqAvatarTool')),
  },
  {
    id: 'region-abbr',
    name: '各省市区简称速查',
    description: '在线快速查询全国 34 个省级行政单位的一字简称，支持搜索过滤和类型筛选，适用于地图制作、地址标准化、考试复习等场景。',
    eyebrow: 'Region Abbr',
    status: 'available',
    icon: Globe,
    category: 'query',
    subcategory: 'region',
    tags: ['省份', '简称', '行政区划', '速查', '地图'],
    component: lazy(() => import('../pages/RegionAbbrTool')),
  },
  {
    id: 'key-tester',
    name: '键盘鼠标检测',
    description: '实时检测键盘按键和鼠标按钮状态，支持 未按 / 按中 / 按过 三种状态可视化，记录按压次数和事件日志。',
    eyebrow: 'Key Tester',
    status: 'available',
    icon: Keyboard,
    category: 'debug',
    subcategory: 'tester',
    tags: ['键盘', '鼠标', '检测', '测试', '按键', '调试'],
    component: lazy(() => import('../pages/KeyTester')),
  },
  {
    id: 'reaction-test',
    name: '反应速度测试',
    description: '测试你的反应速度！随机倒计时后检测框变色，记录从变色到点击的毫秒数，支持历史记录和评级。',
    eyebrow: 'Reaction Test',
    status: 'available',
    icon: Zap,
    category: 'debug',
    subcategory: 'reaction',
    tags: ['反应', '速度', '测试', '反应时间'],
    component: lazy(() => import('../pages/ReactionTestTool')),
  },
  {
    id: 'mcp-inspector',
    name: 'MCP 探测器',
    description: '粘贴 MCP JSON 配置，解析服务地址、鉴权头和传输类型，并尝试探测工具、资源、提示词等接口能力。',
    eyebrow: 'MCP Inspector',
    status: 'available',
    icon: ServerCog,
    category: 'debug',
    subcategory: 'protocol',
    tags: ['MCP', 'JSON-RPC', '接口探测', '协议', '工具列表'],
    component: lazy(() => import('../pages/McpInspectorTool')),
  },
  {
    id: 'base64-image',
    name: 'Base64 图片转换',
    description: '在线图片与 Base64 编码互转工具。支持拖拽/粘贴图片生成 Base64，也支持粘贴 Base64 字符串即时预览和解码下载。',
    eyebrow: 'Base64 Image',
    status: 'available',
    icon: ArrowLeftRight,
    category: 'image',
    subcategory: 'edit',
    tags: ['Base64', '图片', '编码', '解码', '转换', '互转'],
    component: lazy(() => import('../pages/Base64ImageTool')),
  },
  {
    id: 'id-card',
    name: '身份证信息查询',
    description: '根据 18 位身份证号码解析归属地（省/市/区县）、出生日期、性别、年龄，并校验校验码是否合法。',
    eyebrow: 'ID Card Query',
    status: 'available',
    icon: Contact,
    category: 'query',
    subcategory: 'idcard',
    tags: ['身份证', '身份证查询', '归属地', '校验', '行政区划'],
    component: lazy(() => import('../pages/IdCardTool')),
  },
  {
    id: 'ascii-table',
    name: 'ASCII 对照表',
    description: '标准 ASCII 码表（0-127），快速查询字符的十进制、十六进制、八进制、二进制、HTML 实体和描述，支持搜索和分类筛选。',
    eyebrow: 'ASCII Table',
    status: 'available',
    icon: FileCode2,
    category: 'query',
    subcategory: 'ascii',
    tags: ['ASCII', '字符编码', '对照表', '速查', '码表'],
    component: lazy(() => import('../pages/AsciiTableTool')),
  },
  {
    id: 'gif-tool',
    name: 'GIF 工具箱',
    description: 'GIF 逐帧拆分导出、视频转 GIF、GIF 变速与倒放，纯浏览器端处理，无需上传服务器。',
    eyebrow: 'GIF Toolbox',
    status: 'available',
    icon: Film,
    category: 'query',
    subcategory: 'gif',
    tags: ['GIF', '动图', '帧拆分', '视频转GIF', '变速', '倒放'],
    component: lazy(() => import('../pages/GifTool')),
  },
  {
    id: 'model-api-checker',
    name: 'AI 模型 API 检测',
    description: '检测大模型 API 的连通性、模型列表和余额查询，支持 OpenAI / DeepSeek / 智谱 / 硅基流动等主流提供商。',
    eyebrow: 'Model API Checker',
    status: 'available',
    icon: Plug,
    category: 'dev',
    subcategory: 'api',
    tags: ['AI', 'API', 'LLM', '密钥', '连通性', '余额', '模型列表', 'OpenAI', 'DeepSeek'],
    component: lazy(() => import('../pages/ModelApiChecker')),
  },
  {
    id: 'curl-runner',
    name: 'CURL 请求工具',
    description: '粘贴 curl 命令自动解析，支持 $VAR / ${VAR} 全局变量，自动生成输入框并跨命令复用，一键发送 HTTP 请求并查看响应。',
    eyebrow: 'CURL Runner',
    status: 'available',
    icon: Terminal,
    category: 'dev',
    subcategory: 'curl',
    tags: ['curl', 'HTTP', 'API', '请求', '变量', '调试', '$VAR', '全局变量'],
    component: lazy(() => import('../pages/CurlRunner')),
  },
  ]

// ============================================================
// 辅助查询
// ============================================================

export const availableTools = toolRegistry.filter((t) => t.status === 'available')
export const comingSoonTools = toolRegistry.filter((t) => t.status === 'coming-soon')

export function getTool(id: string): ToolDefinition | undefined {
  return toolRegistry.find((t) => t.id === id)
}

export function getToolsByCategory(categoryId: string, subcategoryId?: string): ToolDefinition[] {
  let tools = categoryId === 'all' ? toolRegistry : toolRegistry.filter((t) => t.category === categoryId)
  if (subcategoryId) {
    tools = tools.filter((t) => t.subcategory === subcategoryId)
  }
  return tools
}

export function getSubCategories(categoryId: string): ToolSubCategory[] {
  if (categoryId === 'all') return []
  const cat = toolCategories.find((c) => c.id === categoryId)
  return cat?.subcategories ?? []
}

export function searchTools(query: string): ToolDefinition[] {
  const q = query.toLowerCase().trim()
  if (!q) return toolRegistry
  return toolRegistry.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(q)),
  )
}

// ============================================================
// 添加新工具的 SOP
// ============================================================
// 1. 在 src/pages/ 创建页面组件（使用 ToolPageLayout）
// 2. 在 toolRegistry 数组中添加定义（id/name/description/eyebrow/status/icon/category/subcategory/tags/component）
// 3. 路由和工具选择页会自动生成
// ============================================================
