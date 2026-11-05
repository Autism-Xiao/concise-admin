import { createFileRoute, redirect } from '@tanstack/react-router'
import { resolveHomePathFromStorage } from '@/lib/home-path'

export const Route = createFileRoute('/')({
  // 首页不写死 /dashboard：后端菜单里没有「仪表盘」节点，只授权了业务菜单的账号会被权限守卫拦到 403
  beforeLoad: () => {
    throw redirect({ to: resolveHomePathFromStorage() as never })
  }
})
