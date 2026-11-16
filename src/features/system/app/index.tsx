import { useCallback, useEffect, useState } from 'react'
import { Copy, KeyRound, Network, Plus, RefreshCw, Trash2, Webhook } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { hasPermission } from '@/lib/auth'
import {
  createApp,
  createWebhook,
  deleteApp,
  deleteWebhook,
  fetchApps,
  fetchDeliveries,
  fetchWebhooks,
  parseScopes,
  resetAppSecret,
  testWebhook,
  updateApp,
  updateWebhook,
  type AppItem,
  type DeliveryItem,
  type SecretOnce,
  type WebhookItem
} from './api'

/** 与后端 APP_SCOPES 对齐（展示名）；新增 scope 要两边同步 */
const SCOPE_OPTIONS = [
  { key: 'user:read', label: '读取用户' },
  { key: 'user:write', label: '写入用户' },
  { key: 'file:read', label: '读取文件' },
  { key: 'file:write', label: '写入文件' },
  { key: 'customer:read', label: '读取客户' },
  { key: 'customer:write', label: '写入客户' }
]

/** 与后端 WEBHOOK_EVENTS 对齐 */
const EVENT_OPTIONS = [
  { key: 'user.created', label: '新用户创建' },
  { key: 'user.updated', label: '用户信息变更' },
  { key: 'user.deleted', label: '用户删除' },
  { key: 'webhook.test', label: '连通性测试' }
]

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 密钥一次性展示弹窗：关闭即失效，这是拿到明文的唯一窗口 */
function SecretDialog({ secret, onClose }: { secret: SecretOnce | null; onClose: () => void }) {
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label}已复制`)
    } catch {
      toast.error('复制失败，请手动选择复制')
    }
  }
  return (
    <Dialog open={!!secret} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>密钥只显示这一次</DialogTitle>
          <DialogDescription>离开本弹窗后系统只保留哈希，无法再次查看。请立即复制并保存到对接方的配置里。</DialogDescription>
        </DialogHeader>
        {secret && (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Client ID</p>
              <div className="flex items-center gap-2">
                <code className="bg-muted min-w-0 flex-1 truncate rounded px-2 py-1.5 font-mono text-xs">{secret.clientId}</code>
                <Button variant="outline" size="icon" onClick={() => copy(secret.clientId, 'Client ID')}>
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Client Secret</p>
              <div className="flex items-center gap-2">
                <code className="bg-muted min-w-0 flex-1 truncate rounded px-2 py-1.5 font-mono text-xs">{secret.clientSecret}</code>
                <Button variant="outline" size="icon" onClick={() => copy(secret.clientSecret, 'Client Secret')}>
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
            <p className="text-destructive text-xs">泄露后的处理：在应用行上点「重置密钥」，旧密钥立即作废。</p>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>我已保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function OpenPlatformPage() {
  const [apps, setApps] = useState<AppItem[] | null>(null)
  const [hooks, setHooks] = useState<WebhookItem[] | null>(null)
  const [loading, setLoading] = useState(true)

  // 密钥一次性展示
  const [secret, setSecret] = useState<SecretOnce | null>(null)

  // 应用编辑
  const [appDialog, setAppDialog] = useState<{ mode: 'create' } | { mode: 'edit'; app: AppItem } | null>(null)
  const [appName, setAppName] = useState('')
  const [appRemark, setAppRemark] = useState('')
  const [appScopes, setAppScopes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Webhook 编辑
  const [hookDialog, setHookDialog] = useState<{ mode: 'create' } | { mode: 'edit'; hook: WebhookItem } | null>(null)
  const [hookEvent, setHookEvent] = useState('user.created')
  const [hookUrl, setHookUrl] = useState('')

  // 删除确认与流水
  const [deleting, setDeleting] = useState<{ kind: 'app' | 'hook'; id: string; name: string } | null>(null)
  const [deliveries, setDeliveries] = useState<{ hook: WebhookItem; rows: DeliveryItem[] } | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([fetchApps(), fetchWebhooks()])
      .then(([appPage, hookPage]) => {
        setApps(appPage.records ?? [])
        setHooks(hookPage.records ?? [])
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const openAppDialog = (mode: 'create' | 'edit', app?: AppItem) => {
    setAppName(app?.appName ?? '')
    setAppRemark(app?.remark ?? '')
    setAppScopes(app ? parseScopes(app.scopes) : [])
    setAppDialog(mode === 'create' ? { mode } : { mode, app: app! })
  }

  const saveApp = async () => {
    if (!appDialog) return
    setSaving(true)
    try {
      if (appDialog.mode === 'create') {
        const { secret: once } = await createApp({ appName: appName.trim(), scopes: appScopes, remark: appRemark.trim() || undefined })
        setSecret(once)
      } else {
        await updateApp(appDialog.app.id, { appName: appName.trim(), scopes: appScopes, remark: appRemark.trim() || undefined })
        toast.success('应用已更新（改授权范围后，对接方需重新换取令牌）')
      }
      setAppDialog(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const toggleApp = async (app: AppItem, enabled: boolean) => {
    try {
      await updateApp(app.id, { status: enabled ? '0' : '1' })
      toast.success(enabled ? '应用已启用' : '应用已停用：已签发令牌立即失效')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败')
    }
  }

  const doResetSecret = async (app: AppItem) => {
    try {
      const once = await resetAppSecret(app.id)
      setSecret(once)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '重置失败')
    }
  }

  const saveHook = async () => {
    if (!hookDialog) return
    setSaving(true)
    try {
      if (hookDialog.mode === 'create') {
        await createWebhook({ event: hookEvent, url: hookUrl.trim() })
        toast.success('订阅已创建，签名密钥自动生成（可在列表里复制）')
      } else {
        await updateWebhook(hookDialog.hook.id, { event: hookEvent, url: hookUrl.trim() })
        toast.success('订阅已更新')
      }
      setHookDialog(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const openDeliveries = async (hook: WebhookItem) => {
    try {
      const page = await fetchDeliveries(hook.id, 1, 10)
      setDeliveries({ hook, rows: page.records ?? [] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加载失败')
    }
  }

  const doDelete = async () => {
    if (!deleting) return
    try {
      if (deleting.kind === 'app') await deleteApp(deleting.id)
      else await deleteWebhook(deleting.id)
      toast.success('已删除')
      setDeleting(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  const canCreate = hasPermission('system:app:create')
  const canUpdate = hasPermission('system:app:update')
  const canDelete = hasPermission('system:app:delete')
  const canHookCreate = hasPermission('system:webhook:create')
  const canHookUpdate = hasPermission('system:webhook:update')
  const canHookDelete = hasPermission('system:webhook:delete')

  const scopeLabel = (key: string) => SCOPE_OPTIONS.find(option => option.key === key)?.label ?? key

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">开放平台</h1>
          <p className="text-muted-foreground text-sm">
            第三方系统用 Client ID + Secret 换访问令牌（OAuth2 client_credentials）；Webhook 把平台事件推送到你的回调地址
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw />
          刷新
        </Button>
      </div>

      {/* ------------------------------ 应用 ------------------------------ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4" />
              应用凭证
            </CardTitle>
            <CardDescription>Secret 明文只在创建/重置时显示一次，库里只有哈希</CardDescription>
          </div>
          {canCreate && (
            <Button onClick={() => openAppDialog('create')}>
              <Plus />
              创建应用
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-6 text-center text-sm">加载中…</p>
          ) : !apps?.length ? (
            <p className="text-muted-foreground py-6 text-center text-sm">还没有应用。创建一个，把 Client ID 与 Secret 交给对接方。</p>
          ) : (
            <div className="space-y-3">
              {apps.map(app => (
                <div key={app.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{app.appName}</p>
                      <span className={app.status === '0' ? 'text-xs text-emerald-600' : 'text-xs text-amber-600'}>
                        {app.status === '0' ? '启用' : '停用'}
                      </span>
                    </div>
                    <p className="text-muted-foreground font-mono text-xs">{app.clientId}</p>
                    <div className="flex flex-wrap gap-1">
                      {parseScopes(app.scopes).map(scope => (
                        <span key={scope} className="bg-muted rounded px-1.5 py-0.5 text-[11px]">
                          {scopeLabel(scope)}
                        </span>
                      ))}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      密钥版本：{app.secretPrefixes?.length ? app.secretPrefixes.join('、') : '无有效密钥'}
                      {app.remark ? ` · ${app.remark}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canUpdate && <Switch checked={app.status === '0'} onCheckedChange={v => toggleApp(app, v)} />}
                    {canUpdate && (
                      <Button variant="outline" size="sm" onClick={() => doResetSecret(app)}>
                        重置密钥
                      </Button>
                    )}
                    {canUpdate && (
                      <Button variant="outline" size="sm" onClick={() => openAppDialog('edit', app)}>
                        编辑
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => setDeleting({ kind: 'app', id: app.id, name: app.appName })}>
                        <Trash2 className="text-destructive size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------ Webhook ------------------------------ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Webhook className="size-4" />
              Webhook 订阅
            </CardTitle>
            <CardDescription>事件到达时 POST JSON，签名在 X-Concise-Signature 头（HMAC-SHA256）；失败自动重试 3 次</CardDescription>
          </div>
          {canHookCreate && (
            <Button
              onClick={() => {
                setHookEvent('user.created')
                setHookUrl('')
                setHookDialog({ mode: 'create' })
              }}
            >
              <Plus />
              创建订阅
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-6 text-center text-sm">加载中…</p>
          ) : !hooks?.length ? (
            <p className="text-muted-foreground py-6 text-center text-sm">还没有订阅。回调地址必须是 https。</p>
          ) : (
            <div className="space-y-3">
              {hooks.map(hook => (
                <div key={hook.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">{hook.event}</span>
                      <span className={hook.status === '0' ? 'text-xs text-emerald-600' : 'text-xs text-amber-600'}>
                        {hook.status === '0' ? '启用' : '停用'}
                      </span>
                    </div>
                    <p className="text-muted-foreground max-w-lg truncate font-mono text-xs" title={hook.url}>
                      {hook.url}
                    </p>
                    <p className="text-muted-foreground text-xs">创建于 {formatTime(hook.createTime)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canHookUpdate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await testWebhook(hook.id)
                            toast.success('测试事件已发起，稍后点「流水」查看结果')
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : '触发失败')
                          }
                        }}
                      >
                        测试
                      </Button>
                    )}
                    {canHookUpdate && (
                      <Button variant="outline" size="sm" onClick={() => openDeliveries(hook)}>
                        流水
                      </Button>
                    )}
                    {canHookUpdate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setHookEvent(hook.event)
                          setHookUrl(hook.url)
                          setHookDialog({ mode: 'edit', hook })
                        }}
                      >
                        编辑
                      </Button>
                    )}
                    {canHookDelete && (
                      <Button variant="ghost" size="icon" onClick={() => setDeleting({ kind: 'hook', id: hook.id, name: hook.event })}>
                        <Trash2 className="text-destructive size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------ 接入说明 ------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="size-4" />
            对接说明
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            1. 换令牌：POST <code className="bg-muted rounded px-1">/api/v1/open/token</code>，body{' '}
            <code className="bg-muted rounded px-1">{'{ client_id, client_secret, grant_type: "client_credentials" }'}</code>，得到 access_token（2 小时有效）。
          </p>
          <p>
            2. 调接口：请求头 <code className="bg-muted rounded px-1">Authorization: Bearer &lt;access_token&gt;</code>，只能访问带授权范围的开放接口（/api/v1/open/**）。
          </p>
          <p>
            3. Webhook：请求体在 X-Concise-Signature 用订阅密钥做 HMAC-SHA256（对原始 body 计算前缀 sha256=），接收方验签后按 X-Concise-Delivery 幂等处理。
          </p>
        </CardContent>
      </Card>

      {/* ------------------------------ 弹窗区 ------------------------------ */}
      <SecretDialog secret={secret} onClose={() => setSecret(null)} />

      <Dialog open={!!appDialog} onOpenChange={v => !v && setAppDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{appDialog?.mode === 'create' ? '创建应用' : '编辑应用'}</DialogTitle>
            <DialogDescription>授权范围决定应用令牌能调哪些开放接口。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs" htmlFor="app-name">
                应用名称
              </label>
              <Input id="app-name" value={appName} onChange={e => setAppName(e.target.value)} placeholder="如：库存同步机器人" />
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">授权范围</p>
              <div className="flex flex-wrap gap-3">
                {SCOPE_OPTIONS.map(option => (
                  <label key={option.key} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={appScopes.includes(option.key)}
                      onChange={e =>
                        setAppScopes(v => (e.target.checked ? [...v, option.key] : v.filter(key => key !== option.key)))
                      }
                    />
                    {option.label}
                    <span className="text-muted-foreground font-mono text-[10px]">{option.key}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs" htmlFor="app-remark">
                备注（可选）
              </label>
              <Input id="app-remark" value={appRemark} onChange={e => setAppRemark(e.target.value)} placeholder="对接方是谁、干什么用" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAppDialog(null)}>
              取消
            </Button>
            <Button onClick={saveApp} disabled={saving || !appName.trim() || appScopes.length === 0}>
              {appDialog?.mode === 'create' ? '创建' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!hookDialog} onOpenChange={v => !v && setHookDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{hookDialog?.mode === 'create' ? '创建订阅' : '编辑订阅'}</DialogTitle>
            <DialogDescription>回调地址必须 https；签名密钥创建时自动生成，编辑时不变。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">订阅事件</p>
              <Select value={hookEvent} onValueChange={setHookEvent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_OPTIONS.map(option => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}（{option.key}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs" htmlFor="hook-url">
                回调地址
              </label>
              <Input id="hook-url" value={hookUrl} onChange={e => setHookUrl(e.target.value)} placeholder="https://your-server.example.com/hook" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHookDialog(null)}>
              取消
            </Button>
            <Button onClick={saveHook} disabled={saving || !hookUrl.trim().startsWith('https://')}>
              {hookDialog?.mode === 'create' ? '创建' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 投递流水 */}
      <Dialog open={!!deliveries} onOpenChange={v => !v && setDeliveries(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>投递流水{deliveries ? ` · ${deliveries.hook.event}` : ''}</DialogTitle>
            <DialogDescription>每次派发一行：最终成败、尝试次数、最后一次响应。重试共 4 次（1s / 5s / 15s）。</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {deliveries?.rows.length ? (
              deliveries.rows.map(row => (
                <div key={row.id} className="rounded-lg border p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={row.status === '0' ? 'text-emerald-600' : 'text-destructive'}>
                      {row.status === '0' ? '成功' : '失败'}
                    </span>
                    <span className="text-muted-foreground">
                      尝试 {row.attempts} 次{row.responseCode ? ` · HTTP ${row.responseCode}` : ''}
                    </span>
                    <span className="text-muted-foreground ml-auto">{formatTime(row.createTime)}</span>
                  </div>
                  {row.error && <p className="text-destructive mt-1">{row.error}</p>}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground py-4 text-center text-sm">还没有投递记录</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        confirmText="删除"
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        title={deleting?.kind === 'app' ? '删除应用' : '删除订阅'}
        description={
          deleting?.kind === 'app'
            ? `即将删除「${deleting?.name}」，其全部有效密钥会被撤销（已签发令牌到期后彻底失效）。`
            : `即将删除订阅「${deleting?.name}」，历史投递流水保留。`
        }
        onConfirm={doDelete}
      />
    </div>
  )
}
