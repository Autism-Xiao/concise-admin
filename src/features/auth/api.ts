import { getJson } from '@/lib/http'
import type { LoginAccount } from '@/lib/auth'

export type Account = LoginAccount & { password: string }

// 开发环境走 public/mock 下的静态 JSON；接真实后端时换成登录接口
export function fetchAccounts(): Promise<Account[]> {
  return getJson<Account[]>('/mock/accounts.json')
}
