/* eslint-disable code-complete/enforce-meaningful-names */
import { Children } from 'react'
import type { ReactNode } from 'react'
import type { QueryInfo, SuggestionDataItem, SuggestionsMap } from '../types'

export interface FlattenedSuggestion<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> {
  result: SuggestionDataItem<Extra>
  queryInfo: QueryInfo
}

// eslint-disable-next-line code-complete/low-function-cohesion
const flattenSuggestions = <Extra extends Record<string, unknown> = Record<string, unknown>>(
  children: ReactNode,
  suggestions: SuggestionsMap<Extra> | undefined
): FlattenedSuggestion<Extra>[] => {
  const suggestionsMap = suggestions ?? {}
  const flattened: FlattenedSuggestion<Extra>[] = []
  const handledIndices = new Set<number>()

  const childNodes = Children.toArray(children)

  for (const [childIndex, _child] of childNodes.entries()) {
    const entry = suggestionsMap[childIndex]
    if (!entry) {
      continue
    }

    handledIndices.add(childIndex)
    const { results, queryInfo } = entry
    for (const result of results) {
      flattened.push({ result, queryInfo })
    }
  }

  const remainingIndices = Object.keys(suggestionsMap)
    .map((key) => Number.parseInt(key, 10))
    .filter((index) => !Number.isNaN(index) && !handledIndices.has(index))
    .sort((a, b) => a - b)

  for (const index of remainingIndices) {
    const entry = suggestionsMap[index]
    if (!entry) {
      continue
    }

    const { results, queryInfo } = entry
    for (const result of results) {
      flattened.push({ result, queryInfo })
    }
  }

  return flattened
}

export default flattenSuggestions
