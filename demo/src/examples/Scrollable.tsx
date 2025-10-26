import React, { useState } from 'react'
import { clsx } from 'clsx'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem, MentionsInputChangeEvent } from '../../../src'
import ExampleCard from './ExampleCard'
import {
  mentionPillClass,
  mergeClassNames,
  multilineMentionsClassNames,
} from './mentionsClassNames'

const scrollableClasses = mergeClassNames(multilineMentionsClassNames, {
  input: 'h-40 overflow-y-auto',
  highlighter: 'h-40 overflow-hidden',
})

export default function Scrollable({
  data,
  onAdd = () => {},
}: {
  data: MentionDataItem[]
  onAdd?: (...args: any[]) => void
}) {
  const [value, setValue] = useState(
    "Hi @[John Doe](user:johndoe), \n\n\nlet's add \n\n@[John Doe](user:johndoe) to this conversation... "
  )
  const onMentionsChange = ({ value: nextValue }: MentionsInputChangeEvent) => setValue(nextValue)

  return (
    <ExampleCard
      title="Scrollable composer"
      description="Textarea and highlighter stay perfectly in sync, even while scrolling long drafts."
    >
      <MentionsInput
        value={value}
        onMentionsChange={onMentionsChange}
        className="mentions"
        classNames={scrollableClasses}
        placeholder="Mention people using '@'"
        a11ySuggestionsListLabel={'Suggested mentions'}
      >
        <Mention
          markup="@[__display__](user:__id__)"
          displayTransform={(url) => `@${url}`}
          trigger="@"
          data={data}
          renderSuggestion={(_suggestion, _search, highlightedDisplay, _index, focused) => (
            <div
              className={clsx(
                'flex items-center rounded-xl px-4 py-2.5 text-sm transition',
                focused ? 'bg-indigo-50/80 text-indigo-600' : 'text-slate-600'
              )}
            >
              {highlightedDisplay}
            </div>
          )}
          onAdd={onAdd}
          className={mentionPillClass}
        />
      </MentionsInput>
    </ExampleCard>
  )
}
