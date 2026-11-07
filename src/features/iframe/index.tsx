import { useMemo } from 'react'
import { ShieldAlert } from 'lucide-react'

/**
 * 内链菜单承载页（/iframe?url=...）：
 * 菜单管理里「打开方式 = 内链」的菜单不出现在前端路由表里，
 * 侧边栏把它们路由到本页，用 iframe 嵌入目标地址。
 */
export function IframePage({ url }: { url: string }) {
  const safeUrl = useMemo(() => {
    try {
      const parsed = new URL(url)
      // 只允许 http/https，防 javascript: 等伪协议注入
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : ''
    } catch {
      return ''
    }
  }, [url])

  if (!safeUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <ShieldAlert className="text-muted-foreground size-10" />
        <p className="text-muted-foreground text-sm">内链地址无效（仅支持 http/https 完整地址）</p>
        <p className="text-muted-foreground font-mono text-xs">{url || '（未提供 url 参数）'}</p>
      </div>
    )
  }

  return <iframe src={safeUrl} title={safeUrl} className="bg-background h-full w-full rounded-md border" />
}
