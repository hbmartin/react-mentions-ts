import React, { useState } from 'react'
import { clsx } from 'clsx'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem, MentionSearchContext, MentionsInputChangeEvent } from '../../../src'
import ExampleCard from './ExampleCard'
import {
  mentionPillClass,
  mergeClassNames,
  multilineMentionsClassNames,
} from './mentionsClassNames'

type Availability = 'online' | 'away' | 'offline'

type PersonExtra = {
  avatar: string
  role: string
  availability: Availability
}

const PEOPLE: MentionDataItem<PersonExtra>[] = [
  {
    id: 'ada',
    display: 'Ada Lovelace',
    avatar: '👩‍💻',
    role: 'Staff Engineer',
    availability: 'online',
  },
  {
    id: 'grace',
    display: 'Grace Hopper',
    avatar: '👩‍🔬',
    role: 'Compiler Lead',
    availability: 'online',
  },
  {
    id: 'linus',
    display: 'Linus Torvalds',
    avatar: '🧑‍💻',
    role: 'Kernel Architect',
    availability: 'away',
  },
  {
    id: 'margaret',
    display: 'Margaret Hamilton',
    avatar: '👩‍🚀',
    role: 'Systems Engineer',
    availability: 'offline',
  },
  {
    id: 'alan',
    display: 'Alan Kay',
    avatar: '🧑‍🏫',
    role: 'Research Director',
    availability: 'online',
  },
  {
    id: 'barbara',
    display: 'Barbara Liskov',
    avatar: '👩‍🏫',
    role: 'Principal Scientist',
    availability: 'away',
  },
]

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason as Error)
      },
      { once: true }
    )
  })

/**
 * Subsequence fuzzy matcher that returns a highlight range per matched character —
 * demonstrates multi-range highlights, which the built-in array source (single
 * contiguous substring match) cannot produce.
 */
function fuzzyMatch(display: string, query: string): { start: number; end: number }[] | null {
  if (query.length === 0) {
    return []
  }

  const ranges: { start: number; end: number }[] = []
  const lowerDisplay = display.toLowerCase()
  const lowerQuery = query.toLowerCase()

  let cursor = 0
  for (const char of lowerQuery) {
    const index = lowerDisplay.indexOf(char, cursor)
    if (index === -1) {
      return null
    }
    const last = ranges.at(-1)
    if (last && last.end === index) {
      last.end = index + 1
    } else {
      ranges.push({ start: index, end: index + 1 })
    }
    cursor = index + 1
  }

  return ranges
}

async function searchPeople(
  query: string,
  { signal }: MentionSearchContext
): Promise<MentionDataItem<PersonExtra>[]> {
  await wait(180, signal)

  return PEOPLE.flatMap((person) => {
    const display = person.display ?? String(person.id)
    const highlights = fuzzyMatch(display, query)
    if (highlights === null) {
      return []
    }
    return [{ ...person, highlights }]
  })
}

const availabilityStyles: Record<Availability, string> = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  offline: 'bg-slate-400',
}

const richClassNames = mergeClassNames(multilineMentionsClassNames, {
  suggestionItem: 'flex items-start gap-3 px-4 py-3 text-sm text-slate-900',
  suggestionItemFocused: 'bg-indigo-500/15 text-indigo-900',
})

export default function RichSuggestionData() {
  const [value, setValue] = useState('')
  const onMentionsChange = (change: MentionsInputChangeEvent<PersonExtra>) => {
    setValue(change.value)
  }

  return (
    <ExampleCard
      title="Rich suggestion data"
      description="Typed Extra fields (avatar, role, availability) render beside each suggestion, and the provider returns multi-range fuzzy-match highlights. Try '@grh' to see subsequence matching."
    >
      <MentionsInput
        value={value}
        onMentionsChange={onMentionsChange}
        className="mentions"
        classNames={richClassNames}
        placeholder="Try @grh, @kay, or @hamil"
        a11ySuggestionsListLabel="People suggestions"
      >
        <Mention<PersonExtra>
          trigger="@"
          data={searchPeople}
          debounceMs={150}
          displayTransform={(id, display) => `@${display ?? String(id)}`}
          className={mentionPillClass}
          renderSuggestion={(suggestion, _query, highlightedDisplay, _index, focused) => (
            <div
              className={clsx(
                'flex w-full items-start gap-3',
                focused ? 'text-indigo-900' : 'text-slate-800'
              )}
            >
              <span className="text-2xl leading-none" aria-hidden="true">
                {suggestion.avatar}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{highlightedDisplay}</span>
                <span className="truncate text-xs text-slate-500">{suggestion.role}</span>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span
                  aria-hidden="true"
                  className={clsx(
                    'h-2 w-2 rounded-full',
                    availabilityStyles[suggestion.availability]
                  )}
                />
                {suggestion.availability}
              </span>
            </div>
          )}
        />
      </MentionsInput>
    </ExampleCard>
  )
}
