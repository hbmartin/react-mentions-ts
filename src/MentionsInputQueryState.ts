import { countSuggestions } from './utils'
import type {
  NormalizedMentionDataPage,
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
  queryInfo: QueryInfo,
  ignoreAccents: boolean
): SuggestionQueryState<Extra> => ({
  queryInfo,
  results: [],
  status: 'loading',
  ignoreAccents,
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
  page: NormalizedMentionDataPage<Extra>,
  focusIndex: number,
  inlineAutocomplete: boolean
): SuggestionsLifecycleState<Extra> => {
  const results = page.items
  const ignoreAccents = Object.hasOwn(currentQueryStates, childIndex)
    ? currentQueryStates[childIndex].ignoreAccents
    : false
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
        ignoreAccents,
        pagination: page.paginated
          ? {
              nextCursor: page.nextCursor,
              hasMore: page.hasMore,
              isLoading: false,
            }
          : undefined,
      },
    },
  }
}

export const applyLoadingPageResult = <Extra extends Record<string, unknown>>(
  currentSuggestions: SuggestionsMap<Extra>,
  currentQueryStates: SuggestionQueryStateMap<Extra>,
  childIndex: number,
  focusIndex: number
): SuggestionsLifecycleState<Extra> => {
  if (!Object.hasOwn(currentQueryStates, childIndex)) {
    return {
      suggestions: currentSuggestions,
      queryStates: currentQueryStates,
      focusIndex,
    }
  }

  const currentQueryState = currentQueryStates[childIndex]

  if (currentQueryState.pagination === undefined) {
    return {
      suggestions: currentSuggestions,
      queryStates: currentQueryStates,
      focusIndex,
    }
  }

  return {
    suggestions: currentSuggestions,
    focusIndex,
    queryStates: {
      ...currentQueryStates,
      [childIndex]: {
        ...currentQueryState,
        pagination: {
          ...currentQueryState.pagination,
          isLoading: true,
          error: undefined,
        },
      },
    },
  }
}

export const applySuccessfulPageResult = <Extra extends Record<string, unknown>>(
  currentSuggestions: SuggestionsMap<Extra>,
  currentQueryStates: SuggestionQueryStateMap<Extra>,
  childIndex: number,
  queryInfo: QueryInfo,
  page: NormalizedMentionDataPage<Extra>,
  focusIndex: number
): SuggestionsLifecycleState<Extra> => {
  if (!Object.hasOwn(currentQueryStates, childIndex)) {
    return {
      suggestions: currentSuggestions,
      queryStates: currentQueryStates,
      focusIndex,
    }
  }

  const currentQueryState = currentQueryStates[childIndex]

  if (currentQueryState.pagination === undefined) {
    return {
      suggestions: currentSuggestions,
      queryStates: currentQueryStates,
      focusIndex,
    }
  }

  const previousResults = Object.hasOwn(currentSuggestions, childIndex)
    ? currentSuggestions[childIndex].results
    : []
  const results = [...previousResults, ...page.items]
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
    focusIndex: focusIndex >= suggestionsCount ? Math.max(suggestionsCount - 1, 0) : focusIndex,
    queryStates: {
      ...currentQueryStates,
      [childIndex]: {
        ...currentQueryState,
        queryInfo,
        results,
        status: 'success',
        pagination: {
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          isLoading: false,
        },
      },
    },
  }
}

export const applyErroredPageResult = <Extra extends Record<string, unknown>>(
  currentSuggestions: SuggestionsMap<Extra>,
  currentQueryStates: SuggestionQueryStateMap<Extra>,
  childIndex: number,
  error: unknown,
  focusIndex: number
): SuggestionsLifecycleState<Extra> => {
  if (!Object.hasOwn(currentQueryStates, childIndex)) {
    return {
      suggestions: currentSuggestions,
      queryStates: currentQueryStates,
      focusIndex,
    }
  }

  const currentQueryState = currentQueryStates[childIndex]

  if (currentQueryState.pagination === undefined) {
    return {
      suggestions: currentSuggestions,
      queryStates: currentQueryStates,
      focusIndex,
    }
  }

  return {
    suggestions: currentSuggestions,
    focusIndex,
    queryStates: {
      ...currentQueryStates,
      [childIndex]: {
        ...currentQueryState,
        pagination: {
          ...currentQueryState.pagination,
          isLoading: false,
          error,
        },
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
  const ignoreAccents = Object.hasOwn(currentQueryStates, childIndex)
    ? currentQueryStates[childIndex].ignoreAccents
    : false

  return {
    suggestions,
    focusIndex: focusIndex >= suggestionsCount ? Math.max(suggestionsCount - 1, 0) : focusIndex,
    queryStates: {
      ...currentQueryStates,
      [childIndex]: {
        queryInfo,
        results: [],
        status: 'error',
        ignoreAccents,
        error,
      },
    },
  }
}
