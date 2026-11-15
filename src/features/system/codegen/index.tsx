import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Database, FileCode2, FolderTree, Loader2, Plus, Sparkles, Trash2, TriangleAlert, Wand2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Segmented } from '@/components/ui/segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { hasPermission } from '@/lib/auth'
import { ApiError } from '@/lib/api-error'
import {
  CODEGEN_TYPE_OPTIONS,
  fetchCodegenMeta,
  fetchCodegenTables,
  fetchTableFields,
  generateCodegen,
  previewCodegen,
  type CodegenFieldType,
  type CodegenGenerateResult,
  type CodegenMeta,
  type CodegenPreview,
  type CodegenSpecPayload,
  type CodegenTableInfo
} from './api'

/** 表单里的字段草稿：enum 用一行文本编辑（1:启用|0:停用），提交时再解析成数组 */
interface FieldDraft {
  key: string
  name: string
  comment: string
  type: CodegenFieldType
  required: boolean
  unique: boolean
  query: boolean
  search: boolean
  default: string
  enumText: string
}

let seed = 0
const newField = (patch: Partial<FieldDraft> = {}): FieldDraft => ({
  key: `f${++seed}`,
  name: '',
  comment: '',
  type: 'string',
  required: false,
  unique: false,
  query: false,
  search: false,
  default: '',
  enumText: '',
  ...patch
})

const DEMO_FIELDS: FieldDraft[] = [
  newField({ name: 'title', comment: '标题', required: true, search: true }),
  newField({ name: 'status', comment: '状态', type: 'enum', query: true, default: '1', enumText: '1:启用|0:停用' }),
  newField({ name: 'amount', comment: '金额', type: 'decimal' }),
  newField({ name: 'signed_at', comment: '签约时间', type: 'datetime' }),
  newField({ name: 'remark', comment: '备注', type: 'text' })
]

/** 枚举文本 → 结构化值，顺带把格式错误暴露给用户 */
function parseEnumText(text: string): { values: Array<{ value: number; label: string }>; error?: string } {
  const values: Array<{ value: number; label: string }> = []
  for (const piece of text.split('|')) {
    const raw = piece.trim()
    if (!raw) continue
    const [value, label] = raw.split(':')
    if (value === undefined || label === undefined || !/^-?\d+$/.test(value.trim()) || !label.trim()) {
      return { values, error: `枚举项「${raw}」不合法，应为 值:标签（如 1:启用）` }
    }
    values.push({ value: Number(value.trim()), label: label.trim() })
  }
  if (values.length === 0) return { values, error: '枚举字段至少要有一个值，如 1:启用|0:停用' }
  return { values }
}

/** 把草稿整理成接口载荷；返回第一条校验错误（无错则 error 为空） */
function buildPayload(
  form: {
    module: string
    label: string
    perms: string
    table: string
    menuParent: string
    sort: string
    icon: string
  },
  fields: FieldDraft[]
): { payload: CodegenSpecPayload | null; error?: string } {
  if (!/^[a-z][a-z0-9_]{1,31}$/.test(form.module)) return { payload: null, error: '模块标识须为小写蛇形（2~32 位，如 biz_order）' }
  if (!form.label.trim()) return { payload: null, error: '模块名称不能为空' }
  if (fields.length === 0) return { payload: null, error: '至少定义 1 个业务字段' }
  const names = new Set<string>()
  const out: CodegenFieldPayloadLite[] = []
  for (const field of fields) {
    if (!/^[a-z][a-z0-9_]{0,31}$/.test(field.name)) {
      return { payload: null, error: `字段名「${field.name || '空'}」须为小写蛇形（≤32 位）` }
    }
    if (names.has(field.name)) return { payload: null, error: `字段名「${field.name}」重复` }
    names.add(field.name)
    const item: CodegenFieldPayloadLite = {
      name: field.name,
      type: field.type,
      comment: field.comment.trim() || field.name,
      required: field.required,
      unique: field.unique,
      query: field.query,
      search: field.search
    }
    if (field.default.trim()) item.default = field.default.trim()
    if (field.type === 'enum') {
      const parsed = parseEnumText(field.enumText)
      if (parsed.error) return { payload: null, error: `字段「${field.name}」：${parsed.error}` }
      item.enumValues = parsed.values
      if (item.default && !parsed.values.some(value => String(value.value) === item.default)) {
        return { payload: null, error: `字段「${field.name}」默认值 ${item.default} 不在枚举项里` }
      }
    }
    out.push(item)
  }
  return {
    payload: {
      module: form.module,
      label: form.label.trim(),
      perms: form.perms.trim() || undefined,
      table: form.table.trim() || undefined,
      menuParent: form.menuParent,
      sort: Number(form.sort) || 50,
      icon: form.icon,
      fields: out
    }
  }
}

