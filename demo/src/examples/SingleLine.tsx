import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem, MentionsInputChangeEvent } from '../../../src'
import ExampleCard from './ExampleCard'
import { mentionPillClass, singleLineMentionsClassNames } from './mentionsClassNames'

export default function SingleLine({
  data,
  onAdd,
}: {
  data: MentionDataItem[]
  onAdd: (...args: any[]) => void
}) {
  const [value, setValue] = useState('')

  const onChange = ({ value: nextValue }: MentionsInputChangeEvent) => {
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
        onChange={onChange}
        className="mentions"
        classNames={singleLineMentionsClassNames}
        placeholder="Mention people using '@'"
        a11ySuggestionsListLabel={'Suggested mentions'}
      >
        <Mention data={data} onAdd={onAdd} className={mentionPillClass} />
      </MentionsInput>
    </ExampleCard>
  )
}
