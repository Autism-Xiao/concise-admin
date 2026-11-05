import { useRef, useState } from 'react'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { saveBlobFile } from '@/lib/download'
import { downloadNoticeTemplate, importNotices, type NoticeImportResult } from '../api'

interface NoticeImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 有任一行新增/更新成功时回调，父组件据此刷新列表 */
  onImported: () => void
}

/** 失败明细最多展示条数，避免几十行错误把弹窗撑爆 */
const MAX_ERROR_ROWS = 10

/** 公告导入弹窗：下载模板 → 选 Excel/CSV → 上传 → 展示逐行统计与失败原因 */
export function NoticeImportDialog({ open, onOpenChange, onImported }: NoticeImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [report, setReport] = useState<NoticeImportResult | null>(null)

  const reset = () => {
    setFile(null)
    setReport(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleClose = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleTemplate = () => {
    setDownloading(true)
    downloadNoticeTemplate()
      .then(({ filename, blob }) => saveBlobFile(filename, blob))
      .catch(e => toast.error(e instanceof Error ? e.message : '模板下载失败'))
      .finally(() => setDownloading(false))
  }

  const handleImport = () => {
    if (!file) {
      toast.error('请先选择文件')
      return
    }
    setImporting(true)
    setReport(null)
    importNotices(file)
      .then(result => {
        setReport(result)
        if (result.created || result.updated) {
          onImported()
        }
        if (result.failed === 0) {
          toast.success(`导入完成：新增 ${result.created} 条，更新 ${result.updated} 条`)
        } else {
          toast.warning(`导入完成，但有 ${result.failed} 行失败，请查看下方明细`)
        }
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '导入失败'))
      .finally(() => setImporting(false))
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>导入公告</DialogTitle>
          <DialogDescription>
            按「标题」判定：标题已存在则更新该条，不存在则新增。更新时只覆盖填了值的列，留空表示不改。状态填「已发布」会立即上线并记录发布人与发布时间。支持 .xlsx（推荐）与 .csv，单次最多 1000 行。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 覆盖提示：标题相同的公告会被直接改写，误填模板示例标题会污染线上公告 */}
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            已存在的「标题」会被<b className="font-medium">覆盖</b>（含内容、状态、生效时间与通告对象）。请先删掉模板里的示例行，并核对标题是否与线上公告重名。
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleTemplate} disabled={downloading}>
              <Download className="size-4" />
              {downloading ? '下载中…' : '下载模板'}
            </Button>
            <span className="text-muted-foreground text-xs">模板含填写说明与示例，必填列带 *</span>
          </div>

          <div className="rounded-md border border-dashed p-4">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onChange={e => {
                setFile(e.target.files?.[0] ?? null)
                setReport(null)
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileSpreadsheet className="text-muted-foreground size-4 shrink-0" />
                <span className="truncate text-sm">{file ? file.name : '未选择文件'}</span>
                {file && <span className="text-muted-foreground shrink-0 text-xs">{(file.size / 1024).toFixed(1)} KB</span>}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={importing}>
                <Upload className="size-4" />
                选择文件
              </Button>
            </div>
          </div>

          {report && (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>共 {report.total} 行</span>
                <span className="text-emerald-600">新增 {report.created}</span>
                <span className="text-sky-600">更新 {report.updated}</span>
                <span className="text-muted-foreground">跳过 {report.skipped}</span>
                <span className={report.failed ? 'text-destructive' : 'text-muted-foreground'}>失败 {report.failed}</span>
              </div>
              {report.errors.length > 0 && (
                <ul className="text-muted-foreground max-h-40 space-y-1 overflow-auto text-xs">
                  {report.errors.slice(0, MAX_ERROR_ROWS).map(item => (
                    <li key={`${item.row}-${item.title}`}>
                      第 {item.row} 行{item.title ? `（${item.title}）` : ''}：{item.message}
                    </li>
                  ))}
                  {report.errors.length > MAX_ERROR_ROWS && <li>…另有 {report.errors.length - MAX_ERROR_ROWS} 条未展示</li>}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            {report ? '关闭' : '取消'}
          </Button>
          <Button type="button" onClick={handleImport} disabled={!file || importing}>
            {importing ? '导入中…' : '开始导入'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
