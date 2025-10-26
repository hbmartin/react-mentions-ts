import React, { useRef, useState } from 'react'
import { clsx } from 'clsx'

import { MentionsInput, Mention } from '../../../src'
import type { MentionDataItem, MentionsInputChangeEvent } from '../../../src'
import ExampleCard from './ExampleCard'
import {
  mentionPillAccentClass,
  mergeClassNames,
  multilineMentionsClassNames,
} from './mentionsClassNames'

const floatingSuggestions = mergeClassNames(multilineMentionsClassNames, {
  suggestions: clsx(
    multilineMentionsClassNames.suggestions,
    'absolute bottom-0 left-0 right-0 mt-0 w-full shadow-2xl'
  ),
  suggestionsList: clsx(multilineMentionsClassNames.suggestionsList, 'max-h-32'),
})

export default function Advanced({
  data,
  onBlur = () => {},
  onAdd = () => {},
}: {
  data: MentionDataItem[]
  onBlur?: () => void
  onAdd?: (...args: any[]) => void
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const [value, setValue] = useState('Hi {{johndoe}}!')
  const onMentionsChange = ({ value: nextValue }: MentionsInputChangeEvent) => setValue(nextValue)

  return (
    <ExampleCard
      title="Advanced formatting"
      description="Custom markup, programmatic focus, and flipped suggestion lists for power users."
      actions={
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-indigo-500/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-glow transition hover:bg-indigo-500"
          onClick={() => inputRef.current?.focus()}
        >
          Focus input
        </button>
      }
    >
      <MentionsInput
        value={value}
        onMentionsChange={onMentionsChange}
        onBlur={onBlur}
        className="mentions"
        classNames={floatingSuggestions}
        inputRef={inputRef}
        a11ySuggestionsListLabel={'Suggested mentions'}
      >
        <Mention
          markup="{{__id__}}"
          displayTransform={(id) => `<-- ${id} -->`}
          data={data}
          onAdd={onAdd}
          className={mentionPillAccentClass}
        />
      </MentionsInput>
    </ExampleCard>
  )
}
