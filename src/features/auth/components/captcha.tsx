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
        className="border-input bg-muted/30 hover:bg-muted/60 flex h-9 w-[110px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border transition-colors [&>svg]:h-full [&>svg]:w-full"
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
