import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { DeptFormDialog, type DeptFormValues } from './components/dept-form-dialog'
import { depts as mockDepts, type Dept } from './data/depts'

const columnLabels: Record<string, string> = {
  id: 'ID',
  name: '部门名称',
  leader: '负责人',
  sort: '排序'
}

export function DeptPage() {
  const [list, setList] = useState<Dept[]>(mockDepts)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Dept | null>(null)
  const [deleting, setDeleting] = useState<Dept | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (dept: Dept) => {
    setEditing(dept)
    setFormOpen(true)
  }

  const columns = useMemo<ColumnDef<Dept>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="部门名称" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>
      },
      {
        accessorKey: 'leader',
        header: ({ column }) => <DataTableColumnHeader column={column} title="负责人" />
      },
      {
        accessorKey: 'sort',
        header: ({ column }) => <DataTableColumnHeader column={column} title="排序" />
      },
      {
        id: 'actions',
        header: () => <div className="text-end">操作</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-end">
            <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}>
              <Pencil className="size-4" />
              <span className="sr-only">编辑</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleting(row.original)}>
              <Trash2 className="text-destructive size-4" />
              <span className="sr-only">删除</span>
            </Button>
          </div>
        )
      }
    ],
    []
  )

  const { table, keyword, setKeyword } = useDataTable({ data: list, columns })

  const handleSubmit = (values: DeptFormValues) => {
    if (editing) {
      setList(prev => prev.map(d => (d.id === editing.id ? { ...d, ...values } : d)))
      toast.success('部门已更新')
    } else {
      setList(prev => [{ ...values, id: prev.length ? Math.max(...prev.map(d => d.id)) + 1 : 1 }, ...prev])
      toast.success('部门已创建')
    }
    setFormOpen(false)
  }

  const handleDelete = () => {
    if (!deleting) return
    // 连同下级部门一起删除
    const ids = new Set<number>([deleting.id])
    let changed = true
    while (changed) {
      changed = false
      for (const d of list) {
        if (d.parentId != null && ids.has(d.parentId) && !ids.has(d.id)) {
          ids.add(d.id)
          changed = true
        }
      }
    }
    setList(prev => prev.filter(d => !ids.has(d.id)))
    toast.success(`已删除部门「${deleting.name}」${ids.size > 1 ? `及其 ${ids.size - 1} 个下级部门` : ''}`)
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">部门管理</h1>
          <p className="text-muted-foreground text-sm">共 {list.length} 个部门（mock 数据）</p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          新增部门
        </Button>
      </div>
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
              <Input placeholder="搜索部门 / 负责人" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
            </div>
            <DataTableViewOptions table={table} columnLabels={columnLabels} />
          </div>

          <DataTable table={table} emptyText="没有匹配的部门" />
          <DataTablePagination table={table} />
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除部门「{deleting?.name}」及其所有下级部门，该操作不可恢复。</>}
        onConfirm={handleDelete}
      />

      {formOpen && (
        <DeptFormDialog
          key={editing?.id ?? 'new'}
          open={formOpen}
          onOpenChange={setFormOpen}
          dept={editing}
          depts={list.filter(d => d.id !== editing?.id)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
