# AI 模型 API 检测工具 · 设计方案

> 新增工具页面，用于检测 LLM API 的 **配置连通性**、**模型列表查询**、**余额查询** 三项核心能力。

---

## 一、功能概述

用户在接入各类大模型 API（OpenAI、DeepSeek、智谱、硅基流动等）时，常遇到以下问题：

- API Base URL 填错或密钥过期，请求一直报错却不知原因
- 不清楚该提供商支持哪些模型，模型 ID 写错
- 余额/额度不明，线上调用突然失败

本工具提供一个**统一的检测面板**，一次性完成三项检测：

| 检测项 | 说明 | 对应接口 |
|--------|------|----------|
| **连通性测试** | 验证 Base URL + API Key 是否能成功通信 | `GET /v1/models`（OpenAI 兼容标准） |
| **模型列表** | 拉取该提供商支持的全部模型 ID | `GET /v1/models` |
| **余额查询** | 查询账户剩余额度 / 余额 | 各提供商不同（见第四节） |

---

## 二、系统架构

### 2.1 融入现有项目

项目采用 **注册表驱动** 的工具架构，新工具只需两步接入：

```
1. 在 src/pages/ 创建页面组件（使用 ToolPageLayout）
2. 在 src/tools/registry.ts 注册工具定义
   → 路由和工具列表页自动生成
```

本工具注册信息：

```ts
{
  id: 'model-api-checker',
  name: 'AI 模型 API 检测',
  description: '检测大模型 API 的连通性、模型列表和余额查询，支持 OpenAI / DeepSeek / 智谱 / 硅基流动等主流提供商。',
  eyebrow: 'Model API Checker',
  status: 'available',
  icon: Plug,              // lucide-react 图标
  category: 'dev',         // 新增「开发工具」分类
  subcategory: 'api',
  tags: ['AI', 'API', 'LLM', '密钥', '连通性', '余额', '模型列表'],
  component: lazy(() => import('../pages/ModelApiChecker')),
}
```

### 2.2 新增分类

现有分类无合适的归属，建议新增 **「开发工具」** 分类：

```ts
{ id: 'dev', name: '开发工具', icon: Code2, subcategories: [
  { id: 'api', name: 'API 检测' },
] }
```

### 2.3 模块划分

页面组件内部拆分为以下模块：

```
ModelApiChecker (页面)
├── ConfigPanel          配置面板（提供商选择、Base URL、API Key、代理）
├── CheckRunner          检测执行器（调度三项检测，管理状态）
├── ResultConnectivity   连通性结果展示
├── ResultModelList      模型列表结果展示
├── ResultBalance        余额结果展示
└── ProviderPresets      提供商预设数据（独立模块）
```

### 2.4 文件结构

```
src/
├── pages/
│   └── ModelApiChecker.tsx          页面组件（主入口）
├── lib/
│   └── model-api/
│       ├── types.ts                  类型定义
│       ├── providers.ts              提供商预设数据
│       ├── checker.ts                检测核心逻辑（请求封装）
│       └── cors-proxy.ts             CORS 代理处理
├── tools/
│   └── registry.ts                   （修改：注册新工具 + 新分类）
└── styles.css                        （修改：追加页面样式）
```

---

## 三、核心功能设计

### 3.1 连通性测试

**目的**：验证 Base URL 和 API Key 是否有效。

**策略**：向 `{baseUrl}/models` 发送 GET 请求（OpenAI 兼容标准接口），携带 `Authorization: Bearer {apiKey}`。

**判定逻辑**：

| HTTP 状态码 | 判定 | 说明 |
|-------------|------|------|
| 200 | 连通成功 | 密钥有效，Base URL 正确 |
| 401 | 密钥无效 | Base URL 正确，但 API Key 错误或过期 |
| 403 | 权限不足 | 密钥有效但无权限访问该接口 |
| 404 | 地址错误 | Base URL 可能填错（路径不存在） |
| 超时 / 网络错误 | 不可达 | URL 无法访问，或被 CORS 拦截 |

**展示信息**：状态（成功/失败）、HTTP 状态码、响应耗时（ms）、错误详情。

### 3.2 模型列表查询

**目的**：拉取该提供商支持的所有模型。

**策略**：复用连通性测试的 `GET /models` 请求结果（避免重复请求），解析 `data` 数组。

**响应格式**（OpenAI 兼容标准）：

```json
{
  "object": "list",
  "data": [
    { "id": "gpt-4o", "object": "model", "created": 1234567890, "owned_by": "openai" },
    { "id": "gpt-4o-mini", "object": "model", "created": 1234567890, "owned_by": "openai" }
  ]
}
```

**展示信息**：
- 模型总数
- 模型列表表格（ID、创建时间、所属方），支持搜索过滤
- 一键复制全部模型 ID

### 3.3 余额查询

**目的**：查询账户剩余额度。

**难点**：各提供商余额接口**不统一**，需要逐个适配。

