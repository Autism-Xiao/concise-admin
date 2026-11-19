import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FieldError, intRange, maxLength, requiredWith, useFieldErrors } from '@/lib/form-validation'
import { DICT_COLOR_OPTIONS, dictColorVisual, normalizeHexColor } from '@/lib/dict-color'
import { cn } from '@/lib/utils'
import type { Dict, DictItem, DictItemFormValues } from '../api'

interface DictItemFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 当前选中的字典（决定字典项归属） */
  dict: Dict
  /** null 表示新增 */
  item: DictItem | null
  onSubmit: (values: DictItemFormValues) => Promise<void>
}

const STATUS_LABELS: Record<string, string> = { '1': '启用', '0': '不启用' }

/** 字典项表单：文本 / 值 / 排序 / 状态 / 颜色 / 描述 */
export function DictItemFormDialog({ open, onOpenChange, dict, item, onSubmit }: DictItemFormDialogProps) {
  const [form, setForm] = useState<DictItemFormValues>(() => ({
    itemText: item?.itemText ?? '',
    itemValue: item?.itemValue ?? '',
    sortOrder: item?.sortOrder ?? 0,
    status: item?.status ?? 1,
    description: item?.description ?? '',
    color: item?.color ?? ''
  }))
  const [submitting, setSubmitting] = useState(false)
  /** HEX 输入框的草稿态：允许输入过程中的非法中间值（如 #8B5），合法时才同步到 form.color */
  const [hexDraft, setHexDraft] = useState(() => normalizeHexColor(form.color) ?? '')
  const { errors, runValidation, clearError } = useFieldErrors()

  const set = <K extends keyof DictItemFormValues>(key: K, value: DictItemFormValues[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    clearError(key as string)
  }

  /** 统一改色：同步表单值，并让 HEX 草稿跟着走（选预设色时清空草稿） */
  const setColor = (value: string) => {
    set('color', value)
    setHexDraft(normalizeHexColor(value) ?? '')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? '编辑字典项' : '新增字典项'}</DialogTitle>
          <DialogDescription>
            所属字典：{dict.dictName}（<code className="text-xs">{dict.dictCode}</code>）
          </DialogDescription>
        </DialogHeader>
        <form
          id="dict-item-form"
          className="space-y-4"
          onSubmit={async e => {
            e.preventDefault()
            if (
              !runValidation(
                {
                  itemText: [requiredWith('字典项文本', maxLength(100, '字典项文本'))],
                  itemValue: [requiredWith('字典项值', maxLength(100, '字典项值'))],
                  sortOrder: [intRange(0, 99999, '排序')]
                },
                form as unknown as Record<string, unknown>
              )
            )
              return
            setSubmitting(true)
            try {
              await onSubmit({
                ...form,
                sortOrder: Number(form.sortOrder) || 0,
                // 空串表示「清除配色」，后端会置 null
                color: form.color || '',
                description: form.description?.trim() || undefined
              })
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="item-text">字典项文本</Label>
            <Input id="item-text" value={form.itemText} onChange={e => set('itemText', e.target.value)} placeholder="如 男" maxLength={100} aria-invalid={!!errors.itemText} />
            <FieldError message={errors.itemText} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-value">字典项值</Label>
            <Input id="item-value" value={form.itemValue} onChange={e => set('itemValue', e.target.value)} placeholder="如 1" maxLength={100} aria-invalid={!!errors.itemValue} />
            <FieldError message={errors.itemValue} />
            <p className="text-muted-foreground text-xs">存库用的值，同一字典下不可重复</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-sort">排序</Label>
              <Input id="item-sort" type="number" min={0} value={form.sortOrder} onChange={e => set('sortOrder', Number(e.target.value))} aria-invalid={!!errors.sortOrder} />
              <FieldError message={errors.sortOrder} />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={String(form.status)} onValueChange={v => set('status', Number(v))} items={STATUS_LABELS}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">启用</SelectItem>
                  <SelectItem value="0">不启用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>颜色</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setColor('')}
                aria-pressed={!form.color}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition',
                  form.color ? 'border-border text-muted-foreground hover:bg-accent/60' : 'border-foreground/40 bg-accent text-accent-foreground'
                )}
              >
                不套色
              </button>
              {DICT_COLOR_OPTIONS.map(option => {
                const active = form.color === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setColor(option.value)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition',
                      option.className,
                      active ? 'ring-2 ring-foreground/30' : 'opacity-70 hover:opacity-100'
                    )}
                  >
                    <span aria-hidden className="size-1.5 rounded-full bg-current" />
                    {option.short}
                  </button>
                )
              })}
              {/* 自定义色：原生取色器透传层，点色块即打开系统调色板；选中后 form.color 变成 #RRGGBB */}
              <label
                title="自定义颜色"
                className={cn(
                  'relative inline-flex cursor-pointer items-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-1 text-xs font-medium transition',
                  normalizeHexColor(form.color) ? 'ring-2 ring-foreground/30' : 'opacity-70 hover:opacity-100'
                )}
                style={
                  normalizeHexColor(form.color)
                    ? dictColorVisual(form.color)?.style
                    : undefined
                }
              >
                <span aria-hidden className="size-1.5 rounded-full bg-current" />
                自定义
                <input
                  type="color"
                  aria-label="自定义字典项颜色"
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  value={normalizeHexColor(form.color) ?? '#6366f1'}
                  onChange={e => setColor(e.target.value.toUpperCase())}
                />
              </label>
            </div>
            {/* HEX 精确输入：与取色器双向同步，也方便从别处复制色值粘贴过来 */}
            <div className="flex items-center gap-2">
              <Input
                aria-label="自定义色 HEX 值"
                placeholder="#RRGGBB（如 #8B5CF6）"
                className="h-8 max-w-[220px] font-mono text-xs"
                maxLength={7}
                value={hexDraft}
                onChange={e => {
                  const text = e.target.value
                  setHexDraft(text)
                  if (!text) {
                    set('color', '')
                    return
                  }
                  const hex = normalizeHexColor(text)
                  if (hex) set('color', hex)
                }}
              />
              {normalizeHexColor(form.color) && (
                <span className="text-muted-foreground text-xs">当前：{normalizeHexColor(form.color)}</span>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              预设色自动适配明暗主题；自定义色请输入 #RRGGBB 或用取色器挑选，留空按纯文本显示
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-description">描述</Label>
            <Input id="item-description" value={form.description ?? ''} onChange={e => set('description', e.target.value)} maxLength={255} />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button form="dict-item-form" type="submit" disabled={submitting}>
            {submitting ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
