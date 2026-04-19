import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem, MentionSearchContext, MentionsInputChangeEvent } from '../../../src'
import ExampleCard from './ExampleCard'
import {
  mentionPillClass,
  mergeClassNames,
  multilineMentionsClassNames,
} from './mentionsClassNames'
import { waitForAbortableDelay } from './waitForAbortableDelay'

const DIRECTORY: MentionDataItem[] = [
  { id: 'ada', display: 'Ada Lovelace' },
  { id: 'grace', display: 'Grace Hopper' },
  { id: 'linus', display: 'Linus Torvalds' },
  { id: 'margaret', display: 'Margaret Hamilton' },
]

async function fetchPeople(
  query: string,
  { signal }: MentionSearchContext
): Promise<MentionDataItem[]> {
  await waitForAbortableDelay(250, signal)

  if (query.toLowerCase().includes('fail')) {
    throw new Error('Directory service is offline')
  }

  return DIRECTORY.filter((person) =>
    (person.display ?? '').toLowerCase().includes(query.toLowerCase())
  )
}

const emptyErrorClassNames = mergeClassNames(multilineMentionsClassNames, {
  suggestionsStatus: 'px-0 py-0',
})

export default function EmptyAndError() {
  const [value, setValue] = useState('')
  const onMentionsChange = ({ value: next }: MentionsInputChangeEvent) => {
    setValue(next)
  }

  return (
    <ExampleCard
      title="Empty and error states"
      description="Custom renderEmpty and renderError take over when a query returns no matches or the async provider rejects. Try typing '@zzz' for empty, or '@fail' for error."
    >
      <MentionsInput
        value={value}
        onMentionsChange={onMentionsChange}
        className="mentions"
        classNames={emptyErrorClassNames}
        placeholder="Try @ada, @zzz (empty), or @fail (error)"
        a11ySuggestionsListLabel="People suggestions"
      >
        <Mention
          trigger="@"
          data={fetchPeople}
          debounceMs={150}
          displayTransform={(id, display) => `@${display ?? String(id)}`}
          className={mentionPillClass}
          renderEmpty={(query) => (
            <div className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600">
              <span aria-hidden="true" className="text-lg">
                🔍
              </span>
              <div>
                <p className="font-medium text-slate-800">No matches for &ldquo;{query}&rdquo;</p>
                <p className="text-xs text-slate-500">
                  Check spelling or invite them from the team directory.
                </p>
              </div>
            </div>
          )}
          renderError={(query, error) => {
            const message = error instanceof Error ? error.message : 'Something went wrong'
            return (
              <div role="alert" className="flex items-start gap-3 px-4 py-3 text-sm text-rose-700">
                <span aria-hidden="true" className="text-lg">
                  ⚠️
                </span>
                <div>
                  <p className="font-medium">
                    Couldn&rsquo;t load suggestions for &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-xs text-rose-500">{message}</p>
                </div>
              </div>
            )
          }}
        />
      </MentionsInput>
    </ExampleCard>
  )
}
