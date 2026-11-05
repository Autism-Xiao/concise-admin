import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CaptchaData } from '../api'

interface CaptchaBoxProps {
  /** 后端返回的验证码（svg + captchaId），null 表示加载失败或未加载 */
  captcha: CaptchaData | null
  loading: boolean
  onRefresh: () => void
  refreshTitle: string
}

/** 后端图形验证码：SVG 由接口下发，点击图片或右侧按钮刷新 */
export function CaptchaBox({ captcha, loading, onRefresh, refreshTitle }: CaptchaBoxProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onRefresh}
        title={refreshTitle}
        // 验证码 SVG 是深灰字符，固定白底保证暗色主题下可读（后端也会注入白底 rect，这里是兜底）
        className="border-input flex h-9 w-[110px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-white transition-colors hover:bg-white/85 [&>svg]:h-full [&>svg]:w-full"
      >
        {loading ? (
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
        ) : captcha ? (
          <span className="contents" dangerouslySetInnerHTML={{ __html: captcha.svg }} />
        ) : (
          <RefreshCw className="text-muted-foreground size-4" />
        )}
      </button>
      <Button type="button" variant="ghost" size="icon" onClick={onRefresh} title={refreshTitle}>
        <RefreshCw className="size-4" />
        <span className="sr-only">{refreshTitle}</span>
      </Button>
    </div>
  )
}
