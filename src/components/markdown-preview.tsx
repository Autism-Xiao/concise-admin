import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

import { cn } from '@/lib/utils'

/**
 * Markdown 渲染（react-markdown 默认不渲染原始 HTML，天然防 XSS）
 * 公告正文等用户输入内容的展示出口；样式用 Tailwind 手写映射，跟随主题
 */
const components: Components = {
  h1: ({ children }) => <h1 className="text-xl font-bold first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-3 text-lg font-semibold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-3 text-base font-semibold first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-2 text-sm font-semibold first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="text-sm">{children}</p>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary hover:underline">
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5 text-sm">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5 text-sm">{children}</ol>,
  li: ({ children }) => <li className="text-sm">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-border text-muted-foreground mt-2 space-y-1 border-l-2 pl-3">{children}</blockquote>
  ),
  code: ({ className, children }) => (
    // 行内代码（无 language- 前缀）加底色；代码块内的样式交给 pre 处理
    <code className={cn('font-mono text-xs', !className && 'bg-muted rounded px-1 py-0.5')}>{children}</code>
  ),
  pre: ({ children }) => <pre className="bg-muted/50 border-border mt-2 overflow-x-auto rounded-md border p-3 text-xs">{children}</pre>,
  table: ({ children }) => (
    <div className="border-border mt-2 overflow-x-auto rounded-md border">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="bg-muted/40 border-border border-b px-2 py-1.5 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-border border-b px-2 py-1.5">{children}</td>,
  hr: () => <hr className="border-border my-3" />,
  img: ({ src, alt }) => <img src={typeof src === 'string' ? src : undefined} alt={alt ?? ''} className="max-w-full rounded-md" />
}

export function MarkdownPreview({ content, className }: { content: string; className?: string }) {
  if (!content.trim()) {
    return <p className="text-muted-foreground text-sm">暂无内容</p>
  }
  return (
    <div className={cn('space-y-2 leading-relaxed break-words', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
