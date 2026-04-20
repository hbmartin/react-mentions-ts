import { useEffect, useLayoutEffect, useRef } from 'react'
import type React from 'react'
import {
  applyHighlighterViewPatch,
  applyTextareaResizePatch,
  areInlineSuggestionPositionsEqual,
  areSuggestionsPositionsEqual,
  calculateInlineSuggestionPosition,
  calculateSuggestionsPosition,
  createPendingViewSync,
  createViewSyncPatch,
  getViewSyncDecision,
  getHighlighterViewPatch,
  getTextareaResizePatch,
  hasPendingViewSync,
  mergePendingViewSync,
} from './MentionsInputLayout'
import type { PendingViewSync, ViewSyncCommit, ViewSyncPatch } from './MentionsInputLayout'
import type { SetMentionsInputState } from './MentionsInputState'
import type {
  InputElement,
  MentionChildConfig,
  MentionsInputProps,
  MentionsInputState,
} from './types'
import { useEventCallback } from './utils/useEventCallback'

let generatedIdCounter = 0

const createGeneratedId = (): string => {
  const cryptoObject = (globalThis as { crypto?: Crypto }).crypto

  if (typeof cryptoObject?.randomUUID === 'function') {
    return `mentions-${cryptoObject.randomUUID()}`
  }

  generatedIdCounter += 1
  return `mentions-${generatedIdCounter.toString()}`
}

interface UseCaretLayoutArgs<Extra extends Record<string, unknown>> {
  props: MentionsInputProps<Extra>
  state: MentionsInputState<Extra>
  stateRef: React.RefObject<MentionsInputState<Extra>>
  setState: SetMentionsInputState<Extra>
  value: string
  config: ReadonlyArray<MentionChildConfig<Extra>>
  isInlineAutocomplete: boolean
  hasInlineSuggestion: () => boolean
}

const getExplicitId = (id: unknown): string | null =>
  typeof id === 'string' && id.trim().length > 0 ? id.trim() : null

const isDocumentLike = (value: unknown): value is Document =>
  typeof value === 'object' &&
  value !== null &&
  'nodeType' in value &&
  (value as { nodeType: number }).nodeType === 9 &&
  'body' in value

