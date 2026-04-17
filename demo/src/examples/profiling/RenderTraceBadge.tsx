import { clsx } from 'clsx'

interface RenderTraceBadgeProps {
  count: number
  label?: string
  className?: string
}

export default function RenderTraceBadge({
  count,
  label = 'Renders',
  className,
}: RenderTraceBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200',
        className
      )}
    >
      <span>{label}</span>
      <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-emerald-100">
        {count.toString()}
      </span>
    </span>
  )
}
