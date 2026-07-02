/**
 * 工具页面脚手架
 *
 * 用法：
 *   node scripts/scaffold-tool.js <id> <name> <eyebrow> <category> [tags...]
 *
 * 示例：
 *   node scripts/scaffold-tool.js json "JSON 工具" "JSON Tool" text "JSON" "格式化" "压缩"
 *   node scripts/scaffold-tool.js password "密码生成" "Password" security "密码" "安全"
 *
 * 自动完成：
 *   1. 在 src/pages/ 下创建页面组件文件（ToolPageLayout 模板）
 *   2. 自动更新 src/tools/registry.ts（添加工具定义，自动导入图标）
 *   3. 路由和工具选择页会自动生成，无需额外修改
 */

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const pagesDir = join(root, 'src', 'pages')
const registryPath = join(root, 'src', 'tools', 'registry.ts')

const [id, name, eyebrow, category, ...tags] = process.argv.slice(2)

if (!id || !name || !eyebrow || !category) {
  console.log('用法: node scripts/scaffold-tool.js <id> <name> <eyebrow> <category> [tags...]')
  console.log('示例: node scripts/scaffold-tool.js json "JSON 工具" "JSON Tool" text "JSON" "格式化"')
  console.log('')
  console.log('可选分类: image, text, encode, calculator, color, qrcode, security')
  process.exit(1)
}

const baseId = id.endsWith('-tool') ? id.slice(0, -5) : id
const pascalCaseId = baseId
  .split('-')
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join('')
const componentName = pascalCaseId + 'Tool'
const fileName = componentName + '.tsx'
const filePath = join(pagesDir, fileName)

const categoryIconMap = {
  image: 'Image',
  text: 'FileText',
  encode: 'Type',
  calculator: 'Calculator',
  color: 'Palette',
  qrcode: 'QrCode',
  security: 'Key',
}
const defaultIcon = categoryIconMap[category] || 'Wrench'

// ---- 1. 生成页面组件文件 ----
const template = `import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'

export default function ${componentName}() {
  return (
    <ToolPageLayout toolId="${id}">
      <WorkspaceHeader title="默认模式" />
      <WorkspaceBody>
        <div className="empty-state">
          <h3>${name}</h3>
          <p>工具内容区域 —— 在此实现你的功能。</p>
        </div>
      </WorkspaceBody>
    </ToolPageLayout>
  )
}
`

if (existsSync(filePath)) {
  console.log(`  [跳过] 页面文件已存在: src/pages/${fileName}`)
} else {
  writeFileSync(filePath, template, 'utf-8')
  console.log(`  [创建] src/pages/${fileName}`)
}

// ---- 2. 更新 registry.ts ----
let registryContent = readFileSync(registryPath, 'utf-8')

const existingImport = /^(import \{[\s\S]*?\} from 'lucide-react')/m
const match = registryContent.match(existingImport)
if (!match) {
  console.error('  [错误] 无法找到 lucide-react 导入语句')
  process.exit(1)
}

let imports = match[1]
const importContents = imports.replace(/^import \{/, '').replace(/\} from 'lucide-react'/, '')
const importedIcons = importContents.split(',').map((s) => s.trim()).filter(Boolean)

if (!importedIcons.includes(defaultIcon)) {
  const newImports = imports.replace(/\} from 'lucide-react'/, ', ' + defaultIcon + ' } from \'lucide-react\'')
  registryContent = registryContent.replace(imports, newImports)
  console.log(`  [更新] registry.ts - 添加图标导入: ${defaultIcon}`)
}

const marker = '// ---- 即将上线 ----'
const markerIndex = registryContent.indexOf(marker)
if (markerIndex === -1) {
  console.error('  [错误] 无法找到 "即将上线" 标记')
  process.exit(1)
}

const toolEntry = `
  {
    id: '${id}',
    name: '${name}',
    description: 'TODO: 写一句简短描述',
    eyebrow: '${eyebrow}',
    status: 'available',
    icon: ${defaultIcon},
    category: '${category}',
    tags: ${tags.length > 0 ? `['${tags.join("', '")}']` : 'undefined'},
    component: lazy(() => import('../pages/${componentName}')),
  },`

registryContent = registryContent.replace(marker, toolEntry + '\n' + marker)
writeFileSync(registryPath, registryContent, 'utf-8')
console.log(`  [更新] registry.ts - 添加工具定义: ${id}`)

console.log('\n========================================')
console.log('脚手架完成！')
console.log('========================================')
console.log(`  页面组件: src/pages/${fileName}`)
console.log('  注册表:   src/tools/registry.ts')
console.log('========================================')
console.log('\n接下来需要手动做：')
console.log('  1. 编辑 registry.ts 中的 description（写一句简短描述）')
console.log('  2. 如果需要，更换 icon（从 lucide-react 选择合适的图标）')
console.log('  3. 编辑页面组件，实现业务逻辑')
console.log('  4. 路由和工具选择页会自动生成，无需额外修改')