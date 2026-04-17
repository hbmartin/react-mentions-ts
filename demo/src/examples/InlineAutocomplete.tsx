import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem } from '../../../src'
import ExampleCard from './ExampleCard'
import { inlineMentionsClassNames, mentionPillClass, mergeClassNames } from './mentionsClassNames'
import styles from './example.module.css'

const inlineItalicClasses = mergeClassNames(inlineMentionsClassNames, {
  inlineSuggestion: styles.inlineSuggestion,
  inlineSuggestionText: styles.inlineSuggestionText,
  inlineSuggestionPrefix: styles.inlineSuggestionPrefix,
  inlineSuggestionSuffix: styles.inlineSuggestionSuffix,
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
        onMentionsChange={({ value: nextValue }) => setValue(nextValue)}
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
