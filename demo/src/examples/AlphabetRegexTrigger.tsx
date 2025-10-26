import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem, MentionsInputChangeEvent } from '../../../src'
import ExampleCard from './ExampleCard'
import { mentionPillClass, multilineMentionsClassNames } from './mentionsClassNames'

// First capture group = full match to replace, second = query text for suggestions
const alphabeticalTrigger = /(?:^|\s)((\p{L}+))$/u

export default function AlphabetRegexTrigger({
  data,
  onAdd = () => {},
}: {
  data: MentionDataItem[]
  onAdd?: (params: {
    id: string | number
    display: string
    startPos: number
    endPos: number
    serializerId: string
  }) => void
}) {
  const [value, setValue] = useState(
    'Type a name using only letters to see inline suggestions pop up - try walter or lydia.'
  )

  const handleMentionsChange = ({ value: nextValue }: MentionsInputChangeEvent) =>
    setValue(nextValue)

  return (
    <ExampleCard
      title="Regex trigger on letters"
      description="Provide a custom RegExp trigger that fires for any alphabetical word - no @ prefix required."
    >
      <MentionsInput
        value={value}
        onMentionsChange={handleMentionsChange}
        className="mentions"
        classNames={multilineMentionsClassNames}
        placeholder="Start typing a name to mention someone"
        a11ySuggestionsListLabel="Suggested matches"
      >
        <Mention
          markup="@[__display__](user:__id__)"
          trigger={alphabeticalTrigger}
          data={data}
          onAdd={onAdd}
          className={mentionPillClass}
          appendSpaceOnAdd
        />
      </MentionsInput>
    </ExampleCard>
  )
}
