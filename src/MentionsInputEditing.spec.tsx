import React from 'react'
import { Mention } from './index'
import {
  applyCutToMentionsValue,
  applyPasteToMentionsValue,
  getMarkupSelectionRange,
} from './MentionsInputEditing'
import readConfigFromChildren from './utils/readConfigFromChildren'

const config = readConfigFromChildren([<Mention key="mention" trigger="@" data={[]} />])

describe('MentionsInputEditing', () => {
  it('maps plain-text selections back to markup indices', () => {
    const range = getMarkupSelectionRange('Hello @[Walter White](user:walter)', config, 6, 18)

    expect(range.safeSelectionStart).toBe(6)
    expect(range.safeSelectionEnd).toBe(18)
    expect(range.markupStartIndex).toBe(6)
    expect(range.markupEndIndex).toBe('Hello @[Walter White](user:walter)'.length)
  })

  it('derives the next snapshot when pasting mention markup', () => {
    const result = applyPasteToMentionsValue('', config, 0, 0, '@[Walter White](user:walter)')

    expect(result.value).toBe('@[Walter White](user:walter)')
    expect(result.snapshot.plainText).toBe('Walter White')
    expect(result.snapshot.mentions[0]?.id).toBe('user:walter')
    expect(result.nextSelectionStart).toBe('Walter White'.length)
  })

  it('cuts mention markup while restoring the caret to the selection start', () => {
    const result = applyCutToMentionsValue('Hello @[Walter White](user:walter)', config, 6, 18)

    expect(result.value).toBe('Hello ')
    expect(result.snapshot.plainText).toBe('Hello ')
    expect(result.nextSelectionStart).toBe(6)
  })
})
