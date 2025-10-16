import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'
import defaultMentionStyle from './defaultMentionStyle'
import defaultStyle from './defaultStyle'

export default function SingleLine({ data, onAdd }) {
  const [value, setValue] = useState('')
  const onChange = (ev, newValue) => {
    setValue(newValue)
    console.log('onChange', newValue)
  }
  return (
    <div className="single-line">
      <h3>Single line input</h3>

      <MentionsInput
        singleLine
        value={value}
        onChange={onChange}
        style={defaultStyle}
        placeholder={"Mention people using '@'"}
        a11ySuggestionsListLabel={'Suggested mentions'}
      >
        <Mention data={data} onAdd={onAdd} style={defaultMentionStyle} />
      </MentionsInput>
    </div>
  )
}
