import React from 'react'
import { clsx } from 'clsx'

interface ExampleCardProps {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
}

export function ExampleCard({
  title,
  description,
  actions,
  children,
  className,
}: ExampleCardProps) {
  const id = title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')

  return (
    <section
      id={id}
      className={clsx(
        'group relative h-full overflow-visible rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-indigo-500/5 backdrop-blur',
        'transition duration-300 hover:border-indigo-300/60 hover:bg-white/10',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-400/10 via-transparent to-emerald-400/10 opacity-0 blur-3xl transition duration-500 group-hover:opacity-100" />
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-50">
            <a href={`#${id}`} className="hover:text-indigo-300 transition-colors">
              {title}
            </a>
          </h3>
          {description ? (
            <p className="mt-1 text-sm font-medium text-slate-300/90">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className="mt-5 space-y-5 text-slate-100">{children}</div>
    </section>
  )
}

export default ExampleCard
