import type React from 'react'
import { DEFAULT_MENTION_PROPS } from './MentionDefaultProps'
import type {
  MentionComponentProps,
  MentionDataItem,
  MentionDataPage,
  MentionDataProviderResult,
  MentionDataSection,
  MentionIdentifier,
  MentionPageCursor,
  MentionSearchContext,
  MentionSearchReason,
  NormalizedMentionDataPage,
  QueryInfo,
  SuggestionDataItem,
  SuggestionQueryState,
  SuggestionQueryStateMap,
  SuggestionSection,
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

interface SuggestionsLayoutKeyArgs<Extra extends Record<string, unknown>> {
  suggestions: SuggestionsMap<Extra>
  queryStates: SuggestionQueryStateMap<Extra>
  isLoading: boolean
  statusType: SuggestionsStatusContent['statusType']
  hasInlineSuggestion: boolean
}

interface SearchableSuggestionItem<Extra extends Record<string, unknown>> {
  item: MentionDataItem<Extra>
  searchableDisplay: string
}

type CachedMentionDataItems = ReadonlyArray<MentionDataItem>
type CachedSearchableSuggestionItems = Array<SearchableSuggestionItem<Record<string, unknown>>>

const plainSearchCache = new WeakMap<CachedMentionDataItems, CachedSearchableSuggestionItems>()
const accentSearchCache = new WeakMap<CachedMentionDataItems, CachedSearchableSuggestionItems>()
const suggestionLayoutIdentities = new WeakMap<object, number>()
let nextSuggestionLayoutIdentity = 0

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

const isMentionDataPage = <Extra extends Record<string, unknown>>(
  result: MentionDataProviderResult<Extra>
): result is MentionDataPage<Extra> => !Array.isArray(result)

const getSectionKey = <Extra extends Record<string, unknown>>(
  section: MentionDataSection<Extra>,
  sectionIndex: number
): string => {
  if (section.id !== undefined) {
    return `id:${typeof section.id}:${String(section.id)}`
  }

  return typeof section.label === 'string'
    ? `label:${section.label}`
    : `index:${sectionIndex.toString()}`
}

const normalizeMentionDataSections = <Extra extends Record<string, unknown>>(
  sections: ReadonlyArray<MentionDataSection<Extra>>
): SuggestionSection<Extra>[] => {
  const normalizedSections: SuggestionSection<Extra>[] = []

  for (const [sectionIndex, section] of sections.entries()) {
    if (section.items.length === 0) {
      continue
    }

    normalizedSections.push({
      key: getSectionKey(section, sectionIndex),
      id: section.id,
      label: section.label,
      results: [...section.items],
    })
  }

  return normalizedSections
}

export const normalizeMentionDataResult = <Extra extends Record<string, unknown>>(
  result: MentionDataProviderResult<Extra>,
  maxSuggestions?: number
): NormalizedMentionDataPage<Extra> => {
  if (!isMentionDataPage(result)) {
    return {
      items: maxSuggestions === undefined ? [...result] : result.slice(0, maxSuggestions),
      nextCursor: null,
      hasMore: false,
      paginated: false,
    }
  }

  const nextCursor = result.nextCursor ?? null

  if ('sections' in result && result.sections !== undefined) {
    const sections = normalizeMentionDataSections(result.sections)

    return {
      items: sections.flatMap((section) => section.results),
      sections: sections.length === 0 ? undefined : sections,
      nextCursor,
      hasMore: result.hasMore !== false && nextCursor !== null,
      paginated: true,
    }
  }

  return {
    items: [...result.items],
    nextCursor,
    hasMore: result.hasMore !== false && nextCursor !== null,
    paginated: true,
  }
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
): ReadonlyArray<readonly [number, SuggestionQueryState<Extra>]> => {
  const entries: Array<readonly [number, SuggestionQueryState<Extra>]> = []

  for (const key of Object.keys(queryStates)) {
    const childIndex = Number(key)
    if (Number.isInteger(childIndex)) {
      entries.push([childIndex, queryStates[childIndex]] as const)
    }
  }

  entries.sort(([left], [right]) => left - right)
  return entries
}

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

const getObjectLayoutIdentity = (value: object): number => {
  const cachedIdentity = suggestionLayoutIdentities.get(value)
  if (cachedIdentity !== undefined) {
    return cachedIdentity
  }

  nextSuggestionLayoutIdentity += 1
  suggestionLayoutIdentities.set(value, nextSuggestionLayoutIdentity)
  return nextSuggestionLayoutIdentity
}

const getSuggestionLayoutIdentity = <Extra extends Record<string, unknown>>(
  suggestion: SuggestionDataItem<Extra>
) => {
  const { id, display } = getSuggestionData(suggestion)
  const objectIdentity =
    typeof suggestion === 'object' ? getObjectLayoutIdentity(suggestion) : 'primitive'

  return [typeof id, String(id), display, objectIdentity] as const
}

const getSuggestionSectionLabelLayoutIdentity = (label: React.ReactNode) => {
  if (typeof label === 'object' && label !== null) {
    return ['object', getObjectLayoutIdentity(label)] as const
  }

  return [typeof label, String(label)] as const
}

const getSuggestionSectionLayoutIdentity = <Extra extends Record<string, unknown>>(
  section: SuggestionSection<Extra>
) =>
  [
    section.key,
    getSuggestionSectionLabelLayoutIdentity(section.label),
    section.results.map((item) => getSuggestionLayoutIdentity(item)),
  ] as const

const formatQueryInfoLayoutKey = (queryInfo: QueryInfo) =>
  [
    queryInfo.childIndex,
    queryInfo.query,
    queryInfo.querySequenceStart,
    queryInfo.querySequenceEnd,
  ] as const

export const getSuggestionsLayoutKey = <Extra extends Record<string, unknown>>({
  suggestions,
  queryStates,
  isLoading,
  statusType,
  hasInlineSuggestion,
}: SuggestionsLayoutKeyArgs<Extra>): string => {
  const suggestionParts: Array<
    readonly [
      number,
      ReturnType<typeof formatQueryInfoLayoutKey>,
      Array<ReturnType<typeof getSuggestionLayoutIdentity>>,
      Array<ReturnType<typeof getSuggestionSectionLayoutIdentity>>,
    ]
  > = []
  for (const key of Object.keys(suggestions)) {
    const childIndex = Number(key)
    if (Number.isInteger(childIndex)) {
      const value = suggestions[childIndex]
      suggestionParts.push([
        childIndex,
        formatQueryInfoLayoutKey(value.queryInfo),
        value.results.map((item) => getSuggestionLayoutIdentity(item)),
        value.sections?.map((section) => getSuggestionSectionLayoutIdentity(section)) ?? [],
      ] as const)
    }
  }
  suggestionParts.sort(([left], [right]) => left - right)

  const queryStateParts: Array<
    readonly [
      number,
      ReturnType<typeof formatQueryInfoLayoutKey>,
      SuggestionQueryState<Extra>['status'],
      number,
      'page-loading' | 'page-idle',
      'has-more' | 'no-more',
      'no-error' | 'error',
      'no-page-error' | 'page-error',
    ]
  > = []
  for (const key of Object.keys(queryStates)) {
    const childIndex = Number(key)
    if (Number.isInteger(childIndex)) {
      const queryState = queryStates[childIndex]
      queryStateParts.push([
        childIndex,
        formatQueryInfoLayoutKey(queryState.queryInfo),
        queryState.status,
        queryState.results.length,
        queryState.pagination?.isLoading === true ? 'page-loading' : 'page-idle',
        queryState.pagination?.hasMore === true ? 'has-more' : 'no-more',
        queryState.error === undefined ? 'no-error' : 'error',
        queryState.pagination?.error === undefined ? 'no-page-error' : 'page-error',
      ] as const)
    }
  }
  queryStateParts.sort(([left], [right]) => left - right)

  return JSON.stringify([
    isLoading ? 'loading' : 'idle',
    statusType ?? 'none',
    hasInlineSuggestion ? 'inline' : 'no-inline',
    suggestionParts,
    queryStateParts,
  ])
}

export const getFlattenedSuggestions = <Extra extends Record<string, unknown>>(
  children: React.ReactNode,
  suggestions: SuggestionsMap<Extra>
): FlattenedSuggestion<Extra>[] =>
  flattenSuggestions<Extra>(getMentionChildren(children), suggestions)

const getFlattenedSuggestionsForMentionChildren = <Extra extends Record<string, unknown>>(
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
      ) => Promise<MentionDataProviderResult<Extra>> | MentionDataProviderResult<Extra>),
  options: {
    ignoreAccents: boolean
    maxSuggestions?: number
    signal: AbortSignal
    getSubstringIndex: (string: string, substring: string, ignoreAccents: boolean) => number
  }
): ((
  query: string,
  request?: { cursor?: MentionPageCursor | null; reason?: MentionSearchReason }
) => Promise<NormalizedMentionDataPage<Extra>>) => {
  const { ignoreAccents, maxSuggestions, signal, getSubstringIndex } = options

  if (Array.isArray(data)) {
    const items = data as ReadonlyArray<MentionDataItem<Extra>>
    const searchableItems = getCachedSearchableItems(items, ignoreAccents)

    return (query: string) => {
      return Promise.resolve().then(() => {
        const results: MentionDataItem<Extra>[] = []

        for (const { item, searchableDisplay } of searchableItems) {
          if (signal.aborted) {
            return normalizeMentionDataResult<Extra>([], maxSuggestions)
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

        return normalizeMentionDataResult<Extra>(results, maxSuggestions)
      })
    }
  }

  return async (query: string, request = {}) => {
    const isSignalAborted = () => signal.aborted

    if (isSignalAborted()) {
      return normalizeMentionDataResult<Extra>([], maxSuggestions)
    }

    const provider = data as (
      query: string,
      context: MentionSearchContext
    ) => Promise<MentionDataProviderResult<Extra>> | MentionDataProviderResult<Extra>
    const result = await Promise.resolve(
      provider(query, {
        signal,
        cursor: request.cursor ?? null,
        reason: request.reason ?? 'query',
      })
    )

    if (isSignalAborted()) {
      return normalizeMentionDataResult<Extra>([], maxSuggestions)
    }

    return normalizeMentionDataResult(result, maxSuggestions)
  }
}
