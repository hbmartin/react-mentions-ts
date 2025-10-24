import React, { useState } from 'react'
import { clsx } from 'clsx'

import { Mention, MentionsInput } from '../../../src'
import type { MentionDataItem, MentionsInputChangeHandler } from '../../../src'
import ExampleCard from './ExampleCard'
import { useExampleValue } from './hooks'
import {
  mentionPillAccentClass,
  mentionPillClass,
  mergeClassNames,
  multilineMentionsClassNames,
} from './mentionsClassNames'

// use first/outer capture group to extract the full entered sequence to be replaced
// and second/inner capture group to extract search string from the match
const emailRegex = /(([^\s@]+@[^\s@]+\.[^\s@]+))$/
const defaultValue =
  "Hi @[John Doe](user:johndoe), \n\nlet's add @[joe@smoe.com](email:joe@smoe.com) and @[John Doe](user:johndoe) to this conversation... "

const multiMentionClasses = mergeClassNames(multilineMentionsClassNames, {
  suggestionItem: 'flex items-center justify-between rounded-xl px-4 py-2.5 text-sm',
  suggestionItemFocused: 'bg-indigo-50/80 text-indigo-600',
})

function CutCopyPaste({
  data,
  disabledSource,
}: {
  data: MentionDataItem[]
  disabledSource?: boolean
}) {
  const [sourceValue, onSourceChange, onSourceAdd] = useExampleValue(defaultValue)
  const [targetValue, onTargetChange, onTargetAdd] = useExampleValue('')
  const [plainTextValue, setPlainTextValue] = useState('')

  return (
    <ExampleCard
      title="Copy & paste between inputs"
      description="Mentions survive clipboard hops, even when pasting into plain text fields."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-200">Source composer</h4>
          <p className="text-xs text-slate-400">
            Copy from the rich input{disabledSource ? ' (disabled state)' : ''}.
          </p>
          <MultiMention
            value={sourceValue}
            data={data}
            onMentionsChange={onSourceChange}
            onAdd={onSourceAdd}
            disabled={disabledSource}
          />
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-200">Target composer</h4>
          <p className="text-xs text-slate-400">Paste here — mentions stay intact.</p>
          <MultiMention
            value={targetValue}
            data={data}
            onMentionsChange={onTargetChange}
            onAdd={onTargetAdd}
          />
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-200">Plain text fallback</h4>
          <p className="text-xs text-slate-400">Or fall back to vanilla text output.</p>
          <textarea
            className="h-40 w-full rounded-2xl border border-slate-700/60 bg-slate-900/40 px-4 py-3 text-sm text-slate-100 shadow-inner shadow-slate-950/30 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
            value={plainTextValue}
            onChange={(event) => setPlainTextValue(event.target.value)}
          />
        </div>
      </div>
    </ExampleCard>
  )
}

const MultiMention = ({
  value,
  data,
  onMentionsChange,
  onAdd,
  disabled,
}: {
  value: string
  data: MentionDataItem[]
  onMentionsChange: MentionsInputChangeHandler
  onAdd: (...args: any[]) => void
  disabled?: boolean
}) => (
  <MentionsInput
    value={value}
    onMentionsChange={onMentionsChange}
    className="mentions"
    classNames={multiMentionClasses}
    placeholder={"Mention people using '@'"}
    a11ySuggestionsListLabel={'Suggested mentions'}
    disabled={disabled}
  >
    <Mention
      markup="@[__display__](user:__id__)"
      trigger="@"
      data={data}
      renderSuggestion={(suggestion, search, highlightedDisplay, index, focused) => (
        <div
          className={clsx(
            'flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition',
            focused ? 'bg-indigo-50/80 text-indigo-600' : 'text-slate-600'
          )}
        >
          <span className="truncate font-medium">{highlightedDisplay}</span>
          {typeof suggestion === 'object' && suggestion ? (
            <span className="text-xs font-semibold text-slate-400">@{suggestion.id}</span>
          ) : null}
        </div>
      )}
      onAdd={onAdd}
      className={mentionPillClass}
    />

    <Mention
      markup="@[__display__](email:__id__)"
      trigger={emailRegex}
      data={(search) => [{ id: search, display: search }]}
      onAdd={onAdd}
      className={mentionPillAccentClass}
    />
  </MentionsInput>
)

export default CutCopyPaste
