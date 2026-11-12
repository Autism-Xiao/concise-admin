import { useCallback, useEffect, useState } from 'react'
import { ArchiveRestore, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { fetchRecycledUsers, restoreUser, type User } from '../api'

interface RecycleBinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 恢复成功后回调（刷新用户列表） */
  onRestored?: () => void
}

/**
 * 用户回收站：软删账号在此可查可恢复。
 * 恢复是「空壳」——角色/部门已随软删清空，恢复后需重新分配；用户名被占用时后端会拒绝。
 */
export function RecycleBinDialog({ open, onOpenChange, onRestored }: RecycleBinDialogProps) {
  const [keyword, setKeyword] = useState('')
  const [rows, setRows] = useState<User[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState<User | null>(null)

  const load = useCallback(async (kw: string) => {
    setLoading(true)
    try {
      const page = await fetchRecycledUsers({ keyword: kw || undefined })
      setRows(page.records)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '回收站加载失败')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setKeyword('')
      void load('')
    }
  }, [open, load])

  const doRestore = async () => {
    if (!restoring) return
    try {
      await restoreUser(restoring.id)
      toast.success(`账号「${restoring.realname || restoring.username}」已恢复，请重新分配角色与部门`)
      setRestoring(null)
      await load(keyword.trim())
      onRestored?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '恢复失败')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>用户回收站</DialogTitle>
          <DialogDescription>被删除的账号在此保留（软删除）。恢复后账号为空壳：角色与部门已清空，需要重新分配。</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            className="pl-8"
            placeholder="搜索账号 / 姓名 / 手机号"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') void load(keyword.trim())
            }}
          />
        </div>

        <div className="max-h-[45vh] min-h-40 overflow-y-auto rounded-md border">
          {loading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !rows?.length ? (
            <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">回收站是空的</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="text-left">
                  <th className="w-14 px-3 py-2 text-center font-medium">序号</th>
                  <th className="px-3 py-2 font-medium">账号</th>
                  <th className="px-3 py-2 font-medium">姓名</th>
                  <th className="px-3 py-2 font-medium">手机号</th>
                  <th className="px-3 py-2 font-medium">删除时间</th>
                  <th className="sticky right-0 z-[2] px-3 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user, index) => (
                  <tr key={user.id} className="border-t">
                    <td className="text-muted-foreground px-3 py-2 text-center tabular-nums">{index + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs">{user.username}</td>
                    <td className="px-3 py-2">{user.realname || '-'}</td>
                    <td className="px-3 py-2">{user.phone || '-'}</td>
                    <td className="text-muted-foreground px-3 py-2 font-mono text-xs">{user.updateTime?.replace('T', ' ').slice(0, 19) || '-'}</td>
                    <td className="table-sticky-action table-sticky-action-popover px-3 py-2 text-right">
                      <Button variant="outline" size="sm" onClick={() => setRestoring(user)}>
                        <ArchiveRestore className="size-3.5" />
                        恢复
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        confirmText="恢复"
        confirmVariant="default"
        open={!!restoring}
        onOpenChange={value => !value && setRestoring(null)}
        title="确认恢复该账号？"
        description={
          <>
            即将恢复用户「{restoring?.realname || restoring?.username}」。恢复后为空壳账号（角色/部门已清空），初始状态为「正常」；
            若其用户名已被其他在用账号占用，恢复会被拒绝。
          </>
        }
        onConfirm={doRestore}
      />
    </Dialog>
  )
}
