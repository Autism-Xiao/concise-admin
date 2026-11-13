import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchRoleOptions, type Role } from '@/features/system/role/api'
import type { User } from '../api'

interface BatchRolesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 勾选的目标用户（用于标题提示与提交） */
  targets: User[]
  /** 提交：全量覆盖绑定所选角色 */
  onSubmit: (ids: string[], roleIds: string[]) => Promise<void>
}

/** 批量分配角色：对勾选的用户全量覆盖绑定同一组角色（与单个用户编辑表单同语义） */
export function BatchRolesDialog({ open, onOpenChange, targets, onSubmit }: BatchRolesDialogProps) {
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setRoles(null)
    setLoadError(null)
    fetchRoleOptions()
      .then(setRoles)
      .catch(e => setLoadError(e instanceof Error ? e.message : '加载角色失败'))
  }, [open])

  const toggle = (id: string) => setSelected(prev => (prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!targets.length) return
    setSubmitting(true)
    Promise.resolve(
      onSubmit(
        targets.map(user => user.id),
        selected
      )
    ).finally(() => setSubmitting(false))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>批量分配角色（{targets.length} 个用户）</DialogTitle>
          <DialogDescription>保存后每个用户绑定的角色将整体替换为所选列表（与编辑单个用户同语义），权限实时生效</DialogDescription>
        </DialogHeader>
        <form id="batch-roles-form" className="space-y-4" onSubmit={handleSubmit}>
          {loadError ? (
            <p className="text-destructive text-sm">{loadError}</p>
          ) : !roles ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-md border p-2">
              {roles.map(role => (
                <label key={role.id} className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm">
                  <input type="checkbox" className="accent-primary" checked={selected.includes(role.id)} onChange={() => toggle(role.id)} />
                  {role.roleName || role.roleCode}
                  <span className="text-muted-foreground text-xs">{role.roleCode}</span>
                </label>
              ))}
            </div>
          )}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button form="batch-roles-form" type="submit" disabled={submitting || !roles}>
            {submitting ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
