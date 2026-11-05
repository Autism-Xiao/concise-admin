import { Button } from '@/components/ui/button'
import { logout } from '@/lib/auth'

/**
 * 账号一个业务菜单都没授权时的兜底页。
 * 不再甩 403（用户会以为链接坏了），而是说明原因 + 给出可操作的下一步。
 */
export function NoMenuAccess() {
  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="text-muted-foreground text-7xl font-bold tracking-tight">—</div>
      <h1 className="text-2xl font-bold">尚未分配功能权限</h1>
      <p className="text-muted-foreground max-w-md">
        当前账号的角色还没有勾选任何菜单。请联系管理员在「角色管理 → 分配权限」中勾选菜单和按钮，然后退出重新登录。
      </p>
      <div className="mt-2 flex gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>
          刷新
        </Button>
        <Button onClick={handleLogout}>退出登录</Button>
      </div>
    </div>
  )
}
