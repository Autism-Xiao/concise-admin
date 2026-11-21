interface LogoProps {
  className?: string
  /** 兼容旧签名：新品牌稿自带绿底渐变，深浅背景下都成立，variant 仅保留不产生影响 */
  variant?: 'default' | 'inverted'
}

/**
 * 品牌标识（01-tunnel）：绿色渐变圆角方块 + 三层同心 C 弧（向外渐淡）+ 白色圆心。
 *
 * 用 SVG 矢量重绘（不贴位图）：任意尺寸不糊，渐变/透明度随 viewBox 缩放一致。
 * 几何：三层弧同圆心 (29,33)、同张角（右侧开口 ±50°），半径递增、透明度递减；
 * 最内层弧最亮（近薄荷白），中心实心白点。
 */
export function Logo({ className }: LogoProps) {
  // cos50°≈0.643、sin50°≈0.766，按半径算出每层弧的两个端点（开口朝右）
  const arcs = [
    { r: 22, sw: 6, opacity: 0.32 }, // 外圈：最淡
    { r: 16, sw: 6, opacity: 0.55 }, // 中圈
    { r: 10.5, sw: 6.5, opacity: 0.95 } // 内圈：最亮
  ]
  const cos = Math.cos((50 * Math.PI) / 180)
  const sin = Math.sin((50 * Math.PI) / 180)
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logo-bg" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b8a4c" />
          <stop offset="1" stopColor="#4dbb78" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#logo-bg)" />
      {arcs.map(({ r, sw, opacity }) => {
        const x = 29 + r * cos
        const y1 = 33 + r * sin
        const y2 = 33 - r * sin
        return (
          <path
            key={r}
            d={`M ${x.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 1 1 ${x.toFixed(2)} ${y2.toFixed(2)}`}
            fill="none"
            stroke="#d6eddf"
            strokeWidth={sw}
            strokeLinecap="round"
            opacity={opacity}
          />
        )
      })}
      <circle cx="29" cy="33" r="3.6" fill="#ffffff" />
    </svg>
  )
}
