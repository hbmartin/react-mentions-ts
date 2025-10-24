import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem } from '../../../src'
import ExampleCard from './ExampleCard'
import {
  mergeClassNames,
  mentionPillClass,
  multilineMentionsClassNames,
} from './mentionsClassNames'

const portalClassNames = mergeClassNames(multilineMentionsClassNames, {
  suggestions:
    'mt-3 w-full rounded-2xl border border-indigo-300/40 bg-white text-slate-700 shadow-2xl',
})

export default function SuggestionPortal({
  data,
  onAdd = () => {},
}: {
  data: MentionDataItem[]
  onAdd?: (...args: any[]) => void
}) {
  const [value, setValue] = useState('')
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null)

  return (
    <ExampleCard
      title="Suggestions via portal"
      description="Pop suggestion menus anywhere in the DOM. Perfect for modals, drawers, or fixed toolbars."
    >
      <div className="relative h-72">
        <div
          ref={setPortalHost}
          className="absolute inset-0 overflow-auto rounded-2xl border border-emerald-400/50 bg-emerald-950/20 p-4 text-sm text-emerald-100 shadow-inner shadow-emerald-500/20"
        >
          <p className="mb-3 font-semibold text-emerald-200">Scrollable surface</p>
          <MentionsInput
            value={value}
            onMentionsChange={({ value }) => setValue(value)}
            className="mentions"
            classNames={portalClassNames}
            placeholder={"Mention people using '@'"}
            a11ySuggestionsListLabel={'Suggested mentions'}
            suggestionsPortalHost={portalHost}
          >
            <Mention data={data} onAdd={onAdd} className={mentionPillClass} />
          </MentionsInput>

          <p className="mt-5 text-xs text-emerald-200/80">
            Scroll this container — the portal keeps suggestions fixed relative to the viewport.
          </p>
          <MentionsInput
            value={value}
            onMentionsChange={({ value }) => setValue(value)}
            className="mentions mt-4"
            classNames={mergeClassNames(portalClassNames, {
              input: 'h-32 overflow-auto',
              highlighter: 'h-32 overflow-hidden',
            })}
            placeholder={"Mention people using '@'"}
            a11ySuggestionsListLabel={'Suggested mentions'}
            suggestionsPortalHost={portalHost}
          >
            <Mention data={data} onAdd={onAdd} className={mentionPillClass} />
          </MentionsInput>
        </div>
      </div>
    </ExampleCard>
  )
}
