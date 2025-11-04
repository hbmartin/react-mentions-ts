import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem, MentionsInputChangeEvent } from '../../../src'
import ExampleCard from './ExampleCard'

export default function SingleLine({
  data,
  onAdd,
}: {
  data: MentionDataItem[]
  onAdd: (...args: any[]) => void
}) {
  const [value, setValue] = useState('')

  const onMentionsChange = ({ value: nextValue }: MentionsInputChangeEvent) => {
    setValue(nextValue)
  }

  return (
    <ExampleCard
      title="Single line input"
      description="Perfect for compact composer bars — arrow keys and Enter behave exactly like chat apps."
    >
      <MentionsInput
        singleLine
        value={value}
        onMentionsChange={onMentionsChange}
        className="mentions"
        placeholder="Mention people using '@'"
        a11ySuggestionsListLabel={'Suggested mentions'}
      >
        <Mention data={data} onAdd={onAdd} />
      </MentionsInput>
    </ExampleCard>
  )
}
