import { Children } from 'react'
import type { ReactNode } from 'react'
import type { QueryInfo, SuggestionDataItem, SuggestionsMap } from '../types'

export type FlattenedSuggestion<Extra extends Record<string, unknown> = Record<string, unknown>> = {
  result: SuggestionDataItem<Extra>
  queryInfo: QueryInfo
}

const flattenSuggestions = <Extra extends Record<string, unknown> = Record<string, unknown>>(
  children: ReactNode,
  suggestions: SuggestionsMap<Extra> | undefined
): FlattenedSuggestion<Extra>[] => {
  const suggestionsMap = suggestions ?? {}
  const flattened: FlattenedSuggestion<Extra>[] = []
  const handledIndices = new Set<number>()

  const childNodes = Children.toArray(children)

  childNodes.forEach((_child, childIndex) => {
    const entry = suggestionsMap[childIndex]
    if (!entry) {
      return
    }

    handledIndices.add(childIndex)
    const { results, queryInfo, resultQueryInfos } = entry
    results.forEach((result, index) => {
      const resultQueryInfo = resultQueryInfos?.[index] ?? queryInfo
      flattened.push({ result, queryInfo: resultQueryInfo })
    })
  })

  const remainingIndices = Object.keys(suggestionsMap)
    .map((key) => Number.parseInt(key, 10))
    .filter((index) => !Number.isNaN(index) && !handledIndices.has(index))
    .sort((a, b) => a - b)

  for (const index of remainingIndices) {
    const entry = suggestionsMap[index]
    if (!entry) {
      continue
    }

    const { results, queryInfo, resultQueryInfos } = entry
    results.forEach((result, idx) => {
      const resultQueryInfo = resultQueryInfos?.[idx] ?? queryInfo
      flattened.push({ result, queryInfo: resultQueryInfo })
    })
  }

  return flattened
}

export default flattenSuggestions
