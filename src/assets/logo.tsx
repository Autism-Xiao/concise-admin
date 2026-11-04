interface LogoProps {
  className?: string
  /** default：跟随侧边栏配色（用于普通背景）；inverted：放在 primary 背景上时使用 */
  variant?: 'default' | 'inverted'
}

export function Logo({ className, variant = 'default' }: LogoProps) {
  const inverted = variant === 'inverted'
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="currentColor" className={inverted ? 'text-primary-foreground' : 'text-sidebar-primary'} />
      <path
        d="M47.5 22.5 A18 18 0 1 0 47.5 41.5"
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        className={inverted ? 'stroke-primary' : 'stroke-sidebar-primary-foreground'}
      />
      <circle cx="47.5" cy="32" r="4.5" className={inverted ? 'fill-primary' : 'fill-sidebar-primary-foreground'} />
    </svg>
  )
}
