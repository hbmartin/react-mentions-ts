import countSuggestions from './utils/countSuggestions'
import type {
  MentionDataItem,
  QueryInfo,
  SuggestionQueryState,
  SuggestionQueryStateMap,
  SuggestionsMap,
} from './types'

export interface SuggestionsLifecycleState<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> {
  suggestions: SuggestionsMap<Extra>
  queryStates: SuggestionQueryStateMap<Extra>
  focusIndex: number
}

export const createClearedSuggestionsState = <
  Extra extends Record<string, unknown> = Record<string, unknown>,
>(): SuggestionsLifecycleState<Extra> => ({
  suggestions: {},
  queryStates: {},
  focusIndex: 0,
})

export const createLoadingQueryState = <Extra extends Record<string, unknown>>(
  queryInfo: QueryInfo
): SuggestionQueryState<Extra> => ({
  queryInfo,
  results: [],
  status: 'loading',
})

export const isAbortError = (error: unknown): boolean =>
  typeof DOMException !== 'undefined' && error instanceof DOMException
    ? error.name === 'AbortError'
    : typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name?: string }).name === 'AbortError'

export const applySuccessfulQueryResult = <Extra extends Record<string, unknown>>(
  currentSuggestions: SuggestionsMap<Extra>,
  currentQueryStates: SuggestionQueryStateMap<Extra>,
  childIndex: number,
  queryInfo: QueryInfo,
  results: MentionDataItem<Extra>[],
  focusIndex: number,
  inlineAutocomplete: boolean
): SuggestionsLifecycleState<Extra> => {
  const suggestions: SuggestionsMap<Extra> = {
    ...currentSuggestions,
    [childIndex]: {
      queryInfo,
      results,
    },
  }
  const suggestionsCount = countSuggestions(suggestions)

  return {
    suggestions,
    focusIndex: inlineAutocomplete
      ? 0
      : focusIndex >= suggestionsCount
        ? Math.max(suggestionsCount - 1, 0)
        : focusIndex,
    queryStates: {
      ...currentQueryStates,
      [childIndex]: {
        queryInfo,
        results,
        status: 'success',
      },
    },
  }
}

export const applyErroredQueryResult = <Extra extends Record<string, unknown>>(
  currentSuggestions: SuggestionsMap<Extra>,
  currentQueryStates: SuggestionQueryStateMap<Extra>,
  childIndex: number,
  queryInfo: QueryInfo,
  error: unknown,
  focusIndex: number
): SuggestionsLifecycleState<Extra> => {
  const suggestions = Object.fromEntries(
    Object.entries(currentSuggestions).filter(([key]) => Number(key) !== childIndex)
  ) as SuggestionsMap<Extra>
  const suggestionsCount = countSuggestions(suggestions)

  return {
    suggestions,
    focusIndex: focusIndex >= suggestionsCount ? Math.max(suggestionsCount - 1, 0) : focusIndex,
    queryStates: {
      ...currentQueryStates,
      [childIndex]: {
        queryInfo,
        results: [],
        status: 'error',
        error,
      },
    },
  }
}
