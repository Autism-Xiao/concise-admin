import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { saveBlobFile } from '@/lib/download'
import { humanizeImportError } from '@/lib/import-error'
import { isApiError } from '@/lib/api-error'
import { isImportTemplateError } from '@/lib/biz-code'

/** 后端所有导入接口的统一返回结构（层级/字典/岗位/用户/角色/公告一致） */
export interface ImportResult {
  total: number
  created: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{ row: number; key?: string; username?: string; message: string }>
}

interface ExcelImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** 判定规则说明，写清「已存在时是更新还是跳过」 */
  description: ReactNode
  /** 风险提示（覆盖、删数据等），不传则不显示 */
  warning?: ReactNode
  templateHint?: ReactNode
  /** 导入成功（含部分成功）时回调，父组件据此刷新列表 */
  onImported: () => void
  /** 下载模板 */
  downloadTemplate: () => Promise<{ filename: string; blob: Blob }>
  /** 上传并导入 */
  importFile: (file: File) => Promise<ImportResult>
}

/** 失败明细最多展示条数，避免几十行错误把弹窗撑爆 */
const MAX_ERROR_ROWS = 10

/**
 * 通用 Excel 导入弹窗
 *
 * 各模块的导入交互完全一样（选文件 → 上传 → 展示逐行统计与失败原因），
 * 差异只有「模板怎么下」「文件怎么传」，所以收敛成一个组件，避免每个页面抄一遍。
 */
export function ExcelImportDialog({ open, onOpenChange, title, description, warning, templateHint, onImported, downloadTemplate, importFile }: ExcelImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [report, setReport] = useState<ImportResult | null>(null)

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
    downloadTemplate()
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
    importFile(file)
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
      .catch(e => {
        // 模板问题（缺列/没数据行）不是用户操作错了，引导回「下载模板」；其余原样透出
        if (isApiError(e) && isImportTemplateError(e.code)) {
          toast.error(`${e.message}。可点击上方「下载模板」，按模板列顺序填写后再导入`)
        } else {
          toast.error(e instanceof Error ? e.message : '导入失败')
        }
      })
      .finally(() => setImporting(false))
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {warning && <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">{warning}</div>}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleTemplate} disabled={downloading}>
              <Download className="size-4" />
              {downloading ? '下载中…' : '下载模板'}
            </Button>
            <span className="text-muted-foreground text-xs">{templateHint ?? '模板含填写说明，必填列带 *'}</span>
          </div>

          <div className="rounded-md border border-dashed p-4">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
                    <li key={`${item.row}-${item.key ?? item.username ?? item.message}`}>
                      第 {item.row} 行{item.key || item.username ? `（${item.key ?? item.username}）` : ''}：{humanizeImportError(item.message)}
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
