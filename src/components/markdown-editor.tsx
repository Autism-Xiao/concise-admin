import { useRef, useState } from 'react'
import {
  Bold,
  Braces,
  Code,
  Eye,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  PencilLine,
  Quote,
  Strikethrough,
  type LucideIcon
} from 'lucide-react'

import { MarkdownPreview } from '@/components/markdown-preview'
import { cn } from '@/lib/utils'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** 超出后忽略输入（与后端字段上限一致） */
  maxLength?: number
  /** 编辑区最小高度（px） */
  minHeight?: number
}

/** 工具栏按钮清单（模块级纯数据：动作在点击时按 id 分发，避免渲染期创建闭包） */
const TOOLS: { id: string; icon: LucideIcon; title: string }[] = [
  { id: 'bold', icon: Bold, title: '加粗' },
  { id: 'italic', icon: Italic, title: '斜体' },
  { id: 'strike', icon: Strikethrough, title: '删除线' },
  { id: 'heading', icon: Heading2, title: '标题' },
  { id: 'quote', icon: Quote, title: '引用' },
  { id: 'bullet', icon: List, title: '无序列表' },
  { id: 'ordered', icon: ListOrdered, title: '有序列表' },
  { id: 'inlineCode', icon: Code, title: '行内代码' },
  { id: 'codeBlock', icon: Braces, title: '代码块' },
  { id: 'link', icon: Link2, title: '链接' },
  { id: 'hr', icon: Minus, title: '分隔线' }
]

/**
 * 轻量 Markdown 编辑器：工具栏（加粗/标题/列表等）+ 编辑 / 预览双模式
 * 预览渲染走 MarkdownPreview（react-markdown，不执行原始 HTML）
 */
export function MarkdownEditor({ value, onChange, placeholder, maxLength, minHeight = 192 }: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /** 恢复焦点并把选区设到新插入的内容上（rAF：等受控 textarea 重渲染完） */
  const afterPatch = (start: number, end: number) => {
    requestAnimationFrame(() => {
      const ta = textareaRef.current
      if (!ta) return
      ta.focus()
      ta.setSelectionRange(start, end)
    })
  }

  /** 包裹选区：**粗体** / *斜体* / `code` / [文字](url) */
  const surround = (before: string, after: string, fallback: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e } = ta
    const selected = value.slice(s, e) || fallback
    const next = value.slice(0, s) + before + selected + after + value.slice(e)
    if (maxLength != null && next.length > maxLength) return
    onChange(next)
    afterPatch(s + before.length, s + before.length + selected.length)
  }

  /** 给当前行加前缀：## 标题 / - 列表 / > 引用 */
  const prefixLine = (prefix: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e } = ta
    const lineStart = value.lastIndexOf('\n', s - 1) + 1
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart)
    if (maxLength != null && next.length > maxLength) return
    onChange(next)
    afterPatch(s + prefix.length, e + prefix.length)
  }

  /** 在光标处插入独立块：代码块 / 分隔线 */
  const insertBlock = (block: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const { selectionEnd: e } = ta
    const insert = (e > 0 && !value.endsWith('\n') ? '\n' : '') + block
    const next = value.slice(0, e) + insert + value.slice(e)
    if (maxLength != null && next.length > maxLength) return
    onChange(next)
    afterPatch(e + insert.length, e + insert.length)
  }

  /** 点击工具栏：按 id 分发到对应的文本操作 */
  const runTool = (id: string) => {
    switch (id) {
      case 'bold':
        return surround('**', '**', '粗体')
      case 'italic':
        return surround('*', '*', '斜体')
      case 'strike':
        return surround('~~', '~~', '删除线')
      case 'heading':
        return prefixLine('## ')
      case 'quote':
        return prefixLine('> ')
      case 'bullet':
        return prefixLine('- ')
      case 'ordered':
        return prefixLine('1. ')
      case 'inlineCode':
        return surround('`', '`', 'code')
      case 'codeBlock':
        return insertBlock('```\n代码\n```\n')
      case 'link':
        return surround('[', '](https://)', '链接文字')
      case 'hr':
        return insertBlock('---\n')
    }
  }

  return (
    <div className="focus-within:border-ring focus-within:ring-ring/50 overflow-hidden rounded-md border transition-[border,box-shadow] focus-within:ring-[3px]">
      <div className="bg-muted/40 flex items-center justify-between gap-2 border-b px-1.5 py-1">
        <div className="flex items-center gap-0.5">
          {TOOLS.map(tool => (
            <button
              key={tool.title}
              type="button"
              title={tool.title}
              aria-label={tool.title}
              disabled={mode === 'preview'}
              onClick={() => runTool(tool.id)}
              className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-7 items-center justify-center rounded-sm transition-colors disabled:pointer-events-none disabled:opacity-40"
            >
              <tool.icon className="size-3.5" />
            </button>
          ))}
        </div>
        <div className="bg-muted flex rounded-md p-0.5">
          {(
            [
              { key: 'edit', label: '编辑', icon: PencilLine },
              { key: 'preview', label: '预览', icon: Eye }
            ] as const
          ).map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => setMode(item.key)}
              className={cn(
                'flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs transition-colors',
                mode === item.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="size-3" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'edit' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => {
            if (maxLength == null || e.target.value.length <= maxLength) onChange(e.target.value)
          }}
          placeholder={placeholder}
          spellCheck={false}
          className="placeholder:text-muted-foreground w-full resize-y px-3 py-2.5 text-sm outline-none"
          style={{ minHeight }}
        />
      ) : (
        <div className="overflow-y-auto px-3 py-2.5" style={{ minHeight }}>
          <MarkdownPreview content={value} />
        </div>
      )}

      {maxLength != null && (
        <div className="text-muted-foreground border-t px-3 py-1 text-right text-xs">{value.length}/{maxLength}</div>
      )}
    </div>
  )
}
