import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { UserMultiSelect } from '@/features/users/components/user-multi-select'
import { TASK_UNASSIGNED, type Task, type TaskPriority, type TaskWritePayload } from '../api'

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  task: Task | null
  onSubmit: (values: TaskWritePayload) => Promise<void>
}

/** datetime-local 需要 "YYYY-MM-DDTHH:mm"，后端返回 ISO，转本地展示 */
function toLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * 任务新建 / 编辑弹窗（父组件按 key 重挂载，保证切换任务时表单重置）
 *
 * 负责人用 UserMultiSelect 的 single 模式：任务只有一个负责人，储值仍是 sys_user.id 字符串。
 * 不选代表「未指派」，提交时传 '0'（后端约定的哨兵值）。
 */
export function TaskFormDialog({ open, onOpenChange, task, onSubmit }: TaskFormDialogProps) {
  const [form, setForm] = useState(() => ({
    title: task?.title ?? '',
    description: task?.description ?? '',
    priority: String(task?.priority ?? 1) as '0' | '1' | '2',
    dueDate: toLocalInput(task?.dueDate)
  }))
  /** 负责人 ID 数组：单选控件用单元素数组承载，空数组 = 未指派 */
  const [assignee, setAssignee] = useState<string[]>(() => (task?.assigneeId && task.assigneeId !== TASK_UNASSIGNED ? [task.assigneeId] : []))
  const [pending, setPending] = useState(false)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm(prev => ({ ...prev, [key]: value }))

  const submit = async () => {
    if (!form.title.trim()) {
      toast.error('请填写任务标题')
      return
    }
    const dueDate = form.dueDate ? new Date(form.dueDate).toISOString() : null
    setPending(true)
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: Number(form.priority) as TaskPriority,
        assigneeId: assignee[0] ?? TASK_UNASSIGNED,
        dueDate
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? '编辑任务' : '新增任务'}</DialogTitle>
          <DialogDescription>指派给某人的任务会出现在他的首页「我的待办」里</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="task-title">标题</Label>
            <Input id="task-title" maxLength={64} value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>优先级</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v as '0' | '1' | '2')} items={{ '0': '低', '1': '中', '2': '高' }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">低</SelectItem>
                  <SelectItem value="1">中</SelectItem>
                  <SelectItem value="2">高</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due">截止时间</Label>
              <Input id="task-due" type="datetime-local" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>负责人</Label>
            <UserMultiSelect single value={assignee} onChange={setAssignee} placeholder="搜索账号或姓名指派给某人（不选 = 未指派）" />
            <p className="text-muted-foreground text-xs">只有一个负责人；不选表示未指派，所有有任务查看权限的人都能看到</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-desc">描述</Label>
            <Textarea
              id="task-desc"
              rows={5}
              maxLength={2000}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="任务背景、验收标准等（选填）"
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
