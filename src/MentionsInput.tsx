import type { KeyboardEvent, ReactElement, ReactNode, Ref } from 'react'
import { useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { defaultClassNames } from './defaultClassNames'
import Highlighter from './Highlighter'
import { buildMentionsInputInputProps, defaultMentionsInputProps } from './MentionsInputInputProps'
import MeasurementBridge from './MeasurementBridge'
import MentionsInputView from './MentionsInputView'
import SuggestionsOverlay from './SuggestionsOverlay'
import {
  MentionsInputInlineLiveRegion,
  MentionsInputInlineSuggestion,
} from './MentionsInputInlineSuggestion'
import { getInlineSuggestionAnnouncement, getSuggestionsLayoutKey } from './MentionsInputSelectors'
import { rootStructuralStyle } from './structuralStyles'
import { useCaretLayout } from './useCaretLayout'
import { useMentionSelectionChange } from './useMentionSelectionChange'
import { useMentionValueSnapshot } from './useMentionValueSnapshot'
import { useMentionsEditing } from './useMentionsEditing'
import { useMentionsInputState } from './MentionsInputState'
import { useSuggestionsQuery } from './useSuggestionsQuery'
import type {
  ClassNameJoiner,
  InputComponentProps,
  InputElement,
  MentionsInputChangeEvent,
  MentionsInputClassNames,
  MentionsInputHandle,
  MentionsInputProps,
} from './types'
import { countSuggestions, isNumber } from './utils'
import joinClassNames from './utils/joinClassNames'
import { useEventCallback } from './utils/useEventCallback'

const KEY = {
  TAB: 'Tab',
  RETURN: 'Enter',
  ESC: 'Escape',
  SPACE: ' ',
  RIGHT: 'ArrowRight',
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
} as const

const suggestionHandledKeys = new Set<string>([KEY.ESC, KEY.DOWN, KEY.UP, KEY.RETURN, KEY.TAB])

export type MentionsInputComponentProps<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> = MentionsInputProps<Extra> & {
  ref?: Ref<MentionsInputHandle>
}

const MentionsInput = <Extra extends Record<string, unknown> = Record<string, unknown>>({
  ref,
  ...baseProps
}: MentionsInputComponentProps<Extra>): ReactElement | null => {
  const { state, stateRef, setState } = useMentionsInputState<Extra>()
  const isControlled = baseProps.value !== undefined
  const [uncontrolledValue, setUncontrolledValue] = useState(() => baseProps.defaultValue ?? '')
  const handleUncontrolledMentionsChange = useEventCallback(
    (change: MentionsInputChangeEvent<Extra>): void => {
      setUncontrolledValue(change.value)
      baseProps.onMentionsChange?.(change)
    }
  )
  const props: MentionsInputProps<Extra> = isControlled
    ? baseProps
    : {
        ...baseProps,
        value: uncontrolledValue,
        onMentionsChange: handleUncontrolledMentionsChange,
      }
  const value = props.value ?? ''
  const singleLine = props.singleLine ?? defaultMentionsInputProps.singleLine
  const suggestionsDisplay =
    props.suggestionsDisplay ?? defaultMentionsInputProps.suggestionsDisplay
  const unstyled = props.unstyled ?? false
  const mergeClassNames: ClassNameJoiner = props.mergeClassNames ?? joinClassNames
  const getSlotClassName = (slot: keyof MentionsInputClassNames, baseClass: string): string =>
    mergeClassNames(unstyled ? undefined : baseClass, props.classNames?.[slot])
  const {
    preparedChildren,
    currentSnapshot,
    getMentionChildren,
    getCurrentConfig,
    getCurrentSnapshot,
    cacheSnapshot,
  } = useMentionValueSnapshot<Extra>(props.children, props.value)
  const config = preparedChildren.config
  const mentionChildren = preparedChildren.mentionChildren

  const isInlineAutocomplete = suggestionsDisplay === 'inline'

  const suggestionsQuery = useSuggestionsQuery<Extra>({
    props,
    state,
    stateRef,
    setState,
    mentionChildren,
    getMentionChildren,
    getCurrentConfig,
    isInlineAutocomplete,
  })
  const hasInlineSuggestion = suggestionsQuery.inlineSuggestionDetails !== null
  const suggestionsLayoutKey = isInlineAutocomplete
    ? null
    : getSuggestionsLayoutKey({
        suggestions: state.suggestions,
        queryStates: state.queryStates,
        isLoading: suggestionsQuery.isLoading,
        statusType: suggestionsQuery.suggestionsStatusContent.statusType,
        hasInlineSuggestion,
      })

  const caretLayout = useCaretLayout<Extra>({
    props,
    state,
    stateRef,
    setState,
    value,
    config,
    isInlineAutocomplete,
    hasInlineSuggestion,
    getHasInlineSuggestion: () => suggestionsQuery.getInlineSuggestionDetails() !== null,
    suggestionsLayoutKey,
  })

  const editing = useMentionsEditing<Extra>({
    props,
    stateRef,
    setState,
    inputElementRef: caretLayout.inputElementRef,
    getCurrentConfig,
    getCurrentSnapshot,
    cacheSnapshot,
    updateMentionsQueries: suggestionsQuery.updateMentionsQueries,
    clearSuggestions: suggestionsQuery.clearSuggestions,
    requestHighlighterScrollSync: caretLayout.requestHighlighterScrollSync,
  })

  const handleFormReset = useEventCallback((): void => {
    setUncontrolledValue(baseProps.defaultValue ?? '')
  })

  useEffect(() => {
    if (isControlled) {
      return undefined
    }

    const form = caretLayout.inputElementRef.current?.form ?? null
    if (!form) {
      return undefined
    }

    form.addEventListener('reset', handleFormReset)
    return () => form.removeEventListener('reset', handleFormReset)
  }, [isControlled, handleFormReset, caretLayout.inputElementRef])

  const { currentMentionSelectionMap } = useMentionSelectionChange<Extra>({
    props,
    state,
    config,
    currentSnapshot,
    getCurrentSnapshot,
  })

  const selectFocused = useEventCallback((): void => {
    const entry = suggestionsQuery.getFocusedSuggestionEntry()
    if (!entry) {
      return
    }

    editing.addMention(entry.result, entry.queryInfo)
    setState({ focusIndex: 0 })
  })

  const handleKeyDown = useEventCallback((event: KeyboardEvent<InputElement>): void => {
    if (isInlineAutocomplete) {
      const inlineSuggestion = suggestionsQuery.getInlineSuggestionDetails()
      if (!inlineSuggestion) {
        props.onKeyDown?.(event)
        return
      }

      switch (event.key) {
        case KEY.ESC: {
          const suggestionsCount = countSuggestions(stateRef.current.suggestions)
          if (suggestionsCount > 0) {
            event.preventDefault()
            event.stopPropagation()
            suggestionsQuery.shiftFocus(1)
            return
          }
          break
        }
        case KEY.RETURN:
        case KEY.TAB:
        case KEY.RIGHT: {
          if (
            (event.key === KEY.TAB && event.shiftKey) ||
            !suggestionsQuery.canApplyInlineSuggestion()
          ) {
            break
          }
          event.preventDefault()
          event.stopPropagation()
          selectFocused()
          return
        }
        default:
      }

      props.onKeyDown?.(event)
      return
    }

    const suggestionsCount = countSuggestions(stateRef.current.suggestions)

    if (suggestionsCount === 0 || !caretLayout.suggestionsElementRef.current) {
      props.onKeyDown?.(event)
      return
    }

    if (suggestionHandledKeys.has(event.key)) {
      event.preventDefault()
      event.stopPropagation()
    }

    switch (event.key) {
      case KEY.ESC: {
        suggestionsQuery.clearSuggestions()
        return
      }
      case KEY.DOWN: {
        suggestionsQuery.shiftFocus(1)
        return
      }
      case KEY.UP: {
        suggestionsQuery.shiftFocus(-1)
        return
      }
      case KEY.RETURN:
      case KEY.TAB: {
        selectFocused()
        return
      }
      default:
    }

    props.onKeyDown?.(event)
  })

  useImperativeHandle(
    ref,
    (): MentionsInputHandle => ({
      insertText: editing.insertText,
    }),
    [editing.insertText]
  )

  const getInputProps = (): InputComponentProps => {
    return buildMentionsInputInputProps<Extra>({
      props,
      inputClassName: getSlotClassName('input', defaultClassNames.input(singleLine)),
      plainTextValue: currentSnapshot.plainText,
      singleLine,
      isInlineAutocomplete,
      inlineSuggestion: isInlineAutocomplete ? suggestionsQuery.inlineSuggestionDetails : null,
      isSuggestionsOpened: suggestionsQuery.isOpened,
      suggestionsOverlayId: caretLayout.suggestionsOverlayId,
      inlineAutocompleteLiveRegionId: caretLayout.inlineAutocompleteLiveRegionId,
      focusIndex: state.focusIndex,
      onScroll: caretLayout.handleInputScroll,
      onChange: editing.handleChange,
      onSelect: editing.handleSelect,
      onKeyDown: handleKeyDown,
      onBlur: editing.handleBlur,
      onCompositionStart: editing.handleCompositionStart,
      onCompositionEnd: editing.handleCompositionEnd,
    })
  }

  const renderInputControl = (): ReactElement => {
    const CustomInput = props.inputComponent
    const inputProps = getInputProps()

    if (CustomInput === undefined) {
      return singleLine ? (
        <input type="text" ref={caretLayout.setInputRef} {...inputProps} />
      ) : (
        <textarea ref={caretLayout.setInputRef} {...inputProps} />
      )
    }

    return <CustomInput ref={caretLayout.setInputRef} {...inputProps} />
  }

  const renderSuggestionsOverlay = (): ReactNode | null => {
    if (isInlineAutocomplete) {
      return null
    }

    if (!isNumber(state.selectionStart)) {
      return null
    }

    const { position, left, top, right, width } = state.suggestionsPosition
    const portalTarget = caretLayout.resolvePortalHost()
    const overlayId = caretLayout.suggestionsOverlayId
    const { statusContent, statusType } = suggestionsQuery.suggestionsStatusContent

    const suggestionsNode = (
      <SuggestionsOverlay<Extra>
        id={overlayId}
        mentionChildren={mentionChildren}
        className={props.classNames?.suggestions}
        statusClassName={props.classNames?.suggestionsStatus}
        statusContent={statusContent}
        statusType={statusType}
        listClassName={props.classNames?.suggestionsList}
        itemClassName={props.classNames?.suggestionItem}
        focusedItemClassName={props.classNames?.suggestionItemFocused}
        displayClassName={props.classNames?.suggestionDisplay}
        highlightClassName={props.classNames?.suggestionHighlight}
        loadingClassName={props.classNames?.loadingIndicator}
        spinnerClassName={props.classNames?.loadingSpinner}
        spinnerElementClassName={props.classNames?.loadingSpinnerElement}
        position={position}
        left={left}
        top={top}
        right={right}
        width={width}
        focusIndex={state.focusIndex}
        scrollFocusedIntoView={state.scrollFocusedIntoView}
        containerRef={caretLayout.setSuggestionsElement}
        suggestions={state.suggestions}
        customSuggestionsContainer={props.customSuggestionsContainer}
        onSelect={editing.addMention}
        onMouseDown={editing.handleSuggestionsMouseDown}
        onMouseEnter={suggestionsQuery.handleSuggestionsMouseEnter}
        onLoadMore={suggestionsQuery.loadMoreSuggestions}
        isLoading={suggestionsQuery.isLoading}
        isOpened={suggestionsQuery.isOpened}
        a11ySuggestionsListLabel={props.a11ySuggestionsListLabel}
        unstyled={unstyled}
        mergeClassNames={mergeClassNames}
      >
        {props.children}
      </SuggestionsOverlay>
    )

    return portalTarget ? createPortal(suggestionsNode, portalTarget) : suggestionsNode
  }

  const renderInlineSuggestion = (): ReactNode => {
    if (!isInlineAutocomplete || !isNumber(state.selectionStart)) {
      return null
    }

    return (
      <MentionsInputInlineSuggestion<Extra>
        inlineSuggestion={suggestionsQuery.inlineSuggestionDetails}
        inlineSuggestionPosition={state.inlineSuggestionPosition}
        classNames={props.classNames}
        unstyled={unstyled}
        mergeClassNames={mergeClassNames}
      />
    )
  }

  const renderInlineSuggestionLiveRegion = (): ReactNode => {
    if (!isInlineAutocomplete) {
      return null
    }

    const inlineSuggestion = suggestionsQuery.inlineSuggestionDetails
    const announcement = getInlineSuggestionAnnouncement(
      inlineSuggestion,
      suggestionsQuery.suggestionsStatusContent
    )

    return (
      <MentionsInputInlineLiveRegion
        id={caretLayout.inlineAutocompleteLiveRegionId}
        announcement={announcement}
      />
    )
  }

  const renderHighlighter = (): ReactElement => (
    <Highlighter
      containerRef={caretLayout.setHighlighterElement}
      className={props.classNames?.highlighter}
      substringClassName={props.classNames?.highlighterSubstring}
      caretClassName={props.classNames?.highlighterCaret}
      mentionChildren={mentionChildren}
      config={config}
      value={props.value}
      singleLine={singleLine}
      selectionStart={state.selectionStart}
      selectionEnd={state.selectionEnd}
      recomputeVersion={state.highlighterRecomputeVersion}
      onCaretPositionChange={caretLayout.handleCaretPositionChange}
      mentionSelectionMap={currentMentionSelectionMap}
      unstyled={unstyled}
      mergeClassNames={mergeClassNames}
    >
      {props.children}
    </Highlighter>
  )

  const renderHiddenFormInput = (): ReactNode => {
    if (props.name === undefined || props.name.length === 0) {
      return null
    }

    return (
      <input type="hidden" name={props.name} value={value} readOnly disabled={props.disabled} />
    )
  }

  const renderMeasurementBridge = (): ReactElement => (
    <MeasurementBridge
      container={caretLayout.containerElementRef.current}
      highlighter={caretLayout.highlighterElementRef.current}
      input={caretLayout.inputElementRef.current}
      suggestions={caretLayout.suggestionsElementRef.current}
      requestViewSync={caretLayout.requestViewSync}
    />
  )

  const rootStyle = useMemo(
    () =>
      props.style === undefined ? rootStructuralStyle : { ...rootStructuralStyle, ...props.style },
    [props.style]
  )

  return (
    <MentionsInputView
      rootRef={caretLayout.setContainerElement}
      rootClassName={mergeClassNames(
        unstyled ? undefined : defaultClassNames.root,
        props.className
      )}
      style={rootStyle}
      singleLine={singleLine}
      controlClassName={getSlotClassName('control', defaultClassNames.control)}
      highlighter={renderHighlighter()}
      input={renderInputControl()}
      inlineSuggestion={renderInlineSuggestion()}
      inlineSuggestionLiveRegion={renderInlineSuggestionLiveRegion()}
      suggestionsOverlay={renderSuggestionsOverlay()}
      measurementBridge={renderMeasurementBridge()}
      hiddenFormInput={renderHiddenFormInput()}
    />
  )
}

export default MentionsInput
