import React from 'react'

import { MentionsInput, Mention } from '../../../src'

import defaultStyle from './defaultStyle'
import defaultMentionStyle from './defaultMentionStyle'

import { merge } from '../../../src/utils'

const style = merge({}, defaultStyle, {
  suggestions: {
    list: {
      maxHeight: 100,
      overflow: 'auto',
      position: 'absolute',
      bottom: 14,
    },
  },
})

export default function Advanced({ data, onBlur = () => {}, onAdd = () => {} }) {
  let inputEl = React.createRef()
  const [value, setValue] = useState('Hi {{johndoe}}!');
  const onChange = (ev, newValue) => setValue(newValue);

  return (
    <div className="advanced">
      <h3>Advanced options</h3>

      <MentionsInput
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        style={style}
        inputRef={inputEl}
        a11ySuggestionsListLabel={"Suggested mentions"}
      >
        <Mention
          markup="{{__id__}}"
          displayTransform={id => `<-- ${id} -->`}
          data={data}
          onAdd={onAdd}
          style={defaultMentionStyle}
        />
      </MentionsInput>

      <button
        onClick={() => {
          inputEl.current.focus()
        }}
      >
        focus programmatically
      </button>
    </div>
  )
}
