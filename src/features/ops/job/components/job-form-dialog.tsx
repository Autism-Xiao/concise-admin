import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fetchJobHandlers, JOB_STATUS_LABEL, type JobHandlerMeta, type JobItem, type JobStatus, type JobWritePayload } from '../api'

interface JobFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  job: JobItem | null
  onSubmit: (values: JobWritePayload) => Promise<void>
}

/**
 * 定时任务表单（字段与后端 sys_quartz_job 一致）
 * - 任务类名从后端执行器注册表取，选不到就无法执行
 * - cron 前端只做必填校验，格式由后端 CronTime 校验并回显具体错误
 */
export function JobFormDialog({ open, onOpenChange, job, onSubmit }: JobFormDialogProps) {
  const [form, setForm] = useState(() => ({
    jobClassName: job?.jobClassName ?? '',
    cronExpression: job?.cronExpression ?? '',
    parameter: job?.parameter ?? '',
    description: job?.description ?? '',
    status: (job?.status ?? -1) as JobStatus
  }))
  const [handlers, setHandlers] = useState<JobHandlerMeta[]>([])
  const [pending, setPending] = useState(false)

  useEffect(() => {
    fetchJobHandlers()
      .then(setHandlers)
      .catch(() => setHandlers([]))
  }, [])

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm(prev => ({ ...prev, [key]: value }))

  const submit = async () => {
    if (!form.jobClassName.trim()) {
      toast.error('请选择任务类名')
      return
    }
    if (!form.cronExpression.trim()) {
      toast.error('请填写 cron 表达式')
      return
    }
    setPending(true)
    try {
      await onSubmit({
        jobClassName: form.jobClassName.trim(),
        cronExpression: form.cronExpression.trim(),
        parameter: form.parameter.trim() || undefined,
        description: form.description.trim() || undefined,
        status: form.status
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setPending(false)
    }
  }

  const handlerItems = Object.fromEntries(handlers.map(item => [item.className, item.className]))
  const currentHandler = handlers.find(item => item.className === form.jobClassName)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{job ? '编辑定时任务' : '新增定时任务'}</DialogTitle>
          <DialogDescription>任务类名对应后端已注册的执行器</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>任务类名</Label>
              <Select value={form.jobClassName} onValueChange={v => set('jobClassName', v)} items={handlerItems}>
                <SelectTrigger>
                  <SelectValue placeholder="选择执行器" />
                </SelectTrigger>
                <SelectContent>
                  {handlers.map(item => (
                    <SelectItem key={item.className} value={item.className}>
                      {item.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select
                value={String(form.status)}
                onValueChange={v => set('status', Number(v) as JobStatus)}
                items={{ '0': JOB_STATUS_LABEL[0], '-1': JOB_STATUS_LABEL[-1] }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">运行中</SelectItem>
                  <SelectItem value="-1">已暂停</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {currentHandler && <p className="text-muted-foreground text-xs">{currentHandler.description}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="job-cron">cron 表达式</Label>
              <Input
                id="job-cron"
                placeholder="0 0 3 * * *"
                value={form.cronExpression}
                onChange={e => set('cronExpression', e.target.value)}
                required
              />
              <p className="text-muted-foreground text-xs">6 位：秒 分 时 日 月 周</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-param">参数</Label>
              <Input id="job-param" placeholder="如保留天数 30" value={form.parameter} onChange={e => set('parameter', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-desc">描述</Label>
            <Input id="job-desc" maxLength={255} value={form.description} onChange={e => set('description', e.target.value)} />
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
