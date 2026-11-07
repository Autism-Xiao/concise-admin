import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  label?: string
  defaultName?: string
  placeholder?: string
  submitText?: string
  onSubmit: (name: string) => void
}

/**
 * 通用名称输入弹窗：新建文件夹与重命名共用
 * 父组件用 key 控制重挂载，保证每次打开时初始值都是最新的
 */
export function NameDialog({
  open,
  onOpenChange,
  title,
  description,
  label = '名称',
  defaultName = '',
  placeholder,
  submitText = '确定',
  onSubmit
}: NameDialogProps) {
  const [name, setName] = useState(defaultName)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault()
            const value = name.trim()
            if (!value) return
            onSubmit(value)
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="file-name-input">{label}</Label>
            <Input
              id="file-name-input"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder={placeholder}
              autoFocus
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">{submitText}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
