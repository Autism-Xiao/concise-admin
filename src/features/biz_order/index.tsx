import { useCallback, useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { RefreshButton } from '@/components/ui/refresh-button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useServerTable, type ServerTableQuery } from '@/components/data-table'
import { hasPermission } from '@/lib/auth'
import {
  createBizOrder,
  deleteBizOrder,
  fetchBizOrders,
  updateBizOrder,
  type BizOrder,
  type BizOrderWritePayload
} from './api'
import { BizOrderFormDrawer } from './components/biz_order-form-drawer'

const BizOrderEnumLabels: Record<number, string> = {
  1: '启用',
  0: '停用'
}

const columnLabels: Record<string, string> = {
  title: '标题',
  status: '状态',
  amount: '金额',
  signedAt: '签约时间',
  remark: '备注',
  actions: '操作'
}

/** 订单管理（生成器产物：DataTable + 抽屉表单规约） */
export function BizOrderPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BizOrder | null>(null)
  const [deleting, setDeleting] = useState<BizOrder | null>(null)

  /** 列表查询：搜索/排序/翻页都由接口完成 */
  const fetchPage = useCallback(
    ({ page, pageSize, keyword, sortBy, sortOrder }: ServerTableQuery<Record<string, never>>) =>
      fetchBizOrders({ page, pageSize, keyword, sortBy, sortOrder }),
    []
  )

  const columns = useMemo<ColumnDef<BizOrder>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="标题" />,
        enableSorting: true,
        cell: ({ row }) => {
  return <span className="font-medium">{row.getValue('title') || '-'}</span>
        }
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
        enableSorting: true,
        cell: ({ row }) => {
  const labels = BizOrderEnumLabels
        return <span>{labels[row.getValue<number>('status')] ?? '-'}</span>
        }
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="金额" />,
        enableSorting: true,
        cell: ({ row }) => {
  return <span className="tabular-nums">{row.getValue('amount') ?? '-'}</span>
        }
      },
      {
        accessorKey: 'signedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="签约时间" />,
        enableSorting: true,
        cell: ({ row }) => {
  const text = String(row.getValue('signedAt') ?? '').replace('T', ' ').slice(0, 16)
        return <span className="tabular-nums">{text || '-'}</span>
        }
      },
      {
        accessorKey: 'remark',
        header: ({ column }) => <DataTableColumnHeader column={column} title="备注" />,
        enableSorting: false,
        cell: ({ row }) => {
  return <span className="text-muted-foreground block max-w-64 truncate">{row.getValue('remark') || '-'}</span>
        }
      },
      {
        id: 'actions',
        header: () => <div className="text-end">操作</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-end">
            {hasPermission('biz_order:update') && (
              <Button variant="ghost" size="icon" onClick={() => { setEditing(row.original); setFormOpen(true) }}>
                <Pencil className="size-4" />
                <span className="sr-only">编辑</span>
              </Button>
            )}
            {hasPermission('biz_order:delete') && (
              <Button variant="ghost" size="icon" onClick={() => setDeleting(row.original)}>
                <Trash2 className="text-destructive size-4" />
                <span className="sr-only">删除</span>
              </Button>
            )}
          </div>
        )
      }
    ],
    []
  )

  const { table, keyword, setKeyword, loading, booted, error, total, reload } = useServerTable({
    columns,
    query: fetchPage,
    getRowId: item => String(item.id)
  })

  const handleSubmit = (values: BizOrderWritePayload) => {
    const request = editing ? updateBizOrder(editing.id, values) : createBizOrder(values)
    request
      .then(() => {
        toast.success(editing ? '订单已更新' : '订单已创建')
        setFormOpen(false)
        reload()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '保存失败'))
  }

  const handleDelete = () => {
    if (!deleting) return
    deleteBizOrder(deleting.id)
      .then(() => {
        toast.success('已删除')
        reload()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '删除失败'))
    setDeleting(null)
  }

  const firstTextField = 'title'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">订单管理</h1>
          <p className="text-muted-foreground text-sm">共 {total >= 0 ? total : 0} 个订单</p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission('biz_order:add') && (
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus />
              新增订单
            </Button>
          )}
        </div>
      </div>

      {!booted ? (
        <Card>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-9 w-full max-w-md" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button variant="outline" onClick={reload}>
              重试
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full max-w-xs">
                <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
                <Input placeholder="搜索" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
              <RefreshButton onClick={() => void reload()} className="ms-auto" />
              <DataTableViewOptions table={table} columnLabels={columnLabels} />
            </div>

            <DataTable table={table} loading={loading} emptyText="没有匹配的订单" />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}

      {formOpen && (
        <BizOrderFormDrawer key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} bizOrder={editing} onSubmit={handleSubmit} />
      )}

      <ConfirmDialog
        confirmText="删除"
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        title="删除订单"
        description={<>即将删除订单「{String(deleting?.[firstTextField as keyof BizOrder] ?? deleting?.id)}」，该操作为软删除，可在数据库恢复。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
