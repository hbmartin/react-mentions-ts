import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem } from '../../../src'
import ExampleCard from './ExampleCard'
import {
  mentionPillClass,
  mergeClassNames,
  multilineMentionsClassNames,
} from './mentionsClassNames'

const customContainerClasses = mergeClassNames(multilineMentionsClassNames, {
  suggestions: 'mt-0 shadow-none',
})

export default function CustomSuggestionsContainer({
  data,
  onAdd = () => {},
}: {
  data: MentionDataItem[]
  onAdd?: (...args: any[]) => void
}) {
  const [value, setValue] = useState('')

  return (
    <ExampleCard
      title="Custom suggestions container"
      description="Render suggestions into any bespoke UI chrome — badges, headlines, or analytics."
    >
      <MentionsInput
        value={value}
        onChange={(_event, newValue) => setValue(newValue)}
        className="mentions"
        classNames={customContainerClasses}
        placeholder={"Mention people using '@'"}
        a11ySuggestionsListLabel={'Suggested mentions'}
        allowSuggestionsAboveCursor
        customSuggestionsContainer={(children) => (
          <div className="mt-4 space-y-3 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-4 text-sm text-indigo-100 shadow-xl shadow-indigo-500/15">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-indigo-200">Team mates</h4>
              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-100">
                smart picks
              </span>
            </div>
            {children}
          </div>
        )}
      >
        <Mention data={data} onAdd={onAdd} className={mentionPillClass} />
      </MentionsInput>
    </ExampleCard>
  )
}
