import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'
import { makeTriggerRegex } from '../../../src/utils/makeTriggerRegex'
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
      description="Pass a custom trigger RegExp to handle multi-word searches (e.g., `makeTriggerRegex('@', { allowSpaceInQuery: true })`)."
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
        <Mention
          trigger={makeTriggerRegex('@', { allowSpaceInQuery: true })}
          data={data}
          className={mentionPillClass}
        />
      </MentionsInput>
    </ExampleCard>
  )
}
