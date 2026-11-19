import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Mail, Plus, Search, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  /** 首次加载完成前才显示骨架屏；之后的翻页/搜索保持列表挂载，避免闪烁 */
  const [booted, setBooted] = useState(false)
  /** 搜索框草稿 + 已生效关键字：回车/点搜索才查，避免每敲一个字都请求 */
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [sendOpen, setSendOpen] = useState(false)
  const [deleting, setDeleting] = useState<MessageRecord | null>(null)
  const canSend = hasPermission('system:message:send')
  const canDelete = hasPermission('system:message:delete')
  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1)

  const load = useCallback(() => {
    setLoading(true)
    fetchMessages({ page, pageSize: PAGE_SIZE, keyword: appliedKeyword || undefined })
      .then(res => {
        setList(res.records ?? [])
        setTotal(res.total ?? 0)
      })
      .catch(() => toast.error('发送记录加载失败'))
      .finally(() => {
        setLoading(false)
        setBooted(true)
      })
  }, [page, appliedKeyword])

  useEffect(load, [load])

  /** 提交搜索：回到第 1 页（否则在第 3 页搜新词会得到空结果） */
  const submitSearch = () => {
    setPage(1)
    setAppliedKeyword(keyword.trim())
  }

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
                onKeyDown={e => e.key === 'Enter' && submitSearch()}
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
          {!booted ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="relative">
              {loading && (
                <div className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center" aria-live="polite">
                  <Loader2 className="text-muted-foreground size-5 animate-spin" />
                </div>
              )}
              {list.length === 0 ? (
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
                      {row.msgType === 'system' && <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]">系统</span>}
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
            </div>
          )}
          {!loading && total > 0 && (
            <div className="flex items-center justify-between border-t pt-3">
              <p className="text-muted-foreground text-xs">
                第 {page} / {pageCount} 页，共 {total} 条
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(p - 1, 1))}>
                  上一页
                </Button>
                <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}>
                  下一页
                </Button>
              </div>
            </div>
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

/** 接收范围：pick = 手动指定用户；all = 一键全站 */
type RecvMode = 'all' | 'pick'

function SendDialog({ open, onOpenChange, onSent }: { open: boolean; onOpenChange: (open: boolean) => void; onSent: () => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [recvMode, setRecvMode] = useState<RecvMode>('pick')
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
      setRecvMode('pick')
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
          setRecvMode('pick')
          return
        }
        setReceiverIds(users.map(u => u.id))
        setUsersCache(Object.fromEntries(users.map(u => [u.id, u])))
        toast.success(truncated ? `已选前 1000 名用户（已达单次发送上限）` : `已选择全站 ${users.length} 名用户`)
      })
      .catch(() => {
        toast.error('用户列表加载失败')
        setRecvMode('pick')
      })
      .finally(() => setSelectingAll(false))
  }

  /**
   * 切换接收范围：两种范围互斥，切换即清空已选（全站 ≠ 指定的并集），
   * 避免上一批名单残留在下一次发送里；切回指定用户时自动聚焦搜索框。
   */
  const switchRecvMode = (next: string) => {
    if (next === recvMode) return
    setRecvMode(next as RecvMode)
    setReceiverIds([])
    setUsersCache({})
    if (next === 'all') {
      selectAllUsers()
    } else {
      requestAnimationFrame(() => pickerRef.current?.querySelector<HTMLInputElement>('[data-multiselect-input]')?.focus())
    }
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
          <DialogDescription>全站用户一键送达所有人；指定用户支持搜索账号/姓名多选。发送后每个接收人各收到一条消息。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Input id="msg-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={128} placeholder="消息标题" />
          </div>
          <div className="space-y-1.5">
            <Textarea id="msg-content" value={content} onChange={e => setContent(e.target.value)} rows={5} maxLength={5000} placeholder="消息正文" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label>接收人</Label>
              <Segmented
                value={recvMode}
                onChange={switchRecvMode}
                disabled={selectingAll || busy}
                options={[
                  { value: 'all', label: '全站用户' },
                  { value: 'pick', label: '指定用户' }
                ]}
              />
            </div>
            {recvMode === 'all' ? (
              <div className="border-border bg-muted/30 flex items-center gap-3 rounded-lg border px-3 py-3">
                <Users className="text-primary size-5 shrink-0" />
                {selectingAll ? (
                  <p className="text-muted-foreground text-sm">正在获取全站用户名单…</p>
                ) : receiverIds.length > 0 ? (
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      将发送给全站 <span className="text-primary font-medium">{receiverIds.length}</span> 名用户
                    </p>
                    <p className="text-muted-foreground text-xs">每人各收到一条消息；仅覆盖发送时已存在的账号</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">未获取到可发送的用户</p>
                )}
              </div>
            ) : (
              <div ref={pickerRef}>
                <UserMultiSelect value={receiverIds} onChange={setReceiverIds} usersCache={usersCache} placeholder="搜索账号或姓名，可多选" />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit} disabled={busy || selectingAll}>
            {busy ? '发送中…' : '发送'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
