import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShortcutSettings } from './shortcut-settings'

/**
 * 系统设置 · 快捷键页
 *
 * 全局快捷键的查看与改绑（原在偏好设置抽屉里，收进系统设置统一管理）。
 * 绑定存本机 localStorage，改动立即生效。
 */
export function ShortcutsPage() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>快捷键</CardTitle>
        <CardDescription>查看与自定义全局快捷键，改绑后立即生效，保存在本机</CardDescription>
      </CardHeader>
      <CardContent>
        <ShortcutSettings />
      </CardContent>
    </Card>
  )
}
