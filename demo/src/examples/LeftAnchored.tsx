import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem, MentionsInputChangeEvent } from '../../../src'
import ExampleCard from './ExampleCard'

export default function LeftAnchored({ data }: { data: MentionDataItem[] }) {
  const [value, setValue] = useState('')

  const onMentionsChange = ({ value: nextValue }: MentionsInputChangeEvent) => {
    setValue(nextValue)
  }

  return (
    <ExampleCard
      title="Left anchored suggestions"
      description="Pop the overlay from the input edge instead of the caret, ideal for wide inputs."
    >
      <MentionsInput
        anchorMode="left"
        value={value}
        onMentionsChange={onMentionsChange}
        className="mentions"
        placeholder="Start typing '@' to mention"
        a11ySuggestionsListLabel="Suggested mentions"
      >
        <Mention data={data} />
      </MentionsInput>
    </ExampleCard>
  )
}
