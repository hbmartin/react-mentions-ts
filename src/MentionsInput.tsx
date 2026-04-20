import type { KeyboardEvent, ReactElement, ReactNode, Ref } from 'react'
import { useImperativeHandle } from 'react'
import { cva } from 'class-variance-authority'
import { createPortal } from 'react-dom'
import Highlighter from './Highlighter'
import MeasurementBridge from './MeasurementBridge'
import MentionsInputView from './MentionsInputView'
import SuggestionsOverlay from './SuggestionsOverlay'
import {
  MentionsInputInlineLiveRegion,
  MentionsInputInlineSuggestion,
} from './MentionsInputInlineSuggestion'
import { getInputInlineStyle } from './MentionsInputLayout'
import { getInlineSuggestionAnnouncement } from './MentionsInputSelectors'
import { useCaretLayout } from './useCaretLayout'
import { useMentionSelectionChange } from './useMentionSelectionChange'
import { useMentionValueSnapshot } from './useMentionValueSnapshot'
import { useMentionsEditing } from './useMentionsEditing'
import { useMentionsInputState } from './MentionsInputState'
import { useSuggestionsQuery } from './useSuggestionsQuery'
import type {
  InputComponentProps,
  InputElement,
  MentionsInputClassNames,
  MentionsInputHandle,
  MentionsInputProps,
} from './types'
import { cn, countSuggestions, getSuggestionHtmlId, isNumber, omit } from './utils'
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

const rootStyles = cva('relative overflow-y-visible')
const controlStyles = cva('relative border border-border bg-card')
const inputStyles = cva(
  'relative block w-full m-0 box-border bg-transparent text-foreground transition placeholder:text-muted-foreground [font-family:inherit] [font-size:inherit] [letter-spacing:inherit]',
  {
    variants: {
      singleLine: {
        true: '',
        false: 'h-full overflow-hidden resize-none whitespace-pre-wrap break-words',
      },
    },
  }
)

const HANDLED_PROPS: Array<keyof MentionsInputProps> = [
  'singleLine',
  'anchorMode',
  'suggestionsPlacement',
  'a11ySuggestionsListLabel',
  'value',
  'onKeyDown',
  'customSuggestionsContainer',
  'onSelect',
  'onMentionBlur',
  'onMentionsChange',
  'onMentionSelectionChange',
  'onBlur',
  'onChange',
  'suggestionsPortalHost',
  'inputRef',
  'inputComponent',
  'children',
  'style',
  'className',
  'classNames',
  'suggestionsDisplay',
  'autoResize',
]

const defaultMentionsInputProps = {
  singleLine: false,
  autoResize: false,
  anchorMode: 'caret',
  suggestionsPlacement: 'below',
  onKeyDown: () => null,
  onSelect: () => null,
  suggestionsDisplay: 'overlay',
  spellCheck: false,
} satisfies Partial<MentionsInputProps> & {
  singleLine: boolean
}

const getSlotClassName = (
  classNames: MentionsInputClassNames | undefined,
  slot: keyof MentionsInputClassNames,
  baseClass: string
): string => cn(baseClass, classNames?.[slot])

type MentionsInputComponentProps<Extra extends Record<string, unknown> = Record<string, unknown>> =
  MentionsInputProps<Extra> & {
    ref?: Ref<MentionsInputHandle>
  }

