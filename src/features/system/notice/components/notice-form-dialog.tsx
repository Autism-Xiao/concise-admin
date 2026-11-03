import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Notice, NoticeStatus, NoticeType } from '../api'

interface NoticeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  notice: Notice | null
  onSubmit: (values: Omit<Notice, 'id' | 'publisher' | 'publishAt'>) => void
}

const emptyForm = { title: '', type: '通知' as NoticeType, status: '草稿' as NoticeStatus, content: '' }

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应公告 */
export function NoticeFormDialog({ open, onOpenChange, notice, onSubmit }: NoticeFormDialogProps) {
  const [form, setForm] = useState(() => (notice ? { title: notice.title, type: notice.type, status: notice.status, content: notice.content } : emptyForm))

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{notice ? '编辑公告' : '新增公告'}</DialogTitle>
          <DialogDescription>{notice ? '修改公告信息后保存' : '填写信息创建新公告，发布状态会记录发布时间'}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            onSubmit(form)
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="notice-title">标题</Label>
            <Input id="notice-title" value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>类型</Label>
              <Select value={form.type} onValueChange={v => set('type', v as NoticeType)} items={{ 通知: '通知', 公告: '公告' }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="通知">通知</SelectItem>
                  <SelectItem value="公告">公告</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={form.status} onValueChange={v => set('status', v as NoticeStatus)} items={{ 草稿: '草稿', 已发布: '已发布', 已关闭: '已关闭' }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="草稿">草稿</SelectItem>
                  <SelectItem value="已发布">已发布</SelectItem>
                  <SelectItem value="已关闭">已关闭</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notice-content">内容</Label>
            <textarea
              id="notice-content"
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 min-h-28 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
              value={form.content}
              onChange={e => set('content', e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
