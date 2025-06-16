import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'

import defaultStyle from './defaultStyle'
import defaultMentionStyle from './defaultMentionStyle'

// eslint-disable-next-line no-unused-vars
import classNames from './example.module.css' // uses global css selector

const  CustomInput = React.forwardRef((props, ref) => {
  return <textarea ref={ref} {...props} className="custom-textarea" />
})

export default function CustomInputComponent({ data, onAdd = () => {}}) {
  const [value, setValue] = useState('');
  const onChange = (ev, newValue) => setValue(newValue);

  return (
    <div className="custom-input">
      <h3>Custom input component</h3>

      <MentionsInput
        value={value}
        onChange={onChange}
        style={defaultStyle}
        placeholder={"Mention people using '@'"}
        a11ySuggestionsListLabel={"Suggested mentions"}
        inputComponent={CustomInput}
      >
        <Mention data={data} onAdd={onAdd} style={defaultMentionStyle} />
      </MentionsInput>
    </div>
  )
}
