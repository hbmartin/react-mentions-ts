import React, { useMemo, useState } from 'react'
import { clsx } from 'clsx'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem, MentionSelection } from '../../../src'
import ExampleCard from './ExampleCard'
import {
  mergeClassNames,
  multilineMentionsClassNames,
} from './mentionsClassNames'
import { useExampleValue } from './hooks'

const initialValue =
  'Sync with @[Walter White](walter) and @[Jesse Pinkman](jesse) before the hand-off.'

const selectionAwareClassNames = mergeClassNames(multilineMentionsClassNames, {
  highlighter: clsx(
    multilineMentionsClassNames.highlighter,
    'transition-shadow'
  ),
})

const mentionChipClass = clsx(
  'rounded-full px-2 py-0.5 text-sm font-semibold text-indigo-100',
  'bg-indigo-500/30 shadow-inner shadow-indigo-900/20 transition-colors',
  'data-[mention-selection=inside]:bg-emerald-500/35 data-[mention-selection=inside]:text-emerald-50',
  'data-[mention-selection=boundary]:ring-2 data-[mention-selection=boundary]:ring-indigo-300 data-[mention-selection=boundary]:bg-indigo-500/40',
  'data-[mention-selection=partial]:bg-amber-500/40 data-[mention-selection=partial]:text-amber-50',
  'data-[mention-selection=full]:bg-indigo-500 data-[mention-selection=full]:text-white'
)

export default function MentionSelectionExample({
  data,
}: {
  data: MentionDataItem[]
}) {
  const [value, onMentionsChange, onAdd] = useExampleValue(initialValue)
  const [selection, setSelection] = useState<MentionSelection[]>([])

  const listItems = useMemo(() => {
    if (selection.length === 0) {
      return (
        <li className="text-sm text-slate-400">
          Move the caret inside a mention to see its selection state.
        </li>
      )
    }

    return selection.map((item) => (
      <li
        key={`${item.serializerId}:${item.id}:${item.plainTextStart}:${item.selection}`}
        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-900/60 px-4 py-2 text-sm text-slate-200 ring-1 ring-white/5"
      >
        <span className="font-semibold text-slate-100">{item.display}</span>
        <span className="rounded-full bg-slate-700/70 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-200">
          {item.selection}
        </span>
        <span className="text-xs text-slate-400">
          {item.plainTextStart} – {item.plainTextEnd}
        </span>
      </li>
    ))
  }, [selection])

  return (
    <ExampleCard
      title="Caret mention states"
      description="Listen for caret changes overlapping mentions and style them with data attributes."
    >
      <div className="grid gap-5 lg:grid-cols-[1.4fr,1fr]">
        <div className="space-y-3">
          <MentionsInput
            value={value}
            onMentionsChange={onMentionsChange}
            onMentionSelectionChange={setSelection}
            className="mentions"
            classNames={selectionAwareClassNames}
            placeholder={"Mention teammates using '@'"}
            a11ySuggestionsListLabel={'Suggested mentions'}
          >
            <Mention
              trigger="@"
              data={data}
              onAdd={onAdd}
              className={mentionChipClass}
            />
          </MentionsInput>
          <p className="text-xs text-slate-400">
            Mentions receive a `data-mention-selection` attribute in both the
            input and highlighter layers, so you can style boundary, inside,
            partial, or full selections independently.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-200">
            Active mention selection
          </h4>
          <ul className="space-y-2 rounded-3xl bg-slate-900/40 p-4 shadow-inner shadow-slate-950/40 backdrop-blur">
            {listItems}
          </ul>
        </div>
      </div>
    </ExampleCard>
  )
}