const MentionsInput = <Extra extends Record<string, unknown> = Record<string, unknown>>({
  ref,
  ...props
}: MentionsInputComponentProps<Extra>): ReactElement | null => {
  const { state, stateRef, setState } = useMentionsInputState<Extra>()
  const value = props.value ?? ''
  const singleLine = props.singleLine ?? defaultMentionsInputProps.singleLine
  const suggestionsDisplay =
    props.suggestionsDisplay ?? defaultMentionsInputProps.suggestionsDisplay
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

  const caretLayout = useCaretLayout<Extra>({
    props,
    state,
    stateRef,
    setState,
    value,
    config,
    isInlineAutocomplete,
    hasInlineSuggestion: () => suggestionsQuery.getInlineSuggestionDetails() !== null,
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
    const { readOnly, disabled } = props
    const passthroughProps = omit(
      props as unknown as Record<string, unknown>,
      HANDLED_PROPS as ReadonlyArray<keyof MentionsInputProps>
    ) as Partial<InputComponentProps>
    const baseClassName = getSlotClassName(props.classNames, 'input', inputStyles({ singleLine }))
    const inputProps: Record<string, unknown> = {
      ...passthroughProps,
      className: baseClassName,
      spellCheck: props.spellCheck ?? defaultMentionsInputProps.spellCheck,
      value: currentSnapshot.plainText,
      onScroll: caretLayout.handleInputScroll,
      'data-slot': 'input',
      'data-single-line': singleLine ? 'true' : undefined,
      'data-multi-line': singleLine ? undefined : 'true',
    }
    const inlineStyle = getInputInlineStyle(singleLine)

    if (Object.keys(inlineStyle).length > 0) {
      inputProps.style = inlineStyle
    }

    if (readOnly !== true && disabled !== true) {
      Object.assign(inputProps, {
        onChange: editing.handleChange,
        onSelect: editing.handleSelect,
        onKeyDown: handleKeyDown,
        onBlur: editing.handleBlur,
        onCompositionStart: editing.handleCompositionStart,
        onCompositionEnd: editing.handleCompositionEnd,
      })
    }

    const inlineAutocomplete = isInlineAutocomplete
    const inlineSuggestion = inlineAutocomplete ? suggestionsQuery.inlineSuggestionDetails : null
    const isOverlayOpen = !inlineAutocomplete && suggestionsQuery.isOpened
    const overlayId = caretLayout.suggestionsOverlayId
    const hasOverlayId = overlayId !== undefined

    Object.assign(inputProps, {
      role: 'combobox',
      'aria-autocomplete': inlineAutocomplete ? 'inline' : 'list',
      'aria-expanded': inlineAutocomplete ? 'false' : suggestionsQuery.isOpened ? 'true' : 'false',
      'aria-haspopup': inlineAutocomplete ? undefined : 'listbox',
      'aria-controls': isOverlayOpen && hasOverlayId ? overlayId : undefined,
      'aria-activedescendant':
        isOverlayOpen && hasOverlayId
          ? getSuggestionHtmlId(overlayId, state.focusIndex)
          : undefined,
    })

    if (inlineAutocomplete && inlineSuggestion) {
      const liveRegionId = caretLayout.inlineAutocompleteLiveRegionId
      const existingDescribedBy =
        typeof inputProps['aria-describedby'] === 'string'
          ? inputProps['aria-describedby']
          : undefined
      const describedBy = [existingDescribedBy, liveRegionId]
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .join(' ')
      inputProps['aria-describedby'] = describedBy.length > 0 ? describedBy : undefined
    }

    return inputProps as InputComponentProps
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
    >
      {props.children}
    </Highlighter>
  )

  const renderMeasurementBridge = (): ReactElement => (
    <MeasurementBridge
      container={caretLayout.containerElementRef.current}
      highlighter={caretLayout.highlighterElementRef.current}
      input={caretLayout.inputElementRef.current}
      suggestions={caretLayout.suggestionsElementRef.current}
      requestViewSync={caretLayout.requestViewSync}
    />
  )

  return (
    <MentionsInputView
      rootRef={caretLayout.setContainerElement}
      rootClassName={cn(rootStyles(), props.className)}
      style={props.style}
      singleLine={singleLine}
      controlClassName={getSlotClassName(props.classNames, 'control', controlStyles())}
      highlighter={renderHighlighter()}
      input={renderInputControl()}
      inlineSuggestion={renderInlineSuggestion()}
      inlineSuggestionLiveRegion={renderInlineSuggestionLiveRegion()}
      suggestionsOverlay={renderSuggestionsOverlay()}
      measurementBridge={renderMeasurementBridge()}
    />
  )
}

export default MentionsInput
