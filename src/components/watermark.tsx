import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

interface WatermarkProps {
  /** 水印文字，传数组则为多行 */
  content: string | string[]
  /** 旋转角度 */
  rotate?: number
  /** 文字大小 */
  fontSize?: number
  /** 单个水印区块尺寸 [宽, 高] */
  tileSize?: [number, number]
}

// 安全水印：canvas 生成斜向平铺底纹，覆盖登录后的整个区域。
// 带防篡改观察器：节点被删掉或样式被清空时自动恢复
export function Watermark({ content, rotate = -22, fontSize = 14, tileSize = [320, 180] }: WatermarkProps) {
  const { resolvedTheme } = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const lines = Array.isArray(content) ? content : [content]
  const textKey = lines.join('\n')

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 高分屏下放大画布，避免文字发虚
    const ratio = window.devicePixelRatio || 1
    const [tileW, tileH] = tileSize
    canvas.width = tileW * ratio
    canvas.height = tileH * ratio

    const lineHeight = fontSize * 1.6
    ctx.translate((tileW / 2) * ratio, (tileH / 2) * ratio)
    ctx.rotate((rotate * Math.PI) / 180)
    ctx.font = `${fontSize * ratio}px ui-sans-serif, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)'
    lines.forEach((line, i) => {
      ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * lineHeight * ratio)
    })
    const url = `url("${canvas.toDataURL('image/png')}")`

    const apply = () => {
      el.style.backgroundImage = url
    }
    apply()

    // 防篡改：水印节点被移除时重新挂回，背景被清掉时重新设置
    const restore = () => {
      if (!document.body.contains(el)) {
        document.body.appendChild(el)
      }
      if (el.style.backgroundImage !== url) {
        apply()
      }
    }
    const bodyObserver = new MutationObserver(restore)
    bodyObserver.observe(document.body, { childList: true, subtree: true })
    const attrObserver = new MutationObserver(restore)
    attrObserver.observe(el, { attributes: true, attributeFilter: ['style', 'class'] })

    return () => {
      bodyObserver.disconnect()
      attrObserver.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textKey, rotate, fontSize, resolvedTheme])

  return <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[100]" />
}
