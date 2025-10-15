import React, { useState } from 'react'
import { Mention, MentionsInput } from '../../../src'

import defaultStyle from './defaultStyle'
import defaultMentionStyle from './defaultMentionStyle'

// WTF
let container

export default function BottomGuard({ data, onAdd = () => {} }) {
  const [value, setValue] = useState('')
  const onChange = (ev, newValue) => setValue(newValue)

  return (
    <div
      id="suggestionPortal"
      style={{
        height: '400px',
      }}
      ref={(el) => {
        container = el
      }}
    >
      <h3>Bottom guard example</h3>
      <p>
        Note that the bottom input will open the suggestions list above the cursor. Also, the middle
        one will render its suggestions always on top, even if it has enough space below.
      </p>
      <div
        style={{
          position: 'absolute',
          height: '300px',
          width: '400px',
          overflow: 'auto',
          border: '1px solid green',
          padding: '8px',
        }}
      >
        <MentionsInput
          value={value}
          onChange={onChange}
          style={defaultStyle}
          placeholder={"Mention people using '@'"}
          a11ySuggestionsListLabel={'Suggested mentions'}
          suggestionsPortalHost={container}
          allowSuggestionsAboveCursor={true}
        >
          <Mention data={data} onAdd={onAdd} style={defaultMentionStyle} />
        </MentionsInput>
        <br />
        <br />
        <br />
        <br />
        <br />
        <MentionsInput
          value={value}
          onChange={onChange}
          style={defaultStyle}
          placeholder={"Mention people using '@'"}
          suggestionsPortalHost={container}
          forceSuggestionsAboveCursor={true}
        >
          <Mention data={data} onAdd={onAdd} style={defaultMentionStyle} />
        </MentionsInput>
        <br />
        <br />
        <br />
        <br />
        <MentionsInput
          value={value}
          onChange={onChange}
          style={defaultStyle}
          placeholder={"Mention people using '@'"}
          a11ySuggestionsListLabel={'Suggested mentions'}
          suggestionsPortalHost={container}
          allowSuggestionsAboveCursor={true}
        >
          <Mention data={data} onAdd={onAdd} style={defaultMentionStyle} />
        </MentionsInput>
      </div>
    </div>
  )
}
