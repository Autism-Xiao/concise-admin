import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { importRegions, type RegionImportResult } from '../api'

interface RegionImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 导入成功后回调（父页面刷新列表） */
  onImported: () => void
}

/**
 * 批量导入区划：直接粘贴第三方区划库导出的 JSON 数组（如省级/市级/区县级数据），
 * 后端按 areaCode upsert：已存在 → 更新，不存在 → 插入；单次最多 5000 条。
 */
export function RegionImportDialog({ open, onOpenChange, onImported }: RegionImportDialogProps) {
  const [text, setText] = useState('')
  const [parsedCount, setParsedCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<RegionImportResult | null>(null)

  const parse = (raw: string) => {
    setParsedCount(null)
    setError(null)
    setResult(null)
    if (!raw.trim()) return
    try {
      const data = JSON.parse(raw)
      if (!Array.isArray(data)) {
        setError('内容必须是 JSON 数组（如 [{ "name": "北京市", ... }]）')
        return
      }
      setParsedCount(data.length)
    } catch {
      setError('JSON 解析失败，请检查格式')
    }
  }

  const handleImport = async () => {
    let data: unknown[]
    try {
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('需为非空 JSON 数组')
      data = parsed
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON 解析失败')
      return
    }
    setImporting(true)
    setError(null)
    try {
      const res = await importRegions(data)
      setResult(res)
      onImported()
      if (res.failed.length === 0 && res.skipped === 0) {
        toast.success(`导入完成：新增 ${res.inserted} 条，更新 ${res.updated} 条`)
      } else {
        toast.warning(`导入完成，但有 ${res.failed.length + res.skipped} 条未入库，详见结果`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>导入区划</DialogTitle>
          <DialogDescription>
            粘贴区划 JSON 数组，按「区划代码」增量导入：已存在则更新、不存在则插入。单次最多 5000 条，市/县级全量数据建议分省分批导入。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <textarea
            className="bg-muted/40 ring-input focus-visible:ring-ring h-56 w-full rounded-md p-3 font-mono text-xs ring-1 outline-none focus-visible:ring-2"
            placeholder={
              '[\n  { "id": 1, "areaCode": "110000000000", "parentCode": "0", "level": 0, "levelText": "省份", "name": "北京市", "shortName": "北京", "fullName": "北京", "pinyin": "BeiJing", "lng": "116.407526", "lat": "39.904030" },\n  ...\n]'
            }
            value={text}
            onChange={e => {
              setText(e.target.value)
              parse(e.target.value)
            }}
          />
          {parsedCount !== null && !error && <p className="text-muted-foreground text-xs">已识别 {parsedCount} 条数据</p>}
          {error && <p className="text-destructive text-xs">{error}</p>}
          {result && (
            <div className="bg-muted/40 space-y-1 rounded-md p-3 text-xs">
              <p>
                新增 <span className="text-foreground font-semibold">{result.inserted}</span> 条 · 更新{' '}
                <span className="text-foreground font-semibold">{result.updated}</span> 条 · 跳过重复 {result.skipped} 条 · 失败 {result.failed.length} 条
              </p>
              {result.failed.slice(0, 5).map(f => (
                <p key={f.areaCode} className="text-destructive">
                  {f.areaCode}：{f.reason}
                </p>
              ))}
              {result.failed.length > 5 && <p className="text-muted-foreground">…其余 {result.failed.length - 5} 条失败已省略</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button type="button" onClick={handleImport} disabled={importing || parsedCount === null || !!error}>
            {importing ? '导入中…' : '开始导入'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
