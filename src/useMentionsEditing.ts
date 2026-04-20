import { useEffect, useRef } from 'react'
import type {
  ChangeEvent,
  CompositionEvent as ReactCompositionEvent,
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
  SyntheticEvent,
} from 'react'
import { DEFAULT_MENTION_PROPS } from './MentionDefaultProps'
import {
  applyCutToMentionsValue,
  applyInputChangeToMentionsValue,
  applyInsertTextToMentionsValue,
  applyPasteToMentionsValue,
  getMarkupSelectionRange,
} from './MentionsInputEditing'
import type { MentionValueSnapshot } from './MentionsInputDerived'
import type { MentionsInputStatePatch, SetMentionsInputState } from './MentionsInputState'
import { getSuggestionData } from './MentionsInputSelectors'
import type {
  InputElement,
  MentionChildConfig,
  MentionIdentifier,
  MentionOccurrence,
  MentionsInputChangeTrigger,
  MentionsInputProps,
  MentionsInputState,
  QueryInfo,
  SuggestionDataItem,
} from './types'
import { getMentionsAndPlainText, mapPlainTextIndex, spliceString } from './utils'
import { useEventCallback } from './utils/useEventCallback'

interface UseMentionsEditingArgs<Extra extends Record<string, unknown>> {
  props: MentionsInputProps<Extra>
  stateRef: React.RefObject<MentionsInputState<Extra>>
  setState: SetMentionsInputState<Extra>
  inputElementRef: React.RefObject<InputElement | null>
  getCurrentConfig: () => ReadonlyArray<MentionChildConfig<Extra>>
  getCurrentSnapshot: (
    value?: string,
    config?: ReadonlyArray<MentionChildConfig<Extra>>
  ) => MentionValueSnapshot<Extra>
  cacheSnapshot: (
    value: string,
    config: ReadonlyArray<MentionChildConfig<Extra>>,
    snapshot: MentionValueSnapshot<Extra>
  ) => MentionValueSnapshot<Extra>
  updateMentionsQueries: (plainTextValue: string, caretPosition: number, value?: string) => void
  clearSuggestions: (extraPatch?: MentionsInputStatePatch<Extra>) => void
  requestHighlighterScrollSync: () => void
}

const getMentionDiffKey = <Extra extends Record<string, unknown>>(
  mention: MentionOccurrence<Extra>
): string => JSON.stringify([mention.childIndex, String(mention.id), mention.display])

const getRemovedMentions = <Extra extends Record<string, unknown>>(
  previousMentions: ReadonlyArray<MentionOccurrence<Extra>>,
  nextMentions: ReadonlyArray<MentionOccurrence<Extra>>
): MentionOccurrence<Extra>[] => {
  const nextMentionCounts = new Map<string, number>()

  for (const mention of nextMentions) {
    const key = getMentionDiffKey(mention)
    nextMentionCounts.set(key, (nextMentionCounts.get(key) ?? 0) + 1)
  }

  const removedMentions: MentionOccurrence<Extra>[] = []

  for (const mention of previousMentions) {
    const key = getMentionDiffKey(mention)
    const count = nextMentionCounts.get(key) ?? 0

    if (count === 0) {
      removedMentions.push(mention)
      continue
    }

    nextMentionCounts.set(key, count - 1)
  }

  return removedMentions
}

