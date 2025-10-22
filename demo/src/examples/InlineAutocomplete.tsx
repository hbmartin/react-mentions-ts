import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem } from '../../../src'
import ExampleCard from './ExampleCard'
import { inlineMentionsClassNames, mentionPillClass, mergeClassNames } from './mentionsClassNames'

const inlineItalicClasses = mergeClassNames(inlineMentionsClassNames, {
  inlineSuggestion:
    'pointer-events-none [font-family:inherit] [font-size:inherit] [letter-spacing:inherit] [font-weight:inherit] italic text-slate-400',
  inlineSuggestionSuffix: 'text-slate-400 italic',
})

export default function InlineAutocomplete({ data }: { data: MentionDataItem[] }) {
  const [value, setValue] = useState('')

  return (
    <ExampleCard
      title="Inline autocomplete"
      description="Guide users with subtle, inline completions that respond to Tab, Enter, or →."
    >
      <MentionsInput
        value={value}
        onChange={({ value: nextValue }) => setValue(nextValue)}
        className="mentions"
        classNames={inlineItalicClasses}
        suggestionsDisplay="inline"
        placeholder={'Inline hint'}
      >
        <Mention data={data} className={mentionPillClass} />
      </MentionsInput>
    </ExampleCard>
  )
}
