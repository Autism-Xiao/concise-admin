import { useEffect, useState } from 'react'
import { BadgeCheck, Building2, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { applyTenant, fetchTenantApplyQuota, type TenantApplyQuota } from '../api'

interface TenantApplyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 开通成功回调：通常由上层切到新租户并关闭上层弹窗 */
  onApplied: (tenantId: number) => void
}

const emptyForm = { name: '', code: '', contact: '', phone: '' }

/**
 * 自助开通团队（租户）
 *
 * 「进入系统使用」不需要 VIP；「开通团队」需要。资格与额度全部由后端判定
 * （GET apply/quota），前端只负责按 reason 切文案：
 * - NEED_VIP：没 VIP / VIP 已过期 → 引导联系平台开通
 * - QUOTA_EXCEEDED：已开满 → 显示 M/N 并提示提升额度
 */
export function TenantApplyDialog({ open, onOpenChange, onApplied }: TenantApplyDialogProps) {
  const [quota, setQuota] = useState<TenantApplyQuota | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    setQuota(null)
    setForm(emptyForm)
    fetchTenantApplyQuota()
      .then(res => {
        if (alive) setQuota(res)
      })
      .catch((e: unknown) => {
        if (alive) toast.error(e instanceof Error ? e.message : '获取开通资格失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [open])

  const set = <K extends keyof typeof emptyForm>(key: K, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const tenant = await applyTenant({
        name: form.name.trim(),
        code: form.code.trim(),
        contact: form.contact.trim(),
        phone: form.phone.trim()
      })
      toast.success(`团队「${tenant.name}」已开通，你已成为该团队管理员`)
      onOpenChange(false)
      onApplied(tenant.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '开通失败')
    } finally {
      setSubmitting(false)
    }
  }

  const blocked = quota && !quota.canApply
  const blockedText =
    quota?.reason === 'QUOTA_EXCEEDED'
      ? `你已开通 ${quota.ownedCount}/${quota.maxTenants} 个团队，达到上限。如需继续开通请联系平台提升额度。`
      : '开通团队需要 VIP 资格。请联系平台管理员为你的账号开通 VIP，开通后即可自助创建团队。'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>开通我的团队</DialogTitle>
          <DialogDescription>开通后你将成为该团队的超级管理员，可独立管理成员与数据</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
            <Loader2 className="size-4 animate-spin" />
            正在校验 VIP 资格…
          </div>
        ) : blocked ? (
          <div className="space-y-3 py-2">
            <div className="border-border bg-muted/40 flex items-start gap-3 rounded-lg border p-3">
              <Lock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <p className="text-sm leading-relaxed">{blockedText}</p>
            </div>
            {quota?.isVip ? null : (
              <p className="text-muted-foreground text-xs">提示：已有账号可正常登录使用系统，仅「开通新团队」需要 VIP。</p>
            )}
          </div>
        ) : (
          <form id="tenant-apply-form" className="space-y-4" onSubmit={submit}>
            {quota ? (
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <BadgeCheck className="size-4 text-emerald-500" />
                VIP 有效{quota.vipExpireAt ? `（至 ${quota.vipExpireAt.slice(0, 10)}）` : '（永久）'}，可开通{' '}
                {quota.maxTenants < 0 ? '不限数量' : `${quota.ownedCount}/${quota.maxTenants}`}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="apply-name">团队名称</Label>
                <Input id="apply-name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="如 云启科技" required maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apply-code">团队编码</Label>
                <Input id="apply-code" value={form.code} onChange={e => set('code', e.target.value)} placeholder="如 yunqi" required maxLength={64} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apply-contact">联系人</Label>
                <Input id="apply-contact" value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="选填" maxLength={50} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apply-phone">联系电话</Label>
                <Input id="apply-phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="选填" maxLength={30} />
              </div>
            </div>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Building2 className="size-3.5" />
              编码创建后作为稳定标识，改名前不影响数据归属
            </p>
          </form>
        )}

        <DialogFooter>
          {blocked ? (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              知道了
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                取消
              </Button>
              <Button type="submit" form="tenant-apply-form" disabled={loading || submitting || !form.name.trim() || !form.code.trim()}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                开通团队
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
