import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MarkdownEditor } from '@/components/markdown-editor'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserMultiSelect } from '@/features/users/components/user-multi-select'
import { toast } from 'sonner'
import { useDict } from '@/lib/dict'
import {
  NOTICE_CATEGORY_LABEL,
  NOTICE_PRIORITY_LABEL,
  NOTICE_TARGET_LABEL,
  type Notice,
  type NoticeCategory,
  type NoticePriority,
  type NoticeTarget,
  type NoticeWritePayload
} from '../api'

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
  // 三个下拉都走字典，运营改文案/排序不用发版；字典缺失时回落到代码内默认
  const categoryItems = useDict('sys_notice_category', NOTICE_CATEGORY_LABEL)
  const priorityItems = useDict('sys_notice_priority', NOTICE_PRIORITY_LABEL)
  const targetItems = useDict('sys_notice_target', NOTICE_TARGET_LABEL)
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

  /* ---------------- 接收用户：多选控件按账号挑人，落库仍是用户 ID ---------------- */

  /** 已选用户 ID（多选，提交时逗号拼接为 userIds；存量数据里已删用户的 ID 也原样保留） */
  const [userIds, setUserIds] = useState<string[]>(() =>
    notice?.userIds
      ? notice.userIds
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : []
  )

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm(prev => ({ ...prev, [key]: value }))

  const submit = async () => {
    if (!form.title.trim()) {
      toast.error('请填写标题')
      return
    }

    // 指定用户：选人控件已按账号挑好，这里只把 ID 拼成后端约定的逗号串
    let targetUserIds: string | undefined
    if (form.msgType === 'USER') {
      if (userIds.length === 0) {
        toast.error('请选择接收用户')
        return
      }
      targetUserIds = userIds.join(',')
    }

    setPending(true)
    try {
      await onSubmit({
        title: form.title.trim(),
        msgContent: form.msgContent,
        msgCategory: form.msgCategory,
        priority: form.priority,
        msgType: form.msgType,
        userIds: targetUserIds,
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
          id="notice-form"
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
              <Select value={form.msgCategory} onValueChange={v => set('msgCategory', v as NoticeCategory)} items={categoryItems}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryItems).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>优先级</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v as NoticePriority)} items={priorityItems}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityItems).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>通告对象</Label>
              <Select value={form.msgType} onValueChange={v => set('msgType', v as NoticeTarget)} items={targetItems}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(targetItems).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
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
              <Label>接收用户</Label>
              <UserMultiSelect value={userIds} onChange={setUserIds} />
              <p className="text-muted-foreground text-xs">
                点选即可多选（再点取消），支持按账号 / 姓名搜索全部用户；落库仍是用户 ID，账号已删除的历史用户会标红保留
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
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button form="notice-form" type="submit" disabled={pending}>
            {pending ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
