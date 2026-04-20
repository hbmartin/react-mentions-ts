import { useEffect, useRef } from 'react'
import type React from 'react'
import { DEFAULT_MENTION_PROPS } from './MentionDefaultProps'
import {
  getDataProvider,
  getFocusedSuggestionEntryForMentionChildren,
  getInlineSuggestionDetailsForMentionChildren,
  getSuggestionData,
  getSuggestionQueryStateEntries,
  getSuggestionsStatusContentForMentionChildren,
} from './MentionsInputSelectors'
import type { InlineSuggestionDetails } from './MentionsInputSelectors'
import {
  applyErroredPageResult,
  applyErroredQueryResult,
  applyLoadingPageResult,
  applySuccessfulPageResult,
  applySuccessfulQueryResult,
  createClearedSuggestionsState,
  createLoadingQueryState,
  isAbortError,
} from './MentionsInputQueryState'
import type { MentionsInputStatePatch, SetMentionsInputState } from './MentionsInputState'
import type {
  MentionChildConfig,
  MentionComponentProps,
  MentionPageCursor,
  MentionsInputProps,
  MentionsInputState,
  NormalizedMentionDataPage,
  QueryInfo,
  SuggestionQueryState,
  SuggestionQueryStateMap,
  SuggestionsMap,
} from './types'
import {
  countSuggestions,
  getEndOfLastMention,
  getSubstringIndex,
  mapPlainTextIndex,
} from './utils'
import { makeTriggerRegex } from './utils/makeTriggerRegex'
import { useEventCallback } from './utils/useEventCallback'

interface ActiveSuggestionQuery<Extra extends Record<string, unknown>> {
  childIndex: number
  queryInfo: QueryInfo
  mentionChild: React.ReactElement<MentionComponentProps<Extra>>
  ignoreAccents: boolean
}

interface UseSuggestionsQueryArgs<Extra extends Record<string, unknown>> {
  props: MentionsInputProps<Extra>
  stateRef: React.RefObject<MentionsInputState<Extra>>
  setState: SetMentionsInputState<Extra>
  getMentionChildren: () => React.ReactElement<MentionComponentProps<Extra>>[]
  getCurrentConfig: () => PreparedConfig<Extra>
  isInlineAutocomplete: () => boolean
}

type PreparedConfig<Extra extends Record<string, unknown>> = ReadonlyArray<
  MentionChildConfig<Extra>
>

const resolveTriggerRegex = (trigger: string | RegExp): RegExp => {
  if (typeof trigger === 'string') {
    return makeTriggerRegex(trigger)
  }

  const flags = trigger.flags.replaceAll('g', '')
  // eslint-disable-next-line security/detect-non-literal-regexp -- reconstructing a vetted RegExp to strip 'g'
  return new RegExp(trigger.source, flags)
}

const getLoadingQueryStates = <Extra extends Record<string, unknown>>(
  activeQueries: ReadonlyArray<ActiveSuggestionQuery<Extra>>,
  nextSuggestions: SuggestionsMap<Extra>
): SuggestionQueryStateMap<Extra> =>
  activeQueries.reduce<SuggestionQueryStateMap<Extra>>((queryStates, activeQuery) => {
    const previousResults = Object.hasOwn(nextSuggestions, activeQuery.childIndex)
      ? nextSuggestions[activeQuery.childIndex].results
      : []
    queryStates[activeQuery.childIndex] = {
      ...createLoadingQueryState<Extra>(activeQuery.queryInfo, activeQuery.ignoreAccents),
      results: previousResults,
    }
    return queryStates
  }, {})

const getPreservedSuggestions = <Extra extends Record<string, unknown>>(
  activeQueries: ReadonlyArray<ActiveSuggestionQuery<Extra>>,
  currentSuggestions: SuggestionsMap<Extra>
): SuggestionsMap<Extra> =>
  activeQueries.reduce<SuggestionsMap<Extra>>((nextSuggestions, activeQuery) => {
    if (!Object.hasOwn(currentSuggestions, activeQuery.childIndex)) {
      return nextSuggestions
    }
    const previousSuggestion = currentSuggestions[activeQuery.childIndex]

    if (previousSuggestion.results.length === 0) {
      return nextSuggestions
    }

    nextSuggestions[activeQuery.childIndex] = {
      queryInfo: activeQuery.queryInfo,
      results: previousSuggestion.results,
    }

    return nextSuggestions
  }, {})

