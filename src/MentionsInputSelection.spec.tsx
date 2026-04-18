import React from 'react'
import { Mention } from './index'
import {
  areMentionOccurrencesEqual,
  computeMentionSelectionDetails,
  getMentionSelectionKey,
  getMentionSelectionMap,
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

  it('compares mention snapshots across id, child, plain-text, and display fields', () => {
    expect(areMentionOccurrencesEqual(mentions, [{ ...mentions[0] }])).toBe(true)
    expect(
      areMentionOccurrencesEqual(mentions, [
        {
          ...mentions[0],
          id: 'heisenberg',
        },
      ])
    ).toBe(false)
    expect(
      areMentionOccurrencesEqual(mentions, [
        {
          ...mentions[0],
          childIndex: 1,
        },
      ])
    ).toBe(false)
    expect(
      areMentionOccurrencesEqual(mentions, [
        {
          ...mentions[0],
          plainTextIndex: 7,
        },
      ])
    ).toBe(false)
    expect(
      areMentionOccurrencesEqual(mentions, [
        {
          ...mentions[0],
          display: 'Heisenberg',
        },
      ])
    ).toBe(false)
  })

  it('treats length changes as mention snapshot changes', () => {
    expect(areMentionOccurrencesEqual(mentions, [])).toBe(false)
  })

  it('returns an empty selection when the caret bounds are missing', () => {
    expect(computeMentionSelectionDetails(mentions, config, null, 2)).toEqual({
      selections: [],
      selectionMap: {},
    })
  })

  it('returns null for non-overlapping ranges and falls back to an empty serializer id', () => {
    const result = computeMentionSelectionDetails(
      [
        {
          id: 'orphan',
          display: 'Orphan',
          childIndex: 9,
          index: 0,
          plainTextIndex: 0,
        },
      ],
      config,
      0,
      6
    )

    expect(result.selections[0]).toMatchObject({
      id: 'orphan',
      selection: 'full',
      serializerId: '',
    })
    expect(getMentionSelectionMap(mentions, config, 30, 40)).toEqual({})
  })
})
