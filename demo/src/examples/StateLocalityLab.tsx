import React, { useState } from 'react'
import ExampleCard from './ExampleCard'
import RenderTraceBadge from './profiling/RenderTraceBadge'
import { useRenderTrace } from './profiling/useRenderTrace'

function StaticReferencePanel() {
  const renderCount = useRenderTrace('StateLocalityLab.StaticReferencePanel')

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">
          Stable sibling
        </h4>
        <RenderTraceBadge count={renderCount} label="Panel renders" />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        This panel has no local state. It sits beside the controller to prove that moving state down
        keeps unrelated branches out of the render loop.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-slate-200">
        <li>Selection math lives in the mentions shell, not in decorative siblings.</li>
        <li>Layout measurements should stay near the DOM nodes that actually need them.</li>
        <li>Composition is cheaper than sprinkling memoization everywhere.</li>
      </ul>
    </section>
  )
}

function LocalStateController() {
  const renderCount = useRenderTrace('StateLocalityLab.LocalStateController')
  const [isExpanded, setIsExpanded] = useState(false)
  const detailsId = 'state-locality-details'

  return (
    <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-100">
          Local controller
        </h4>
        <RenderTraceBadge count={renderCount} label="Controller renders" />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-emerald-50/90">
        Toggle this panel to simulate the modernization directive of moving state into the smallest
        branch that actually needs it.
      </p>
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        className="mt-4 inline-flex items-center rounded-full bg-emerald-300/90 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200"
        onClick={() => setIsExpanded((value) => !value)}
      >
        {isExpanded ? 'Collapse localized state' : 'Expand localized state'}
      </button>
      {isExpanded ? (
        <div
          id={detailsId}
          role="region"
          aria-label="Localized state details"
          className="mt-4 rounded-2xl border border-emerald-200/20 bg-emerald-950/30 p-4 text-sm leading-relaxed text-emerald-50"
        >
          Only this controller should rerender as the state flips. The sibling panel next to it
          should keep its render count flat.
        </div>
      ) : null}
    </section>
  )
}

export default function StateLocalityLab() {
  const renderCount = useRenderTrace('StateLocalityLab')

  return (
    <ExampleCard
      title="State locality lab"
      description="A miniature rehearsal for the “move state down” directive before applying it to MentionsInput internals."
      actions={<RenderTraceBadge count={renderCount} label="Card renders" />}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <StaticReferencePanel />
        <LocalStateController />
      </div>
      <p className="text-sm leading-relaxed text-slate-300">
        Expected outcome: the controller badge increments when you toggle the panel, while the
        stable sibling stays flat. That is the same locality goal we want from overlay, inline hint,
        and measurement work in the library.
      </p>
    </ExampleCard>
  )
}
