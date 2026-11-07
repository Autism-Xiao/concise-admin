import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  ChevronRight,
  Download,
  FolderPlus,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Upload
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { hasPermission } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { FileIcon } from './components/file-icon'
import { NameDialog } from './components/name-dialog'
import { QuickAccessCard, type FileView } from './components/quick-access-card'
import { RecentFilesCard } from './components/recent-files-card'
import { StorageCard } from './components/storage-card'
import {
  batchDeleteFiles,
  createFolder,
  deleteFile,
  downloadFile,
  fetchBreadcrumb,
  fetchFileStats,
  fetchFiles,
  fetchRecentFiles,
  formatRelativeTime,
  formatSize,
  updateFile,
  uploadFile,
  type BreadcrumbItem,
  type FileNode,
  type FileStats
} from './api'

/** 每页条数（与后端默认一致） */
const PAGE_SIZE = 20

type DialogState = { type: 'folder' } | { type: 'rename'; node: FileNode } | null

/**
 * 文件管理（个人空间）
 *
 * 数据全部来自 /api/v1/files：目录树只存数据库（parent_id），
 * 物理文件按 sha256 内容寻址存在服务端 storage/files，改名/移动不动物理文件。
 * 本页支持：逐层进入目录、面包屑回退、上传（点击 + 拖拽，带进度）、新建文件夹、
 * 重命名、星标、下载、软删（进回收站）、批量删除。
 */