**策略**：在提供商预设中定义余额查询的端点路径和响应解析规则，运行时动态拼接 URL 并按规则解析。

**解析规则设计**（JSONPath 风格）：

```ts
interface BalanceConfig {
  endpoint: string              // 余额查询路径，如 '/user/balance'
  method: 'GET' | 'POST'
  // 响应解析：从 JSON 中提取余额字段
  fields: {
    balance?: string            // JSONPath，如 'data.balance' 或 'is_available'
    currency?: string           // 货币字段路径，如 'data.currency'
    used?: string               // 已用额度字段
    total?: string              // 总额度字段
  }
}
```

---

## 四、提供商预设

### 4.1 预设列表

| 提供商 | Base URL | 模型列表 | 余额查询端点 | 余额解析 |
|--------|----------|----------|-------------|----------|
| OpenAI | `https://api.openai.com/v1` | `/models` | 无公开接口 | — |
| DeepSeek | `https://api.deepseek.com` | `/models` | `/user/balance` | `balance_infos[0].total_balance` |
| 智谱 AI | `https://open.bigmodel.cn/api/paas/v4` | `/models` | `/users/balance` | `balance` |
| 硅基流动 | `https://api.siliconflow.cn/v1` | `/models` | `/user/info` | `data.balance` |
| 月之暗面 | `https://api.moonshot.cn/v1` | `/models` | 无 | — |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `/models` | 无 | — |
| OpenRouter | `https://openrouter.ai/api/v1` | `/models` | `/credits` | `data.total_credits - data.total_usage` |
| 零一万物 | `https://api.lingyiwanwu.com/v1` | `/models` | 无 | — |
| 自定义 | 用户填写 | `/models` | 用户填写 | 用户填写 |

### 4.2 预设数据结构

```ts
interface ProviderPreset {
  id: string
  name: string                // 显示名称
  baseUrl: string             // 默认 Base URL
  hasBalance: boolean         // 是否支持余额查询
  balanceConfig?: BalanceConfig
  docsUrl?: string            // 文档链接
  note?: string               // 注意事项
}
```

选择预设后自动填充 Base URL 和余额配置；用户也可选「自定义」手动填写全部字段。

---

## 五、CORS 问题与解决方案

### 5.1 问题分析

本项目是**纯前端 SPA**，浏览器直接请求第三方 API 会受同源策略限制。主流 LLM API 提供商大多**未设置 CORS 响应头**，浏览器请求会被拦截。

### 5.2 解决方案：可配置代理

提供**代理地址输入框**，用户可填入自己的代理 URL。请求流程变为：

```
浏览器 → 代理服务 → LLM API
```

代理地址支持两种模式：

| 模式 | 格式 | 示例 |
|------|------|------|
| 前缀代理 | `{proxy}{targetUrl}` | `https://my-proxy.com/https://api.deepseek.com/models` |
| 占位符代理 | `{proxy}` 中含 `{url}` | `https://my-proxy.com/?url={url}` |

**默认行为**：不使用代理，直接请求。如果请求因 CORS 失败，在错误信息中提示用户配置代理。

### 5.3 开发环境代理（可选）

在 `vite.config.ts` 中增加开发用代理，仅供本地开发测试：

```ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api-proxy': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy/, ''),
      },
    },
  },
})
```

### 5.4 生产环境代理（Docker 部署）

在 `nginx.conf` 中增加一个通用代理 location（可选，用户自行决定是否启用）：

```nginx
location /proxy/ {
    # 代理目标由查询参数 target 指定
    # 注意：生产环境需限制白名单或加鉴权，避免成为开放代理
    resolver 8.8.8.8;
    proxy_pass $arg_target;
    proxy_set_header Host $proxy_host;
    proxy_set_header Authorization $http_authorization;
}
```

> **安全提示**：开放代理有被滥用的风险，生产环境务必加访问控制。

---

## 六、UI 设计

### 6.1 页面布局

采用上下分区布局（非左右分栏），上方为配置区，下方为检测结果区：

