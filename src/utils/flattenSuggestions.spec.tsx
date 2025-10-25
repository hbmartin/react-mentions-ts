import React from 'react'
import flattenSuggestions from './flattenSuggestions'
import type { SuggestionDataItem, SuggestionsMap } from '../types'

const createSuggestion = (id: string, display?: string): SuggestionDataItem => ({
  id,
  display,
})

const createQueryInfo = (childIndex: number, displayMatchStart?: number) => ({
  childIndex,
  query: `query-${childIndex}`,
  querySequenceStart: childIndex,
  querySequenceEnd: childIndex + 1,
  plainTextValue: `plain-${childIndex}`,
  ...(displayMatchStart !== undefined ? { displayMatchStart } : {}),
})

describe('#flattenSuggestions', () => {
  it('places suggestions following the order of rendered children first', () => {
    const children = [<div key="0" />, <div key="1" />]

    const suggestions: SuggestionsMap = {
      1: {
        queryInfo: createQueryInfo(1),
        results: [createSuggestion('second')],
      },
      0: {
        queryInfo: createQueryInfo(0),
        results: [createSuggestion('first-1'), createSuggestion('first-2')],
      },
    }

    const flattened = flattenSuggestions(children, suggestions)

    expect(flattened.map((entry) => entry.queryInfo.childIndex)).toEqual([0, 0, 1])
    expect(
      flattened.map((entry) => (typeof entry.result === 'string' ? entry.result : entry.result.id))
    ).toEqual(['first-1', 'first-2', 'second'])
  })

  it('appends orphaned suggestions ordered by their indices', () => {
    const children = [<div key="0" />]

    const suggestions: SuggestionsMap = {
      4: {
        queryInfo: createQueryInfo(4),
        results: [createSuggestion('orphan-2')],
      },
      2: {
        queryInfo: createQueryInfo(2),
        results: [createSuggestion('orphan-1')],
      },
      0: {
        queryInfo: createQueryInfo(0),
        results: [createSuggestion('child')],
      },
    }

    const flattened = flattenSuggestions(children, suggestions)

    expect(flattened.map((entry) => entry.queryInfo.childIndex)).toEqual([0, 2, 4])
    expect(
      flattened.map((entry) => (typeof entry.result === 'string' ? entry.result : entry.result.id))
    ).toEqual(['child', 'orphan-1', 'orphan-2'])
  })

  it('uses result specific query info when provided', () => {
    const children = [<div key="0" />]

    const suggestions: SuggestionsMap = {
      0: {
        queryInfo: createQueryInfo(0),
        results: [createSuggestion('first'), createSuggestion('second')],
        resultQueryInfos: [createQueryInfo(0, 3), createQueryInfo(0, 5)],
      },
    }

    const flattened = flattenSuggestions(children, suggestions)

    expect(flattened.map((entry) => entry.queryInfo.displayMatchStart)).toEqual([3, 5])
  })

  it('returns an empty array when no suggestions are provided', () => {
    const flattened = flattenSuggestions([<div key="0" />], undefined)
    expect(flattened).toEqual([])
  })
})
