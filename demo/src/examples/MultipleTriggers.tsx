import React, { useState } from 'react'
import { clsx } from 'clsx'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem, MentionsInputChangeEvent } from '../../../src'
import ExampleCard from './ExampleCard'
import {
  mentionPillAccentClass,
  mentionPillClass,
  mergeClassNames,
  multilineMentionsClassNames,
} from './mentionsClassNames'

// use first/outer capture group to extract the full entered sequence to be replaced
// and second/inner capture group to extract search string from the match
const emailRegex = /(([^\s@]+@[^\s@]+\.[^\s@]+))$/

const suggestionRow = 'flex items-center justify-between rounded-xl px-4 py-2.5 text-sm'

export default function MultipleTriggers({
  data,
  onAdd = () => {},
}: {
  data: MentionDataItem[]
  onAdd?: (...args: any[]) => void
}) {
  const [value, setValue] = useState(
    "Hi @[John Doe](user:johndoe), \n\nlet's add [joe@smoe.com](email:joe@smoe.com) and @[John Doe](user:johndoe) to this conversation... "
  )
  const onMentionsChange = ({ value: nextValue }: MentionsInputChangeEvent) => setValue(nextValue)

  return (
    <ExampleCard
      title="Multiple trigger patterns"
      description="Mention teammates with @usernames or type an email address — the input switches styling based on the trigger."
    >
      <MentionsInput
        value={value}
        onMentionsChange={onMentionsChange}
        className="mentions"
        classNames={mergeClassNames(multilineMentionsClassNames, {
          suggestionItem: suggestionRow,
          suggestionItemFocused: clsx(suggestionRow, 'bg-indigo-50/80 text-indigo-600'),
        })}
        placeholder="Mention people using '@'"
        a11ySuggestionsListLabel={'Suggested mentions'}
      >
        <Mention
          markup="@[__display__](user:__id__)"
          trigger="@"
          data={data}
          renderSuggestion={(suggestion, _search, highlightedDisplay, _index, focused) => (
            <div
              className={clsx(
                suggestionRow,
                'transition',
                focused ? 'bg-indigo-50/80 text-indigo-600' : 'text-slate-600'
              )}
            >
              <span className="truncate font-medium">{highlightedDisplay}</span>
              {typeof suggestion === 'object' && suggestion ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                  @{suggestion.id}
                </span>
              ) : null}
            </div>
          )}
          onAdd={onAdd}
          className={mentionPillClass}
        />

        <Mention
          markup="[__display__](email:__id__)"
          trigger={emailRegex}
          data={(search) => [{ id: search, display: search }]}
          onAdd={onAdd}
          className={mentionPillAccentClass}
        />
      </MentionsInput>
    </ExampleCard>
  )
}
