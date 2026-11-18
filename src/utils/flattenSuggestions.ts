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

export interface FlattenedSuggestionSectionEntry {
  type: 'section'
  key: string
  label: ReactNode
  queryInfo: QueryInfo
}

export interface FlattenedSuggestionItemEntry<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> {
  type: 'item'
  key: string
  index: number
  result: SuggestionDataItem<Extra>
  queryInfo: QueryInfo
  sectionKey?: string
}

export type FlattenedSuggestionRenderEntry<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> = FlattenedSuggestionSectionEntry | FlattenedSuggestionItemEntry<Extra>

type OrderedSuggestionMapEntry<Extra extends Record<string, unknown> = Record<string, unknown>> =
  readonly [number, SuggestionsMap<Extra>[number]]

const getSuggestionId = <Extra extends Record<string, unknown>>(
  suggestion: SuggestionDataItem<Extra>
): string => String(suggestion.id)

const getOrderedSuggestionMapEntries = <
  Extra extends Record<string, unknown> = Record<string, unknown>,
>(
  children: ReactNode,
  suggestions: SuggestionsMap<Extra> | undefined
): Array<OrderedSuggestionMapEntry<Extra>> => {
  const suggestionsMap = suggestions ?? {}
  const orderedEntries: Array<OrderedSuggestionMapEntry<Extra>> = []
  const handledIndices = new Set<number>()
  const childNodes = Children.toArray(children)

  for (const [childIndex] of childNodes.entries()) {
    if (!Object.hasOwn(suggestionsMap, childIndex)) {
      continue
    }

    const entry = suggestionsMap[childIndex]
    handledIndices.add(childIndex)
    orderedEntries.push([childIndex, entry])
  }

  const remainingIndices = Object.keys(suggestionsMap)
    .map((key) => Number.parseInt(key, 10))
    .filter((index) => !Number.isNaN(index) && !handledIndices.has(index))
    .toSorted((a, b) => a - b)

  for (const index of remainingIndices) {
    orderedEntries.push([index, suggestionsMap[index]])
  }

  return orderedEntries
}

const flattenSuggestions = <Extra extends Record<string, unknown> = Record<string, unknown>>(
  children: ReactNode,
  suggestions: SuggestionsMap<Extra> | undefined
): FlattenedSuggestion<Extra>[] => {
  const flattened: FlattenedSuggestion<Extra>[] = []

  for (const [, entry] of getOrderedSuggestionMapEntries(children, suggestions)) {
    const { results, queryInfo } = entry
    for (const result of results) {
      flattened.push({ result, queryInfo })
    }
  }

  return flattened
}

export const flattenSuggestionRenderEntries = <
  Extra extends Record<string, unknown> = Record<string, unknown>,
>(
  children: ReactNode,
  suggestions: SuggestionsMap<Extra> | undefined
): Array<FlattenedSuggestionRenderEntry<Extra>> => {
  const flattened: Array<FlattenedSuggestionRenderEntry<Extra>> = []
  let suggestionIndex = 0

  for (const [childIndex, entry] of getOrderedSuggestionMapEntries(children, suggestions)) {
    const { queryInfo, results, sections } = entry
    const handledResults = new Set<SuggestionDataItem<Extra>>()

    if (sections !== undefined && sections.length > 0) {
      for (const section of sections) {
        const sectionKey = `${childIndex.toString()}-section-${section.key}`
        flattened.push({
          type: 'section',
          key: sectionKey,
          label: section.label,
          queryInfo,
        })

        for (const [sectionResultIndex, result] of section.results.entries()) {
          handledResults.add(result)
          flattened.push({
            type: 'item',
            key: `${sectionKey}-item-${getSuggestionId(result)}-${sectionResultIndex.toString()}`,
            index: suggestionIndex,
            result,
            queryInfo,
            sectionKey,
          })
          suggestionIndex += 1
        }
      }
    }

    for (const [resultIndex, result] of results.entries()) {
      if (handledResults.has(result)) {
        continue
      }

      flattened.push({
        type: 'item',
        key: `${childIndex.toString()}-item-${getSuggestionId(result)}-${resultIndex.toString()}`,
        index: suggestionIndex,
        result,
        queryInfo,
      })
      suggestionIndex += 1
    }
  }

  return flattened
}

export default flattenSuggestions
