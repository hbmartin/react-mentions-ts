import React, { useState } from 'react'
import { clsx } from 'clsx'

import { MentionsInput, Mention } from '../../../src'
import type { MentionsInputChangeEvent } from '../../../src'
import ExampleCard from './ExampleCard'
import {
  mentionPillClass,
  mergeClassNames,
  multilineMentionsClassNames,
} from './mentionsClassNames'

function fetchUsers(query: string) {
  if (!query) return Promise.resolve([])
  return fetch(`https://api.github.com/search/users?q=${query}`)
    .then((res) => res.json())
    .then((res) =>
      res.items.map((user: { login: string }) => ({ display: user.login, id: user.login }))
    )
}

const githubSuggestions = mergeClassNames(multilineMentionsClassNames, {
  suggestion: 'flex items-center gap-3 px-4 py-2.5 text-sm text-slate-100',
  suggestionFocused: 'bg-indigo-500/20 text-indigo-100',
})

export default function AsyncGithubUserMentions() {
  const [value, setValue] = useState('')
  const onMentionsChange = ({ value: nextValue }: MentionsInputChangeEvent) =>
    setValue(nextValue)

  return (
    <ExampleCard
      title="Async GitHub mentions"
      description="Hit the public GitHub API as you type — the component handles debouncing and focus management."
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
