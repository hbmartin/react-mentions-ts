import React, { useState } from 'react'
import { clsx } from 'clsx'

import { Mention, MentionsInput } from '../../../src'
import type {
  MentionDataItem,
  MentionDataPage,
  MentionSearchContext,
  MentionsInputChangeEvent,
} from '../../../src'
import ExampleCard from './ExampleCard'
import {
  mentionPillClass,
  mergeClassNames,
  multilineMentionsClassNames,
} from './mentionsClassNames'

type UserExtra = {
  department: string
}

const DEPARTMENTS = ['Design', 'Engineering', 'Sales', 'Support', 'Ops'] as const
const TOTAL_USERS = 120
const PAGE_SIZE = 10
const SIMULATED_LATENCY_MS = 300

const ALL_USERS: MentionDataItem<UserExtra>[] = Array.from({ length: TOTAL_USERS }, (_, i) => {
  const department = DEPARTMENTS[i % DEPARTMENTS.length] ?? 'Engineering'
  return {
    id: `user-${String(i + 1).padStart(3, '0')}`,
    display: `User ${String(i + 1).padStart(3, '0')}`,
    department,
  }
})

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason as Error)
      return
    }

    const onAbort = () => {
      clearTimeout(timer)
      reject(signal.reason as Error)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })

async function fetchUserPage(
  query: string,
  { cursor, signal }: MentionSearchContext
): Promise<MentionDataPage<UserExtra>> {
  await wait(SIMULATED_LATENCY_MS, signal)

  const matches = ALL_USERS.filter((user) =>
    (user.display ?? String(user.id)).toLowerCase().includes(query.toLowerCase())
  )

  const offset = typeof cursor === 'number' ? cursor : 0
  const items = matches.slice(offset, offset + PAGE_SIZE)
  const nextOffset = offset + items.length
  const hasMore = nextOffset < matches.length

  return {
    items,
    nextCursor: hasMore ? nextOffset : null,
    hasMore,
  }
}

const paginatedClassNames = mergeClassNames(multilineMentionsClassNames, {
  suggestionsList: 'max-h-56 overflow-y-auto divide-y divide-slate-100',
  suggestionItem: 'flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-slate-900',
  suggestionItemFocused: 'bg-indigo-500/15 text-indigo-800',
})

export default function PaginatedUsers() {
  const [value, setValue] = useState('')
  const onMentionsChange = (change: MentionsInputChangeEvent<UserExtra>) => {
    setValue(change.value)
  }

  return (
    <ExampleCard
      title="Cursor paginated suggestions"
      description={`Scroll the suggestion list to load more. The provider returns pages of ${String(PAGE_SIZE)} until it exhausts ${String(TOTAL_USERS)} users.`}
    >
      <MentionsInput
        value={value}
        onMentionsChange={onMentionsChange}
        className="mentions"
        classNames={paginatedClassNames}
        placeholder="Type '@' and scroll the list to page through results"
        a11ySuggestionsListLabel="Paginated user suggestions"
      >
        <Mention<UserExtra>
          trigger="@"
          data={fetchUserPage}
          debounceMs={150}
          displayTransform={(id, display) => `@${display ?? String(id)}`}
          className={mentionPillClass}
          renderSuggestion={(suggestion, _query, highlightedDisplay, _index, focused) => (
            <div
              className={clsx(
                'flex w-full items-center justify-between gap-3',
                focused ? 'text-indigo-800' : 'text-slate-700'
              )}
            >
              <span className="truncate font-medium">{highlightedDisplay}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {suggestion.department}
              </span>
            </div>
          )}
        />
      </MentionsInput>
    </ExampleCard>
  )
}