export const useMentionsEditing = <Extra extends Record<string, unknown>>(
  args: UseMentionsEditingArgs<Extra>
) => {
  const argsRef = useRef(args)
  argsRef.current = args

  const suggestionsMouseDownRef = useRef(false)
  const isComposingRef = useRef(false)

  const emitOnRemoveCallbacks = useEventCallback(
    (
      previousSnapshot: MentionValueSnapshot<Extra>,
      nextSnapshot: MentionValueSnapshot<Extra>,
      config: ReadonlyArray<MentionChildConfig<Extra>>
    ): MentionOccurrence<Extra>[] => {
      const removedMentions = getRemovedMentions(previousSnapshot.mentions, nextSnapshot.mentions)

      for (const mention of removedMentions) {
        const onRemove = config[mention.childIndex]?.onRemove ?? DEFAULT_MENTION_PROPS.onRemove
        onRemove(mention.id)
      }

      return removedMentions
    }
  )

  const executeOnChange = useEventCallback(
    (
      baseTrigger: MentionsInputChangeTrigger,
      newValue: string,
      nextSnapshot: MentionValueSnapshot<Extra>,
      previousValue: string,
      previousSnapshot: MentionValueSnapshot<Extra>,
      config: ReadonlyArray<MentionChildConfig<Extra>>,
      mentionId?: MentionIdentifier
    ): void => {
      const removedMentions =
        baseTrigger.type === 'mention-add'
          ? []
          : emitOnRemoveCallbacks(previousSnapshot, nextSnapshot, config)
      const trigger =
        removedMentions.length > 0
          ? {
              type: 'mention-remove' as const,
              nativeEvent: baseTrigger.nativeEvent,
            }
          : baseTrigger
      const resolvedMentionId =
        mentionId ?? (removedMentions.length === 1 ? removedMentions[0]?.id : undefined)

      argsRef.current.props.onMentionsChange?.({
        trigger,
        value: newValue,
        plainTextValue: nextSnapshot.plainText,
        idValue: nextSnapshot.idValue,
        mentions: nextSnapshot.mentions,
        previousValue,
        mentionId: resolvedMentionId,
      })
    }
  )

  const insertText = useEventCallback((text: string): void => {
    const {
      props,
      stateRef,
      setState,
      inputElementRef,
      getCurrentConfig,
      getCurrentSnapshot,
      cacheSnapshot,
      updateMentionsQueries,
      requestHighlighterScrollSync,
    } = argsRef.current
    const input = inputElementRef.current
    const selectionStart = input?.selectionStart ?? stateRef.current.selectionStart
    const selectionEnd = input?.selectionEnd ?? stateRef.current.selectionEnd
    const value = props.value ?? ''
    const config = getCurrentConfig()
    const previousSnapshot = getCurrentSnapshot(value, config)
    const insertResult = applyInsertTextToMentionsValue<Extra>(
      value,
      config,
      selectionStart,
      selectionEnd,
      text
    )

    cacheSnapshot(insertResult.value, config, insertResult.snapshot)
    input?.focus()
    setState({
      selectionStart: insertResult.nextSelectionStart,
      selectionEnd: insertResult.nextSelectionStart,
      pendingSelectionUpdate: true,
    })

    executeOnChange(
      { type: 'insert-text' },
      insertResult.value,
      insertResult.snapshot,
      value,
      previousSnapshot,
      config
    )

    updateMentionsQueries(
      insertResult.snapshot.plainText,
      insertResult.nextSelectionStart,
      insertResult.value
    )
    requestHighlighterScrollSync()
  })

  const supportsClipboardActions = useEventCallback(
    (event: ClipboardEvent): boolean => !!event.clipboardData
  )

  const saveSelectionToClipboard = useEventCallback((event: ClipboardEvent): void => {
    const input = argsRef.current.inputElementRef.current
    if (!input || !event.clipboardData) {
      return
    }

    const selectionStart = input.selectionStart ?? 0
    const selectionEnd = input.selectionEnd ?? selectionStart
    const valueText = argsRef.current.props.value ?? ''
    const config = argsRef.current.getCurrentConfig()
    const { markupStartIndex, markupEndIndex } = getMarkupSelectionRange(
      valueText,
      config,
      selectionStart,
      selectionEnd
    )

    event.clipboardData.setData('text/plain', input.value.slice(selectionStart, selectionEnd))
    event.clipboardData.setData(
      'text/react-mentions',
      valueText.slice(markupStartIndex, markupEndIndex)
    )
  })

  const handlePaste = useEventCallback((event: ClipboardEvent): void => {
    const {
      props,
      stateRef,
      setState,
      inputElementRef,
      getCurrentConfig,
      getCurrentSnapshot,
      cacheSnapshot,
    } = argsRef.current

    if (event.target !== inputElementRef.current) {
      return
    }
    if (!supportsClipboardActions(event) || !event.clipboardData) {
      return
    }

    event.preventDefault()

    const valueText = props.value ?? ''
    const pastedMentions = event.clipboardData.getData('text/react-mentions')
    const pastedData = event.clipboardData.getData('text/plain')
    const config = getCurrentConfig()
    const previousSnapshot = getCurrentSnapshot(valueText, config)
    const pasteResult = applyPasteToMentionsValue<Extra>(
      valueText,
      config,
      stateRef.current.selectionStart,
      stateRef.current.selectionEnd,
      pastedMentions || pastedData
    )
    cacheSnapshot(pasteResult.value, config, pasteResult.snapshot)

    executeOnChange(
      { type: 'paste', nativeEvent: event },
      pasteResult.value,
      pasteResult.snapshot,
      valueText,
      previousSnapshot,
      config
    )
    setState({
      selectionStart: pasteResult.nextSelectionStart,
      selectionEnd: pasteResult.nextSelectionStart,
      pendingSelectionUpdate: true,
    })
  })

  const handleCopy = useEventCallback((event: ClipboardEvent): void => {
    if (event.target !== argsRef.current.inputElementRef.current) {
      return
    }
    if (!supportsClipboardActions(event)) {
      return
    }

    event.preventDefault()
    saveSelectionToClipboard(event)
  })

  const handleCut = useEventCallback((event: ClipboardEvent): void => {
    const {
      props,
      stateRef,
      setState,
      inputElementRef,
      getCurrentConfig,
      getCurrentSnapshot,
      cacheSnapshot,
    } = argsRef.current

    if (event.target !== inputElementRef.current) {
      return
    }
    if (!supportsClipboardActions(event) || !event.clipboardData) {
      return
    }

    event.preventDefault()
    saveSelectionToClipboard(event)

    const valueText = props.value ?? ''
    const config = getCurrentConfig()
    const previousSnapshot = getCurrentSnapshot(valueText, config)
    const cutResult = applyCutToMentionsValue<Extra>(
      valueText,
      config,
      stateRef.current.selectionStart,
      stateRef.current.selectionEnd
    )
    cacheSnapshot(cutResult.value, config, cutResult.snapshot)

    setState({
      selectionStart: cutResult.nextSelectionStart,
      selectionEnd: cutResult.nextSelectionStart,
      pendingSelectionUpdate: true,
    })

    executeOnChange(
      { type: 'cut', nativeEvent: event },
      cutResult.value,
      cutResult.snapshot,
      valueText,
      previousSnapshot,
      config
    )
  })

  const handleChange = useEventCallback((event: ChangeEvent<InputElement>): void => {
    const {
      props,
      stateRef,
      setState,
      inputElementRef,
      getCurrentConfig,
      getCurrentSnapshot,
      cacheSnapshot,
      updateMentionsQueries,
      requestHighlighterScrollSync,
    } = argsRef.current
    const native = event.nativeEvent
    if ('isComposing' in native && typeof native.isComposing === 'boolean') {
      isComposingRef.current = native.isComposing
    }
    const value = props.value ?? ''
    const newPlainTextValue = event.target.value

    let selectionStartBefore = stateRef.current.selectionStart
    if (selectionStartBefore === null) {
      selectionStartBefore = event.target.selectionStart ?? 0
    }

    let selectionEndBefore = stateRef.current.selectionEnd
    if (selectionEndBefore === null) {
      selectionEndBefore = event.target.selectionEnd ?? selectionStartBefore
    }

    const nativeEvent = event.nativeEvent as unknown as ReactCompositionEvent<InputElement> & {
      data?: string | null
      isComposing?: boolean
    }
    const config = getCurrentConfig()
    const previousSnapshot = getCurrentSnapshot(value, config)
    const inputChangeResult = applyInputChangeToMentionsValue<Extra>(
      value,
      newPlainTextValue,
      config,
      selectionStartBefore,
      selectionEndBefore,
      event.target.selectionEnd ?? selectionEndBefore,
      stateRef.current.selectionEnd,
      nativeEvent.data
    )
    cacheSnapshot(inputChangeResult.value, config, inputChangeResult.snapshot)

    setState((prevState) => ({
      selectionStart: inputChangeResult.nextSelectionStart,
      selectionEnd: inputChangeResult.nextSelectionEnd,
      pendingSelectionUpdate:
        prevState.pendingSelectionUpdate || inputChangeResult.shouldRestoreSelection,
    }))

    if (
      nativeEvent.isComposing === true &&
      inputChangeResult.nextSelectionStart === inputChangeResult.nextSelectionEnd &&
      inputElementRef.current !== null
    ) {
      updateMentionsQueries(inputElementRef.current.value, inputChangeResult.nextSelectionStart)
    }

    executeOnChange(
      { type: 'input', nativeEvent: event.nativeEvent },
      inputChangeResult.value,
      inputChangeResult.snapshot,
      value,
      previousSnapshot,
      config
    )

    props.onChange?.(event)
    requestHighlighterScrollSync()
  })

  const syncSelectionFromInput = useEventCallback(
    (reason: 'select' | 'selectionchange' = 'selectionchange'): void => {
      const {
        stateRef,
        setState,
        inputElementRef,
        updateMentionsQueries,
        requestHighlighterScrollSync,
      } = argsRef.current
      const input = inputElementRef.current
      if (!input) {
        return
      }

      if (reason === 'selectionchange') {
        const ownerDocument = input.ownerDocument
        if (ownerDocument.activeElement !== input) {
          return
        }
      }

      const selectionStart = input.selectionStart ?? null
      const selectionEnd = input.selectionEnd ?? null
      const selectionChanged =
        selectionStart !== stateRef.current.selectionStart ||
        selectionEnd !== stateRef.current.selectionEnd

      if (selectionChanged) {
        setState({
          selectionStart,
          selectionEnd,
        })
      }

      if (isComposingRef.current) {
        return
      }

      if (selectionStart !== null && selectionStart === selectionEnd) {
        updateMentionsQueries(input.value, selectionStart)
      } else {
        clearSuggestions()
      }

      requestHighlighterScrollSync()
    }
  )

  const handleSelect = useEventCallback((event: SyntheticEvent<InputElement>): void => {
    syncSelectionFromInput('select')
    argsRef.current.props.onSelect?.(event)
  })

  const handleBlur = useEventCallback((event: ReactFocusEvent<InputElement>): void => {
    const clickedSuggestion = suggestionsMouseDownRef.current
    suggestionsMouseDownRef.current = false

    if (!clickedSuggestion) {
      argsRef.current.setState({
        selectionStart: null,
        selectionEnd: null,
      })
    }

    argsRef.current.requestHighlighterScrollSync()
    argsRef.current.props.onMentionBlur?.(event, clickedSuggestion)
    argsRef.current.props.onBlur?.(event)
  })

  const handleSuggestionsMouseDown = useEventCallback((_event: ReactMouseEvent): void => {
    suggestionsMouseDownRef.current = true
  })

  const handleCompositionStart = useEventCallback((): void => {
    isComposingRef.current = true
  })

  const handleCompositionEnd = useEventCallback((): void => {
    isComposingRef.current = false
  })

  const clearSuggestions = useEventCallback((): void => {
    argsRef.current.clearSuggestions()
  })

  const addMention = useEventCallback(
    (
      suggestion: SuggestionDataItem<Extra>,
      { childIndex, querySequenceStart, querySequenceEnd }: QueryInfo
    ): void => {
      const {
        props,
        inputElementRef,
        getCurrentConfig,
        getCurrentSnapshot,
        cacheSnapshot,
        clearSuggestions,
      } = argsRef.current
      const { id, display } = getSuggestionData(suggestion)
      const value = props.value ?? ''
      const config = getCurrentConfig()
      const previousSnapshot = getCurrentSnapshot(value, config)
      if (childIndex < 0 || childIndex >= config.length) {
        return
      }
      const childConfig = config[childIndex]
      const {
        serializer,
        appendSpaceOnAdd = DEFAULT_MENTION_PROPS.appendSpaceOnAdd,
        onAdd = DEFAULT_MENTION_PROPS.onAdd,
      } = childConfig

      const start = mapPlainTextIndex(value, config, querySequenceStart, 'START') as number
      const end = start + querySequenceEnd - querySequenceStart

      const mentionDisplay = display
      let insert = serializer.insert({ id, display: mentionDisplay })

      if (appendSpaceOnAdd) {
        insert += ' '
      }
      const newValue = spliceString(value, start, end, insert)

      inputElementRef.current?.focus()

      let displayValue = childConfig.displayTransform(id, mentionDisplay)
      if (appendSpaceOnAdd) {
        displayValue += ' '
      }
      const newCaretPosition = querySequenceStart + displayValue.length
      clearSuggestions({
        selectionStart: newCaretPosition,
        selectionEnd: newCaretPosition,
        pendingSelectionUpdate: true,
      })

      const {
        mentions,
        plainText: newPlainTextValue,
        idValue: newIdValue,
      } = getMentionsAndPlainText<Extra>(newValue, config)
      const nextSnapshot = cacheSnapshot(newValue, config, {
        mentions,
        plainText: newPlainTextValue,
        idValue: newIdValue,
      })

      executeOnChange(
        { type: 'mention-add' },
        newValue,
        nextSnapshot,
        value,
        previousSnapshot,
        config,
        id
      )

      onAdd?.({
        id,
        display: mentionDisplay,
        startPos: start,
        endPos: end,
        serializerId: serializer.id,
      })
    }
  )

  const handleDocumentSelectionChange = useEventCallback((): void => {
    syncSelectionFromInput('selectionchange')
  })

  useEffect(() => {
    const ownerDocument = argsRef.current.inputElementRef.current?.ownerDocument ?? document

    ownerDocument.addEventListener('copy', handleCopy)
    ownerDocument.addEventListener('cut', handleCut)
    ownerDocument.addEventListener('paste', handlePaste)
    ownerDocument.addEventListener('selectionchange', handleDocumentSelectionChange)

    return () => {
      ownerDocument.removeEventListener('copy', handleCopy)
      ownerDocument.removeEventListener('cut', handleCut)
      ownerDocument.removeEventListener('paste', handlePaste)
      ownerDocument.removeEventListener('selectionchange', handleDocumentSelectionChange)
    }
  }, [handleCopy, handleCut, handlePaste, handleDocumentSelectionChange])

  return {
    isComposingRef,
    insertText,
    executeOnChange,
    handlePaste,
    saveSelectionToClipboard,
    supportsClipboardActions,
    handleCopy,
    handleCut,
    handleChange,
    handleSelect,
    syncSelectionFromInput,
    handleBlur,
    handleSuggestionsMouseDown,
    handleCompositionStart,
    handleCompositionEnd,
    clearSuggestions,
    addMention,
  }
}
