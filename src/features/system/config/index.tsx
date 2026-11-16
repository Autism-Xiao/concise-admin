import { useEffect, useMemo, useState } from 'react'
import { Loader2, RotateCw, Save, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { hasPermission } from '@/lib/auth'
import { fetchConfigs, reloadConfigCache, updateConfigsBatch, type SystemConfigItem } from './api'

/** 分组中文名（未登记的原样展示，方便新增分组时不改前端） */
const GROUP_LABELS: Record<string, string> = {
  security: '安全策略',
  ops: '运维'
}

const GROUP_HINTS: Record<string, string> = {
  security: '改完立即生效：新建用户、管理员重置密码、用户自助改密都会按这里的策略校验',
  ops: '备份任务的运行参数，下一次定时执行时生效'
}

export function ConfigPage() {
  const canEdit = hasPermission('system:config:update')
  const [items, setItems] = useState<SystemConfigItem[] | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [savingGroup, setSavingGroup] = useState<string | null>(null)
  const [reloading, setReloading] = useState(false)

  const load = async () => {
    try {
      const list = await fetchConfigs()
      setItems(list)
      setDraft(Object.fromEntries(list.map(item => [item.configKey, item.configValue])))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '参数加载失败')
      setItems([])
    }
  }

  useEffect(() => {
    void load()
  }, [])

  /** 按分组聚拢，保持后端返回顺序 */
  const groups = useMemo(() => {
    const map = new Map<string, SystemConfigItem[]>()
    for (const item of items ?? []) {
      const list = map.get(item.configGroup) ?? []
      list.push(item)
      map.set(item.configGroup, list)
    }
    return [...map.entries()]
  }, [items])

  const dirtyOf = (group: string) =>
    (items ?? []).filter(item => item.configGroup === group && draft[item.configKey] !== item.configValue)

  const handleSave = async (group: string) => {
    const changed = dirtyOf(group)
    if (!changed.length) {
      toast.info('没有修改')
      return
    }
    setSavingGroup(group)
    try {
      await updateConfigsBatch(changed.map(item => ({ configKey: item.configKey, configValue: draft[item.configKey] ?? '' })))
      toast.success(`已保存 ${changed.length} 项`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSavingGroup(null)
    }
  }

  const handleReload = async () => {
    setReloading(true)
    try {
      await reloadConfigCache()
      await load()
      toast.success('缓存已刷新')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '刷新失败')
    } finally {
      setReloading(false)
    }
  }

  if (!items) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Settings2 className="h-5 w-5" />
            参数配置
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">运行时可调的系统参数，改完即时生效，不需要重启服务</p>
        </div>
        <Button variant="outline" onClick={handleReload} disabled={reloading}>
          {reloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}
          刷新缓存
        </Button>
      </div>

      {groups.length === 0 && <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">没有可配置的参数</CardContent></Card>}

      {groups.map(([group, list]) => {
        const changedCount = dirtyOf(group).length
        return (
          <Card key={group}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-base">{GROUP_LABELS[group] ?? group}</CardTitle>
                {GROUP_HINTS[group] && <CardDescription className="mt-1">{GROUP_HINTS[group]}</CardDescription>}
              </div>
              <Button size="sm" onClick={() => handleSave(group)} disabled={!canEdit || savingGroup === group || changedCount === 0}>
                {savingGroup === group ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                保存{changedCount > 0 ? `（${changedCount}）` : ''}
              </Button>
            </CardHeader>
            <CardContent className="divide-y">
              {list.map(item => {
                const value = draft[item.configKey] ?? ''
                const changed = value !== item.configValue
                return (
                  <div key={item.configKey} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={item.configKey} className="text-sm font-medium">
                          {item.name}
                        </Label>
                        {changed && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-700">未保存</span>}
                      </div>
                      {item.remark && <p className="mt-1 text-xs text-muted-foreground">{item.remark}</p>}
                      <code className="mt-1 block text-[11px] text-muted-foreground/70">{item.configKey}</code>
                    </div>
                    <div className="shrink-0">
                      {item.valueType === 'boolean' ? (
                        <Switch
                          id={item.configKey}
                          checked={value === 'true'}
                          disabled={!canEdit}
                          onCheckedChange={checked => setDraft(prev => ({ ...prev, [item.configKey]: String(checked) }))}
                        />
                      ) : (
                        <Input
                          id={item.configKey}
                          className="w-[180px]"
                          type={item.valueType === 'number' ? 'number' : 'text'}
                          value={value}
                          disabled={!canEdit}
                          onChange={event => setDraft(prev => ({ ...prev, [item.configKey]: event.target.value }))}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
