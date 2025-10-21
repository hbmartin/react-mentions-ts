import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem } from '../../../src'
import ExampleCard from './ExampleCard'
import { mentionPillClass, singleLineMentionsClassNames } from './mentionsClassNames'

export default function SingleLineIgnoringAccents({
  data,
  onAdd = () => {},
}: {
  data: MentionDataItem[]
  onAdd?: (...args: any[]) => void
}) {
  const [value, setValue] = useState('')
  const onChange = (_ev: unknown, newValue: string) => setValue(newValue)

  return (
    <ExampleCard
      title="Single line input ignoring accents"
      description="Type without worrying about diacritics — we normalise characters before matching."
    >
      <MentionsInput
        singleLine
        value={value}
        onChange={onChange}
        className="mentions"
        classNames={singleLineMentionsClassNames}
        placeholder="Mention people using '@'"
        ignoreAccents
        a11ySuggestionsListLabel={'Suggested mentions'}
      >
        <Mention data={data} onAdd={onAdd} className={mentionPillClass} />
      </MentionsInput>
    </ExampleCard>
  )
}
