import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchUsers } from '@/features/users/api'
import { assignTenantUsers, fetchTenantUsers, type Tenant } from '../api'

interface TenantUserDialogProps {
  tenant: Tenant
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

interface Candidate {
  id: string
  username: string
  realname: string
}

/**
 * 分配用户（覆盖式）
 *
 * 左边是系统里的账号（按关键字搜索），右边是该租户的当前成员。
 * 保存时把右边名单整体提交，后端做多退少补 —— 不用逐条调用「加入/移除」。
 * 这里没有「拖拽/穿梭框」组件，用两列列表 + 加减按钮，语义清楚且不引入新依赖。
 */
export function TenantUserDialog({ tenant, open, onOpenChange, onSaved }: TenantUserDialogProps) {
  const [members, setMembers] = useState<Candidate[] | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchTenantUsers(tenant.id, 1, 200)
      .then(page => {
        if (!alive) return
        setMembers(page.records.map(item => ({ id: item.id, username: item.username, realname: item.realname })))
      })
      .catch(error => {
        if (!alive) return
        toast.error(error instanceof Error ? error.message : '加载成员失败')
        setMembers([])
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [tenant.id])

  useEffect(() => {
    let alive = true
    const timer = setTimeout(() => {
      fetchUsers(keyword)
        .then(result => alive && setCandidates(result.records.map(item => ({ id: item.id, username: item.username, realname: item.realname ?? '' }))))
        .catch(() => alive && setCandidates([]))
    }, 250)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [keyword])

  const memberIds = useMemo(() => new Set((members ?? []).map(item => item.id)), [members])
  const available = candidates.filter(item => !memberIds.has(item.id))

  const add = (user: Candidate) => setMembers(prev => [...(prev ?? []), user])
  const remove = (user: Candidate) => setMembers(prev => (prev ?? []).filter(item => item.id !== user.id))

  const save = () => {
    setSaving(true)
    assignTenantUsers(
      tenant.id,
      (members ?? []).map(item => item.id)
    )
      .then(result => {
        toast.success(`已更新成员：新增 ${result.added} 人，移除 ${result.removed} 人`)
        onSaved()
        onOpenChange(false)
      })
      .catch(error => toast.error(error instanceof Error ? error.message : '保存失败'))
      .finally(() => setSaving(false))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>分配用户 · {tenant.name}</DialogTitle>
          <DialogDescription>左侧选人加入，右侧可移除；保存后按最终名单生效（该账号切换到这个租户才能看到租户数据）</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
              <Input placeholder="搜索账号 / 姓名" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
            </div>
            <div className="h-64 overflow-auto rounded-md border">
              {available.length === 0 ? (
                <p className="text-muted-foreground py-10 text-center text-sm">没有可添加的账号</p>
              ) : (
                available.map(user => (
                  <div key={user.id} className="hover:bg-accent/50 flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="truncate font-medium">{user.realname || user.username}</span>
                      <span className="text-muted-foreground ms-2 text-xs">{user.username}</span>
                    </span>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => add(user)} title="加入租户">
                      <Plus className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">当前成员（{(members ?? []).length}）</p>
            <div className="h-64 overflow-auto rounded-md border">
              {loading ? (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-2/3" />
                </div>
              ) : (members ?? []).length === 0 ? (
                <p className="text-muted-foreground py-10 text-center text-sm">还没有成员</p>
              ) : (
                (members ?? []).map(user => (
                  <div key={user.id} className="hover:bg-accent/50 flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="truncate font-medium">{user.realname || user.username}</span>
                      <span className="text-muted-foreground ms-2 text-xs">{user.username}</span>
                    </span>
                    <Button variant="ghost" size="icon" className="text-destructive size-7" onClick={() => remove(user)} title="移出">
                      <Minus className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" disabled={saving || loading} onClick={save}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
