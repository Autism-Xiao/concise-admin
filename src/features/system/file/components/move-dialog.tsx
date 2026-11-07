import { useEffect, useState } from 'react'
import { ChevronRight, FolderClosed, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { fetchBreadcrumb, fetchFiles, type BreadcrumbItem, type FileNode } from '../api'

interface MoveDialogProps {
  /** 要移动的文件/文件夹；null 表示关闭 */
  node: FileNode | null
  busy?: boolean
  onClose: () => void
  onConfirm: (targetId: number) => void
}

const ROOT: BreadcrumbItem = { id: 0, name: '全部文件' }

/**
 * 「移动到…」目录选择器
 *
 * 逐层下钻而不是一次拉全树：文件多的人可能上千个目录，全树既慢又难选。
 * 当前目录下的文件夹列表里会剔掉「被移动的文件夹自己」——
 * 更深的成环（移到自己子孙里）前端很难静态判断，交给后端 `isDescendant` 拦。
 */
export function MoveDialog({ node, busy, onClose, onConfirm }: MoveDialogProps) {
  const [currentId, setCurrentId] = useState(0)
  const [trail, setTrail] = useState<BreadcrumbItem[]>([ROOT])
  const [folders, setFolders] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 每次重新打开都回到根目录
  useEffect(() => {
    if (!node) return
    setCurrentId(0)
    setTrail([ROOT])
  }, [node])

  useEffect(() => {
    if (!node) return
    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const [page, crumbs] = await Promise.all([
          fetchFiles({ parentId: currentId, pageSize: 100 }),
          fetchBreadcrumb(currentId).catch(() => [ROOT])
        ])
        if (cancelled) return
        setFolders(page.records.filter(item => item.isFolder && item.id !== node.id))
        setTrail(crumbs)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '目录加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [node, currentId])

  const alreadyHere = !!node && currentId === node.parentId

  return (
    <Dialog open={!!node} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>移动到</DialogTitle>
          <DialogDescription>选择目标文件夹：「{node?.name ?? ''}」将移动到这里</DialogDescription>
        </DialogHeader>

        <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          {trail.map((item, index) => (
            <span key={`${item.id}-${index}`} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="text-muted-foreground size-3.5" />}
              <button
                type="button"
                onClick={() => setCurrentId(item.id)}
                className={cn(
                  'max-w-[10rem] truncate rounded px-1 hover:underline',
                  index === trail.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {item.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="h-64 overflow-y-auto rounded-md border">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : error ? (
            <p className="text-muted-foreground p-4 text-sm">{error}</p>
          ) : folders.length === 0 ? (
            <p className="text-muted-foreground flex h-full items-center justify-center p-4 text-sm">这里没有子文件夹，可以「移到这里」</p>
          ) : (
            <ul className="p-1">
              {folders.map(item => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setCurrentId(item.id)}
                    className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm"
                  >
                    <FolderClosed className="size-4 shrink-0 text-amber-500" />
                    <span className="truncate">{item.name}</span>
                    <ChevronRight className="text-muted-foreground ms-auto size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button disabled={busy || alreadyHere} onClick={() => onConfirm(currentId)}>
            {alreadyHere ? '已在该目录' : '移到这里'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
