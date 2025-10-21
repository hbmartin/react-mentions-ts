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

const nerdFontClasses = mergeClassNames(multilineMentionsClassNames, {
  control: 'font-mono text-sm',
  highlighter: 'font-mono',
  input: 'font-mono text-sm',
})

const CustomInput = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      {...props}
      className={clsx(
        className,
        'min-h-[9rem] resize-none bg-slate-950/60 font-mono text-sm leading-6 text-emerald-100 placeholder:text-emerald-300/40 shadow-inner shadow-emerald-500/20'
      )}
    />
  )
)

export default function CustomInputComponent({
  data,
  onAdd = () => {},
}: {
  data: MentionDataItem[]
  onAdd?: (...args: any[]) => void
}) {
  const [value, setValue] = useState('')

  return (
    <ExampleCard
      title="Custom input component"
      description="Bring your own textarea — style it like an editor while keeping mentions intact."
    >
      <MentionsInput
        value={value}
        onChange={(_ev, newValue) => setValue(newValue)}
        className="mentions"
        classNames={nerdFontClasses}
        placeholder={"Mention people using '@'"}
        a11ySuggestionsListLabel={'Suggested mentions'}
        inputComponent={CustomInput}
      >
        <Mention data={data} onAdd={onAdd} className={mentionPillClass} />
      </MentionsInput>
    </ExampleCard>
  )
}
