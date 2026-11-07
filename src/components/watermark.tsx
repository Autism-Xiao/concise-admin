import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

interface WatermarkProps {
  /** 水印文字，传数组则为多行 */
  content: string | string[]
  /** 旋转角度 */
  rotate?: number
  /** 文字大小 */
  fontSize?: number
  /** 不透明度（0~1）；样式参数由后端全局策略下发，前端不再各自写死 */
  opacity?: number
  /** 单个水印区块尺寸 [宽, 高] */
  tileSize?: [number, number]
}

// 安全水印：canvas 生成斜向平铺底纹，覆盖登录后的整个区域。
// 带防篡改观察器：节点被删掉或样式被清空时自动恢复
export function Watermark({ content, rotate = -22, fontSize = 14, opacity = 0.08, tileSize = [250, 140] }: WatermarkProps) {
  const { resolvedTheme } = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const lines = Array.isArray(content) ? content : [content]
  const textKey = lines.join('\n')
  const [tileW, tileH] = tileSize

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 高分屏下放大画布，避免文字发虚
    const ratio = window.devicePixelRatio || 1
    const lineHeight = fontSize * 1.6
    ctx.font = `${fontSize * ratio}px ui-sans-serif, system-ui, sans-serif`

    // 量出文字实际尺寸，取旋转后的外接矩形，保证区块完整容纳文字：
    // 长内容（用户名 + IP）在任意密度 / 分辨率下都不会被区块边界裁掉
    const rad = (Math.abs(rotate) * Math.PI) / 180
    const textW = Math.max(...lines.map(line => ctx.measureText(line).width)) / ratio
    const textH = lines.length * lineHeight
    const rotW = textW * Math.cos(rad) + textH * Math.sin(rad)
    const rotH = textW * Math.sin(rad) + textH * Math.cos(rad)
    const effW = Math.max(tileW, Math.ceil(rotW) + 48)
    const effH = Math.max(tileH, Math.ceil(rotH) + 48)

    // 注意：设置 canvas 宽高会重置上下文状态，之后需重新设置 font 等属性
    canvas.width = effW * ratio
    canvas.height = effH * ratio
    ctx.font = `${fontSize * ratio}px ui-sans-serif, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = resolvedTheme === 'dark' ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`

    const drawMark = (x: number, y: number) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate((rotate * Math.PI) / 180)
      lines.forEach((line, i) => {
        ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * lineHeight * ratio)
      })
      ctx.restore()
    }
    // 中心一枚 + 四角各一枚：四角的水印跨区块拼接成完整文字，
    // 平铺后形成交错网格，且任何一枚都不会被画布边缘裁断
    drawMark((effW / 2) * ratio, (effH / 2) * ratio)
    drawMark(0, 0)
    drawMark(effW * ratio, 0)
    drawMark(0, effH * ratio)
    drawMark(effW * ratio, effH * ratio)
    const url = `url("${canvas.toDataURL('image/png')}")`

    // 记浏览器**读回**的规范化值再比对：直接拿 url 比会有「设置值 vs 读回值」的格式差异，
    // 一旦不等就会每次滚动（背景位移触发 style 变更）都重设一遍背景图，白掉帧
    let appliedBackground = ''
    const apply = () => {
      el.style.backgroundImage = url
      appliedBackground = el.style.backgroundImage
    }
    apply()

    /* ---------- 随动：底纹跟着内容一起滚 ---------- */

    // 本项目的滚动发生在 <main data-scroll="main" class="overflow-y-auto"> 里，window 本身不滚；
    // 拿不到该容器（登录页、独立 iframe 等）才退回 window 滚动。
    // 做法是背景「反向位移」：内容往下滚 100px，底纹就上移 100px，
    // 视觉上水印钉在内容上随内容走，而不是像贴纸一样浮在视口里。
    const scroller = document.querySelector<HTMLElement>('main[data-scroll="main"]')
    let frame = 0
    const syncPosition = () => {
      frame = 0
      const x = scroller?.scrollLeft ?? window.scrollX
      const y = scroller?.scrollTop ?? window.scrollY
      el.style.backgroundPosition = `${-x}px ${-y}px`
    }
    // rAF 节流：滚动事件按帧合并，避免一次滚动触发几十次样式写入
    const requestSync = () => {
      if (!frame) frame = window.requestAnimationFrame(syncPosition)
    }
    syncPosition()
    scroller?.addEventListener('scroll', requestSync, { passive: true })
    window.addEventListener('scroll', requestSync, { passive: true })
    window.addEventListener('resize', requestSync)

    // 防篡改：水印节点被移除时重新挂回，背景被清掉时重新设置
    const restore = () => {
      if (!document.body.contains(el)) {
        document.body.appendChild(el)
      }
      if (el.style.backgroundImage !== appliedBackground) {
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
      scroller?.removeEventListener('scroll', requestSync)
      window.removeEventListener('scroll', requestSync)
      window.removeEventListener('resize', requestSync)
      if (frame) window.cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textKey, rotate, fontSize, opacity, tileW, tileH, resolvedTheme])

  return <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-40" />
}
