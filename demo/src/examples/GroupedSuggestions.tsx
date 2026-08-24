import React, { useState } from 'react'

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
import { waitForAbortableDelay } from './waitForAbortableDelay'

type DirectoryExtra = {
  detail: string
}

const USERS: MentionDataItem<DirectoryExtra>[] = [
  { id: 'user:ada', display: 'Ada Lovelace', detail: 'Engineering' },
  { id: 'user:grace', display: 'Grace Hopper', detail: 'Platform' },
  { id: 'user:margaret', display: 'Margaret Hamilton', detail: 'Reliability' },
]

const TEAMS: MentionDataItem<DirectoryExtra>[] = [
  { id: 'team:frontend', display: 'Frontend Team', detail: 'Design systems' },
  { id: 'team:platform', display: 'Platform Team', detail: 'Infrastructure' },
  { id: 'team:support', display: 'Support Team', detail: 'Customer operations' },
]

const groupedClassNames = mergeClassNames(multilineMentionsClassNames, {
  suggestionsList: 'divide-y-0',
  suggestionSection: 'border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500',
  suggestionItem: 'px-4 py-2.5 text-sm text-slate-700',
  suggestionItemFocused: 'bg-indigo-50 text-indigo-700',
})

const matchesQuery = (item: MentionDataItem<DirectoryExtra>, query: string): boolean => {
  const normalizedQuery = query.toLocaleLowerCase()
  return [item.display, item.detail, String(item.id)].some((value) =>
    (value ?? '').toLocaleLowerCase().includes(normalizedQuery)
  )
}

async function fetchGroupedDirectory(
  query: string,
  { signal }: MentionSearchContext
): Promise<MentionDataPage<DirectoryExtra>> {
  await waitForAbortableDelay(180, signal)

  return {
    sections: [
      {
        id: 'users',
        label: 'Users',
        items: USERS.filter((item) => matchesQuery(item, query)),
      },
      {
        id: 'teams',
        label: 'Teams',
        items: TEAMS.filter((item) => matchesQuery(item, query)),
      },
    ],
  }
}

export default function GroupedSuggestions() {
  const [value, setValue] = useState('')
  const onMentionsChange = (change: MentionsInputChangeEvent<DirectoryExtra>) => {
    setValue(change.value)
  }

  return (
    <ExampleCard
      title="Grouped suggestions"
      description="Return page sections from one provider to show Users and Teams under the same @ trigger."
    >
      <MentionsInput
        value={value}
        onMentionsChange={onMentionsChange}
        className="mentions"
        classNames={groupedClassNames}
        placeholder="Type '@a', '@team', or '@platform'"
        a11ySuggestionsListLabel="Grouped people and team suggestions"
      >
        <Mention<DirectoryExtra>
          trigger="@"
          data={fetchGroupedDirectory}
          debounceMs={120}
          displayTransform={(id, display) => `@${display ?? String(id)}`}
          className={mentionPillClass}
        />
      </MentionsInput>
    </ExampleCard>
  )
}
