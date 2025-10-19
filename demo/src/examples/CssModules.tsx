import React, { useState } from 'react'

import { MentionsInput, Mention } from '../../../src'
import type { MentionDataItem } from '../../../src'
import ExampleCard from './ExampleCard'

import classNames from './example.module.css'

export default function CssModules({ data }: { data: MentionDataItem[] }) {
  const [value, setValue] = useState('Hi @[John Doe](johndoe)')
  const onChange = (_ev: unknown, newValue: string) => setValue(newValue)

  return (
    <ExampleCard
      title="CSS Modules integration"
      description="Prefer scoped styles? Combine BEM hooks with your favourite build-time tooling."
    >
      <MentionsInput
        value={value}
        onChange={onChange}
        className="mentions"
        classNames={classNames}
        a11ySuggestionsListLabel={'Suggested mentions'}
      >
        <Mention data={data} className={classNames.mentions__mention} />
      </MentionsInput>
    </ExampleCard>
  )
}
