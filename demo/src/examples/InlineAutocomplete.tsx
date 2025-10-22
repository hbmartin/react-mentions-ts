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
  const [remainingHintValue, setRemainingHintValue] = useState('')
  const [fullHintValue, setFullHintValue] = useState('')

  return (
    <ExampleCard
      title="Inline autocomplete"
      description="Guide users with subtle, inline completions that respond to Tab, Enter, or →."
    >
      <div className="space-y-5">
        <MentionsInput
          value={remainingHintValue}
        onChange={({ value }) => setRemainingHintValue(value)}
          className="mentions"
          classNames={inlineItalicClasses}
          suggestionsDisplay="inline"
          inlineSuggestionDisplay="remaining"
          placeholder={'Inline hint (remaining characters)'}
        >
          <Mention data={data} className={mentionPillClass} />
        </MentionsInput>

        <MentionsInput
          value={fullHintValue}
        onChange={({ value }) => setFullHintValue(value)}
          className="mentions"
          classNames={inlineItalicClasses}
          suggestionsDisplay="inline"
          inlineSuggestionDisplay="full"
          placeholder={'Inline hint (full suggestion)'}
        >
          <Mention data={data} className={mentionPillClass} />
        </MentionsInput>
      </div>
    </ExampleCard>
  )
}
