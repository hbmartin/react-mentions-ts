import { countSuggestions } from './utils'
import type {
  NormalizedMentionDataPage,
  QueryInfo,
  SuggestionQueryState,
  SuggestionQueryStateMap,
  SuggestionSection,
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

type PaginatedSuggestionQueryState<Extra extends Record<string, unknown>> =
  SuggestionQueryState<Extra> & {
    pagination: NonNullable<SuggestionQueryState<Extra>['pagination']>
  }

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

const preserveSuggestionsState = <Extra extends Record<string, unknown>>(
  currentSuggestions: SuggestionsMap<Extra>,
  currentQueryStates: SuggestionQueryStateMap<Extra>,
  focusIndex: number
): SuggestionsLifecycleState<Extra> => ({
  suggestions: currentSuggestions,
  queryStates: currentQueryStates,
  focusIndex,
})

const getCurrentQueryState = <Extra extends Record<string, unknown>>(
  currentQueryStates: SuggestionQueryStateMap<Extra>,
  childIndex: number
): SuggestionQueryState<Extra> | null =>
  Object.hasOwn(currentQueryStates, childIndex) ? currentQueryStates[childIndex] : null

const getCurrentPaginatedQueryState = <Extra extends Record<string, unknown>>(
  currentQueryStates: SuggestionQueryStateMap<Extra>,
  childIndex: number
): PaginatedSuggestionQueryState<Extra> | null => {
  const currentQueryState = getCurrentQueryState(currentQueryStates, childIndex)

  return currentQueryState?.pagination === undefined
    ? null
    : (currentQueryState as PaginatedSuggestionQueryState<Extra>)
}

const clampFocusIndex = <Extra extends Record<string, unknown>>(
  suggestions: SuggestionsMap<Extra>,
  focusIndex: number
): number => {
  const suggestionsCount = countSuggestions(suggestions)

  return focusIndex >= suggestionsCount ? Math.max(suggestionsCount - 1, 0) : focusIndex
}

const getDefinedSections = <Extra extends Record<string, unknown>>(
  sections: SuggestionSection<Extra>[] | undefined
): SuggestionSection<Extra>[] | undefined =>
  sections === undefined || sections.length === 0 ? undefined : sections

const createSuggestionsEntry = <Extra extends Record<string, unknown>>(
  queryInfo: QueryInfo,
  results: SuggestionQueryState<Extra>['results'],
  sections?: SuggestionSection<Extra>[]
): SuggestionsMap<Extra>[number] => ({
  queryInfo,
  results,
  ...(getDefinedSections(sections) === undefined ? {} : { sections }),
})

const mergeSuggestionSections = <Extra extends Record<string, unknown>>(
  previousSections: SuggestionSection<Extra>[] | undefined,
  nextSections: SuggestionSection<Extra>[] | undefined
): SuggestionSection<Extra>[] | undefined => {
  if (previousSections === undefined || previousSections.length === 0) {
    return getDefinedSections(nextSections)
  }

  if (nextSections === undefined || nextSections.length === 0) {
    return previousSections
  }

  const mergedSections = previousSections.map((section) => ({
    ...section,
    results: [...section.results],
  }))
  const sectionIndexByKey = new Map(
    mergedSections.map((section, sectionIndex) => [section.key, sectionIndex] as const)
  )

  for (const section of nextSections) {
    const existingSectionIndex = sectionIndexByKey.get(section.key)

    if (existingSectionIndex === undefined) {
      sectionIndexByKey.set(section.key, mergedSections.length)
      mergedSections.push({
        ...section,
        results: [...section.results],
      })
      continue
    }

    const existingSection = mergedSections[existingSectionIndex]
    mergedSections[existingSectionIndex] = {
      ...existingSection,
      results: [...existingSection.results, ...section.results],
    }
  }

  return mergedSections
}

const applyPaginationResult = <Extra extends Record<string, unknown>>(
  currentSuggestions: SuggestionsMap<Extra>,
  currentQueryStates: SuggestionQueryStateMap<Extra>,
  childIndex: number,
  currentQueryState: PaginatedSuggestionQueryState<Extra>,
  focusIndex: number,
  pagination: PaginatedSuggestionQueryState<Extra>['pagination']
): SuggestionsLifecycleState<Extra> => ({
  suggestions: currentSuggestions,
  focusIndex,
  queryStates: {
    ...currentQueryStates,
    [childIndex]: {
      ...currentQueryState,
      pagination,
    },
  },
})

const applyPagePaginationResult = <Extra extends Record<string, unknown>>(
  currentSuggestions: SuggestionsMap<Extra>,
  currentQueryStates: SuggestionQueryStateMap<Extra>,
  childIndex: number,
  focusIndex: number,
  getPagination: (
    currentQueryState: PaginatedSuggestionQueryState<Extra>
  ) => PaginatedSuggestionQueryState<Extra>['pagination']
): SuggestionsLifecycleState<Extra> => {
  const currentQueryState = getCurrentPaginatedQueryState(currentQueryStates, childIndex)
  if (!currentQueryState) {
    return preserveSuggestionsState(currentSuggestions, currentQueryStates, focusIndex)
  }

  return applyPaginationResult(
    currentSuggestions,
    currentQueryStates,
    childIndex,
    currentQueryState,
    focusIndex,
    getPagination(currentQueryState)
  )
}

export const applySuccessfulQueryResult = <Extra extends Record<string, unknown>>(
  currentSuggestions: SuggestionsMap<Extra>,
  currentQueryStates: SuggestionQueryStateMap<Extra>,
  childIndex: number,
  queryInfo: QueryInfo,
  page: NormalizedMentionDataPage<Extra>,
  focusIndex: number,
  inlineAutocomplete: boolean
): SuggestionsLifecycleState<Extra> => {
  const currentQueryState = getCurrentQueryState(currentQueryStates, childIndex)
  if (!currentQueryState) {
    return preserveSuggestionsState(currentSuggestions, currentQueryStates, focusIndex)
  }

  const results = page.items
  const sections = getDefinedSections(page.sections)
  const ignoreAccents = currentQueryState.ignoreAccents ?? false
  const suggestions: SuggestionsMap<Extra> = {
    ...currentSuggestions,
    [childIndex]: createSuggestionsEntry(queryInfo, results, sections),
  }
  const nextFocusIndex = inlineAutocomplete ? 0 : clampFocusIndex(suggestions, focusIndex)

  return {
    suggestions,
    focusIndex: nextFocusIndex,
    queryStates: {
      ...currentQueryStates,
      [childIndex]: {
        queryInfo,
        results,
        ...(sections === undefined ? {} : { sections }),
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
  return applyPagePaginationResult(
    currentSuggestions,
    currentQueryStates,
    childIndex,
    focusIndex,
    (currentQueryState) => ({
      ...currentQueryState.pagination,
      isLoading: true,
      error: undefined,
    })
  )
}

export const applySuccessfulPageResult = <Extra extends Record<string, unknown>>(
  currentSuggestions: SuggestionsMap<Extra>,
  currentQueryStates: SuggestionQueryStateMap<Extra>,
  childIndex: number,
  queryInfo: QueryInfo,
  page: NormalizedMentionDataPage<Extra>,
  focusIndex: number
): SuggestionsLifecycleState<Extra> => {
  const currentQueryState = getCurrentPaginatedQueryState(currentQueryStates, childIndex)
  if (!currentQueryState) {
    return preserveSuggestionsState(currentSuggestions, currentQueryStates, focusIndex)
  }

  const previousResults = Object.hasOwn(currentSuggestions, childIndex)
    ? currentSuggestions[childIndex].results
    : []
  const previousSections = Object.hasOwn(currentSuggestions, childIndex)
    ? currentSuggestions[childIndex].sections
    : undefined
  const results = [...previousResults, ...page.items]
  const sections = mergeSuggestionSections(previousSections, page.sections)
  const suggestions: SuggestionsMap<Extra> = {
    ...currentSuggestions,
    [childIndex]: createSuggestionsEntry(queryInfo, results, sections),
  }

  return {
    suggestions,
    focusIndex: clampFocusIndex(suggestions, focusIndex),
    queryStates: {
      ...currentQueryStates,
      [childIndex]: {
        ...currentQueryState,
        queryInfo,
        results,
        ...(sections === undefined ? {} : { sections }),
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
  return applyPagePaginationResult(
    currentSuggestions,
    currentQueryStates,
    childIndex,
    focusIndex,
    (currentQueryState) => ({
      ...currentQueryState.pagination,
      isLoading: false,
      error,
    })
  )
}

export const applyErroredQueryResult = <Extra extends Record<string, unknown>>(
  currentSuggestions: SuggestionsMap<Extra>,
  currentQueryStates: SuggestionQueryStateMap<Extra>,
  childIndex: number,
  queryInfo: QueryInfo,
  error: unknown,
  focusIndex: number
): SuggestionsLifecycleState<Extra> => {
  const currentQueryState = getCurrentQueryState(currentQueryStates, childIndex)
  if (!currentQueryState) {
    return preserveSuggestionsState(currentSuggestions, currentQueryStates, focusIndex)
  }

  const suggestions = Object.fromEntries(
    Object.entries(currentSuggestions).filter(([key]) => Number(key) !== childIndex)
  ) as SuggestionsMap<Extra>
  const ignoreAccents = currentQueryState.ignoreAccents ?? false

  return {
    suggestions,
    focusIndex: clampFocusIndex(suggestions, focusIndex),
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
