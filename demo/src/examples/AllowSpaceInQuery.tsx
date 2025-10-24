import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem, MentionsInputChangeEvent } from '../../../src'
import ExampleCard from './ExampleCard'
import { mentionPillClass, singleLineMentionsClassNames } from './mentionsClassNames'

export default function AllowSpaceInQuery({ data }: { data: MentionDataItem[] }) {
  const [value, setValue] = useState('')

  const handleChange = ({ value: nextValue }: MentionsInputChangeEvent) => {
    setValue(nextValue)
  }

  return (
    <ExampleCard
      title="Multi-word queries"
      description="With `allowSpaceInQuery`, suggestions stay open after typing spaces—handy for full names."
    >
      <MentionsInput
        singleLine
        value={value}
        onMentionsChange={handleChange}
        className="mentions"
        classNames={singleLineMentionsClassNames}
        placeholder="Try typing '@gus fr' or '@mike e'"
        a11ySuggestionsListLabel="Suggested mentions"
      >
        <Mention allowSpaceInQuery data={data} className={mentionPillClass} />
      </MentionsInput>
    </ExampleCard>
  )
}
