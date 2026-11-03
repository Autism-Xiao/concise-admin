import { useMemo, useState } from 'react'
import { CheckCircle2, CircleDashed } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { DashboardDoc, DocSection } from '../api'

const TABS: { key: DocSection; label: string }[] = [
  { key: 'outline', label: '大纲' },
  { key: 'performance', label: '历史业绩' },
  { key: 'personnel', label: '核心人员' },
  { key: 'docs', label: '重点文档' }
]

export function DocumentsTable({ documents }: { documents: DashboardDoc[] }) {
  const [tab, setTab] = useState<DocSection>('outline')

  const counts = useMemo(() => {
    const map = {} as Record<DocSection, number>
    for (const t of TABS) map[t.key] = documents.filter(d => d.section === t.key).length
    return map
  }, [documents])

  const rows = useMemo(() => documents.filter(d => d.section === tab), [documents, tab])

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-1 pt-2">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              {counts[t.key] > 0 && tab !== t.key && (
                <span className="bg-muted-foreground/20 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs">{counts[t.key]}</span>
              )}
            </button>
          ))}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>标题</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-end">目标</TableHead>
              <TableHead className="text-end">限制</TableHead>
              <TableHead>审批人</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              rows.map(doc => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.title}</TableCell>
                  <TableCell className="text-muted-foreground">{doc.type}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      {doc.status === '已完成' ? (
                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <CircleDashed className="size-4 text-sky-600 dark:text-sky-400" />
                      )}
                      {doc.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-end">{doc.target}</TableCell>
                  <TableCell className="text-end">{doc.limit}</TableCell>
                  <TableCell className="text-muted-foreground">{doc.reviewer}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
