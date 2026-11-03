import { createFileRoute, redirect } from '@tanstack/react-router'

// 旧的 /system/log 精确命中时重定向到登录日志；子路径（login/operation）正常放行
export const Route = createFileRoute('/_authenticated/system/log')({
  beforeLoad: ({ location }) => {
    if (location.pathname === '/system/log') {
      throw redirect({ to: '/system/log/login' })
    }
  }
})
