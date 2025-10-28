import React, { useState } from 'react'
import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem, MentionsInputChangeEvent } from '../../../src'
import ExampleCard from './ExampleCard'
import {
  mentionPillClass,
  mergeClassNames,
  multilineMentionsClassNames,
} from './mentionsClassNames'

const autoResizeClasses = mergeClassNames(multilineMentionsClassNames, {
  control: 'min-h-[4.5rem]',
  highlighter: 'min-h-[4.5rem]',
  input: 'min-h-[4.5rem]',
})

export default function AutoResize({
  data,
  onAdd = () => {},
}: {
  data: MentionDataItem[]
  onAdd?: (...args: any[]) => void
}) {
  const [value, setValue] = useState(
    'Start typing to watch the composer grow. Try mentioning @[Walter White](user:walter)!'
  )

  const handleMentionsChange = ({ value: nextValue }: MentionsInputChangeEvent) =>
    setValue(nextValue)

  return (
    <ExampleCard
      title="Auto-resizing composer"
      description="Enable `autoResize` to mirror the textarea height to its scroll height after every change."
    >
      <MentionsInput
        autoResize
        value={value}
        onMentionsChange={handleMentionsChange}
        className="mentions"
        classNames={autoResizeClasses}
        placeholder="Mention teammates with '@'"
        a11ySuggestionsListLabel="Suggested teammates"
      >
        <Mention
          markup="@[__display__](user:__id__)"
          displayTransform={(id, display) => `@${display ?? id}`}
          trigger="@"
          data={data}
          onAdd={onAdd}
          className={mentionPillClass}
        />
      </MentionsInput>
    </ExampleCard>
  )
}
