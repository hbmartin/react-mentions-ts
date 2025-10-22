import React, { useEffect, useState } from 'react'
import { clsx } from 'clsx'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem } from '../../../src'
import ExampleCard from './ExampleCard'
import {
  mentionPillClass,
  mergeClassNames,
  multilineMentionsClassNames,
} from './mentionsClassNames'

const neverMatchingRegex = /($a)/

type EmojiEntry = {
  emoji: string
  name: string
}

const emojiClassNames = mergeClassNames(multilineMentionsClassNames, {
  suggestionItem: 'flex items-center gap-3 px-4 py-2.5 text-sm text-slate-100',
  suggestionItemFocused: 'bg-emerald-500/20 text-emerald-800',
  suggestionDisplay: 'flex items-center gap-3',
  suggestionHighlight: 'font-semibold text-emerald-800',
})

export default function Emojis({ data }: { data: MentionDataItem[] }) {
  const [emojis, setEmojis] = useState<EmojiEntry[]>([])
  const [value, setValue] = useState('')

  useEffect(() => {
    fetch(
      'https://gist.githubusercontent.com/oliveratgithub/0bf11a9aff0d6da7b46f1490f86a71eb/raw/d8e4b78cfe66862cf3809443c1dba017f37b61db/emojis.json'
    )
      .then((response) => response.json())
      .then((jsonData) => {
        setEmojis(jsonData.emojis as EmojiEntry[])
      })
  }, [])

  const queryEmojis = (query: string) => {
    if (!query) return Promise.resolve([])

    const lower = query.toLowerCase()
    return Promise.resolve(
      emojis
        .filter((emoji) => emoji.name.includes(lower))
        .slice(0, 10)
        .map(({ emoji, name }) => ({ id: emoji, display: `${emoji} ${name}` }))
    )
  }

  return (
    <ExampleCard
      title="Emoji support"
      description="Mix people mentions with emoji search powered by remote JSON data."
    >
      <MentionsInput
        value={value}
        onChange={({ value }) => setValue(value)}
        className="mentions"
        classNames={emojiClassNames}
        placeholder={"Press ':' for emojis, mention people using '@'"}
      >
        <Mention
          trigger="@"
          displayTransform={(username) => `@${username}`}
          markup="@__id__"
          data={data}
          regex={/@(\S+)/}
          className={mentionPillClass}
          appendSpaceOnAdd
        />
        <Mention
          trigger=":"
          markup="__id__"
          regex={neverMatchingRegex}
          data={queryEmojis}
          renderSuggestion={(suggestion, _search, highlightedDisplay, _index, focused) => {
            return (
              <div
                className={clsx(
                  'flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition',
                  focused ? 'bg-emerald-500/20 text-emerald-100' : 'text-slate-100'
                )}
              >
                <span className="text-2xl" aria-hidden="true">
                  {typeof suggestion === 'object' ? suggestion.id : suggestion}
                </span>
                <span className="truncate text-left text-sm">{highlightedDisplay}</span>
              </div>
            )
          }}
        />
      </MentionsInput>
    </ExampleCard>
  )
}