export const useSuggestionsQuery = <Extra extends Record<string, unknown>>(
  args: UseSuggestionsQueryArgs<Extra>
) => {
  const argsRef = useRef(args)
  argsRef.current = args

  const queryIdRef = useRef(0)
  const queryDebounceTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const queryAbortControllersRef = useRef(new Map<number, AbortController>())
  const loadingPageChildrenRef = useRef(new Set<number>())

  const clearPendingSuggestionRequests = useEventCallback((): void => {
    for (const timeoutId of queryDebounceTimersRef.current.values()) {
      clearTimeout(timeoutId)
    }
    queryDebounceTimersRef.current.clear()

    for (const controller of queryAbortControllersRef.current.values()) {
      controller.abort()
    }
    queryAbortControllersRef.current.clear()
    loadingPageChildrenRef.current.clear()
  })

  const replaceSuggestions = useEventCallback(
    (
      computeNextState: (
        prevState: MentionsInputState<Extra>
      ) => Pick<MentionsInputState<Extra>, 'suggestions' | 'queryStates' | 'focusIndex'>
    ): void => {
      argsRef.current.setState((prevState) => computeNextState(prevState))
    }
  )

  const getActiveSuggestionQueries = useEventCallback(
    (
      plainTextValue: string,
      caretPosition: number,
      value: string = argsRef.current.props.value ?? ''
    ): ActiveSuggestionQuery<Extra>[] => {
      const mentionChildren = argsRef.current.getMentionChildren()
      const config = argsRef.current.getCurrentConfig()
      const positionInValue = mapPlainTextIndex(value, config, caretPosition, 'NULL')

      if (positionInValue === null || positionInValue === undefined) {
        return []
      }

      const substringStartIndex = getEndOfLastMention(
        value.slice(0, Math.max(0, positionInValue)),
        config
      )
      const substring = plainTextValue.slice(substringStartIndex, caretPosition)

      return mentionChildren.flatMap((mentionChild, childIndex) => {
        const triggerProp = mentionChild.props.trigger ?? '@'
        const regex = resolveTriggerRegex(triggerProp)
        const match = substring.match(regex)

        if (match === null) {
          return []
        }
        const replacementRange = match[1]
        const query = match[2]

        if (typeof replacementRange !== 'string' || typeof query !== 'string') {
          return []
        }

        const matchIndex = match.index ?? 0
        const querySequenceStart =
          substringStartIndex + substring.indexOf(replacementRange, matchIndex)
        return [
          {
            childIndex,
            queryInfo: {
              childIndex,
              query,
              querySequenceStart,
              querySequenceEnd: querySequenceStart + replacementRange.length,
            },
            mentionChild,
            ignoreAccents: regex.flags.includes('u'),
          },
        ]
      })
    }
  )

  const updateSuggestions = useEventCallback(
    async (
      queryId: number,
      childIndex: number,
      queryInfo: QueryInfo,
      results: NormalizedMentionDataPage<Extra> | Promise<NormalizedMentionDataPage<Extra>>,
      controller: AbortController
    ): Promise<void> => {
      if (queryId !== queryIdRef.current) {
        return
      }

      try {
        const page = await Promise.resolve(results)
        if (queryId !== queryIdRef.current || controller.signal.aborted) {
          return
        }

        if (queryAbortControllersRef.current.get(childIndex) === controller) {
          queryAbortControllersRef.current.delete(childIndex)
        }

        replaceSuggestions((prevState) =>
          applySuccessfulQueryResult(
            prevState.suggestions,
            prevState.queryStates,
            childIndex,
            queryInfo,
            page,
            prevState.focusIndex,
            argsRef.current.isInlineAutocomplete()
          )
        )
      } catch (error) {
        if (queryAbortControllersRef.current.get(childIndex) === controller) {
          queryAbortControllersRef.current.delete(childIndex)
        }

        if (queryId !== queryIdRef.current || controller.signal.aborted || isAbortError(error)) {
          return
        }

        replaceSuggestions((prevState) =>
          applyErroredQueryResult(
            prevState.suggestions,
            prevState.queryStates,
            childIndex,
            queryInfo,
            error,
            prevState.focusIndex
          )
        )
      }
    }
  )

  const updatePageSuggestions = useEventCallback(
    async (
      queryId: number,
      childIndex: number,
      queryInfo: QueryInfo,
      results: NormalizedMentionDataPage<Extra> | Promise<NormalizedMentionDataPage<Extra>>,
      controller: AbortController
    ): Promise<void> => {
      const isStaleRequest = () => queryId !== queryIdRef.current || controller.signal.aborted

      try {
        if (isStaleRequest()) {
          return
        }

        const page = await Promise.resolve(results)
        if (isStaleRequest()) {
          return
        }

        replaceSuggestions((prevState) =>
          applySuccessfulPageResult(
            prevState.suggestions,
            prevState.queryStates,
            childIndex,
            queryInfo,
            page,
            prevState.focusIndex
          )
        )
      } catch (error) {
        if (isStaleRequest() || isAbortError(error)) {
          return
        }

        replaceSuggestions((prevState) =>
          applyErroredPageResult(
            prevState.suggestions,
            prevState.queryStates,
            childIndex,
            error,
            prevState.focusIndex
          )
        )
      } finally {
        if (queryAbortControllersRef.current.get(childIndex) === controller) {
          queryAbortControllersRef.current.delete(childIndex)
          loadingPageChildrenRef.current.delete(childIndex)
        }
      }
    }
  )

  const scheduleSuggestionQuery = useEventCallback(
    (
      queryId: number,
      childIndex: number,
      queryInfo: QueryInfo,
      mentionChild: React.ReactElement<MentionComponentProps<Extra>>,
      ignoreAccents: boolean
    ): void => {
      const debounceMs = mentionChild.props.debounceMs ?? DEFAULT_MENTION_PROPS.debounceMs
      const maxSuggestions =
        mentionChild.props.maxSuggestions ?? DEFAULT_MENTION_PROPS.maxSuggestions

      const pendingTimer = queryDebounceTimersRef.current.get(childIndex)
      if (pendingTimer !== undefined) {
        clearTimeout(pendingTimer)
        queryDebounceTimersRef.current.delete(childIndex)
      }

      const previousController = queryAbortControllersRef.current.get(childIndex)
      previousController?.abort()

      const controller = new AbortController()
      queryAbortControllersRef.current.set(childIndex, controller)

      const executeQuery = () => {
        queryDebounceTimersRef.current.delete(childIndex)

        const provideData = getDataProvider<Extra>(mentionChild.props.data, {
          ignoreAccents,
          maxSuggestions,
          signal: controller.signal,
          getSubstringIndex,
        })

        void updateSuggestions(
          queryId,
          childIndex,
          queryInfo,
          provideData(queryInfo.query),
          controller
        )
      }

      if (debounceMs > 0) {
        queryDebounceTimersRef.current.set(childIndex, setTimeout(executeQuery, debounceMs))
        return
      }

      executeQuery()
    }
  )

  const scheduleSuggestionPageQuery = useEventCallback(
    (
      queryId: number,
      childIndex: number,
      queryInfo: QueryInfo,
      mentionChild: React.ReactElement<MentionComponentProps<Extra>>,
      ignoreAccents: boolean,
      cursor: MentionPageCursor
    ): void => {
      if (loadingPageChildrenRef.current.has(childIndex)) {
        return
      }

      loadingPageChildrenRef.current.add(childIndex)

      const controller = new AbortController()
      queryAbortControllersRef.current.set(childIndex, controller)
      const maxSuggestions =
        mentionChild.props.maxSuggestions ?? DEFAULT_MENTION_PROPS.maxSuggestions

      replaceSuggestions((prevState) =>
        applyLoadingPageResult(
          prevState.suggestions,
          prevState.queryStates,
          childIndex,
          prevState.focusIndex
        )
      )

      const provideData = getDataProvider<Extra>(mentionChild.props.data, {
        ignoreAccents,
        maxSuggestions,
        signal: controller.signal,
        getSubstringIndex,
      })

      void updatePageSuggestions(
        queryId,
        childIndex,
        queryInfo,
        provideData(queryInfo.query, {
          cursor,
          reason: 'page',
        }),
        controller
      )
    }
  )

  const updateMentionsQueries = useEventCallback(
    (plainTextValue: string, caretPosition: number, value?: string): void => {
      const activeQueries = getActiveSuggestionQueries(plainTextValue, caretPosition, value)
      const queryId = queryIdRef.current + 1
      queryIdRef.current = queryId
      clearPendingSuggestionRequests()

      if (activeQueries.length === 0) {
        replaceSuggestions(() => ({
          suggestions: {},
          queryStates: {},
          focusIndex: 0,
        }))
        return
      }

      replaceSuggestions((prevState) => {
        const suggestions = getPreservedSuggestions(activeQueries, prevState.suggestions)

        return {
          suggestions,
          queryStates: getLoadingQueryStates(activeQueries, suggestions),
          focusIndex: 0,
        }
      })

      for (const { childIndex, queryInfo, mentionChild, ignoreAccents } of activeQueries) {
        scheduleSuggestionQuery(queryId, childIndex, queryInfo, mentionChild, ignoreAccents)
      }
    }
  )

  const clearSuggestions = useEventCallback(
    (extraPatch: MentionsInputStatePatch<Extra> = {}): void => {
      queryIdRef.current += 1
      clearPendingSuggestionRequests()
      const clearedState = createClearedSuggestionsState<Extra>()
      argsRef.current.setState({
        suggestions: clearedState.suggestions,
        queryStates: clearedState.queryStates,
        focusIndex: clearedState.focusIndex,
        ...extraPatch,
      })
    }
  )

  const loadMoreSuggestions = useEventCallback((): void => {
    if (argsRef.current.isInlineAutocomplete()) {
      return
    }

    const mentionChildren = argsRef.current.getMentionChildren()
    const queryId = queryIdRef.current

    for (const [childIndex, queryState] of getSuggestionQueryStateEntries(
      argsRef.current.stateRef.current.queryStates
    )) {
      const { pagination } = queryState

      if (queryState.status !== 'success' || pagination === undefined) {
        continue
      }

      if (!pagination.hasMore || pagination.isLoading || pagination.nextCursor === null) {
        continue
      }

      const mentionChild = mentionChildren.at(childIndex)
      if (mentionChild === undefined) {
        continue
      }

      scheduleSuggestionPageQuery(
        queryId,
        childIndex,
        queryState.queryInfo,
        mentionChild,
        queryState.ignoreAccents ?? false,
        pagination.nextCursor
      )
    }
  })

  const shiftFocus = useEventCallback((delta: number): void => {
    const suggestionsCount = countSuggestions(argsRef.current.stateRef.current.suggestions)

    if (suggestionsCount === 0) {
      return
    }

    argsRef.current.setState((prevState) => ({
      focusIndex: (suggestionsCount + prevState.focusIndex + delta) % suggestionsCount,
      scrollFocusedIntoView: true,
    }))
  })

  const handleSuggestionsMouseEnter = useEventCallback((focusIndex: number): void => {
    argsRef.current.setState({
      focusIndex,
      scrollFocusedIntoView: false,
    })
  })

  const getFocusedSuggestionEntry = useEventCallback(() =>
    getFocusedSuggestionEntryForMentionChildren<Extra>(
      argsRef.current.getMentionChildren(),
      argsRef.current.stateRef.current.suggestions,
      argsRef.current.stateRef.current.focusIndex
    )
  )

  const getInlineSuggestionDetails = useEventCallback((): InlineSuggestionDetails<Extra> | null =>
    argsRef.current.isInlineAutocomplete()
      ? getInlineSuggestionDetailsForMentionChildren<Extra>(
          argsRef.current.getMentionChildren(),
          argsRef.current.stateRef.current.suggestions,
          argsRef.current.stateRef.current.focusIndex
        )
      : null
  )

  const canApplyInlineSuggestion = useEventCallback((): boolean => {
    if (!argsRef.current.isInlineAutocomplete()) {
      return false
    }

    const inlineSuggestion = getInlineSuggestionDetails()
    if (!inlineSuggestion) {
      return false
    }

    const { selectionStart, selectionEnd } = argsRef.current.stateRef.current
    if (selectionStart === null || selectionEnd === null || selectionStart !== selectionEnd) {
      return false
    }

    return selectionEnd === inlineSuggestion.queryInfo.querySequenceEnd
  })

  const getPreferredQueryState = useEventCallback((): SuggestionQueryState<Extra> | null => {
    const entries = getSuggestionQueryStateEntries(argsRef.current.stateRef.current.queryStates)
    return entries[0]?.[1] ?? null
  })

  const getSuggestionsStatusContent = useEventCallback(() =>
    getSuggestionsStatusContentForMentionChildren<Extra>(
      argsRef.current.getMentionChildren(),
      argsRef.current.stateRef.current.suggestions,
      argsRef.current.stateRef.current.queryStates
    )
  )

  const isLoading = useEventCallback(
    (): boolean =>
      argsRef.current.getMentionChildren().some((child) => child.props.isLoading === true) ||
      getSuggestionQueryStateEntries(argsRef.current.stateRef.current.queryStates).some(
        ([, queryState]) =>
          queryState.status === 'loading' || queryState.pagination?.isLoading === true
      )
  )

  const isOpened = useEventCallback(
    (): boolean =>
      typeof argsRef.current.stateRef.current.selectionStart === 'number' &&
      (countSuggestions(argsRef.current.stateRef.current.suggestions) !== 0 ||
        isLoading() ||
        getSuggestionsStatusContent().statusType !== null)
  )

  useEffect(() => clearPendingSuggestionRequests, [clearPendingSuggestionRequests])

  return {
    queryIdRef,
    queryDebounceTimersRef,
    queryAbortControllersRef,
    clearPendingSuggestionRequests,
    replaceSuggestions,
    getActiveSuggestionQueries,
    scheduleSuggestionQuery,
    updateSuggestions,
    updatePageSuggestions,
    updateMentionsQueries,
    clearSuggestions,
    loadMoreSuggestions,
    shiftFocus,
    handleSuggestionsMouseEnter,
    getFocusedSuggestionEntry,
    getSuggestionData,
    getInlineSuggestionDetails,
    canApplyInlineSuggestion,
    getPreferredQueryState,
    getSuggestionsStatusContent,
    isLoading,
    isOpened,
  }
}
