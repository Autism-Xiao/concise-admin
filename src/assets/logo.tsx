export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="currentColor" className="text-sidebar-primary" />
      <path d="M47.5 22.5 A18 18 0 1 0 47.5 41.5" fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-sidebar-primary-foreground" />
      <circle cx="47.5" cy="32" r="4.5" className="fill-sidebar-primary-foreground" />
    </svg>
  )
}
