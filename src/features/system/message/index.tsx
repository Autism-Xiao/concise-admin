import { useEffect, useRef, useState } from 'react'
import { Mail, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { fetchAllUserBriefs, type UserBrief } from '@/features/users/api'
import { UserMultiSelect } from '@/features/users/components/user-multi-select'
import { hasPermission } from '@/lib/auth'
import { deleteMessage, fetchMessages, formatDateTime, sendMessage, type MessageRecord } from './api'

/**
 * 消息中心（管理端）
 *
 * 发送记录列表 + 手动发送。个人侧消息在顶栏「消息」铃铛里，不在这个页面。
 * 接收人用 UserMultiSelect 多选站内用户（按 ID 精确提交，与公告选人控件同源）。
 */
export function MessagePage() {
  const [list, setList] = useState<MessageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [sendOpen, setSendOpen] = useState(false)
  const [deleting, setDeleting] = useState<MessageRecord | null>(null)
  const canSend = hasPermission('system:message:send')
  const canDelete = hasPermission('system:message:delete')

  const load = () => {
    setLoading(true)
    fetchMessages({ pageSize: 50, keyword: keyword || undefined })
      .then(res => setList(res.records ?? []))
      .catch(() => toast.error('发送记录加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="text-muted-foreground size-4" />
            消息中心
            <span className="text-muted-foreground text-xs font-normal">共 {list.length} 条发送记录</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                className="w-48 pl-8"
                placeholder="按标题搜索"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && load()}
              />
            </div>
            {canSend && (
              <Button size="sm" onClick={() => setSendOpen(true)}>
                <Plus className="size-4" />
                发送消息
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">还没有发送过消息</p>
          ) : (
            <ul className="divide-border divide-y">
              {list.map(row => (
                <li key={row.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
                    <Mail className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{row.title}</p>
                      {row.msgType === 'system' && (
                        <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]">系统</span>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{row.content}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      送达 {row.receiverCount} 人 · {formatDateTime(row.createdAt)}
                    </p>
                  </div>
                  {canDelete && (
                    <Button variant="ghost" size="icon" className="text-muted-foreground size-8 shrink-0" onClick={() => setDeleting(row)}>
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <SendDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        onSent={() => {
          setSendOpen(false)
          load()
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={open => !open && setDeleting(null)}
        title="删除发送记录"
        description={`确定删除「${deleting?.title ?? ''}」吗？所有接收人的消息记录将一并删除，且不可恢复。`}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await deleteMessage(deleting.id)
            toast.success('已删除')
            setDeleting(null)
            load()
          } catch (error) {
            toast.error(error instanceof Error ? error.message : '删除失败')
          }
        }}
      />
    </div>
  )
}

function SendDialog({
  open,
  onOpenChange,
  onSent
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSent: () => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  /** 已选接收人用户 ID（多选选人控件产出，后端按 ID 精确匹配，不存在打错账号的问题） */
  const [receiverIds, setReceiverIds] = useState<string[]>([])
  /** 批量选中（全站用户）时的 id → 账号缓存，chips 直接显示真实账号，不必逐个 lookup */
  const [usersCache, setUsersCache] = useState<Record<string, UserBrief>>({})
  const [selectingAll, setSelectingAll] = useState(false)
  const [busy, setBusy] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setTitle('')
      setContent('')
      setReceiverIds([])
      setUsersCache({})
    }
  }, [open])

  /** 一键全选全站用户：翻页拉满（后端单次上限 1000 人） */
  const selectAllUsers = () => {
    setSelectingAll(true)
    fetchAllUserBriefs()
      .then(({ users, truncated }) => {
        if (users.length === 0) {
          toast.error('没有可选用户（可能缺少用户查看权限）')
          return
        }
        setReceiverIds(users.map(u => u.id))
        setUsersCache(Object.fromEntries(users.map(u => [u.id, u])))
        toast.success(truncated ? `已选前 1000 名用户（已达单次发送上限）` : `已选择全站 ${users.length} 名用户`)
      })
      .catch(() => toast.error('用户列表加载失败'))
      .finally(() => setSelectingAll(false))
  }

  /** 切到手动挑人：把面板点开 */
  const focusPicker = () => {
    pickerRef.current?.querySelector<HTMLInputElement>('[data-multiselect-input]')?.focus()
  }

  const submit = () => {
    if (!title.trim() || !content.trim() || receiverIds.length === 0) {
      toast.error('标题、正文、接收人都不能为空')
      return
    }
    setBusy(true)
    sendMessage({ title: title.trim(), content: content.trim(), userIds: receiverIds })
      .then(result => {
        toast.success(`已发送，送达 ${result.delivered} 人`)
        onSent()
      })
      .catch(error => toast.error(error instanceof Error ? error.message : '发送失败'))
      .finally(() => setBusy(false))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>发送站内信</DialogTitle>
          <DialogDescription>接收人为站内用户，支持搜索账号/姓名多选；发送后每个接收人各收到一条消息。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="msg-title">标题</Label>
            <Input id="msg-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={128} placeholder="消息标题" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="msg-content">正文</Label>
            <Textarea id="msg-content" value={content} onChange={e => setContent(e.target.value)} rows={5} maxLength={5000} placeholder="消息正文" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>接收人</Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
                  disabled={selectingAll || busy}
                  onClick={selectAllUsers}
                >
                  {selectingAll ? '选择中…' : '全站用户'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
                  disabled={selectingAll || busy}
                  onClick={focusPicker}
                >
                  选择个别
                </Button>
              </div>
            </div>
            <div ref={pickerRef}>
              <UserMultiSelect value={receiverIds} onChange={setReceiverIds} usersCache={usersCache} placeholder="搜索账号或姓名，可多选" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? '发送中…' : '发送'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
