import { useEffect, useMemo, useState } from 'react'
import { Download, FolderPlus, LayoutGrid, List, MoreHorizontal, Search, Star, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { cn } from '@/lib/utils'
import { FileIcon } from './components/file-icon'
import { NewFolderDialog } from './components/new-folder-dialog'
import { QuickAccessCard, type QuickFilter } from './components/quick-access-card'
import { RecentFilesCard } from './components/recent-files-card'
import { StorageCard } from './components/storage-card'
import { fetchFiles, fetchStorage, formatRelativeTime, formatSize, saveFiles, type FileItem, type StorageInfo } from './api'
import { withOperationLog } from '@/features/system/log/api'

/** 所有者头像底色（按名字取模） */
const avatarColors = ['bg-blue-500', 'bg-emerald-600', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-cyan-600']

function OwnerAvatar({ name }: { name: string }) {
  if (!name) return null
  const color = avatarColors[name.charCodeAt(0) % avatarColors.length]
  return (
    <span className="flex items-center gap-2">
      <Avatar className="size-6">
        <AvatarFallback className={cn('text-[10px] text-white', color)}>{name.slice(0, 1)}</AvatarFallback>
      </Avatar>
      <span className="text-sm">{name}</span>
    </span>
  )
}

export function FilePage() {
  const [list, setList] = useState<FileItem[] | null>(null)
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter | null>(null)
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [folderOpen, setFolderOpen] = useState(false)
  const [deleting, setDeleting] = useState<FileItem | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    Promise.all([fetchFiles(), fetchStorage()])
      .then(([files, s]) => {
        setList(files)
        setStorage(s)
      })
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const files = useMemo(() => list ?? [], [list])

  /** 快速访问计数 */
  const counts = useMemo<Record<QuickFilter, number>>(
    () => ({
      recent: files.filter(f => f.type === 'file').length,
      starred: files.filter(f => f.starred).length,
      shared: files.filter(f => f.shared).length,
      folders: files.filter(f => f.type === 'folder').length
    }),
    [files]
  )

  /** 关键词 + 快速访问过滤；默认文件夹在前，其余按修改时间倒序 */
  const visible = useMemo(() => {
    let result = files.filter(f => f.name.toLowerCase().includes(keyword.trim().toLowerCase()))
    if (quickFilter === 'starred') result = result.filter(f => f.starred)
    if (quickFilter === 'shared') result = result.filter(f => f.shared)
    if (quickFilter === 'folders') result = result.filter(f => f.type === 'folder')
    return result.sort((a, b) => {
      if (quickFilter === 'recent') return b.modifiedAt.localeCompare(a.modifiedAt)
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      return b.modifiedAt.localeCompare(a.modifiedAt)
    })
  }, [files, keyword, quickFilter])

  const allVisibleSelected = visible.length > 0 && visible.every(f => selected.has(f.id))

  const toggleAll = () => {
    setSelected(allVisibleSelected ? new Set() : new Set(visible.map(f => f.id)))
  }

  const toggleOne = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /** 乐观更新 + 写回 files.json，失败回退重新加载；操作记入操作日志 */
  const persist = (next: FileItem[], successMsg: string) => {
    setList(next)
    setSelected(prev => {
      const ids = new Set(next.map(f => f.id))
      return new Set([...prev].filter(id => ids.has(id)))
    })
    withOperationLog(successMsg, () => saveFiles(next))
      .then(() => toast.success(successMsg))
      .catch(() => {
        toast.error('写入 files.json 失败，已重新加载')
        load()
      })
  }

  const nextId = () => (files.length ? Math.max(...files.map(f => f.id)) + 1 : 1)

  const handleUpload = () => {
    const name = `未命名文件 ${counts.recent + 1}.txt`
    persist(
      [
        { id: nextId(), name, type: 'file', ext: 'txt', size: 1024, owner: '我', starred: false, shared: false, modifiedAt: new Date().toISOString() },
        ...files
      ],
      `已上传「${name}」（mock）`
    )
  }

  const handleNewFolder = (name: string) => {
    persist(
      [{ id: nextId(), name, type: 'folder', ext: null, size: null, owner: '', starred: false, shared: false, modifiedAt: new Date().toISOString() }, ...files],
      `已新建文件夹「${name}」`
    )
    setFolderOpen(false)
  }

  const toggleStar = (file: FileItem) => {
    persist(
      files.map(f => (f.id === file.id ? { ...f, starred: !f.starred } : f)),
      file.starred ? `已取消星标「${file.name}」` : `已星标「${file.name}」`
    )
  }

  const handleDelete = () => {
    if (!deleting) return
    persist(
      files.filter(f => f.id !== deleting.id),
      `已删除「${deleting.name}」`
    )
    setDeleting(null)
  }

  const handleBatchDelete = () => {
    persist(
      files.filter(f => !selected.has(f.id)),
      `已删除 ${selected.size} 个项目`
    )
  }

  /** 行内操作（列表 / 网格共用） */
  const renderActions = (file: FileItem) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">操作</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => toggleStar(file)}>
          <Star className={cn(file.starred && 'fill-amber-400 text-amber-400')} />
          {file.starred ? '取消星标' : '星标'}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={file.type === 'folder'} onClick={() => toast.success(`开始下载「${file.name}」（mock）`)}>
          <Download />
          下载
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => setDeleting(file)}>
          <Trash2 />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const renderName = (file: FileItem) => (
    <span className="flex min-w-0 items-center gap-2.5">
      <FileIcon item={file} className="size-5 shrink-0" />
      <span className="truncate font-medium">{file.name}</span>
      {file.starred && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />}
      {file.shared && <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-[10px] leading-none">已共享</span>}
    </span>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">文件管理</h1>
          <p className="text-muted-foreground text-sm">管理和组织您的文件和文件夹</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleUpload}>
            <Upload />
            上传
          </Button>
          <Button onClick={() => setFolderOpen(true)}>
            <FolderPlus />
            新建文件夹
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
        <Input placeholder="搜索文件和文件夹…" className="ps-9" value={keyword} onChange={e => setKeyword(e.target.value)} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-6">
          <StorageCard storage={storage} />
          <QuickAccessCard counts={counts} active={quickFilter} onSelect={setQuickFilter} />
          <RecentFilesCard files={files} onViewAll={() => setQuickFilter('recent')} />
        </div>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <h2 className="shrink-0 text-base font-semibold">
                  {quickFilter === 'starred'
                    ? '星标文件'
                    : quickFilter === 'shared'
                      ? '共享文件'
                      : quickFilter === 'folders'
                        ? '全部文件夹'
                        : quickFilter === 'recent'
                          ? '最近文件'
                          : '所有文件'}
                </h2>
                {selected.size > 0 && (
                  <span className="text-muted-foreground flex items-center gap-2 text-sm">
                    已选 {selected.size} 项
                    <Button variant="destructive" size="sm" className="h-7" onClick={handleBatchDelete}>
                      <Trash2 />
                      删除
                    </Button>
                  </span>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" className="size-8" onClick={() => setView('list')}>
                  <List className="size-4" />
                  <span className="sr-only">列表视图</span>
                </Button>
                <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" className="size-8" onClick={() => setView('grid')}>
                  <LayoutGrid className="size-4" />
                  <span className="sr-only">网格视图</span>
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <p className="text-muted-foreground text-sm">{error}</p>
                <Button variant="outline" onClick={load}>
                  重试
                </Button>
              </div>
            ) : visible.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center text-sm">没有匹配的文件</p>
            ) : view === 'list' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <input
                        type="checkbox"
                        className="accent-primary size-4 align-middle"
                        checked={allVisibleSelected}
                        onChange={toggleAll}
                        aria-label="全选"
                      />
                    </TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead className="hidden md:table-cell">所有者</TableHead>
                    <TableHead className="hidden sm:table-cell">修改时间</TableHead>
                    <TableHead className="hidden sm:table-cell">大小</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map(file => (
                    <TableRow key={file.id} data-state={selected.has(file.id) ? 'selected' : undefined}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="accent-primary size-4 align-middle"
                          checked={selected.has(file.id)}
                          onChange={() => toggleOne(file.id)}
                          aria-label={`选择 ${file.name}`}
                        />
                      </TableCell>
                      <TableCell>{renderName(file)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <OwnerAvatar name={file.owner} />
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden tabular-nums sm:table-cell">{formatRelativeTime(file.modifiedAt)}</TableCell>
                      <TableCell className="text-muted-foreground hidden tabular-nums sm:table-cell">{formatSize(file.size)}</TableCell>
                      <TableCell>{renderActions(file)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {visible.map(file => (
                  <div
                    key={file.id}
                    className={cn(
                      'group hover:bg-accent/50 relative flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors',
                      selected.has(file.id) && 'border-primary bg-accent/50'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="accent-primary absolute start-2 top-2 size-4"
                      checked={selected.has(file.id)}
                      onChange={() => toggleOne(file.id)}
                      aria-label={`选择 ${file.name}`}
                    />
                    <div className="absolute end-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">{renderActions(file)}</div>
                    <FileIcon item={file} className="size-10" />
                    <div className="w-full">
                      <p className="flex items-center justify-center gap-1 text-sm font-medium">
                        <span className="truncate">{file.name}</span>
                        {file.starred && <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                        {formatSize(file.size)} · {formatRelativeTime(file.modifiedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {folderOpen && <NewFolderDialog open={folderOpen} onOpenChange={setFolderOpen} onSubmit={handleNewFolder} />}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除「{deleting?.name}」，该操作不可恢复。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
