import React, { useState } from 'react'
import { clsx } from 'clsx'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem } from '../../../src'
import ExampleCard from './ExampleCard'
import {
  mentionPillClass,
  mergeClassNames,
  multilineMentionsClassNames,
} from './mentionsClassNames'
import emojisData from './emojis.json'

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

export default function Emojis({
  data,
  onAdd = () => {},
}: {
  data: MentionDataItem[]
  onAdd?: (...args: any[]) => void
}) {
  const [emojis] = useState<EmojiEntry[]>(emojisData.emojis as EmojiEntry[])
  const [value, setValue] = useState('')

  const queryEmojis = (query: string) => {
    console.log('queryEmojis', query, emojis.length)
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
      description="Mix people mentions with emoji search powered by JSON data."
    >
      <MentionsInput
        value={value}
        onMentionsChange={({ value }) => setValue(value)}
        className="mentions"
        classNames={emojiClassNames}
        placeholder={"Press ':' for emojis, mention people using '@'"}
      >
        <Mention
          onAdd={onAdd}
          trigger="@"
          displayTransform={(username) => `@${username}`}
          data={data}
          className={mentionPillClass}
          appendSpaceOnAdd
        />
        <Mention
          onAdd={onAdd}
          trigger=":"
          data={queryEmojis}
          className="bg-transparent"
          displayTransform={(id) => String(id)}
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
