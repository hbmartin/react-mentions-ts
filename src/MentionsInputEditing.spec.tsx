import React from 'react'
import { Mention } from './index'
import {
  applyInputChangeToMentionsValue,
  applyInsertTextToMentionsValue,
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

  it('derives the next snapshot when inserting text', () => {
    const result = applyInsertTextToMentionsValue(
      'Hello ',
      config,
      6,
      6,
      '@[Walter White](user:walter)'
    )

    expect(result.value).toBe('Hello @[Walter White](user:walter)')
    expect(result.snapshot.plainText).toBe('Hello Walter White')
    expect(result.nextSelectionStart).toBe('Hello Walter White'.length)
  })

  it('normalizes only the pasted payload when converting CRLF to LF', () => {
    const value = 'Keep\r\nline'
    const result = applyPasteToMentionsValue(value, config, value.length, value.length, '\r\nnext')

    expect(result.value).toBe('Keep\r\nline\nnext')
    expect(result.snapshot.plainText).toBe('Keep\r\nline\nnext')
    expect(result.nextSelectionStart).toBe('Keep\r\nline\nnext'.length)
  })

  it('normalizes lone carriage returns in inserted text', () => {
    const result = applyInsertTextToMentionsValue('Hello', config, 5, 5, '\rthere')

    expect(result.value).toBe('Hello\nthere')
    expect(result.snapshot.plainText).toBe('Hello\nthere')
    expect(result.nextSelectionStart).toBe('Hello\nthere'.length)
  })

  it('cuts mention markup while restoring the caret to the selection start', () => {
    const result = applyCutToMentionsValue('Hello @[Walter White](user:walter)', config, 6, 18)

    expect(result.value).toBe('Hello ')
    expect(result.snapshot.plainText).toBe('Hello ')
    expect(result.nextSelectionStart).toBe(6)
  })

  it('falls back to zero when selection bounds are null', () => {
    const range = getMarkupSelectionRange('Hello @[Walter White](user:walter)', config, null, null)

    expect(range.safeSelectionStart).toBe(0)
    expect(range.safeSelectionEnd).toBe(0)
    expect(range.markupStartIndex).toBe(0)
    expect(range.markupEndIndex).toBe(0)
  })

  it('uses the safe selection start when pasting without a tracked mention boundary', () => {
    const result = applyPasteToMentionsValue('Hello', config, null, null, ' friend')

    expect(result.value).toBe(' friendHello')
    expect(result.nextSelectionStart).toBe(' friend'.length)
  })

  it('restores the caret to the start of a mention when typing inside one', () => {
    const value = 'Hello @[Walter White](user:walter)'
    const plainTextValue = 'Hello W!'
    const result = applyInputChangeToMentionsValue(
      value,
      plainTextValue,
      config,
      7,
      7,
      plainTextValue.length,
      10,
      '!'
    )

    expect(result.shouldRestoreSelection).toBe(true)
    expect(result.nextSelectionStart).toBe(7)
    expect(result.nextSelectionEnd).toBe(7)
  })

  it('keeps the updated caret when there is no tracked mention range to restore', () => {
    const value = 'Hello @[Walter White](user:walter)'
    const plainTextValue = 'Hello Walter White!'
    const result = applyInputChangeToMentionsValue(
      value,
      plainTextValue,
      config,
      plainTextValue.length - 1,
      plainTextValue.length - 1,
      plainTextValue.length,
      null,
      '!'
    )

    expect(result.shouldRestoreSelection).toBe(false)
    expect(result.nextSelectionStart).toBe(plainTextValue.length)
    expect(result.nextSelectionEnd).toBe(plainTextValue.length)
  })
})
