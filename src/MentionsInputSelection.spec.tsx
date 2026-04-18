import React from 'react'
import { Mention } from './index'
import {
  areMentionOccurrencesEqual,
  computeMentionSelectionDetails,
  getMentionSelectionKey,
} from './MentionsInputSelection'
import readConfigFromChildren from './utils/readConfigFromChildren'

const config = readConfigFromChildren([<Mention key="mention" trigger="@" data={[]} />])
const mentions = [
  {
    id: 'walter',
    display: 'Walter White',
    childIndex: 0,
    index: 6,
    plainTextIndex: 6,
  },
]

describe('MentionsInputSelection', () => {
  it('classifies collapsed caret positions as inside or boundary', () => {
    const inside = computeMentionSelectionDetails(mentions, config, 9, 9)
    const boundary = computeMentionSelectionDetails(mentions, config, 6, 6)

    expect(inside.selections[0]?.selection).toBe('inside')
    expect(boundary.selections[0]?.selection).toBe('boundary')
    expect(inside.selectionMap[getMentionSelectionKey(0, 6)]).toBe('inside')
  })

  it('classifies range selections as partial or full', () => {
    const partial = computeMentionSelectionDetails(mentions, config, 3, 10)
    const full = computeMentionSelectionDetails(mentions, config, 6, 18)

    expect(partial.selections[0]?.selection).toBe('partial')
    expect(full.selections[0]?.selection).toBe('full')
  })

  it('treats markup index changes as a mention snapshot change', () => {
    expect(
      areMentionOccurrencesEqual(mentions, [
        {
          ...mentions[0],
          index: 7,
        },
      ])
    ).toBe(false)
  })
})
