import { useEffect, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { downloadFile, fetchPreviewBlob, formatSize, type FileNode } from '../api'

interface PreviewDialogProps {
  /** 为 null 表示关闭 */
  node: FileNode | null
  onClose: () => void
}

type PreviewState =
  | { status: 'loading' }
  | { status: 'image'; url: string }
  | { status: 'pdf'; url: string }
  | { status: 'text'; content: string; truncated: boolean }
  | { status: 'error'; message: string }

/** 文本预览上限：几十 MB 的日志整段塞进 DOM 会把页面卡死 */
const TEXT_LIMIT = 200 * 1024

/**
 * 在线预览弹窗
 *
 * 图片 / PDF / 纯文本由后端 `/:id/preview` 放行，其余类型后端会 400，
 * 这里原样把提示显示出来并引导下载（不做「假装能预览」的降级）。
 * blob 用 objectURL 渲染，关闭时立刻 revoke，避免内存常驻。
 */
export function PreviewDialog({ node, onClose }: PreviewDialogProps) {
  const [state, setState] = useState<PreviewState>({ status: 'loading' })

  useEffect(() => {
    if (!node) return
    let cancelled = false
    let objectUrl: string | null = null
    setState({ status: 'loading' })

    void (async () => {
      try {
        const { blob, mime } = await fetchPreviewBlob(node)
        if (cancelled) return

        if (mime.startsWith('image/')) {
          objectUrl = URL.createObjectURL(blob)
          setState({ status: 'image', url: objectUrl })
          return
        }
        if (mime.startsWith('application/pdf')) {
          objectUrl = URL.createObjectURL(blob)
          setState({ status: 'pdf', url: objectUrl })
          return
        }

        const truncated = blob.size > TEXT_LIMIT
        const content = await blob.slice(0, TEXT_LIMIT).text()
        if (cancelled) return
        setState({ status: 'text', content, truncated })
      } catch (error) {
        if (cancelled) return
        setState({ status: 'error', message: error instanceof Error ? error.message : '无法预览该文件' })
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [node])

  return (
    <Dialog open={!!node} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate pe-6">{node?.name ?? '预览'}</DialogTitle>
          <DialogDescription>{node ? `${node.ext ? node.ext.toUpperCase() : '未知类型'} · ${formatSize(node.size)}` : ''}</DialogDescription>
        </DialogHeader>

        <div className="bg-muted/40 flex min-h-80 items-center justify-center overflow-auto rounded-md border">
          {state.status === 'loading' && <Loader2 className="text-muted-foreground size-6 animate-spin" />}
          {state.status === 'image' && <img src={state.url} alt={node?.name} className="max-h-[70vh] max-w-full object-contain" />}
          {state.status === 'pdf' && <iframe src={state.url} title={node?.name ?? 'PDF'} className="h-[70vh] w-full" />}
          {state.status === 'text' && (
            <pre className="max-h-[70vh] w-full overflow-auto p-4 text-xs leading-relaxed whitespace-pre-wrap">
              {state.content}
              {state.truncated ? '\n\n……（内容较长，仅展示前 200 KB，完整内容请下载）' : ''}
            </pre>
          )}
          {state.status === 'error' && <p className="text-muted-foreground p-8 text-center text-sm">{state.message}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
          {node && (
            <Button onClick={() => void downloadFile(node)}>
              <Download />
              下载
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
