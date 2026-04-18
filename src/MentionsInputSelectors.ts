import type React from 'react'
import { DEFAULT_MENTION_PROPS } from './MentionDefaultProps'
import type {
  MentionComponentProps,
  MentionDataItem,
  MentionIdentifier,
  MentionSearchContext,
  QueryInfo,
  SuggestionDataItem,
  SuggestionQueryState,
  SuggestionQueryStateMap,
  SuggestionsMap,
} from './types'
import type { FlattenedSuggestion } from './utils/flattenSuggestions'
import { flattenSuggestions } from './utils'
import { collectMentionElements } from './utils/readConfigFromChildren'

export interface InlineSuggestionDetails<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> {
  hiddenPrefix: string
  visibleText: string
  queryInfo: QueryInfo
  suggestion: SuggestionDataItem<Extra>
  announcement: string
}

export interface SuggestionsStatusContent {
  statusContent: React.ReactNode
  statusType: 'empty' | 'error' | null
}

export const DEFAULT_EMPTY_SUGGESTIONS_MESSAGE = 'No suggestions found'
export const DEFAULT_ERROR_SUGGESTIONS_MESSAGE = 'Unable to load suggestions'
export const INLINE_AUTOCOMPLETE_FALLBACK_ANNOUNCEMENT = 'No inline suggestions available'

interface SearchableSuggestionItem<Extra extends Record<string, unknown>> {
  item: MentionDataItem<Extra>
  searchableDisplay: string
}

type CachedMentionDataItems = ReadonlyArray<MentionDataItem>
type CachedSearchableSuggestionItems = Array<SearchableSuggestionItem<Record<string, unknown>>>

const plainSearchCache = new WeakMap<CachedMentionDataItems, CachedSearchableSuggestionItems>()
const accentSearchCache = new WeakMap<CachedMentionDataItems, CachedSearchableSuggestionItems>()

const getCachedSearchableItems = <Extra extends Record<string, unknown>>(
  items: ReadonlyArray<MentionDataItem<Extra>>,
  ignoreAccents: boolean
): Array<SearchableSuggestionItem<Extra>> => {
  const cache = ignoreAccents ? accentSearchCache : plainSearchCache
  const cacheKey = items as CachedMentionDataItems
  const cached = cache.get(cacheKey) as Array<SearchableSuggestionItem<Extra>> | undefined

  if (cached) {
    return cached
  }

  const searchableItems = items.map((item) => ({
    item,
    searchableDisplay: item.display ?? String(item.id),
  }))
  cache.set(cacheKey, searchableItems as CachedSearchableSuggestionItems)

  return searchableItems
}

export const getMentionChildFromArray = <Extra extends Record<string, unknown>>(
  mentionChildren: ReadonlyArray<React.ReactElement<MentionComponentProps<Extra>>>,
  childIndex: number
): React.ReactElement<MentionComponentProps<Extra>> | undefined => mentionChildren[childIndex]

export const getMentionChildren = <Extra extends Record<string, unknown>>(
  children: React.ReactNode
) => collectMentionElements<Extra>(children)

export const getMentionChild = <Extra extends Record<string, unknown>>(
  children: React.ReactNode,
  childIndex: number
): React.ReactElement<MentionComponentProps<Extra>> | undefined =>
  getMentionChildren<Extra>(children)[childIndex]

export const getSuggestionQueryStateEntries = <Extra extends Record<string, unknown>>(
  queryStates: SuggestionQueryStateMap<Extra>
): ReadonlyArray<readonly [number, SuggestionQueryState<Extra>]> =>
  Object.entries(queryStates)
    .map(([key, value]) => [Number(key), value] as const)
    .filter(([key]) => Number.isInteger(key))
    .toSorted(([left], [right]) => left - right)

export const getSuggestionData = <Extra extends Record<string, unknown>>(
  suggestion: SuggestionDataItem<Extra>
): {
  id: MentionIdentifier
  display: string
} => {
  if (typeof suggestion === 'string') {
    return { id: suggestion, display: suggestion }
  }

  return {
    id: suggestion.id,
    display: suggestion.display ?? String(suggestion.id),
  }
}

export const getFlattenedSuggestions = <Extra extends Record<string, unknown>>(
  children: React.ReactNode,
  suggestions: SuggestionsMap<Extra>
): FlattenedSuggestion<Extra>[] =>
  flattenSuggestions<Extra>(getMentionChildren(children), suggestions)

export const getFlattenedSuggestionsForMentionChildren = <Extra extends Record<string, unknown>>(
  mentionChildren: ReadonlyArray<React.ReactElement<MentionComponentProps<Extra>>>,
  suggestions: SuggestionsMap<Extra>
): FlattenedSuggestion<Extra>[] => flattenSuggestions<Extra>(mentionChildren, suggestions)

