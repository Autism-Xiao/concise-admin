import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MarkdownEditor } from '@/components/markdown-editor'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fetchUsers } from '@/features/users/api'
import { toast } from 'sonner'
import { NOTICE_CATEGORY_LABEL, NOTICE_PRIORITY_LABEL, NOTICE_TARGET_LABEL, type Notice, type NoticeCategory, type NoticePriority, type NoticeTarget, type NoticeWritePayload } from '../api'

/** 用户列表接口的分页上限（候选下拉最多给这么多账号，更多请直接输入账号） */
const USER_OPTION_LIMIT = 100

interface UserOption {
  id: string
  username: string
  realname?: string
}

/** 把逗号分隔的 token 拆开（兼容中英文逗号、空格、换行） */
function splitUserTokens(raw: string): string[] {
  return raw
    .split(/[,，\s]+/)
    .map(t => t.trim())
    .filter(Boolean)
}

interface NoticeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  notice: Notice | null
  onSubmit: (values: NoticeWritePayload) => Promise<void>
}

/** datetime-local 需要 "YYYY-MM-DDTHH:mm"，后端返回的是 ISO，截断即用 */
function toLocalInput(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应公告 */
export function NoticeFormDialog({ open, onOpenChange, notice, onSubmit }: NoticeFormDialogProps) {
  const [form, setForm] = useState(() => ({
    title: notice?.title ?? '',
    msgContent: notice?.msgContent ?? '',
    msgCategory: (notice?.msgCategory ?? '1') as NoticeCategory,
    priority: (notice?.priority ?? 'M') as NoticePriority,
    msgType: (notice?.msgType ?? 'ALL') as NoticeTarget,
    startTime: toLocalInput(notice?.startTime),
    endTime: toLocalInput(notice?.endTime),
    /** 编辑已撤销公告时默认仍是未发布，重新发布走列表的「发布」按钮 */
    sendStatus: (notice?.sendStatus === '1' ? '1' : '0') as '0' | '1'
  }))
  const [pending, setPending] = useState(false)

  /* ---------------- 接收用户：页面输入账号，提交时换算成 ID ---------------- */

  const [userOptions, setUserOptions] = useState<UserOption[]>([])
  /** 输入框内容 = 用户账号（逗号分隔）；存量 ID 翻译成账号回显，找不到的以 #id 保留 */
  const [userInput, setUserInput] = useState('')

  useEffect(() => {
    if (!open) return
    let alive = true
    fetchUsers()
      .then(res => {
        if (!alive) return
        const options = (res.records ?? []).slice(0, USER_OPTION_LIMIT).map(u => ({ id: u.id, username: u.username, realname: u.realname }))
        setUserOptions(options)
        // 编辑存量公告：把 userIds 里的 ID 翻译成账号展示；账号已删的保留 #id，提交时原样传回不弄丢
        if (notice?.userIds) {
          const ids = notice.userIds.split(',').map(s => s.trim()).filter(Boolean)
          setUserInput(ids.map(id => options.find(o => o.id === id)?.username ?? `#${id}`).join(','))
        }
      })
      .catch(() => {
        // 用户表拉取失败：退回显示原始 ID，保证已有配置可见可保存
        if (notice?.userIds) setUserInput(notice.userIds)
      })
    return () => {
      alive = false
    }
  }, [open, notice])

  /** 输入框 → 已选账号的预览（含姓名与未知标记） */
  const pickedUsers = useMemo(() => {
    return splitUserTokens(userInput).map(token => {
      if (token.startsWith('#')) return { token, label: `${token.slice(1)}（账号未知，按 ID 保留）`, known: false }
      const found = userOptions.find(o => o.username === token)
      return { token, label: found?.realname ? `${token}（${found.realname}）` : token, known: Boolean(found) }
    })
  }, [userInput, userOptions])

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm(prev => ({ ...prev, [key]: value }))

  const submit = async () => {
    if (!form.title.trim()) {
      toast.error('请填写标题')
      return
    }

    // 指定用户：把输入的账号换算回 ID（后端按 ID 做权限过滤）；账号不存在直接阻断，避免发出没人收得到的公告
    let userIds: string | undefined
    if (form.msgType === 'USER') {
      const tokens = splitUserTokens(userInput)
      if (tokens.length === 0) {
        toast.error('请填写接收用户账号')
        return
      }
      const unknown: string[] = []
      const ids = tokens.map(token => {
        if (token.startsWith('#')) return token.slice(1) // 存量里账号已删的用户，按原 ID 保留
        const found = userOptions.find(o => o.username === token)
        if (!found) unknown.push(token)
        return found?.id ?? ''
      })
      if (unknown.length > 0) {
        toast.error(`以下账号不存在，请检查：${unknown.join('、')}`)
        return
      }
      userIds = ids.join(',')
    }

    setPending(true)
    try {
      await onSubmit({
        title: form.title.trim(),
        msgContent: form.msgContent,
        msgCategory: form.msgCategory,
        priority: form.priority,
        msgType: form.msgType,
        userIds,
        startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined,
        endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
        sendStatus: form.sendStatus
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{notice ? '编辑公告' : '新增公告'}</DialogTitle>
          <DialogDescription>{notice ? '修改后保存，状态切到已发布会自动记录发布时间' : '填写信息创建公告，选「已发布」会立即上线'}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="notice-title">标题</Label>
            <Input id="notice-title" maxLength={100} value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>消息类型</Label>
              <Select value={form.msgCategory} onValueChange={v => set('msgCategory', v as NoticeCategory)} items={NOTICE_CATEGORY_LABEL}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">通知公告</SelectItem>
                  <SelectItem value="2">系统消息</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>优先级</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v as NoticePriority)} items={NOTICE_PRIORITY_LABEL}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="H">高</SelectItem>
                  <SelectItem value="M">中</SelectItem>
                  <SelectItem value="L">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>通告对象</Label>
              <Select value={form.msgType} onValueChange={v => set('msgType', v as NoticeTarget)} items={NOTICE_TARGET_LABEL}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全体用户</SelectItem>
                  <SelectItem value="USER">指定用户</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>发布状态</Label>
              <Select value={form.sendStatus} onValueChange={v => set('sendStatus', v as '0' | '1')} items={{ '0': '未发布（存草稿）', '1': '已发布' }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">未发布（存草稿）</SelectItem>
                  <SelectItem value="1">已发布</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.msgType === 'USER' && (
            <div className="space-y-2">
              <Label htmlFor="notice-users">接收用户账号</Label>
              <Input
                id="notice-users"
                list="notice-user-options"
                autoComplete="off"
                placeholder="输入用户账号（如 admin），多个用英文逗号分隔"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
              />
              <datalist id="notice-user-options">
                {userOptions.map(o => (
                  <option key={o.id} value={o.username}>
                    {o.realname ? `${o.username}（${o.realname}）` : o.username}
                  </option>
                ))}
              </datalist>
              {pickedUsers.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {pickedUsers.map(u => (
                    <span
                      key={u.token}
                      className={`rounded px-1.5 py-0.5 text-xs ${
                        u.known ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      {u.label}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-muted-foreground text-xs">
                按账号填写，保存后按用户 ID 下发；候选账号来自用户管理（最多前 {USER_OPTION_LIMIT}
                个，超出请直接输入账号），红色表示账号当前不存在
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="notice-start">生效开始</Label>
              <Input id="notice-start" type="datetime-local" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notice-end">生效结束</Label>
              <Input id="notice-end" type="datetime-local" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notice-content">内容</Label>
            <MarkdownEditor
              value={form.msgContent}
              onChange={v => set('msgContent', v)}
              placeholder="公告正文，支持 Markdown（**加粗**、列表、表格、代码块等）"
              maxLength={20000}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