export const useCaretLayout = <Extra extends Record<string, unknown>>(
  args: UseCaretLayoutArgs<Extra>
) => {
  const argsRef = useRef(args)
  argsRef.current = args

  const containerElementRef = useRef<HTMLDivElement | null>(null)
  const inputElementRef = useRef<InputElement | null>(null)
  const highlighterElementRef = useRef<HTMLDivElement | null>(null)
  const suggestionsElementRef = useRef<HTMLDivElement | null>(null)
  const defaultSuggestionsPortalHostRef = useRef<HTMLElement | null>(null)
  const pendingViewSyncRef = useRef<PendingViewSync>(createPendingViewSync())
  const isFlushingViewSyncRef = useRef(false)
  const scrollSyncFrameRef = useRef<number | null>(null)
  const autoResizeFrameRef = useRef<number | null>(null)
  const didUnmountRef = useRef(false)
  const pendingHighlighterRecomputeRef = useRef(false)
  const queuedHighlighterRecomputeRef = useRef(false)
  const previousCommitRef = useRef<ViewSyncCommit<Extra> | null>(null)

  const cancelScheduledFrame = useEventCallback(
    (frameRef: React.RefObject<number | null>): void => {
      const frame = frameRef.current
      if (frame !== null && typeof globalThis.cancelAnimationFrame === 'function') {
        globalThis.cancelAnimationFrame(frame)
      }
      frameRef.current = null
    }
  )

  const explicitId = getExplicitId(args.props.id)
  const baseId = explicitId ?? args.state.generatedId
  const suggestionsOverlayId = baseId === null ? undefined : `${baseId}-suggestions`
  const inlineAutocompleteLiveRegionId = baseId === null ? undefined : `${baseId}-inline-live`

  const ensureGeneratedId = useEventCallback((): void => {
    if (
      getExplicitId(argsRef.current.props.id) !== null ||
      argsRef.current.stateRef.current.generatedId !== null
    ) {
      return
    }

    argsRef.current.setState({ generatedId: createGeneratedId() })
  })

  const shouldMeasureSuggestions = useEventCallback(
    (): boolean =>
      !argsRef.current.isInlineAutocomplete &&
      typeof argsRef.current.stateRef.current.selectionStart === 'number'
  )

  const shouldMeasureInline = useEventCallback(
    (): boolean =>
      argsRef.current.isInlineAutocomplete &&
      typeof argsRef.current.stateRef.current.selectionStart === 'number'
  )

  const resolvePortalHost = useEventCallback((): Element | null => {
    const { suggestionsPortalHost } = argsRef.current.props

    if (suggestionsPortalHost === null) {
      return null
    }

    if (isDocumentLike(suggestionsPortalHost)) {
      return suggestionsPortalHost.body
    }

    if (suggestionsPortalHost) {
      return suggestionsPortalHost
    }

    return inputElementRef.current?.ownerDocument.body ?? defaultSuggestionsPortalHostRef.current
  })

  const resolveViewSyncFlags = useEventCallback(
    (flags: Partial<PendingViewSync>): Partial<PendingViewSync> => {
      const nextFlags: Partial<PendingViewSync> = {}

      if (flags.restoreSelection === true) {
        nextFlags.restoreSelection = true
      }
      if (flags.syncScroll === true) {
        nextFlags.syncScroll = true
      }
      if (flags.recomputeHighlighter === true) {
        nextFlags.recomputeHighlighter = true
      }
      if (flags.measureSuggestions === true && shouldMeasureSuggestions()) {
        nextFlags.measureSuggestions = true
      }
      if (flags.measureInline === true && shouldMeasureInline()) {
        nextFlags.measureInline = true
      }

      return nextFlags
    }
  )

  const updateHighlighterScroll = useEventCallback((): boolean =>
    applyHighlighterViewPatch(
      highlighterElementRef.current,
      getHighlighterViewPatch(inputElementRef.current, highlighterElementRef.current)
    )
  )

  const resetTextareaHeight = useEventCallback((): boolean => {
    const { props } = argsRef.current
    const inputElement = inputElementRef.current

    if (!(inputElement instanceof HTMLTextAreaElement)) {
      return false
    }

    const resizePatch = getTextareaResizePatch(inputElement, {
      singleLine: props.singleLine,
      autoResize: props.autoResize,
    })
    const didUpdate = applyTextareaResizePatch(inputElement, resizePatch)

    if (
      props.singleLine === true ||
      props.autoResize !== true ||
      typeof globalThis.requestAnimationFrame !== 'function'
    ) {
      cancelScheduledFrame(autoResizeFrameRef)
      return didUpdate
    }

    cancelScheduledFrame(autoResizeFrameRef)

    autoResizeFrameRef.current = globalThis.requestAnimationFrame(() => {
      autoResizeFrameRef.current = null
      applyTextareaResizePatch(
        inputElementRef.current,
        getTextareaResizePatch(inputElementRef.current, {
          singleLine: argsRef.current.props.singleLine,
          autoResize: argsRef.current.props.autoResize,
        })
      )
    })

    return didUpdate
  })

  const updateSuggestionsPosition = useEventCallback((): boolean => {
    const { props, stateRef, setState } = argsRef.current
    const position =
      calculateSuggestionsPosition({
        caretPosition: stateRef.current.caretPosition,
        suggestionsPlacement: props.suggestionsPlacement ?? 'below',
        anchorMode: props.anchorMode ?? 'caret',
        resolvedPortalHost: resolvePortalHost(),
        suggestions: suggestionsElementRef.current,
        highlighter: highlighterElementRef.current,
        container: containerElementRef.current,
      }) ?? {}

    if (areSuggestionsPositionsEqual(position, stateRef.current.suggestionsPosition)) {
      return false
    }

    setState({ suggestionsPosition: position })
    return true
  })

  const updateInlineSuggestionPosition = useEventCallback((): boolean => {
    const { stateRef, setState } = argsRef.current

    if (!argsRef.current.isInlineAutocomplete) {
      if (stateRef.current.inlineSuggestionPosition === null) {
        return false
      }

      setState({ inlineSuggestionPosition: null })
      return true
    }

    const nextPosition = argsRef.current.hasInlineSuggestion()
      ? calculateInlineSuggestionPosition({ highlighter: highlighterElementRef.current })
      : null

    if (
      areInlineSuggestionPositionsEqual(stateRef.current.inlineSuggestionPosition, nextPosition)
    ) {
      return false
    }

    setState({ inlineSuggestionPosition: nextPosition })
    return true
  })

  const scheduleHighlighterRecompute = useEventCallback((): void => {
    if (didUnmountRef.current) {
      return
    }

    if (pendingHighlighterRecomputeRef.current) {
      queuedHighlighterRecomputeRef.current = true
      return
    }

    pendingHighlighterRecomputeRef.current = true
    argsRef.current.setState((prevState) => ({
      highlighterRecomputeVersion: prevState.highlighterRecomputeVersion + 1,
    }))
  })

  const setSelection = useEventCallback(
    (selectionStart: number | null, selectionEnd: number | null): void => {
      if (selectionStart === null || selectionEnd === null) {
        return
      }

      const element = inputElementRef.current
      if (!element) {
        return
      }

      let selectionApplied = false
      if (typeof element.setSelectionRange === 'function') {
        element.setSelectionRange(selectionStart, selectionEnd)
        selectionApplied = true
      } else if ('createTextRange' in element) {
        const range = (
          element as unknown as {
            createTextRange: () => {
              collapse: (value: boolean) => void
              moveEnd: (unit: string, value: number) => void
              moveStart: (unit: string, value: number) => void
              select: () => void
            }
          }
        ).createTextRange()
        range.collapse(true)
        range.moveEnd('character', selectionEnd)
        range.moveStart('character', selectionStart)
        range.select()
        selectionApplied = true
      }

      if (selectionApplied) {
        requestHighlighterScrollSync()
      }
    }
  )

  const flushPendingViewSync = useEventCallback((): ViewSyncPatch => {
    if (
      didUnmountRef.current ||
      isFlushingViewSyncRef.current ||
      !hasPendingViewSync(pendingViewSyncRef.current)
    ) {
      return createViewSyncPatch()
    }

    if (scrollSyncFrameRef.current !== null) {
      cancelScheduledFrame(scrollSyncFrameRef)
    }

    isFlushingViewSyncRef.current = true

    try {
      const pendingViewSync = pendingViewSyncRef.current
      pendingViewSyncRef.current = createPendingViewSync()
      const patch = createViewSyncPatch()
      const { stateRef, setState } = argsRef.current

      if (pendingViewSync.restoreSelection && stateRef.current.pendingSelectionUpdate) {
        setState({ pendingSelectionUpdate: false })
        setSelection(stateRef.current.selectionStart, stateRef.current.selectionEnd)
        patch.restoredSelection = true
      }

      let layoutDidChange = false

      if (pendingViewSync.syncScroll) {
        patch.syncedScroll = true
        layoutDidChange = updateHighlighterScroll() || layoutDidChange
        layoutDidChange = resetTextareaHeight() || layoutDidChange
      }

      if (pendingViewSync.measureSuggestions) {
        patch.measuredSuggestions = updateSuggestionsPosition()
      }

      if (pendingViewSync.measureInline) {
        patch.measuredInline = updateInlineSuggestionPosition()
      }

      if (pendingViewSync.recomputeHighlighter || layoutDidChange) {
        scheduleHighlighterRecompute()
        patch.recomputedHighlighter = true
      }

      return patch
    } finally {
      isFlushingViewSyncRef.current = false
    }
  })

  const requestViewSync = useEventCallback(
    (
      flags: Partial<PendingViewSync>,
      options: {
        flushNow?: boolean
      } = {}
    ): void => {
      const filteredFlags = resolveViewSyncFlags(flags)
      pendingViewSyncRef.current = mergePendingViewSync(pendingViewSyncRef.current, filteredFlags)

      if (!hasPendingViewSync(pendingViewSyncRef.current)) {
        return
      }

      if (options.flushNow === true) {
        flushPendingViewSync()
        return
      }

      if (typeof globalThis.requestAnimationFrame !== 'function') {
        flushPendingViewSync()
        return
      }

      if (scrollSyncFrameRef.current !== null) {
        return
      }

      scrollSyncFrameRef.current = globalThis.requestAnimationFrame(() => {
        scrollSyncFrameRef.current = null
        flushPendingViewSync()
      })
    }
  )

  const requestHighlighterScrollSync = useEventCallback((): void => {
    requestViewSync({
      syncScroll: true,
      measureSuggestions: true,
      measureInline: true,
    })
  })

  const handleCaretPositionChange = useEventCallback(
    (position: MentionsInputState<Extra>['caretPosition']): void => {
      argsRef.current.setState({ caretPosition: position })
      requestViewSync({
        measureSuggestions: true,
        measureInline: true,
      })
    }
  )

  const handleInputScroll = useEventCallback((): void => {
    requestViewSync(
      {
        syncScroll: true,
        measureSuggestions: true,
        measureInline: true,
      },
      { flushNow: true }
    )
  })

  const handleDocumentScroll = useEventCallback((): void => {
    if (!shouldMeasureSuggestions() && !shouldMeasureInline()) {
      return
    }

    requestViewSync({
      measureSuggestions: true,
      measureInline: true,
    })
  })

  const setContainerElement = useEventCallback((element: HTMLDivElement | null): void => {
    containerElementRef.current = element
  })

  const setHighlighterElement = useEventCallback((element: HTMLDivElement | null): void => {
    highlighterElementRef.current = element
  })

  const setSuggestionsElement = useEventCallback((element: HTMLDivElement | null): void => {
    suggestionsElementRef.current = element

    if (element !== null) {
      requestViewSync({
        measureSuggestions: true,
      })
    }
  })

  const setInputRef = useEventCallback((element: InputElement | null): void => {
    inputElementRef.current = element
    defaultSuggestionsPortalHostRef.current = element?.ownerDocument.body ?? null
    const { inputRef } = argsRef.current.props
    if (typeof inputRef === 'function') {
      inputRef(element)
    } else if (inputRef !== null && inputRef !== undefined) {
      ;(inputRef as React.RefObject<InputElement | null>).current = element
    }
  })

  useLayoutEffect(() => {
    didUnmountRef.current = false

    return () => {
      didUnmountRef.current = true
      cancelScheduledFrame(scrollSyncFrameRef)
      cancelScheduledFrame(autoResizeFrameRef)
      pendingHighlighterRecomputeRef.current = false
      queuedHighlighterRecomputeRef.current = false
    }
  }, [cancelScheduledFrame])

  useLayoutEffect(() => {
    if (!pendingHighlighterRecomputeRef.current) {
      return
    }

    pendingHighlighterRecomputeRef.current = false
    if (queuedHighlighterRecomputeRef.current) {
      queuedHighlighterRecomputeRef.current = false
      scheduleHighlighterRecompute()
    }
  }, [args.state.highlighterRecomputeVersion, scheduleHighlighterRecompute])

  useLayoutEffect(() => {
    const { props, state, value, config } = argsRef.current
    const previousCommit = previousCommitRef.current
    const currentCommit: ViewSyncCommit<Extra> = {
      value,
      config: [...config],
      autoResize: props.autoResize,
      selectionStart: state.selectionStart,
      selectionEnd: state.selectionEnd,
      generatedId: state.generatedId,
      caretPosition: state.caretPosition,
      pendingSelectionUpdate: state.pendingSelectionUpdate,
    }
    const decision = getViewSyncDecision(previousCommit, currentCommit)

    ensureGeneratedId()
    requestViewSync(decision.flags, { flushNow: decision.flushNow })

    if (!decision.flushNow) {
      flushPendingViewSync()
    }

    previousCommitRef.current = currentCommit
  }, [
    args.config,
    args.isInlineAutocomplete,
    args.props.anchorMode,
    args.props.autoResize,
    args.props.singleLine,
    args.props.suggestionsPlacement,
    args.props.suggestionsPortalHost,
    args.state.caretPosition,
    args.state.focusIndex,
    args.state.generatedId,
    args.state.pendingSelectionUpdate,
    args.state.queryStates,
    args.state.selectionEnd,
    args.state.selectionStart,
    args.state.suggestions,
    args.value,
    ensureGeneratedId,
    flushPendingViewSync,
    requestViewSync,
  ])

  useEffect(() => {
    const ownerDocument = inputElementRef.current?.ownerDocument

    if (ownerDocument === undefined) {
      return undefined
    }

    ownerDocument.addEventListener('scroll', handleDocumentScroll, true)

    return () => {
      ownerDocument.removeEventListener('scroll', handleDocumentScroll, true)
    }
  }, [
    args.props.inputComponent,
    args.props.singleLine,
    args.state.generatedId,
    handleDocumentScroll,
  ])

  return {
    containerElementRef,
    inputElementRef,
    highlighterElementRef,
    suggestionsElementRef,
    pendingViewSyncRef,
    scrollSyncFrameRef,
    autoResizeFrameRef,
    setContainerElement,
    setInputRef,
    setHighlighterElement,
    setSuggestionsElement,
    suggestionsOverlayId,
    inlineAutocompleteLiveRegionId,
    ensureGeneratedIdIfNeeded: ensureGeneratedId,
    resolvePortalHost,
    requestViewSync,
    flushPendingViewSync,
    resetTextareaHeight,
    updateInlineSuggestionPosition,
    handleCaretPositionChange,
    scheduleHighlighterRecompute,
    updateSuggestionsPosition,
    updateHighlighterScroll,
    requestHighlighterScrollSync,
    handleInputScroll,
    handleDocumentScroll,
    setSelection,
  }
}
