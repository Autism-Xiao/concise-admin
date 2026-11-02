import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function randomCaptchaCode(length = 4) {
  return Array.from({ length }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
}

interface CaptchaImageProps {
  code: string
  onRefresh: () => void
}

/** 由字符串生成确定性伪随机数（0~1），保证渲染是纯函数 */
function seeded(code: string, salt: number) {
  let h = salt
  for (const c of code) h = (h * 31 + c.charCodeAt(0)) % 233280
  return h / 233280
}

/** 图形验证码（mock）：SVG 绘制字符 + 干扰线，点击或右侧按钮刷新 */
export function CaptchaImage({ code, onRefresh }: CaptchaImageProps) {
  const chars = code.split('').map((char, i) => ({
    char,
    x: 14 + i * 24,
    y: 26 + seeded(code, i + 1) * 6,
    rotate: seeded(code, i + 11) * 40 - 20
  }))

  const lines = Array.from({ length: 4 }, (_, i) => ({
    x1: seeded(code, i * 4 + 21) * 110,
    y1: seeded(code, i * 4 + 22) * 40,
    x2: seeded(code, i * 4 + 23) * 110,
    y2: seeded(code, i * 4 + 24) * 40
  }))

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onRefresh}
        title="点击刷新验证码"
        className="border-input bg-muted/30 hover:bg-muted/60 h-9 shrink-0 cursor-pointer overflow-hidden rounded-md border transition-colors"
      >
        <svg width="110" height="36" viewBox="0 0 110 36">
          {lines.map((line, i) => (
            <line key={i} {...line} className="stroke-muted-foreground/40" strokeWidth="1" />
          ))}
          {chars.map((c, i) => (
            <text key={i} x={c.x} y={c.y} transform={`rotate(${c.rotate} ${c.x} ${c.y})`} className="fill-foreground font-mono text-lg font-bold">
              {c.char}
            </text>
          ))}
        </svg>
      </button>
      <Button type="button" variant="ghost" size="icon" onClick={onRefresh}>
        <RefreshCw className="size-4" />
        <span className="sr-only">刷新验证码</span>
      </Button>
    </div>
  )
}
