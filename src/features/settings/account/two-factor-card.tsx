import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { Copy, KeyRound, Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { activateTwoFactor, deactivateTwoFactor, fetchTwoFactorStatus, regenerateBackupCodes, setupTwoFactor } from '@/features/auth/api'

/**
 * 两步验证卡片（系统设置-账户）
 *
 * 后端链路：GET /v1/auth/2fa/status → POST setup 出 otpauth:// URI → 扫码 →
 * POST activate（6 位动态码）开启，响应里一次性返回 10 条备份恢复码；
 * 开启后登录必须带动态码或备份码（登录页 2105 会展开输入框）。
 * 备份码是手机丢失时的唯一后路，激活后必须让用户立刻保存。
 */
export function TwoFactorCard() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [remaining, setRemaining] = useState(0)
  const [busy, setBusy] = useState(false)
  // 绑定弹窗：setup 拿到 otpauthUrl 后打开，输入动态码激活
  const [setupOpen, setSetupOpen] = useState(false)
  const [otpauthUrl, setOtpauthUrl] = useState('')
  const [setupCode, setSetupCode] = useState('')
  // 关闭弹窗：验码后关闭
  const [disableOpen, setDisableOpen] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  // 备份码展示（激活成功后自动弹出）
  const [codesOpen, setCodesOpen] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  // 重新生成备份码：需要当前动态码
  const [regenOpen, setRegenOpen] = useState(false)
  const [regenCode, setRegenCode] = useState('')

  const loadStatus = () => {
    fetchTwoFactorStatus()
      .then(res => {
        setEnabled(res.enabled)
        setRemaining(res.remainingBackupCodes ?? 0)
      })
      // 状态拿不到按「未开启」降级：按钮可点，点开时接口再兜一次错误提示
      .catch(() => setEnabled(false))
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const openSetup = async () => {
    setBusy(true)
    try {
      const res = await setupTwoFactor()
      setOtpauthUrl(res.otpauthUrl)
      setSetupCode('')
      setSetupOpen(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发起绑定失败')
    } finally {
      setBusy(false)
    }
  }

  const confirmActivate = async () => {
    if (!/^\d{6}$/.test(setupCode)) {
      toast.error('请输入 6 位动态验证码')
      return
    }
    setBusy(true)
    try {
      const res = await activateTwoFactor(setupCode)
      setEnabled(true)
      setSetupOpen(false)
      // 备份码只在这里出现一次，立刻弹出来让用户保存
      setBackupCodes(res.backupCodes ?? [])
      setRemaining(res.backupCodes?.length ?? 0)
      setCodesOpen(true)
      toast.success('两步验证已开启，请立刻保存下面的备份码')
    } catch (error) {
      // 2106 验证码不对/过期：留在弹窗里直接重输
      toast.error(error instanceof Error ? error.message : '激活失败')
    } finally {
      setBusy(false)
    }
  }

  const confirmDisable = async () => {
    if (!/^\d{6}$/.test(disableCode)) {
      toast.error('请输入 6 位动态验证码')
      return
    }
    setBusy(true)
    try {
      await deactivateTwoFactor(disableCode)
      setEnabled(false)
      setRemaining(0)
      setDisableOpen(false)
      toast.success('两步验证已关闭')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '关闭失败')
    } finally {
      setBusy(false)
    }
  }

  const confirmRegen = async () => {
    if (!/^\d{6}$/.test(regenCode)) {
      toast.error('请输入 6 位动态验证码')
      return
    }
    setBusy(true)
    try {
      const res = await regenerateBackupCodes(regenCode)
      setBackupCodes(res.backupCodes ?? [])
      setRemaining(res.backupCodes?.length ?? 0)
      setRegenOpen(false)
      setCodesOpen(true)
      toast.success('已生成新的备份码，旧码全部作废')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成失败')
    } finally {
      setBusy(false)
    }
  }

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'))
      toast.success('已复制全部备份码')
    } catch {
      toast.error('复制失败，请手动选择')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>两步验证</CardTitle>
        <CardDescription>开启后登录时除密码外还需输入认证器上的 6 位动态验证码，或一条备份码</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            {enabled === null ? (
              <>
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
                <span className="text-muted-foreground">读取中…</span>
              </>
            ) : enabled ? (
              <>
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>已开启：登录需要动态验证码或备份码</span>
                <span className={remaining > 0 ? 'text-muted-foreground text-xs' : 'text-amber-600 text-xs'}>
                  （剩余备份码 {remaining} 条{remaining === 0 ? '，建议重新生成' : ''}）
                </span>
              </>
            ) : (
              <>
                <ShieldOff className="text-muted-foreground size-4" />
                <span className="text-muted-foreground">未开启：仅凭密码即可登录</span>
              </>
            )}
          </div>
          {enabled ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRegenCode('')
                  setRegenOpen(true)
                }}
              >
                <KeyRound className="mr-1.5 size-4" />
                重新生成备份码
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDisableCode('')
                  setDisableOpen(true)
                }}
              >
                关闭两步验证
              </Button>
            </div>
          ) : (
            <Button disabled={busy || enabled === null} onClick={() => void openSetup()}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              开启两步验证
            </Button>
          )}
        </div>

        {/* 绑定弹窗：扫码 + 输入动态码激活 */}
        <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>开启两步验证</DialogTitle>
              <DialogDescription>用 Google Authenticator、1Password 等认证器扫码，然后输入其显示的 6 位动态码</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-lg bg-white p-3">
                {/* otpauth:// URI 由认证器 App 扫码解析；手动输入走下方 URI 文本 */}
                <QRCodeSVG value={otpauthUrl} size={168} />
              </div>
              <p className="text-muted-foreground w-full truncate rounded bg-muted px-2 py-1.5 font-mono text-[11px]" title={otpauthUrl}>
                {otpauthUrl}
              </p>
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="输入 6 位动态码"
                className="text-center tracking-[0.4em]"
                value={setupCode}
                onChange={e => setSetupCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => {
                  if (e.key === 'Enter') void confirmActivate()
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSetupOpen(false)}>
                取消
              </Button>
              <Button disabled={busy} onClick={() => void confirmActivate()}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                确认开启
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 备份码展示：只在激活/重新生成后出现一次 */}
        <Dialog open={codesOpen} onOpenChange={setCodesOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>备份恢复码</DialogTitle>
              <DialogDescription>
                手机丢失或认证器被删时，用其中任意一条代替动态码登录。每条只能用一次，此后再也无法查看，请立刻保存到安全位置。
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map(code => (
                <code key={code} className="rounded bg-muted px-2 py-1.5 text-center font-mono text-sm tracking-wide">
                  {code}
                </code>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => void copyAll()}>
                <Copy className="mr-1.5 size-4" />
                复制全部
              </Button>
              <Button onClick={() => setCodesOpen(false)}>我已保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 重新生成：验码，旧码即刻作废 */}
        <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>重新生成备份码</DialogTitle>
              <DialogDescription>旧备份码将全部作废（含尚未使用的），请确认手边有可用的认证器</DialogDescription>
            </DialogHeader>
            <Input
              inputMode="numeric"
              maxLength={6}
              placeholder="输入认证器上的 6 位动态码确认"
              className="text-center tracking-[0.4em]"
              value={regenCode}
              onChange={e => setRegenCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => {
                if (e.key === 'Enter') void confirmRegen()
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRegenOpen(false)}>
                取消
              </Button>
              <Button disabled={busy} onClick={() => void confirmRegen()}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                生成新码
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 关闭弹窗：验码后关闭 */}
        <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>关闭两步验证</DialogTitle>
              <DialogDescription>关闭后登录仅凭密码即可，确认仍要关闭吗？备份码也会一并清除。</DialogDescription>
            </DialogHeader>
            <Input
              inputMode="numeric"
              maxLength={6}
              placeholder="输入认证器上的 6 位动态码确认"
              className="text-center tracking-[0.4em]"
              value={disableCode}
              onChange={e => setDisableCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => {
                if (e.key === 'Enter') void confirmDisable()
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setDisableOpen(false)}>
                取消
              </Button>
              <Button variant="destructive" disabled={busy} onClick={() => void confirmDisable()}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                确认关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
