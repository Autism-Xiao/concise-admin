import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const faqs = [
  { q: '如何切换深色模式？', a: '点击右上角的主题按钮，或使用快捷键 ⌘K 打开搜索后选择主题。' },
  { q: '数据是真实的吗？', a: '不是，当前所有页面均为本地 mock 数据，接入后端接口后替换即可。' },
  { q: '如何添加新页面？', a: '在 src/routes/_authenticated/ 下新建文件，路由会自动生成。' }
]

export function HelpCenterPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">帮助中心</h1>
      <div className="grid max-w-2xl gap-4">
        {faqs.map(faq => (
          <Card key={faq.q}>
            <CardHeader>
              <CardTitle className="text-base">{faq.q}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{faq.a}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
