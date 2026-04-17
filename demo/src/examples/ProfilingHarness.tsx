import ExampleCard from './ExampleCard'
import RenderTraceBadge from './profiling/RenderTraceBadge'
import { isProfilingConsoleEnabled, useRenderTrace } from './profiling/useRenderTrace'

const caseStudies = [
  {
    title: 'Moving state down',
    href: '#state-locality-lab',
    body: 'Toggle the localized controller. The static reference panel should keep its render badge stable.',
  },
  {
    title: 'Inline autocomplete',
    href: '#inline-autocomplete',
    body: 'Type `@a`, cycle suggestions, and verify only the inline completion branch churns.',
  },
  {
    title: 'Portal positioning',
    href: '#suggestions-via-portal',
    body: 'Scroll the portal host and confirm the overlay keeps its viewport-relative positioning without clipping.',
  },
  {
    title: 'Async race cancellation',
    href: '#async-github-mentions',
    body: 'Type quickly through multiple queries and verify stale responses never flash back into the list.',
  },
  {
    title: 'Scroll/resize measurement',
    href: '#scrollable-composer',
    body: 'Use the scrollable and auto-resize demos together to confirm measurement work stays local to the composer shell.',
  },
]

export default function ProfilingHarness() {
  const renderCount = useRenderTrace('ProfilingHarness')

  return (
    <ExampleCard
      title="Modernization profiling harness"
      description="Use the live demo as the rehearsal surface for each modernization case study before touching the public API."
      actions={<RenderTraceBadge count={renderCount} label="Harness renders" />}
    >
      <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4 text-sm leading-relaxed text-sky-100">
        <p>
          Run <code>pnpm dev</code> to enable why-did-you-render and console trace logs. Run{' '}
          <code>pnpm demo</code> for the quieter version with just the in-UI render badges.
        </p>
        <p className="mt-2 text-sky-100/80">
          React Strict Mode is enabled in the demo, so development render counts will be higher than
          production. Compare relative changes, not absolute totals.
        </p>
        <p className="mt-2 text-sky-100/80">
          Console tracing: {isProfilingConsoleEnabled ? 'enabled' : 'disabled'}.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {caseStudies.map((caseStudy) => (
          <a
            key={caseStudy.title}
            href={caseStudy.href}
            className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-emerald-300/60 hover:bg-slate-950/80"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
              Case study
            </div>
            <h4 className="mt-2 text-base font-semibold text-slate-50">{caseStudy.title}</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{caseStudy.body}</p>
          </a>
        ))}
      </div>
    </ExampleCard>
  )
}
