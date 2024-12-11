import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'

import defaultStyle from './defaultStyle'
import defaultMentionStyle from './defaultMentionStyle'

export default function SingleLine({ value, data, onChange, onAdd }) {
  const [value, setValue] = useState('');
  const onChange = (ev, newValue) => setValue(newValue);

  return (
    <div className="single-line">
      <h3>Single line input</h3>

      <MentionsInput
        singleLine
        value={value}
        onChange={onChange}
        style={defaultStyle}
        placeholder={"Mention people using '@'"}
        a11ySuggestionsListLabel={"Suggested mentions"}
      >
        <Mention data={data} onAdd={onAdd} style={defaultMentionStyle} />
      </MentionsInput>
    </div>
  )
}
