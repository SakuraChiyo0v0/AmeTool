import type { ProviderPreset } from './types'

// ============================================================
// 提供商预设数据
// ============================================================
// 余额查询接口各厂商不统一，以下为实测可用的端点和解析规则。
// hasBalance = false 表示该提供商无公开余额查询接口。
// ============================================================

export const providerPresets: ProviderPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    hasBalance: false,
    docsUrl: 'https://platform.openai.com/docs/api-reference',
    note: 'OpenAI 无公开余额查询接口，可通过 dashboard 查看。',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    hasBalance: true,
    balanceConfig: {
      endpoint: '/user/balance',
      method: 'GET',
      fields: {
        balance: 'balance_infos.0.total_balance',
        used: 'balance_infos.0.discounted_usage',
        total: 'balance_infos.0.total_balance',
      },
    },
    docsUrl: 'https://platform.deepseek.com/api-docs',
  },
  {
    id: 'zhipu',
    name: '智谱 AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    hasBalance: true,
    balanceConfig: {
      endpoint: '/users/balance',
      method: 'GET',
      fields: {
        balance: 'balance',
        used: 'usage',
        total: 'balance',
      },
    },
    docsUrl: 'https://open.bigmodel.cn/dev/api',
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    hasBalance: true,
    balanceConfig: {
      endpoint: '/user/info',
      method: 'GET',
      fields: {
        balance: 'data.balance',
        used: 'data.charge',
        total: 'data.totalCharge',
      },
    },
    docsUrl: 'https://docs.siliconflow.cn',
  },
  {
    id: 'moonshot',
    name: '月之暗面 (Kimi)',
    baseUrl: 'https://api.moonshot.cn/v1',
    hasBalance: false,
    docsUrl: 'https://platform.moonshot.cn/docs',
  },
  {
    id: 'qwen',
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    hasBalance: false,
    docsUrl: 'https://help.aliyun.com/zh/dashscope',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    hasBalance: true,
    balanceConfig: {
      endpoint: '/credits',
      method: 'GET',
      fields: {
        total: 'data.total_credits',
        used: 'data.total_usage',
        balance: 'data.total_credits',
      },
    },
    docsUrl: 'https://openrouter.ai/docs',
  },
  {
    id: 'lingyi',
    name: '零一万物',
    baseUrl: 'https://api.lingyiwanwu.com/v1',
    hasBalance: false,
    docsUrl: 'https://platform.lingyiwanwu.com/docs',
  },
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    hasBalance: false,
    note: '手动填写 Base URL，兼容 OpenAI API 格式的任意提供商。',
  },
]

/** 根据 ID 获取提供商预设 */
export function getProvider(id: string): ProviderPreset | undefined {
  return providerPresets.find((p) => p.id === id)
}