```
┌─────────────────────────────────────────────────────┐
│  [工具标题区 - ToolPageLayout 自动渲染]                │
├─────────────────────────────────────────────────────┤
│  配置面板                                             │
│  ┌──────────────┐ ┌──────────────────────────────┐  │
│  │ 提供商选择    │ │ Base URL                     │  │
│  │ [下拉菜单 ▼]  │ │ [______________________]     │  │
│  └──────────────┘ └──────────────────────────────┘  │
│  ┌──────────────────────────────┐ ┌──────────────┐  │
│  │ API Key                      │ │ 代理地址(可选) │  │
│  │ [______________________] [👁] │ │ [__________] │  │
│  └──────────────────────────────┘ └──────────────┘  │
│                                                     │
│  [一键检测]  [仅测连通]  [仅查模型]  [仅查余额]       │
├─────────────────────────────────────────────────────┤
│  检测结果                                             │
│                                                     │
│  ┌─ 连通性测试 ─────────────────────────────────┐   │
│  │ ● 成功  200 OK  耗时 342ms                    │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ 模型列表 ───────────────────────────────────┐   │
│  │ 共 42 个模型  [搜索...]  [复制全部]           │   │
│  │ ┌─────────────────────────────────────────┐  │   │
│  │ │ gpt-4o          openai    2024-05-13    │  │   │
│  │ │ gpt-4o-mini     openai    2024-07-18    │  │   │
│  │ │ ...                                      │  │   │
│  │ └─────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ 余额查询 ───────────────────────────────────┐   │
│  │ 剩余额度: ¥ 52.30                            │   │
│  │ 已用: ¥ 47.70  /  总计: ¥ 100.00             │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 6.2 交互细节

- **API Key 输入框**：默认掩码显示（`sk-****`），点击眼睛图标切换明文
- **提供商切换**：自动填充 Base URL，清空之前的检测结果
- **检测按钮**：支持「一键检测全部」和单项检测
- **检测中状态**：按钮禁用 + loading 动画，结果区显示骨架屏
- **模型列表**：可搜索过滤，点击模型 ID 可复制
- **错误提示**：用红色卡片展示，附带可能原因和建议操作
- **CORS 提示**：检测到网络错误时，展开代理配置说明

### 6.3 状态机

```
idle → checking → success
                ↘ error
```

每个检测项独立维护状态，互不影响。

---

## 七、数据结构

### 7.1 核心类型定义

```ts
// 检测项类型
type CheckType = 'connectivity' | 'models' | 'balance'

// 检测状态
type CheckStatus = 'idle' | 'checking' | 'success' | 'error'

// 单项检测结果
interface CheckResult {
  status: CheckStatus
  httpStatus?: number          // HTTP 状态码
  latency?: number             // 耗时（ms）
  data?: unknown               // 响应数据
  error?: string               // 错误信息
  timestamp: number            // 检测时间
}

// 连通性结果
interface ConnectivityResult extends CheckResult {
  data?: {
    reachable: boolean
    authValid: boolean
  }
}

// 模型列表结果
interface ModelListResult extends CheckResult {
  data?: {
    models: ModelInfo[]
    total: number
  }
}

interface ModelInfo {
  id: string
  ownedBy?: string
  created?: number
}

// 余额结果
interface BalanceResult extends CheckResult {
  data?: {
    balance?: number
    currency?: string
    used?: number
    total?: number
    raw?: unknown              // 原始响应（调试用）
  }
}

// 配置
interface CheckerConfig {
  baseUrl: string
  apiKey: string
  proxyUrl?: string            // 可选代理地址
  provider: string             // 提供商 ID
}
```

### 7.2 本地存储

配置信息（不含 API Key）可持久化到 localStorage，方便下次使用：

```ts
interface StoredConfig {
  provider: string
  baseUrl: string
  proxyUrl?: string
  // apiKey 不存储，每次手动输入
}
```

> **安全原则**：API Key 绝不持久化，仅存在于内存中。

---

## 八、安全考虑

| 风险 | 措施 |
|------|------|
| API Key 泄露 | 仅存内存，不写入 localStorage；输入框默认掩码；页面卸载即清除 |
| Key 在 URL 中暴露 | 所有请求通过 Header 传递 Authorization，不放在 URL 参数 |
| 代理被滥用 | 生产环境代理需加鉴权；代理地址由用户自填，工具不内置公共代理 |
| 第三方请求追踪 | 明确告知用户请求会发送到配置的 API 地址（或代理），工具本身不上报任何数据 |

---

## 九、实现计划

### 9.1 实现步骤

| 步骤 | 内容 | 涉及文件 |
|------|------|----------|
| 1 | 定义类型和提供商预设 | `src/lib/model-api/types.ts`、`providers.ts` |
| 2 | 实现检测核心逻辑 | `src/lib/model-api/checker.ts`、`cors-proxy.ts` |
| 3 | 实现页面组件 | `src/pages/ModelApiChecker.tsx` |
| 4 | 注册工具和新分类 | `src/tools/registry.ts` |
| 5 | 追加页面样式 | `src/styles.css` |
| 6 | 开发环境代理配置 | `vite.config.ts`（可选） |
| 7 | 构建验证 | `npm run build` |

### 9.2 依赖

- **无新增依赖**。全部使用项目已有的 React + lucide-react，HTTP 请求用原生 `fetch`。

---

## 十、后续扩展方向

- **模型可用性测试**：发送最小 chat completion 请求（如 `{"messages":[{"role":"user","content":"hi"}]}`），验证指定模型是否真正可调用
- **批量检测**：支持配置多个提供商，一键批量检测对比
- **延迟对比**：对同一提供商多次请求，绘制延迟折线图（可复用项目已有的 Chart.js）
- **历史记录**：记录历次检测结果，支持对比变化趋势
- **导出报告**：将检测结果导出为 JSON / Markdown 报告
