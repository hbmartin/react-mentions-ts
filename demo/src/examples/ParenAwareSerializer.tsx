import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'
import type {
  MentionDataItem,
  MentionSerializer,
  MentionSerializerMatch,
  MentionsInputChangeEvent,
} from '../../../src'
import ExampleCard from './ExampleCard'
import { mentionPillClass, multilineMentionsClassNames } from './mentionsClassNames'

const STRUCTURAL_CHARS = /[\\[\]()]/g
const ESCAPE_SEQUENCE = /\\([\\[\]()])/g

const escapePart = (value: string) => value.replace(STRUCTURAL_CHARS, (char) => `\\${char}`)
const unescapePart = (value: string) => value.replace(ESCAPE_SEQUENCE, '$1')

// Matches @[display](id) where display and id may contain escaped \ [ ] ( ).
const PAREN_AWARE_PATTERN = /@\[((?:\\[\\[\]()]|[^\\\]])+)\]\(((?:\\[\\[\]()]|[^\\)])+)\)/

const parenAwareSerializer: MentionSerializer = {
  id: 'paren-aware-user',
  insert: ({ id, display }) => `@[${escapePart(display)}](${escapePart(String(id))})`,
  findAll: (value) => {
    const matches: MentionSerializerMatch[] = []
    const regex = new RegExp(PAREN_AWARE_PATTERN.source, 'g')
    let match: RegExpExecArray | null
    while ((match = regex.exec(value)) !== null) {
      const [markup, rawDisplay, rawId] = match
      if (typeof rawDisplay !== 'string' || typeof rawId !== 'string') {
        continue
      }
      matches.push({
        markup,
        index: match.index,
        id: unescapePart(rawId),
        display: unescapePart(rawDisplay),
      })
    }
    return matches
  },
}

const teammates: MentionDataItem[] = [
  { id: 'wendy', display: 'Wendy (Marketing)' },
  { id: 'oneal(ceo)', display: "Alex O'Neal (CEO)" },
  { id: 'kai', display: 'Kai (Remote (US))' },
  { id: 'jess', display: 'Jess Park' },
  { id: 'mina', display: 'Mina Ishii (PM)' },
]

export default function ParenAwareSerializer() {
  const [value, setValue] = useState('Ping @[Wendy \\(Marketing\\)](wendy) about the launch.')
  const onMentionsChange = (change: MentionsInputChangeEvent) => {
    setValue(change.value)
  }

  return (
    <ExampleCard
      title="Custom serializer with parentheses"
      description="Pass a MentionSerializer object instead of a markup string. This one backslash-escapes structural characters so display names and ids can contain '(' and ')'."
    >
      <MentionsInput
        value={value}
        onMentionsChange={onMentionsChange}
        className="mentions"
        classNames={multilineMentionsClassNames}
        placeholder="Mention someone with '@' — try Wendy (Marketing)"
        a11ySuggestionsListLabel="Suggested teammates"
      >
        <Mention
          trigger="@"
          markup={parenAwareSerializer}
          data={teammates}
          className={mentionPillClass}
        />
      </MentionsInput>
      <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-900/90 p-3 text-xs leading-relaxed text-slate-100">
        {value || '(empty)'}
      </pre>
    </ExampleCard>
  )
}