type CodegenFieldPayloadLite = {
  name: string
  type: CodegenFieldType
  comment: string
  required: boolean
  unique: boolean
  query: boolean
  search: boolean
  default?: string
  enumValues?: Array<{ value: number; label: string }>
}

/** 小开关片：比 Switch 省横向空间，四个标志位一行放得下 */
function FlagChip({ label, active, onChange, title }: { label: string; active: boolean; onChange: (next: boolean) => void; title: string }) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={() => onChange(!active)}
      className={
        active
          ? 'border-primary/50 bg-primary/10 text-primary h-7 rounded-md border px-2 text-[11px] font-medium transition-colors'
          : 'text-muted-foreground hover:text-foreground hover:border-foreground/30 h-7 rounded-md border border-dashed px-2 text-[11px] transition-colors'
      }
    >
      {label}
    </button>
  )
}

/** 系统代码生成器：表单化 DSL → 预览 → 落盘生成 */
export function CodegenPage() {
  const [meta, setMeta] = useState<CodegenMeta | null>(null)
  const [metaError, setMetaError] = useState<string | null>(null)
  const [tables, setTables] = useState<CodegenTableInfo[]>([])
  const [form, setForm] = useState({
    module: 'biz_order',
    label: '订单',
    perms: '',
    table: '',
    menuParent: 'menu_collab',
    sort: '50',
    icon: 'Briefcase'
  })
  const [fields, setFields] = useState<FieldDraft[]>(DEMO_FIELDS)
  const [preview, setPreview] = useState<CodegenPreview | null>(null)
  const [previewKey, setPreviewKey] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [scope, setScope] = useState<'server' | 'admin'>('server')
  const [activePath, setActivePath] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [forceConfirmed, setForceConfirmed] = useState(false)
  const [result, setResult] = useState<CodegenGenerateResult | null>(null)
  const [importTable, setImportTable] = useState('')

  useEffect(() => {
    fetchCodegenMeta()
      .then(setMeta)
      .catch(error => setMetaError(error instanceof Error ? error.message : '生成器信息加载失败'))
    fetchCodegenTables()
      .then(setTables)
      .catch(() => setTables([]))
  }, [])

  const built = useMemo(() => buildPayload(form, fields), [form, fields])
  const payload = built.payload
  const specKey = useMemo(() => (payload ? JSON.stringify(payload) : ''), [payload])
  const stale = Boolean(preview) && previewKey !== specKey

  const filesOfScope = useMemo(() => (preview?.files ?? []).filter(file => file.scope === scope), [preview, scope])
  const activeFile = useMemo(() => {
    if (!preview) return null
    return preview.files.find(file => `${file.scope}:${file.path}` === activePath) ?? filesOfScope[0] ?? null
  }, [preview, activePath, filesOfScope])

  const patchField = useCallback((key: string, patch: Partial<FieldDraft>) => {
    setFields(list => list.map(item => (item.key === key ? { ...item, ...patch } : item)))
  }, [])

  const moveField = (index: number, delta: number) => {
    setFields(list => {
      const next = [...list]
      const target = index + delta
      if (target < 0 || target >= next.length) return list
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  const runPreview = async () => {
    if (!payload) {
      toast.error(built.error ?? '配置不完整')
      return
    }
    setPreviewing(true)
    setResult(null)
    try {
      const data = await previewCodegen(payload)
      setPreview(data)
      setPreviewKey(specKey)
      const first = data.files.find(file => file.scope === 'server') ?? data.files[0]
      if (first) {
        setScope(first.scope)
        setActivePath(`${first.scope}:${first.path}`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '预览失败')
    } finally {
      setPreviewing(false)
    }
  }

  const runGenerate = async (force: boolean) => {
    if (!payload) return
    setGenerating(true)
    try {
      const data = await generateCodegen({ ...payload, force })
      setResult(data)
      setConfirmOpen(false)
      setForceConfirmed(false)
      toast.success(`已生成 ${data.created.length} 个文件`)
    } catch (error) {
      if (error instanceof ApiError && error.code === 9201) {
        setForceConfirmed(true)
        setConfirmOpen(true)
        return
      }
      toast.error(error instanceof Error ? error.message : '生成失败')
    } finally {
      setGenerating(false)
    }
  }

  const importFromTable = async () => {
    if (!importTable) {
      toast.error('先选择一张数据表')
      return
    }
    try {
      const data = await fetchTableFields(importTable)
      if (data.fields.length === 0) {
        toast.error('这张表除了系统列没有可用字段')
        return
      }
      setFields(
        data.fields.map(field =>
          newField({
            name: field.name,
            comment: field.comment,
            type: field.type,
            required: field.required,
            unique: field.unique,
            default: field.default ?? '',
            enumText: ''
          })
        )
      )
      setForm(current => ({
        ...current,
        module: /^[a-z][a-z0-9_]{1,31}$/.test(data.table) ? data.table : current.module,
        label: data.label || current.label,
        table: data.table
      }))
      toast.success(`已导入 ${data.fields.length} 个字段，请复核类型与必填`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导入失败')
    }
  }

  const copyActive = async () => {
    if (!activeFile) return
    try {
      await navigator.clipboard.writeText(activeFile.content)
      toast.success('已复制文件内容')
    } catch {
      toast.error('复制失败，请手动选中')
    }
  }

  if (metaError) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">{metaError}</CardContent>
      </Card>
    )
  }
  if (!meta) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const canGenerate = hasPermission('tools:codegen:generate')
  const parentItems = Object.fromEntries(meta.parents.map(item => [item.value, item.label]))
  const iconItems = Object.fromEntries(meta.icons.map(item => [item.value, item.label]))
  const typeItems = Object.fromEntries(CODEGEN_TYPE_OPTIONS.map(item => [item.value, item.label]))
  const tableItems = Object.fromEntries(tables.map(item => [item.name, item.comment ? `${item.name}（${item.comment}）` : item.name]))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">代码生成</h1>
          <p className="text-muted-foreground text-sm">
            定义模块与字段 → 预览产物 → 一键生成后端五件套 + 迁移 + 前端列表页。模板仍来自 scripts/gen-module.cjs，与命令行完全一致。
          </p>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span
            className={
              meta.enabled ? 'rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-700' : 'rounded-full border px-2 py-0.5'
            }
          >
            {meta.enabled ? '已启用' : '已禁用'}
          </span>
          <span className="font-mono">server: {meta.roots.server}</span>
        </div>
      </div>

      {!meta.enabled && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-2 py-4 text-sm">
            <TriangleAlert className="text-destructive mt-0.5 size-4 shrink-0" />
            <span>
              当前环境已关闭生成器（生产环境默认禁用）。需要显式设置 <code className="font-mono">CODEGEN_ENABLED=true</code> 并重启后端。
            </span>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" />
              生成完成：{result.label}（{result.module}）
            </CardTitle>
            <CardDescription>
              新写入 {result.created.length} 个文件{result.skipped.length > 0 ? `，跳过已存在 ${result.skipped.length} 个` : ''}；菜单节点{' '}
              <code className="font-mono">{result.menuId}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="text-muted-foreground list-decimal space-y-1 ps-5">
              {result.nextSteps.map(step => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <details className="rounded-lg border">
              <summary className="text-muted-foreground cursor-pointer px-3 py-2 text-xs">查看脚本日志</summary>
              <pre className="max-h-56 overflow-auto border-t px-3 py-2 font-mono text-[11px] leading-relaxed">{result.log}</pre>
            </details>
          </CardContent>
        </Card>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,6fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">模块信息</CardTitle>
              <CardDescription>模块标识决定目录名、表名与按钮权限前缀，生成后不建议再改</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cg-module">模块标识</Label>
                  <Input
                    id="cg-module"
                    className="font-mono"
                    value={form.module}
                    placeholder="biz_order"
                    onChange={event => setForm(current => ({ ...current, module: event.target.value.trim() }))}
                  />
                  <p className="text-muted-foreground text-[11px]">小写蛇形，2~32 位；生成 src/modules/&lt;标识&gt;</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cg-label">模块名称</Label>
                  <Input
                    id="cg-label"
                    value={form.label}
                    placeholder="订单"
                    onChange={event => setForm(current => ({ ...current, label: event.target.value }))}
                  />
                  <p className="text-muted-foreground text-[11px]">菜单名 + 页面标题，如「订单管理」</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cg-perms">权限前缀</Label>
                  <Input
                    id="cg-perms"
                    className="font-mono"
                    value={form.perms}
                    placeholder={form.module || '同模块标识'}
                    onChange={event => setForm(current => ({ ...current, perms: event.target.value.trim() }))}
                  />
                  <p className="text-muted-foreground text-[11px]">留空即同模块标识，生成 list/add/update/delete</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cg-table">物理表名</Label>
                  <Input
                    id="cg-table"
                    className="font-mono"
                    value={form.table}
                    placeholder={form.module || '同模块标识'}
                    onChange={event => setForm(current => ({ ...current, table: event.target.value.trim() }))}
                  />
                  <p className="text-muted-foreground text-[11px]">留空即同模块标识；表已存在时生成会失败</p>
                </div>
                <div className="space-y-1.5">
                  <Label>菜单分组</Label>
                  <Select value={form.menuParent} items={parentItems} onValueChange={value => setForm(current => ({ ...current, menuParent: value }))}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meta.parents.map(item => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>菜单图标</Label>
                  <Select value={form.icon} items={iconItems} onValueChange={value => setForm(current => ({ ...current, icon: value }))}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meta.icons.map(item => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}（{item.value}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2 border-t pt-3">
                <div className="min-w-52 flex-1 space-y-1.5">
                  <Label>从已有数据表导入</Label>
                  <Select value={importTable} items={tableItems} onValueChange={setImportTable}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="选择一张表（自动反推字段）" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map(item => (
                        <SelectItem key={item.name} value={item.name}>
                          {item.name}
                          {item.comment ? `（${item.comment}）` : ''}
                          {item.hasModule ? ' · 已有模块' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={importFromTable} disabled={!importTable}>
                  <Database />
                  导入字段
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFields(DEMO_FIELDS.map(field => ({ ...field, key: `f${++seed}` })))
                    setForm(current => ({ ...current, label: '订单', module: current.module || 'biz_order' }))
                  }}
                >
                  <Wand2 />
                  填示例字段
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">字段定义</CardTitle>
                <CardDescription>共 {fields.length} 个字段；勾选决定列表页行为，枚举用「值:标签」竖线分隔</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setFields(list => [...list, newField()])}>
                <Plus />
                添加字段
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {fields.length === 0 && (
                <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
                  还没有字段，点右上「添加字段」或「填示例字段」
                </div>
              )}
              {fields.map((field, index) => (
                <div key={field.key} className="bg-muted/30 space-y-2 rounded-lg border p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      className="h-8 w-32 font-mono text-xs"
                      value={field.name}
                      placeholder="字段名"
                      onChange={event => patchField(field.key, { name: event.target.value.trim() })}
                    />
                    <Input
                      className="h-8 w-32 text-xs"
                      value={field.comment}
                      placeholder="中文名"
                      onChange={event => patchField(field.key, { comment: event.target.value })}
                    />
                    <Select value={field.type} items={typeItems} onValueChange={value => patchField(field.key, { type: value as CodegenFieldType })}>
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CODEGEN_TYPE_OPTIONS.map(item => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FlagChip
                      label="必填"
                      title="必填：entity 非空 + 表单必填"
                      active={field.required}
                      onChange={next => patchField(field.key, { required: next })}
                    />
                    <FlagChip
                      label="唯一"
                      title="唯一：按租户唯一，写入前查重"
                      active={field.unique}
                      onChange={next => patchField(field.key, { unique: next })}
                    />
                    <FlagChip label="查询" title="查询：列表页精确过滤项" active={field.query} onChange={next => patchField(field.key, { query: next })} />
                    <FlagChip
                      label="搜索"
                      title="搜索：列表页关键字模糊匹配"
                      active={field.search}
                      onChange={next => patchField(field.key, { search: next })}
                    />
                    <Input
                      className="h-8 w-20 font-mono text-xs"
                      value={field.default}
                      placeholder="默认值"
                      onChange={event => patchField(field.key, { default: event.target.value.trim() })}
                    />
                    <div className="ms-auto flex items-center gap-0.5">
                      <Button size="icon" variant="ghost" className="size-7" disabled={index === 0} onClick={() => moveField(index, -1)} title="上移">
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        disabled={index === fields.length - 1}
                        onClick={() => moveField(index, 1)}
                        title="下移"
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive size-7"
                        onClick={() => setFields(list => list.filter(item => item.key !== field.key))}
                        title="删除字段"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  {field.type === 'enum' && (
                    <Input
                      className="h-8 font-mono text-xs"
                      value={field.enumText}
                      placeholder="枚举项：1:启用|0:停用"
                      onChange={event => patchField(field.key, { enumText: event.target.value })}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="xl:sticky xl:top-6">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderTree className="size-4" />
                产物预览
                {preview && <span className="text-muted-foreground text-xs font-normal">{preview.files.length} 个文件</span>}
              </CardTitle>
              <Segmented
                value={scope}
                onChange={value => setScope(value as 'server' | 'admin')}
                options={[
                  { value: 'server', label: `后端 ${preview ? preview.files.filter(file => file.scope === 'server').length : 0}` },
                  { value: 'admin', label: `前端 ${preview ? preview.files.filter(file => file.scope === 'admin').length : 0}` }
                ]}
              />
            </div>
            <CardDescription>预览在临时目录渲染，不会改动仓库；确认后再执行生成</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!preview ? (
              <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed py-14 text-center text-sm">
                <FileCode2 className="size-6 opacity-60" />
                <span>点下方「预览产物」查看将生成的文件与代码</span>
              </div>
            ) : (
              <>
                {stale && (
                  <div className="text-muted-foreground bg-muted/60 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs">
                    <TriangleAlert className="size-3.5" />
                    配置已改动，预览结果过期，请重新预览后再生成
                  </div>
                )}
                {preview.warnings.length > 0 && (
                  <ul className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/5 px-2.5 py-2 text-xs">
                    {preview.warnings.map(warning => (
                      <li key={warning} className="flex items-start gap-1.5">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="max-h-40 space-y-0.5 overflow-auto rounded-md border p-1">
                  {filesOfScope.map(file => {
                    const id = `${file.scope}:${file.path}`
                    const active = activeFile && `${activeFile.scope}:${activeFile.path}` === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setActivePath(id)}
                        className={
                          active
                            ? 'bg-primary/10 text-foreground flex w-full items-center gap-2 rounded px-2 py-1 text-start'
                            : 'text-muted-foreground hover:bg-muted/60 flex w-full items-center gap-2 rounded px-2 py-1 text-start'
                        }
                      >
                        <FileCode2 className="size-3.5 shrink-0 opacity-70" />
                        <span className="truncate font-mono text-[11px]">{file.path}</span>
                        <span className="text-muted-foreground ms-auto shrink-0 text-[10px] tabular-nums">{file.lines} 行</span>
                      </button>
                    )
                  })}
                  {filesOfScope.length === 0 && <p className="text-muted-foreground px-2 py-3 text-center text-xs">该侧没有产物</p>}
                </div>
                {activeFile && (
                  <div className="overflow-hidden rounded-lg border">
                    <div className="bg-muted/50 flex items-center justify-between gap-2 border-b px-2.5 py-1.5">
                      <span className="truncate font-mono text-[11px]">{activeFile.path}</span>
                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px]" onClick={copyActive}>
                        <Copy className="size-3" />
                        复制
                      </Button>
                    </div>
                    <pre className="max-h-[380px] overflow-auto p-2.5 font-mono text-[11px] leading-[1.65]">
                      {activeFile.content.split('\n').map((line, index) => (
                        <div key={index} className="flex">
                          <span className="text-muted-foreground/50 w-7 shrink-0 text-right select-none">{index + 1}</span>
                          <span className="ps-2.5 whitespace-pre">{line || ' '}</span>
                        </div>
                      ))}
                    </pre>
                  </div>
                )}
                <details className="rounded-lg border">
                  <summary className="text-muted-foreground cursor-pointer px-3 py-2 text-xs">生成时会改动的注册点（{preview.touched.length} 处）</summary>
                  <ul className="text-muted-foreground space-y-1 border-t px-3 py-2 text-[11px]">
                    {preview.touched.map(item => (
                      <li key={item} className="font-mono">
                        {item}
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <Button variant="outline" onClick={runPreview} disabled={previewing || generating}>
                {previewing ? <Loader2 className="animate-spin" /> : <FolderTree />}
                {previewing ? '预览中…' : preview ? '重新预览' : '预览产物'}
              </Button>
              <Button
                disabled={!canGenerate || generating || !preview || stale}
                onClick={() => {
                  setForceConfirmed(false)
                  setConfirmOpen(true)
                }}
              >
                {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {generating ? '生成中…' : '执行生成'}
              </Button>
              {!built.payload && <span className="text-destructive text-xs">{built.error}</span>}
              {!canGenerate && <span className="text-muted-foreground text-xs">缺少 tools:codegen:generate 权限</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={open => {
          setConfirmOpen(open)
          if (!open) setForceConfirmed(false)
        }}
        title={forceConfirmed ? '模块已存在，仍要继续？' : '确认执行代码生成？'}
        confirmText={forceConfirmed ? '继续生成' : '确认生成'}
        confirmVariant="default"
        loading={generating}
        description={
          <div className="space-y-2 text-sm">
            {forceConfirmed ? (
              <p>
                后端目录 <code className="font-mono">src/modules/{form.module}</code> 已存在（或同表已建）。继续只会补齐缺失文件，同名文件与旧表不会被覆盖。
              </p>
            ) : (
              <p>将向后端与前端的源码目录写入文件，并修改 app.module.ts、前端路由、page-registry、i18n。生成后需要自行 build + 迁移 + 重启才能生效。</p>
            )}
            <ul className="text-muted-foreground list-disc space-y-0.5 ps-4 text-xs">
              <li>
                模块：{form.module}（{form.label}）
              </li>
              <li>字段：{fields.length} 个</li>
              <li>
                菜单：挂在 {parentItems[form.menuParent] ?? form.menuParent} 下，id 为 menu_{form.module}
              </li>
            </ul>
          </div>
        }
        onConfirm={() => runGenerate(forceConfirmed)}
      />
    </div>
  )
}
