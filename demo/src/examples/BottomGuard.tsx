import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem } from '../../../src'
import ExampleCard from './ExampleCard'
import {
  mergeClassNames,
  mentionPillClass,
  multilineMentionsClassNames,
} from './mentionsClassNames'

const guardClassNames = mergeClassNames(multilineMentionsClassNames, {
  suggestions: 'mt-3 w-full rounded-xl border border-emerald-300/40 bg-emerald-50 text-emerald-900 shadow-xl',
})

export default function BottomGuard({
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
      title="Cursor guards"
      description="Show how overlays adapt above or below the caret, even inside scrollable regions."
    >
      <div className="relative h-[22rem]">
        <div
          ref={setPortalHost}
          className="absolute inset-0 overflow-auto rounded-2xl border border-emerald-400/60 bg-emerald-950/10 p-5 text-sm text-emerald-200 shadow-inner shadow-emerald-500/30"
        >
          <p className="mb-4 font-semibold text-emerald-200">Scroll container</p>
          <MentionsInput
            value={value}
            onChange={(_event, newValue) => setValue(newValue)}
            className="mentions"
            classNames={guardClassNames}
            placeholder={"Mention people using '@'"}
            a11ySuggestionsListLabel={'Suggested mentions'}
            suggestionsPortalHost={portalHost}
            allowSuggestionsAboveCursor
          >
            <Mention data={data} onAdd={onAdd} className={mentionPillClass} />
          </MentionsInput>

          <div className="my-6 h-16 rounded-xl border border-dashed border-emerald-400/40" />

          <MentionsInput
            value={value}
            onChange={(_event, newValue) => setValue(newValue)}
            className="mentions"
            classNames={guardClassNames}
            placeholder={"Mention people using '@'"}
            suggestionsPortalHost={portalHost}
            forceSuggestionsAboveCursor
          >
            <Mention data={data} onAdd={onAdd} className={mentionPillClass} />
          </MentionsInput>

          <div className="my-6 h-20" />

          <MentionsInput
            value={value}
            onChange={(_event, newValue) => setValue(newValue)}
            className="mentions"
            classNames={guardClassNames}
            placeholder={"Mention people using '@'"}
            a11ySuggestionsListLabel={'Suggested mentions'}
            suggestionsPortalHost={portalHost}
            allowSuggestionsAboveCursor
          >
            <Mention data={data} onAdd={onAdd} className={mentionPillClass} />
          </MentionsInput>
        </div>
      </div>
    </ExampleCard>
  )
}
