import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem, MentionsInputChangeEvent } from '../../../src'
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
  const onMentionsChange = ({ value: nextValue }: MentionsInputChangeEvent) =>
    setValue(nextValue)

  const normalize = (input: string): string =>
    input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()

  const filterByQuery = async (query: string): Promise<MentionDataItem[]> => {
    const normalizedQuery = normalize(query)
    return data.filter((item) =>
      normalize(item.display ?? String(item.id)).includes(normalizedQuery)
    )
  }

  return (
    <ExampleCard
      title="Single line input ignoring accents"
      description="Type without worrying about diacritics — we normalise characters before matching."
    >
      <MentionsInput
        singleLine
        value={value}
        onMentionsChange={onMentionsChange}
        className="mentions"
        classNames={singleLineMentionsClassNames}
        placeholder="Mention people using '@'"
        a11ySuggestionsListLabel={'Suggested mentions'}
      >
        <Mention data={filterByQuery} onAdd={onAdd} className={mentionPillClass} />
      </MentionsInput>
    </ExampleCard>
  )
}
