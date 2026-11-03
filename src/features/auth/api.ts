import { getJson } from '@/lib/http'
import type { LoginAccount } from '@/lib/auth'

export type AccountStatus = 'active' | 'disabled'

export type Account = LoginAccount & {
  password: string
  /** disabled 时禁止登录 */
  status: AccountStatus
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时换成登录接口
export function fetchAccounts(): Promise<Account[]> {
  return getJson<Account[]>('/mock/accounts.json')
}

// 开发环境由 vite 中间件写入 public/mock/accounts.json；生产环境换成真实接口
export async function saveAccounts(accounts: Account[]): Promise<void> {
  const res = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accounts)
  })
  if (!res.ok) throw new Error('保存失败')
}
