import React, { useState } from 'react'
import { clsx } from 'clsx'

import { MentionsInput, Mention } from '../../../src'
import type { MentionDataItem, MentionSearchContext, MentionsInputChangeEvent } from '../../../src'
import ExampleCard from './ExampleCard'
import {
  mentionPillClass,
  mergeClassNames,
  multilineMentionsClassNames,
} from './mentionsClassNames'
import RenderTraceBadge from './profiling/RenderTraceBadge'
import { useRenderTrace } from './profiling/useRenderTrace'

async function fetchUsers(
  query: string,
  { signal }: MentionSearchContext
): Promise<MentionDataItem[]> {
  if (!query) {
    return Promise.resolve([])
  }

  const response = await fetch(`https://api.github.com/search/users?q=${query}`, { signal })
  if (!response.ok) {
    throw new Error(`GitHub user search failed (${response.status.toString()})`)
  }

  const data = (await response.json()) as { items?: Array<{ login: string }> }
  return (data.items ?? []).map((user) => ({ display: user.login, id: user.login }))
}

const githubSuggestions = mergeClassNames(multilineMentionsClassNames, {
  suggestionItem: 'flex items-center gap-3 px-4 py-2.5 text-sm text-slate-900',
  suggestionItemFocused: 'bg-indigo-500/20 text-indigo-900',
})

export default function AsyncGithubUserMentions() {
  const [value, setValue] = useState('')
  const renderCount = useRenderTrace('AsyncGithubUserMentions')
  const onMentionsChange = ({ value: nextValue }: MentionsInputChangeEvent) => setValue(nextValue)

  return (
    <ExampleCard
      title="Async GitHub mentions"
      description="Hit the public GitHub API as you type — the component handles debouncing, cancellation, and stale-result suppression."
      actions={<RenderTraceBadge count={renderCount} label="Card renders" />}
    >
      <MentionsInput
        value={value}
        onMentionsChange={onMentionsChange}
        className="mentions"
        classNames={githubSuggestions}
        placeholder="Mention any GitHub user using @username"
        a11ySuggestionsListLabel={'Suggested GitHub users for mention'}
      >
        <Mention
          displayTransform={(login) => `@${login}`}
          trigger="@"
          data={fetchUsers}
          debounceMs={200}
          maxSuggestions={6}
          renderSuggestion={(suggestion, _search, highlightedDisplay, _index, focused) => (
            <div
              className={clsx(
                'flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm transition',
                focused ? 'bg-indigo-500/20 text-indigo-100' : 'text-slate-200'
              )}
            >
              <span className="truncate font-medium">{highlightedDisplay}</span>
              {typeof suggestion === 'object' && suggestion ? (
                <code className="rounded bg-slate-900/60 px-2 py-0.5 text-xs text-sky-300">
                  @{suggestion.id}
                </code>
              ) : null}
            </div>
          )}
          className={mentionPillClass}
        />
      </MentionsInput>
    </ExampleCard>
  )
}
