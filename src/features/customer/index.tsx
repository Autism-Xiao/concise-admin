import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { hasPermission } from '@/lib/auth'
import {
  createCustomer,
  deleteCustomer,
  fetchCustomers,
  updateCustomer,
  type Customer,
  type CustomerWritePayload
} from './api'
import { CustomerFormDrawer } from './components/customer-form-drawer'

const CustomerEnumLabels: Record<number, string> = {
  0: '普通',
  1: 'VIP'
}

const columnLabels: Record<string, string> = {
  name: '客户名称',
  contact: '联系人',
  phone: '电话',
  level: '级别',
  vip: '客户等级',
  remark: '备注',
  actions: '操作'
}

/** 客户管理（生成器产物：DataTable + 抽屉表单规约） */
export function CustomerPage() {
  const [list, setList] = useState<Customer[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState<Customer | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchCustomers({ pageSize: 500 })
      .then(res => setList(res.records ?? []))
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const customers = useMemo(() => list ?? [], [list])

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="客户名称" />,
        enableSorting: true,
        cell: ({ row }) => {
  return <span className="font-medium">{row.getValue('name') || '-'}</span>
        }
      },
      {
        accessorKey: 'contact',
        header: ({ column }) => <DataTableColumnHeader column={column} title="联系人" />,
        enableSorting: true,
        cell: ({ row }) => {
  return <span className="font-medium">{row.getValue('contact') || '-'}</span>
        }
      },
      {
        accessorKey: 'phone',
        header: ({ column }) => <DataTableColumnHeader column={column} title="电话" />,
        enableSorting: true,
        cell: ({ row }) => {
  return <span className="font-medium">{row.getValue('phone') || '-'}</span>
        }
      },
      {
        accessorKey: 'level',
        header: ({ column }) => <DataTableColumnHeader column={column} title="级别" />,
        enableSorting: true,
        cell: ({ row }) => {
  return <span className="tabular-nums">{row.getValue('level') ?? '-'}</span>
        }
      },
      {
        accessorKey: 'vip',
        header: ({ column }) => <DataTableColumnHeader column={column} title="客户等级" />,
        enableSorting: true,
        cell: ({ row }) => {
  const labels = CustomerEnumLabels
        return <span>{labels[row.getValue<number>('vip')] ?? '-'}</span>
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
            {hasPermission('customer:update') && (
              <Button variant="ghost" size="icon" onClick={() => { setEditing(row.original); setFormOpen(true) }}>
                <Pencil className="size-4" />
                <span className="sr-only">编辑</span>
              </Button>
            )}
            {hasPermission('customer:delete') && (
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

  const { table, keyword, setKeyword } = useDataTable({
    data: customers,
    columns,
    getRowId: item => String(item.id)
  })

  const handleSubmit = (values: CustomerWritePayload) => {
    const request = editing ? updateCustomer(editing.id, values) : createCustomer(values)
    request
      .then(() => {
        toast.success(editing ? '客户已更新' : '客户已创建')
        setFormOpen(false)
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '保存失败'))
  }

  const handleDelete = () => {
    if (!deleting) return
    deleteCustomer(deleting.id)
      .then(() => {
        toast.success('已删除')
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '删除失败'))
    setDeleting(null)
  }

  const firstTextField = 'name'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">客户管理</h1>
          <p className="text-muted-foreground text-sm">共 {customers.length} 个客户</p>
        </div>
        {hasPermission('customer:add') && (
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus />
            新增客户
          </Button>
        )}
      </div>

      {loading ? (
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
            <Button variant="outline" onClick={load}>
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
              <DataTableViewOptions table={table} columnLabels={columnLabels} />
            </div>

            <DataTable table={table} emptyText="没有匹配的客户" />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}

      {formOpen && (
        <CustomerFormDrawer key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} customer={editing} onSubmit={handleSubmit} />
      )}

      <ConfirmDialog
        confirmText="删除"
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        title="删除客户"
        description={<>即将删除客户「{String(deleting?.[firstTextField as keyof Customer] ?? deleting?.id)}」，该操作为软删除，可在数据库恢复。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