export const getFocusedSuggestionEntry = <Extra extends Record<string, unknown>>(
  children: React.ReactNode,
  suggestions: SuggestionsMap<Extra>,
  focusIndex: number
): {
  result: SuggestionDataItem<Extra>
  queryInfo: QueryInfo
} | null => {
  const flattened = getFlattenedSuggestions(children, suggestions)
  if (flattened.length === 0) {
    return null
  }

  return flattened[focusIndex] ?? flattened[0]
}

export const getFocusedSuggestionEntryForMentionChildren = <Extra extends Record<string, unknown>>(
  mentionChildren: ReadonlyArray<React.ReactElement<MentionComponentProps<Extra>>>,
  suggestions: SuggestionsMap<Extra>,
  focusIndex: number
): {
  result: SuggestionDataItem<Extra>
  queryInfo: QueryInfo
} | null => {
  const flattened = getFlattenedSuggestionsForMentionChildren(mentionChildren, suggestions)
  if (flattened.length === 0) {
    return null
  }

  return flattened[focusIndex] ?? flattened[0]
}

export const getInlineSuggestionRemainder = (
  displayValue: string,
  queryInfo: QueryInfo
): string => {
  const query = queryInfo.query
  if (query.length === 0) {
    return displayValue
  }

  const normalizedDisplay = displayValue.toLocaleLowerCase()
  const normalizedQuery = query.toLocaleLowerCase()

  if (normalizedDisplay.startsWith(normalizedQuery)) {
    return displayValue.slice(query.length)
  }

  return displayValue
}

export const getInlineSuggestionDetailsForMentionChildren = <Extra extends Record<string, unknown>>(
  mentionChildren: ReadonlyArray<React.ReactElement<MentionComponentProps<Extra>>>,
  suggestions: SuggestionsMap<Extra>,
  focusIndex: number
): InlineSuggestionDetails<Extra> | null => {
  const entry = getFocusedSuggestionEntryForMentionChildren(
    mentionChildren,
    suggestions,
    focusIndex
  )
  if (!entry) {
    return null
  }

  const { queryInfo, result } = entry
  const mentionChild = getMentionChildFromArray<Extra>(mentionChildren, queryInfo.childIndex)
  if (!mentionChild) {
    return null
  }

  const {
    displayTransform = DEFAULT_MENTION_PROPS.displayTransform,
    appendSpaceOnAdd = DEFAULT_MENTION_PROPS.appendSpaceOnAdd,
  } = mentionChild.props

  const { id, display } = getSuggestionData(result)
  let displayValue = displayTransform(id, display)

  if (appendSpaceOnAdd) {
    displayValue += ' '
  }

  const visibleText = getInlineSuggestionRemainder(displayValue, queryInfo)
  if (!visibleText) {
    return null
  }

  const hiddenPrefixLength = displayValue.length - visibleText.length
  const hiddenPrefix = hiddenPrefixLength > 0 ? displayValue.slice(0, hiddenPrefixLength) : ''
  const announcement = displayValue.trimEnd()

  return {
    hiddenPrefix,
    visibleText,
    queryInfo,
    suggestion: result,
    announcement: announcement.length > 0 ? announcement : displayValue,
  }
}

export const getInlineSuggestionDetails = <Extra extends Record<string, unknown>>(
  children: React.ReactNode,
  suggestions: SuggestionsMap<Extra>,
  focusIndex: number
): InlineSuggestionDetails<Extra> | null => {
  return getInlineSuggestionDetailsForMentionChildren(
    getMentionChildren(children),
    suggestions,
    focusIndex
  )
}

export const getPreferredQueryState = <Extra extends Record<string, unknown>>(
  queryStates: SuggestionQueryStateMap<Extra>
): SuggestionQueryState<Extra> | null => getSuggestionQueryStateEntries(queryStates)[0]?.[1] ?? null

export const getSuggestionsStatusContent = <Extra extends Record<string, unknown>>(
  children: React.ReactNode,
  suggestions: SuggestionsMap<Extra>,
  queryStates: SuggestionQueryStateMap<Extra>
): SuggestionsStatusContent => {
  return getSuggestionsStatusContentForMentionChildren(
    getMentionChildren(children),
    suggestions,
    queryStates
  )
}

export const getSuggestionsStatusContentForMentionChildren = <
  Extra extends Record<string, unknown>,
