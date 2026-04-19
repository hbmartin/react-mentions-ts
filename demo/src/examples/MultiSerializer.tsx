import React, { useState } from 'react'

import { createMarkupSerializer, Mention, MentionsInput } from '../../../src'
import type {
  MentionDataItem,
  MentionSerializer,
  MentionSerializerMatch,
  MentionsInputChangeEvent,
} from '../../../src'
import ExampleCard from './ExampleCard'
import {
  mentionPillAccentClass,
  mentionPillClass,
  multilineMentionsClassNames,
} from './mentionsClassNames'

const userSerializer = createMarkupSerializer('@[__display__](__id__)')

const TAG_PATTERN = /(?<!\S)#([A-Za-z][\w-]*)/g

const tagSerializer: MentionSerializer = {
  id: 'bare-hashtag',
  insert: ({ id }) => `#${String(id)}`,
  findAll: (value) => {
    const matches: MentionSerializerMatch[] = []
    const regex = new RegExp(TAG_PATTERN.source, 'g')
    let match: RegExpExecArray | null
    while ((match = regex.exec(value)) !== null) {
      const [markup, tag] = match
      if (typeof tag !== 'string') {
        continue
      }
      matches.push({
        markup,
        index: match.index,
        id: tag,
        display: tag,
      })
    }
    return matches
  },
}

const users: MentionDataItem[] = [
  { id: 'ada', display: 'Ada Lovelace' },
  { id: 'grace', display: 'Grace Hopper' },
  { id: 'linus', display: 'Linus Torvalds' },
  { id: 'margaret', display: 'Margaret Hamilton' },
]

const tags: MentionDataItem[] = [
  { id: 'launch', display: 'launch' },
  { id: 'retro', display: 'retro' },
  { id: 'roadmap', display: 'roadmap' },
  { id: 'incident', display: 'incident' },
  { id: 'design-review', display: 'design-review' },
]

export default function MultiSerializer() {
  const [value, setValue] = useState(
    'Ping @[Ada Lovelace](ada) before the #launch standup — thoughts on #roadmap?'
  )
  const onMentionsChange = ({ value: next }: MentionsInputChangeEvent) => {
    setValue(next)
  }

  return (
    <ExampleCard
      title="Mixed serializers: @users + #tags"
      description="Two Mention children emit different markup. @users use createMarkupSerializer bracketed markup, while #tags use a custom MentionSerializer that emits bare '#tag' text."
    >
      <MentionsInput
        value={value}
        onMentionsChange={onMentionsChange}
        className="mentions"
        classNames={multilineMentionsClassNames}
        placeholder="Mention teammates with '@' or topics with '#'"
        a11ySuggestionsListLabel="Suggested mentions and tags"
      >
        <Mention
          trigger="@"
          markup={userSerializer}
          data={users}
          displayTransform={(_id, display) => `@${display ?? ''}`}
          className={mentionPillClass}
        />
        <Mention
          trigger="#"
          markup={tagSerializer}
          data={tags}
          displayTransform={(id) => `#${String(id)}`}
          className={mentionPillAccentClass}
        />
      </MentionsInput>
      <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-900/90 p-3 text-xs leading-relaxed text-slate-100">
        {value || '(empty)'}
      </pre>
    </ExampleCard>
  )
}