export function FilePage() {
  const [view, setView] = useState<FileView>('browse')
  const [folderId, setFolderId] = useState(0)
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: 0, name: '全部文件' }])
  const [records, setRecords] = useState<FileNode[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [pageIndex, setPageIndex] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [stats, setStats] = useState<FileStats | null>(null)
  const [recent, setRecent] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'list' | 'grid'>('list')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [uploading, setUploading] = useState<{ name: string; percent: number; index: number; total: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [deleting, setDeleting] = useState<FileNode | null>(null)
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [busy, setBusy] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (view === 'recent') {
        const rows = await fetchRecentFiles(50)
        setRecords(rows)
        setTotal(rows.length)
        setPages(1)
      } else {
        const res = await fetchFiles({
          parentId: folderId,
          keyword: debouncedKeyword,
          starred: view === 'starred',
          page: pageIndex,
          pageSize: PAGE_SIZE
        })
        setRecords(res.records)
        setTotal(res.total)
        setPages(Math.max(res.pages, 1))
      }
      const [nextStats, crumbs, recentRows] = await Promise.all([
        fetchFileStats().catch(() => null),
        view === 'browse'
          ? fetchBreadcrumb(folderId).catch(() => [{ id: 0, name: '全部文件' }])
          : Promise.resolve([{ id: 0, name: view === 'starred' ? '星标文件' : '最近文件' }]),
        fetchRecentFiles(4).catch(() => [])
      ])
      setStats(nextStats)
      setBreadcrumb(crumbs)
      setRecent(recentRows)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [view, folderId, debouncedKeyword, pageIndex])

  useEffect(() => {
    void load()
  }, [load])

  // 搜索防抖：输入停止 300ms 才发请求，并把页码重置回第一页
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword)
      setPageIndex(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [keyword])

  const enterFolder = (node: FileNode) => {
    if (!node.isFolder) return
    setFolderId(node.id)
    setView('browse')
    setPageIndex(1)
    setSelected(new Set())
    setKeyword('')
  }

  const gotoFolder = (id: number) => {
    setFolderId(id)
    setView('browse')
    setPageIndex(1)
    setSelected(new Set())
  }

  const switchView = (next: FileView) => {
    setView(next)
    setPageIndex(1)
    setSelected(new Set())
  }

  const toggleOne = (id: number) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const allSelected = records.length > 0 && records.every(node => selected.has(node.id))
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(records.map(node => node.id)))

  /** 上传：串行执行以便展示单个文件的百分比；同名统一走 rename（保留两份，不静默覆盖） */
  const handleUpload = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    if (!files.length || uploading) return
    let success = 0
    const failures: string[] = []
    for (let index = 0; index < files.length; index++) {
      const file = files[index]
      setUploading({ name: file.name, percent: 0, index: index + 1, total: files.length })
      try {
        const result = await uploadFile(file, {
          parentId: view === 'browse' ? folderId : 0,
          onConflict: 'rename',
          onProgress: percent => setUploading(prev => (prev ? { ...prev, percent } : prev))
        })
        success += 1
        if (result.skipped) toast.info(result.message)
      } catch (e) {
        failures.push(`${file.name}：${e instanceof Error ? e.message : '上传失败'}`)
      }
    }
    setUploading(null)
    if (success) toast.success(`已上传 ${success} 个文件${failures.length ? `，${failures.length} 个失败` : ''}`)
    failures.slice(0, 3).forEach(message => toast.error(message))
    await load()
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
    if (event.dataTransfer.files?.length) void handleUpload(event.dataTransfer.files)
  }

  const handleCreateFolder = async (name: string) => {
    if (busy) return
    setBusy(true)
    try {
      await createFolder(view === 'browse' ? folderId : 0, name)
      toast.success(`已新建文件夹「${name}」`)
      setDialog(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '新建失败')
    } finally {
      setBusy(false)
    }
  }

  const handleRename = async (node: FileNode, name: string) => {
    if (busy) return
    if (name === node.name) {
      setDialog(null)
      return
    }
    setBusy(true)
    try {
      await updateFile(node.id, { name })
      toast.success(`已重命名为「${name}」`)
      setDialog(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '重命名失败')
    } finally {
      setBusy(false)
    }
  }

  const toggleStar = async (node: FileNode) => {
    try {
      await updateFile(node.id, { starred: !node.starred })
      toast.success(node.starred ? `已取消星标「${node.name}」` : `已星标「${node.name}」`)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败')
    }
  }

  const handleDownload = async (node: FileNode) => {
    try {
      await downloadFile(node)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '下载失败')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    const target = deleting
    setDeleting(null)
    try {
      await deleteFile(target.id)
      toast.success(`已删除「${target.name}」，可在回收站恢复`)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  const handleBatchDelete = async () => {
    if (!selected.size) return
    const ids = [...selected]
    try {
      const result = await batchDeleteFiles(ids)
      toast.success(`已删除 ${result.deleted} 项，可在回收站恢复`)
      setBatchDeleting(false)
      setSelected(new Set())
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '批量删除失败')
    }
  }

  const title = view === 'starred' ? '星标文件' : view === 'recent' ? '最近文件' : '全部文件'
  const canUpload = hasPermission('system:file:upload')
  const canCreate = hasPermission('system:file:add')
  const canUpdate = hasPermission('system:file:update')
  const canDelete = hasPermission('system:file:delete')
  const canDownload = hasPermission('system:file:download')

  /** 行内操作（列表 / 网格共用） */
  const renderActions = (node: FileNode) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">操作</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {node.isFolder ? (
          <DropdownMenuItem onClick={() => enterFolder(node)}>
            <ChevronRight />
            打开
          </DropdownMenuItem>
        ) : (
          canDownload && (
            <DropdownMenuItem onClick={() => void handleDownload(node)}>
              <Download />
              下载
            </DropdownMenuItem>
          )
        )}
        {canUpdate && (
          <DropdownMenuItem onClick={() => void toggleStar(node)}>
            <Star className={cn(node.starred && 'fill-amber-400 text-amber-400')} />
            {node.starred ? '取消星标' : '星标'}
          </DropdownMenuItem>
        )}
        {canUpdate && (
          <DropdownMenuItem onClick={() => setDialog({ type: 'rename', node })}>
            <Pencil />
            重命名
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(node)}>
              <Trash2 />
              删除
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const renderName = (node: FileNode) => (
    <button type="button" className="flex min-w-0 items-center gap-2.5 text-left" onDoubleClick={() => enterFolder(node)} onClick={() => enterFolder(node)}>
      <FileIcon item={node} className="size-5 shrink-0" />
      <span className={cn('truncate font-medium', node.isFolder && 'hover:underline')}>{node.name}</span>
      {node.starred && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />}
    </button>
  )

  const emptyText = useMemo(() => {
    if (debouncedKeyword) return `没有找到包含「${debouncedKeyword}」的文件`
    if (view === 'starred') return '还没有星标文件，在文件操作里点「星标」即可收藏'
    if (view === 'recent') return '还没有上传过文件'
    return '这个文件夹是空的，可以点右上角「上传」或直接把文件拖进来'
  }, [debouncedKeyword, view])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">文件管理</h1>
          <p className="text-muted-foreground text-sm">
            {stats ? `共 ${stats.fileCount} 个文件、${stats.folderCount} 个文件夹，已用 ${formatSize(stats.totalBytes)}` : '正在统计存储用量…'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={event => {
                  if (event.target.files?.length) void handleUpload(event.target.files)
                  event.target.value = ''
                }}
              />
              <Button variant="outline" disabled={!!uploading} onClick={() => fileInputRef.current?.click()}>
                <Upload />
                上传
              </Button>
            </>
          )}
          {canCreate && (
            <Button onClick={() => setDialog({ type: 'folder' })}>
              <FolderPlus />
              新建文件夹
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder={view === 'browse' ? '在当前文件夹中搜索…' : '在这份列表里搜索…'}
          className="ps-9"
          value={keyword}
          onChange={event => setKeyword(event.target.value)}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-6">
          <StorageCard storage={stats} />
          <QuickAccessCard view={view} fileCount={stats?.fileCount ?? 0} onSelect={switchView} />
          <RecentFilesCard
            files={recent}
            onViewAll={() => switchView('recent')}
            onOpen={file => {
              if (file.isFolder) enterFolder(file)
              else void handleDownload(file)
            }}
          />
        </div>

        <Card
          onDragOver={event => {
            event.preventDefault()
            if (!dragOver) setDragOver(true)
          }}
          onDragLeave={event => {
            if (event.currentTarget.contains(event.relatedTarget as Node)) return
            setDragOver(false)
          }}
          onDrop={handleDrop}
          className={cn(dragOver && 'ring-primary ring-2 ring-offset-2')}
        >
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {view === 'browse' ? (
                  <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
                    {breadcrumb.map((item, index) => (
                      <Fragment key={`${item.id}-${index}`}>
                        {index > 0 && <ChevronRight className="text-muted-foreground size-3.5" />}
                        <button
                          type="button"
                          onClick={() => gotoFolder(item.id)}
                          className={cn(
                            'truncate rounded px-1 hover:underline',
                            index === breadcrumb.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground'
                          )}
                        >
                          {item.name}
                        </button>
                      </Fragment>
                    ))}
                  </nav>
                ) : (
                  <h2 className="text-base font-semibold">{title}</h2>
                )}
                {selected.size > 0 && (
                  <span className="text-muted-foreground flex items-center gap-2 text-sm">
                    已选 {selected.size} 项
                    {canDelete && (
                      <Button variant="destructive" size="sm" className="h-7" onClick={() => setBatchDeleting(true)}>
                        <Trash2 />
                        删除
                      </Button>
                    )}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" className="size-8" onClick={() => void load()} disabled={loading}>
                  <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
                  <span className="sr-only">刷新</span>
                </Button>
                <Button variant={mode === 'list' ? 'secondary' : 'ghost'} size="icon" className="size-8" onClick={() => setMode('list')}>
                  <List className="size-4" />
                  <span className="sr-only">列表视图</span>
                </Button>
                <Button variant={mode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="size-8" onClick={() => setMode('grid')}>
                  <LayoutGrid className="size-4" />
                  <span className="sr-only">网格视图</span>
                </Button>
              </div>
            </div>

            {uploading && (
              <div className="bg-muted/50 flex items-center gap-3 rounded-md px-3 py-2 text-sm">
                <Loader2 className="size-4 shrink-0 animate-spin" />
                <span className="min-w-0 flex-1 truncate">
                  正在上传 {uploading.index}/{uploading.total}：{uploading.name}
                </span>
                <span className="text-muted-foreground tabular-nums">{uploading.percent}%</span>
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <p className="text-muted-foreground text-sm">{error}</p>
                <Button variant="outline" onClick={() => void load()}>
                  重试
                </Button>
              </div>
            ) : records.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center text-sm">{emptyText}</p>
            ) : mode === 'list' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <input
                        type="checkbox"
                        className="accent-primary size-4 align-middle"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="全选"
                      />
                    </TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead className="hidden md:table-cell">类型</TableHead>
                    <TableHead className="hidden sm:table-cell">修改时间</TableHead>
                    <TableHead className="hidden sm:table-cell">大小</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map(node => (
                    <TableRow key={node.id} data-state={selected.has(node.id) ? 'selected' : undefined}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="accent-primary size-4 align-middle"
                          checked={selected.has(node.id)}
                          onChange={() => toggleOne(node.id)}
                          aria-label={`选择 ${node.name}`}
                        />
                      </TableCell>
                      <TableCell>{renderName(node)}</TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">
                        <span className="text-xs">{node.isFolder ? '文件夹' : (node.ext || '未知').toUpperCase()}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden tabular-nums sm:table-cell">{formatRelativeTime(node.updateTime)}</TableCell>
                      <TableCell className="text-muted-foreground hidden tabular-nums sm:table-cell">
                        {node.isFolder ? '-' : formatSize(node.size)}
                      </TableCell>
                      <TableCell>{renderActions(node)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {records.map(node => (
                  <div
                    key={node.id}
                    className={cn(
                      'group hover:bg-accent/50 relative flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors',
                      selected.has(node.id) && 'border-primary bg-accent/50'
                    )}
                    onDoubleClick={() => enterFolder(node)}
                  >
                    <input
                      type="checkbox"
                      className="accent-primary absolute start-2 top-2 size-4"
                      checked={selected.has(node.id)}
                      onChange={() => toggleOne(node.id)}
                      aria-label={`选择 ${node.name}`}
                    />
                    <div className="absolute end-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">{renderActions(node)}</div>
                    <button type="button" onClick={() => enterFolder(node)} className="flex flex-col items-center gap-2">
                      <FileIcon item={node} className="size-10" />
                      <div className="w-full">
                        <p className="flex items-center justify-center gap-1 text-sm font-medium">
                          <span className="truncate">{node.name}</span>
                          {node.starred && <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                          {node.isFolder ? '文件夹' : formatSize(node.size)} · {formatRelativeTime(node.updateTime)}
                        </p>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && total > PAGE_SIZE && (
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">共 {total} 项</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={pageIndex <= 1} onClick={() => setPageIndex(index => index - 1)}>
                    上一页
                  </Button>
                  <span className="text-muted-foreground tabular-nums">
                    {pageIndex} / {pages}
                  </span>
                  <Button variant="outline" size="sm" disabled={pageIndex >= pages} onClick={() => setPageIndex(index => index + 1)}>
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {dialog?.type === 'folder' && (
        <NameDialog
          key="new-folder"
          open
          onOpenChange={open => !open && setDialog(null)}
          title="新建文件夹"
          description={view === 'browse' ? '将在当前文件夹下创建' : '将在根目录创建'}
          placeholder="未命名文件夹"
          submitText="创建"
          onSubmit={name => void handleCreateFolder(name)}
        />
      )}

      {dialog?.type === 'rename' && (
        <NameDialog
          key={`rename-${dialog.node.id}`}
          open
          onOpenChange={open => !open && setDialog(null)}
          title="重命名"
          description="文件扩展名会随之更新"
          defaultName={dialog.node.name}
          submitText="保存"
          onSubmit={name => void handleRename(dialog.node, name)}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={open => !open && setDeleting(null)}
        description={
          <>
            即将删除「{deleting?.name}」{deleting?.isFolder ? '及其全部内容' : ''}。删除后进入回收站，可再恢复。
          </>
        }
        onConfirm={handleDelete}
      />

      <ConfirmDeleteDialog
        open={batchDeleting}
        onOpenChange={setBatchDeleting}
        title="批量删除"
        description={<>即将删除勾选的 {selected.size} 项（文件夹会连同内容一起删除）。删除后进入回收站，可再恢复。</>}
        onConfirm={handleBatchDelete}
      />
    </div>
  )
}