>(
  mentionChildren: ReadonlyArray<React.ReactElement<MentionComponentProps<Extra>>>,
  suggestions: SuggestionsMap<Extra>,
  queryStates: SuggestionQueryStateMap<Extra>
): SuggestionsStatusContent => {
  if (Object.values(suggestions).some(({ results }) => results.length > 0)) {
    return { statusContent: null, statusType: null }
  }

  const preferredQueryState = getPreferredQueryState(queryStates)
  if (!preferredQueryState || preferredQueryState.status === 'loading') {
    return { statusContent: null, statusType: null }
  }

  const mentionChild = getMentionChildFromArray<Extra>(
    mentionChildren,
    preferredQueryState.queryInfo.childIndex
  )
  if (!mentionChild) {
    return { statusContent: null, statusType: null }
  }

  if (preferredQueryState.status === 'error') {
    const renderError = mentionChild.props.renderError ?? DEFAULT_MENTION_PROPS.renderError ?? null

    if (!renderError) {
      return {
        statusContent: DEFAULT_ERROR_SUGGESTIONS_MESSAGE,
        statusType: 'error',
      }
    }

    const statusContent = renderError(
      preferredQueryState.queryInfo.query,
      preferredQueryState.error
    )

    if (statusContent === null || statusContent === false) {
      return { statusContent: null, statusType: null }
    }

    return {
      statusContent:
        statusContent === undefined ? DEFAULT_ERROR_SUGGESTIONS_MESSAGE : statusContent,
      statusType: 'error',
    }
  }

  const renderEmpty = mentionChild.props.renderEmpty ?? DEFAULT_MENTION_PROPS.renderEmpty ?? null

  if (!renderEmpty) {
    return {
      statusContent: DEFAULT_EMPTY_SUGGESTIONS_MESSAGE,
      statusType: 'empty',
    }
  }

  const statusContent = renderEmpty(preferredQueryState.queryInfo.query)

  if (statusContent === null || statusContent === false) {
    return { statusContent: null, statusType: null }
  }

  return {
    statusContent: statusContent === undefined ? DEFAULT_EMPTY_SUGGESTIONS_MESSAGE : statusContent,
    statusType: 'empty',
  }
}

export const getInlineSuggestionAnnouncement = <Extra extends Record<string, unknown>>(
  inlineSuggestion: InlineSuggestionDetails<Extra> | null,
  statusContent: SuggestionsStatusContent
): string => {
  if (inlineSuggestion) {
    return inlineSuggestion.announcement
  }

  if (statusContent.statusType !== null && typeof statusContent.statusContent === 'string') {
    return statusContent.statusContent
  }

  return INLINE_AUTOCOMPLETE_FALLBACK_ANNOUNCEMENT
}

export const getDataProvider = <Extra extends Record<string, unknown>>(
  data:
    | ReadonlyArray<MentionDataItem<Extra>>
    | ((
        query: string,
        context: MentionSearchContext
      ) => Promise<ReadonlyArray<MentionDataItem<Extra>>> | ReadonlyArray<MentionDataItem<Extra>>),
  options: {
    ignoreAccents: boolean
    maxSuggestions?: number
    signal: AbortSignal
    getSubstringIndex: (string: string, substring: string, ignoreAccents: boolean) => number
  }
): ((query: string) => Promise<MentionDataItem<Extra>[]>) => {
  const { ignoreAccents, maxSuggestions, signal, getSubstringIndex } = options
  const applyMaxSuggestions = (
    items: ReadonlyArray<MentionDataItem<Extra>>
  ): MentionDataItem<Extra>[] =>
    maxSuggestions === undefined ? [...items] : items.slice(0, maxSuggestions)

  if (Array.isArray(data)) {
    const items = data as ReadonlyArray<MentionDataItem<Extra>>
    const searchableItems = getCachedSearchableItems(items, ignoreAccents)

    return (query: string) => {
      return Promise.resolve().then(() => {
        const results: MentionDataItem<Extra>[] = []

        for (const { item, searchableDisplay } of searchableItems) {
          if (signal.aborted) {
            return []
          }

          const index = getSubstringIndex(searchableDisplay, query, ignoreAccents)
          if (index < 0) {
            continue
          }

          results.push({
            ...item,
            highlights: [{ start: index, end: index + query.length }],
          })

          if (maxSuggestions !== undefined && results.length >= maxSuggestions) {
            break
          }
        }

        return applyMaxSuggestions(results)
      })
    }
  }

  return async (query: string) => {
    const provider = data as (
      query: string,
      context: MentionSearchContext
    ) => Promise<ReadonlyArray<MentionDataItem<Extra>>> | ReadonlyArray<MentionDataItem<Extra>>
    const result = await Promise.resolve(provider(query, { signal }))
    return applyMaxSuggestions(result)
  }
}
