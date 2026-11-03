import { useMemo, useState } from 'react'
import { Download, FileArchive, FileText, FileSpreadsheet, Film, Folder, Image, Search, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { files as mockFiles, formatSize, type FileItem, type FileType } from './data/files'

const typeMeta: Record<FileType, { label: string; icon: typeof Folder }> = {
  folder: { label: '文件夹', icon: Folder },
  document: { label: '文档', icon: FileText },
  image: { label: '图片', icon: Image },
  spreadsheet: { label: '表格', icon: FileSpreadsheet },
  archive: { label: '压缩包', icon: FileArchive },
  video: { label: '视频', icon: Film }
}

const columnLabels: Record<string, string> = {
  id: 'ID',
  name: '名称',
  type: '类型',
  size: '大小',
  owner: '所有者',
  modifiedAt: '修改时间'
}

export function FilePage() {
  const [list, setList] = useState<FileItem[]>(mockFiles)
  const [typeFilter, setTypeFilter] = useState('all')
  const [deleting, setDeleting] = useState<FileItem | null>(null)

  const columns = useMemo<ColumnDef<FileItem>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="名称" />,
        cell: ({ row }) => {
          const Icon = typeMeta[row.original.type].icon
          return (
            <span className="flex items-center gap-2 font-medium">
              <Icon className="text-muted-foreground size-4 shrink-0" />
              {row.getValue('name')}
            </span>
          )
        }
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="类型" />,
        cell: ({ row }) => typeMeta[row.getValue<FileType>('type')].label,
        filterFn: (row, id, value) => row.getValue(id) === value
      },
      {
        accessorKey: 'size',
        header: ({ column }) => <DataTableColumnHeader column={column} title="大小" />,
        cell: ({ row }) => <span className="tabular-nums">{formatSize(row.original.size)}</span>
      },
      {
        accessorKey: 'owner',
        header: ({ column }) => <DataTableColumnHeader column={column} title="所有者" />
      },
      {
        accessorKey: 'modifiedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="修改时间" />,
        cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.getValue('modifiedAt')}</span>
      },
      {
        id: 'actions',
        header: () => <div className="text-end">操作</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-end">
            <Button
              variant="ghost"
              size="icon"
              disabled={row.original.type === 'folder'}
              onClick={() => toast.success(`开始下载「${row.original.name}」（mock）`)}
            >
              <Download className="size-4" />
              <span className="sr-only">下载</span>
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

  const columnFilters = useMemo(() => (typeFilter === 'all' ? [] : [{ id: 'type', value: typeFilter }]), [typeFilter])
  const typeItems = useMemo(() => ({ all: '全部类型', ...Object.fromEntries(Object.entries(typeMeta).map(([value, { label }]) => [value, label])) }), [])
  const { table, keyword, setKeyword } = useDataTable({ data: list, columns, columnFilters })

  const handleUpload = () => {
    const name = `未命名文件 ${list.length + 1}.txt`
    setList(prev => [
      {
        id: prev.length ? Math.max(...prev.map(f => f.id)) + 1 : 1,
        name,
        type: 'document',
        size: 1024,
        owner: '我',
        modifiedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
      },
      ...prev
    ])
    toast.success(`已上传「${name}」（mock）`)
  }

  const handleDelete = () => {
    if (!deleting) return
    setList(prev => prev.filter(f => f.id !== deleting.id))
    toast.success(`已删除「${deleting.name}」`)
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">文件管理</h1>
          <p className="text-muted-foreground text-sm">共 {list.length} 个文件 / 文件夹（mock 数据）</p>
        </div>
        <Button onClick={handleUpload}>
          <Upload />
          上传文件
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
              <Input placeholder="搜索文件名 / 所有者" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter} items={typeItems}>
              <SelectTrigger className="h-9 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {Object.entries(typeMeta).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DataTableViewOptions table={table} columnLabels={columnLabels} />
          </div>

          <DataTable table={table} emptyText="没有匹配的文件" />
          <DataTablePagination table={table} />
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除「{deleting?.name}」，该操作不可恢复。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
