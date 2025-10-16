import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'
import defaultMentionStyle from './defaultMentionStyle'
import defaultStyle from './defaultStyle'

const inlineStyle = {
  ...defaultStyle,
  inlineSuggestion: {
    ...defaultStyle.inlineSuggestion,
    fontStyle: 'italic',
  },
}

export default function InlineAutocomplete({ data }) {
  const [remainingHintValue, setRemainingHintValue] = useState('')
  const [fullHintValue, setFullHintValue] = useState('')

  return (
    <div className="inline-autocomplete">
      <h3>Inline autocomplete</h3>
      <p>Type “@al” and press Tab, Enter, or → to accept the hint. Press Esc to cycle options.</p>

      <MentionsInput
        value={remainingHintValue}
        onChange={(_event, newValue) => setRemainingHintValue(newValue)}
        suggestionsDisplay="inline"
        inlineSuggestionDisplay="remaining"
        style={inlineStyle}
        placeholder={'Inline hint (remaining characters)'}
      >
        <Mention data={data} style={defaultMentionStyle} />
      </MentionsInput>

      <MentionsInput
        value={fullHintValue}
        onChange={(_event, newValue) => setFullHintValue(newValue)}
        suggestionsDisplay="inline"
        inlineSuggestionDisplay="full"
        style={inlineStyle}
        placeholder={'Inline hint (full suggestion)'}
      >
        <Mention data={data} style={defaultMentionStyle} />
      </MentionsInput>
    </div>
  )
}
