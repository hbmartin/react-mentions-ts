import type {
  ChangeEvent,
  CompositionEvent,
  CSSProperties,
  KeyboardEvent,
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
  SyntheticEvent,
} from 'react'
import React, { Children } from 'react'
import { cva } from 'class-variance-authority'
import { createPortal } from 'react-dom'
import Highlighter from './Highlighter'
import { DEFAULT_MENTION_PROPS } from './MentionDefaultProps'
import SuggestionsOverlay from './SuggestionsOverlay'
import {
  applyChangeToValue,
  countSuggestions,
  findStartOfMentionInPlainText,
  getEndOfLastMention,
  getMentions,
  getPlainText,
  getSubstringIndex,
  getSuggestionHtmlId,
  isIE,
  isNumber,
  makeMentionsMarkup,
  mapPlainTextIndex,
  omit,
  readConfigFromChildren,
  spliceString,
} from './utils'
import { cn } from './utils/cn'
import { makeTriggerRegex } from './utils/makeTriggerRegex'
import type {
  CaretCoordinates,
  DataSource,
  InputComponentProps,
  MentionComponentProps,
  MentionDataItem,
  MentionOccurrence,
  MentionsInputProps,
  MentionsInputState,
  MentionsInputClassNames,
  QueryInfo,
  SuggestionDataItem,
  SuggestionsMap,
  SuggestionsPosition,
  InputElement,
} from './types'

const getDataProvider = (
  data: DataSource,
  ignoreAccents?: boolean
): ((query: string) => Promise<MentionDataItem[]>) => {
  if (Array.isArray(data)) {
    return (query: string) =>
      Promise.resolve(
        data.filter(
          (item) => getSubstringIndex(item.display || String(item.id), query, ignoreAccents) >= 0
        )
      )
  }

  return data
}

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
const controlStyles = cva('relative')
const inputStyles = cva(
  'relative block w-full m-0 box-border bg-transparent [font-family:inherit] [font-size:inherit] [letter-spacing:inherit]',
  {
    variants: {
      singleLine: {
        true: '',
        false: 'h-full overflow-hidden resize-none',
      },
    },
  }
)
const inlineSuggestionStyles = cva(
  'absolute inline-block pointer-events-none [color:inherit] opacity-40 whitespace-pre [font-family:inherit] [font-size:inherit] [letter-spacing:inherit] z-[2]'
)
const inlineSuggestionTextStyles = 'relative inline-block'
const inlineSuggestionPrefixStyles =
  'absolute right-full top-0 whitespace-pre invisible pointer-events-none'
const inlineSuggestionSuffixStyles = 'whitespace-pre'

const HANDLED_PROPS: Array<keyof MentionsInputProps> = [
  'singleLine',
  'allowSpaceInQuery',
  'allowSuggestionsAboveCursor',
  'selectLastSuggestionOnSpace',
  'forceSuggestionsAboveCursor',
  'ignoreAccents',
  'a11ySuggestionsListLabel',
  'value',
  'valueLink',
  'onKeyDown',
  'customSuggestionsContainer',
  'onSelect',
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
  'inlineSuggestionDisplay',
]

class MentionsInput extends React.Component<MentionsInputProps, MentionsInputState> {
  static readonly defaultProps: Partial<MentionsInputProps> = {
    ignoreAccents: false,
    singleLine: false,
    allowSuggestionsAboveCursor: false,
    onKeyDown: () => null,
    onSelect: () => null,
    onBlur: () => null,
    suggestionsDisplay: 'overlay',
    inlineSuggestionDisplay: 'remaining',
  }

  private suggestions: SuggestionsMap = {}
  private readonly uuidSuggestionsOverlay: string
  private containerElement: HTMLDivElement | null = null
  private inputElement: HTMLInputElement | HTMLTextAreaElement | null = null
  private highlighterElement: HTMLDivElement | null = null
  private suggestionsElement: HTMLDivElement | null = null
  private _queryId = 0
  private _suggestionsMouseDown = false
  private readonly _selectionStartBeforeFocus: number | null = null
  private readonly _selectionEndBeforeFocus: number | null = null
  private _isComposing = false
  private readonly defaultSuggestionsPortalHost: HTMLElement | null

  private getSlotClassName(slot: keyof MentionsInputClassNames, baseClass: string) {
    const { classNames } = this.props
    const extra = classNames?.[slot]
    return cn(baseClass, extra)
  }

  private resolvePortalHost(): Element | null {
    const { suggestionsPortalHost } = this.props

    if (suggestionsPortalHost === null) {
      return null
    }

    if (typeof Document !== 'undefined' && suggestionsPortalHost instanceof Document) {
      return suggestionsPortalHost.body
    }

    if (suggestionsPortalHost) {
      return suggestionsPortalHost as Element
    }

    return this.defaultSuggestionsPortalHost
  }

  constructor(props: MentionsInputProps) {
    super(props)
    this.uuidSuggestionsOverlay = Math.random().toString(16).slice(2)
    this.defaultSuggestionsPortalHost = typeof document === 'undefined' ? null : document.body

    this.handleCopy = this.handleCopy.bind(this)
    this.handleCut = this.handleCut.bind(this)
    this.handlePaste = this.handlePaste.bind(this)

    this.state = {
      focusIndex: 0,
      selectionStart: null,
      selectionEnd: null,
      suggestions: {},
      caretPosition: null,
      suggestionsPosition: {},
      setSelectionAfterHandlePaste: false,
    }
  }

  componentDidMount(): void {
    document.addEventListener('copy', this.handleCopy)
    document.addEventListener('cut', this.handleCut)
    document.addEventListener('paste', this.handlePaste)
    document.addEventListener('scroll', this.handleDocumentScroll, true)

    this.updateSuggestionsPosition()
  }

  componentDidUpdate(prevProps: MentionsInputProps, prevState: MentionsInputState): void {
    // Update position of suggestions unless this componentDidUpdate was
    // triggered by an update to suggestionsPosition.
    if (prevState.suggestionsPosition === this.state.suggestionsPosition) {
      this.updateSuggestionsPosition()
    }

    // maintain selection in case a mention is added/removed causing
    // the cursor to jump to the end
    if (this.state.setSelectionAfterMentionChange) {
      this.setState({ setSelectionAfterMentionChange: false })
      this.setSelection(this.state.selectionStart, this.state.selectionEnd)
    }
    if (this.state.setSelectionAfterHandlePaste) {
      this.setState({ setSelectionAfterHandlePaste: false })
      this.setSelection(this.state.selectionStart, this.state.selectionEnd)
    }
  }

  componentWillUnmount(): void {
    document.removeEventListener('copy', this.handleCopy)
    document.removeEventListener('cut', this.handleCut)
    document.removeEventListener('paste', this.handlePaste)
    document.removeEventListener('scroll', this.handleDocumentScroll, true)
  }

  render(): React.ReactNode {
    const { className, style, singleLine } = this.props
    const rootClassName = cn(rootStyles(), className)
    return (
      <div
        ref={this.setContainerElement}
        className={rootClassName}
        style={style}
        data-single-line={singleLine ? 'true' : undefined}
        data-multi-line={singleLine ? undefined : 'true'}
      >
        {this.renderControl()}
        {this.renderSuggestionsOverlay()}
      </div>
    )
  }

  setContainerElement = (el: HTMLDivElement | null) => {
    this.containerElement = el
  }

  getInputProps = (): InputComponentProps => {
    const { readOnly, disabled, singleLine } = this.props

    const passthroughProps = omit(
      this.props,
      HANDLED_PROPS as ReadonlyArray<keyof MentionsInputProps>
    ) as Partial<InputComponentProps>

    const { ...restPassthrough } = passthroughProps

    const baseClassName = this.getSlotClassName(
      'input',
      inputStyles({ singleLine: Boolean(singleLine) })
    )

    const props: Record<string, unknown> = {
      ...restPassthrough,
      className: baseClassName,
      value: this.getPlainText(),
      onScroll: this.updateHighlighterScroll,
      'data-slot': 'input',
      'data-single-line': singleLine ? 'true' : undefined,
      'data-multi-line': singleLine ? undefined : 'true',
    }

    const inlineStyle: CSSProperties = {
      background: 'transparent',
    }

    if (!singleLine && isMobileSafari) {
      inlineStyle.marginTop = 1
      inlineStyle.marginLeft = -3
    }

    if (Object.keys(inlineStyle).length > 0) {
      props.style = inlineStyle
    }

    if (!readOnly && !disabled) {
      Object.assign(props, {
        onChange: this.handleChange,
        onSelect: this.handleSelect,
        onKeyDown: this.handleKeyDown,
        onBlur: this.handleBlur,
        onCompositionStart: this.handleCompositionStart,
        onCompositionEnd: this.handleCompositionEnd,
      })
    }

    if (this.isInlineAutocomplete()) {
      const inlineSuggestion = this.getInlineSuggestionDetails()
      if (inlineSuggestion) {
        Object.assign(props, {
          role: 'combobox',
          'aria-autocomplete': 'inline',
          'aria-expanded': false,
        })
      }
    } else if (this.isOpened()) {
      Object.assign(props, {
        role: 'combobox',
        'aria-controls': this.uuidSuggestionsOverlay,
        'aria-expanded': true,
        'aria-autocomplete': 'list',
        'aria-haspopup': 'listbox',
        'aria-activedescendant': getSuggestionHtmlId(
          this.uuidSuggestionsOverlay,
          this.state.focusIndex
        ),
      })
    }

    return props as InputComponentProps
  }

  renderControl = (): React.ReactElement => {
    const { singleLine, inputComponent: CustomInput } = this.props
    const inputProps = this.getInputProps()
    const controlClassName = this.getSlotClassName('control', controlStyles())

    const control = CustomInput
      ? React.createElement(
          CustomInput as React.ComponentType<any>,
          {
            ref: this.setInputRef,
            ...inputProps,
          } as any
        )
      : singleLine
        ? this.renderInput(inputProps)
        : this.renderTextarea(inputProps)

    return (
      <div className={controlClassName} data-slot="control">
        {this.renderHighlighter()}
        {control}
        {this.renderInlineSuggestion()}
      </div>
    )
  }

  renderInput = (props: InputComponentProps): React.ReactElement => {
    return <input type="text" ref={this.setInputRef} {...props} />
  }

  renderTextarea = (props: InputComponentProps): React.ReactElement => {
    return <textarea ref={this.setInputRef} {...props} />
  }

  setInputRef = (el: InputElement | null) => {
    this.inputElement = el
    const { inputRef } = this.props
    if (typeof inputRef === 'function') {
      inputRef(el)
    } else if (inputRef) {
      ;(inputRef as React.RefObject<InputElement | null>).current = el
    }
  }

  setSuggestionsElement = (el: HTMLDivElement | null) => {
    this.suggestionsElement = el
  }

  // eslint-disable-next-line sonarjs/function-return-type
  renderSuggestionsOverlay = (): React.ReactNode | null => {
    if (this.isInlineAutocomplete()) {
      return null
    }

    if (!isNumber(this.state.selectionStart)) {
      // do not show suggestions when the input does not have the focus
      return null
    }

    const { position, left, top, right, width } = this.state.suggestionsPosition
    const portalTarget = this.resolvePortalHost()

    const suggestionsNode = (
      <SuggestionsOverlay
        id={this.uuidSuggestionsOverlay}
        className={this.props.classNames?.suggestions}
        listClassName={this.props.classNames?.suggestionsList}
        itemClassName={this.props.classNames?.suggestionItem}
        focusedItemClassName={this.props.classNames?.suggestionItemFocused}
        displayClassName={this.props.classNames?.suggestionDisplay}
        highlightClassName={this.props.classNames?.suggestionHighlight}
        loadingClassName={this.props.classNames?.loadingIndicator}
        spinnerClassName={this.props.classNames?.loadingSpinner}
        spinnerElementClassName={this.props.classNames?.loadingSpinnerElement}
        position={position}
        left={left}
        top={top}
        right={right}
        width={width}
        focusIndex={this.state.focusIndex}
        scrollFocusedIntoView={this.state.scrollFocusedIntoView}
        containerRef={this.setSuggestionsElement}
        suggestions={this.state.suggestions}
        customSuggestionsContainer={this.props.customSuggestionsContainer}
        onSelect={this.addMention}
        onMouseDown={this.handleSuggestionsMouseDown}
        onMouseEnter={this.handleSuggestionsMouseEnter}
        isLoading={this.isLoading()}
        isOpened={this.isOpened()}
        ignoreAccents={this.props.ignoreAccents}
        a11ySuggestionsListLabel={this.props.a11ySuggestionsListLabel}
      >
        {this.props.children}
      </SuggestionsOverlay>
    )
    if (portalTarget) {
      return createPortal(suggestionsNode, portalTarget)
    }
    return suggestionsNode
  }

  renderInlineSuggestion = (): React.ReactNode => {
    if (!this.isInlineAutocomplete()) {
      return null
    }

    if (!isNumber(this.state.selectionStart)) {
      return null
    }

    const inlineSuggestion = this.getInlineSuggestionDetails()
    if (!inlineSuggestion) {
      return null
    }

    const { caretPosition } = this.state
    const highlighter = this.highlighterElement
    if (!caretPosition || !highlighter) {
      return null
    }

    const caretElement = highlighter.querySelector<HTMLSpanElement>('[data-mentions-caret]')
    const controlElement = highlighter.parentElement
    const controlRect = controlElement?.getBoundingClientRect()
    const caretRect = caretElement?.getBoundingClientRect()

    if (!caretRect || !controlRect) {
      return null
    }

    const left = caretRect.left - controlRect.left
    const top = caretRect.top - controlRect.top

    const wrapperClassName = this.getSlotClassName('inlineSuggestion', inlineSuggestionStyles())
    const wrapperStyle: CSSProperties = { left, top }
    const textWrapperClassName = this.getSlotClassName(
      'inlineSuggestionText',
      inlineSuggestionTextStyles
    )
    const prefixClassName = this.getSlotClassName(
      'inlineSuggestionPrefix',
      inlineSuggestionPrefixStyles
    )
    const suffixClassName = this.getSlotClassName(
      'inlineSuggestionSuffix',
      inlineSuggestionSuffixStyles
    )

    return (
      <div
        aria-hidden="true"
        className={wrapperClassName}
        data-slot="inline-suggestion"
        style={wrapperStyle}
      >
        <span className={textWrapperClassName}>
          {inlineSuggestion.hiddenPrefix ? (
            <span className={prefixClassName} aria-hidden="true">
              {inlineSuggestion.hiddenPrefix}
            </span>
          ) : null}
          <span className={suffixClassName}>{inlineSuggestion.visibleText}</span>
        </span>
      </div>
    )
  }

  renderHighlighter = (): React.ReactElement => {
    const { selectionStart, selectionEnd } = this.state
    const { singleLine, children, value, classNames } = this.props

    return (
      <Highlighter
        containerRef={this.setHighlighterElement}
        className={classNames?.highlighter}
        substringClassName={classNames?.highlighterSubstring}
        caretClassName={classNames?.highlighterCaret}
        value={value}
        singleLine={singleLine}
        selectionStart={selectionStart}
        selectionEnd={selectionEnd}
        onCaretPositionChange={this.handleCaretPositionChange}
      >
        {children}
      </Highlighter>
    )
  }

  setHighlighterElement = (el: HTMLDivElement | null) => {
    this.highlighterElement = el
  }

  handleCaretPositionChange = (position: CaretCoordinates | null) => {
    this.setState({ caretPosition: position })
  }

  isInlineAutocomplete = (): boolean => this.props.suggestionsDisplay === 'inline'

  getFlattenedSuggestions = (): Array<{
    result: SuggestionDataItem | string
    queryInfo: QueryInfo
  }> =>
    Object.values(this.state.suggestions).flatMap(({ results, queryInfo }) =>
      results.map((result) => ({ result, queryInfo }))
    )

  getFocusedSuggestionEntry = (): {
    result: SuggestionDataItem | string
    queryInfo: QueryInfo
  } | null => {
    const flattened = this.getFlattenedSuggestions()
    if (flattened.length === 0) {
      return null
    }
    return flattened[this.state.focusIndex] ?? flattened[0]
  }

  getSuggestionData = (
    suggestion: SuggestionDataItem | string
  ): {
    id: MentionDataItem['id']
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

  getInlineSuggestionDetails = (): {
    hiddenPrefix: string
    visibleText: string
    queryInfo: QueryInfo
    suggestion: SuggestionDataItem | string
  } | null => {
    if (!this.isInlineAutocomplete()) {
      return null
    }

    const entry = this.getFocusedSuggestionEntry()
    if (!entry) {
      return null
    }

    const { queryInfo, result } = entry
    const mentionChild = Children.toArray(this.props.children)[queryInfo.childIndex] as
      | React.ReactElement<MentionComponentProps>
      | undefined

    if (!mentionChild) {
      return null
    }

    const {
      displayTransform = DEFAULT_MENTION_PROPS.displayTransform,
      appendSpaceOnAdd = DEFAULT_MENTION_PROPS.appendSpaceOnAdd,
    } = mentionChild.props

    const { id, display } = this.getSuggestionData(result)
    let displayValue = displayTransform(id, display)
    if (appendSpaceOnAdd) {
      displayValue += ' '
    }

    let hiddenPrefix = ''
    let visibleText = displayValue

    if (this.props.inlineSuggestionDisplay === 'remaining') {
      visibleText = this.getInlineSuggestionRemainder(displayValue, queryInfo)
    } else {
      hiddenPrefix = this.getInlineSuggestionPrefix(displayValue, queryInfo)
      if (hiddenPrefix.length > 0) {
        visibleText = displayValue.slice(hiddenPrefix.length)
      }
    }

    if (!visibleText) {
      return null
    }

    return {
      hiddenPrefix,
      visibleText,
      queryInfo,
      suggestion: result,
    }
  }

  getInlineSuggestionRemainder = (displayValue: string, queryInfo: QueryInfo): string => {
    const query = queryInfo.query ?? ''
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

  getInlineSuggestionPrefix = (displayValue: string, queryInfo: QueryInfo): string => {
    const query = queryInfo.query ?? ''
    if (query.length === 0) {
      return ''
    }

    const normalizedDisplay = displayValue.toLocaleLowerCase()
    const normalizedQuery = query.toLocaleLowerCase()

    if (normalizedDisplay.startsWith(normalizedQuery)) {
      return displayValue.slice(0, query.length)
    }

    return ''
  }

  canApplyInlineSuggestion = (): boolean => {
    if (!this.isInlineAutocomplete()) {
      return false
    }

    const inlineSuggestion = this.getInlineSuggestionDetails()
    if (!inlineSuggestion) {
      return false
    }

    const { selectionStart, selectionEnd } = this.state
    if (selectionStart == null || selectionEnd == null || selectionStart !== selectionEnd) {
      return false
    }

    return selectionEnd === inlineSuggestion.queryInfo.querySequenceEnd
  }

  // Returns the text to set as the value of the textarea with all markups removed
  getPlainText = (): string => {
    return getPlainText(this.props.value || '', readConfigFromChildren(this.props.children))
  }

  executeOnChange = (
    event: { target: { value: string } },
    newValue: string,
    newPlainTextValue: string,
    mentions: MentionOccurrence[]
  ): void => {
    if (this.props.onChange) {
      this.props.onChange(
        event as unknown as ChangeEvent<InputElement>,
        newValue,
        newPlainTextValue,
        mentions
      )
      return
    }

    if (this.props.valueLink) {
      const { requestChange } = this.props.valueLink as {
        requestChange: (
          value: string,
          newValue: string,
          newPlainTextValue: string,
          mentions: MentionOccurrence[]
        ) => void
      }
      requestChange(event.target.value, newValue, newPlainTextValue, mentions)
    }
  }

  handlePaste(event: ClipboardEvent): void {
    if (event.target !== this.inputElement) {
      return
    }
    if (!this.supportsClipboardActions(event) || !event.clipboardData) {
      return
    }

    event.preventDefault()

    const { selectionStart, selectionEnd } = this.state
    const { value, children } = this.props
    const valueText = value ?? ''

    const config = readConfigFromChildren(children)
    const safeSelectionStart = selectionStart ?? 0
    const safeSelectionEnd = selectionEnd ?? safeSelectionStart

    const markupStartIndex = mapPlainTextIndex(
      valueText,
      config,
      safeSelectionStart,
      'START'
    ) as number
    const markupEndIndex = mapPlainTextIndex(valueText, config, safeSelectionEnd, 'END') as number

    const clipboardData = event.clipboardData
    const pastedMentions = clipboardData.getData('text/react-mentions')
    const pastedData = clipboardData.getData('text/plain')

    const newValue = spliceString(
      valueText,
      markupStartIndex,
      markupEndIndex,
      pastedMentions || pastedData
    ).replaceAll('\r', '')

    const newPlainTextValue = getPlainText(newValue, config)

    const eventMock = { target: { value: newValue } }

    this.executeOnChange(eventMock, newValue, newPlainTextValue, getMentions(newValue, config))

    // Move the cursor position to the end of the pasted data
    const startOfMention =
      selectionStart == undefined
        ? undefined
        : findStartOfMentionInPlainText(valueText, config, selectionStart)
    const nextPos =
      (startOfMention ?? safeSelectionStart) +
      getPlainText(pastedMentions || pastedData, config).length
    this.setState({
      selectionStart: nextPos,
      selectionEnd: nextPos,
      setSelectionAfterHandlePaste: true,
    })
  }

  saveSelectionToClipboard(event: ClipboardEvent): void {
    const input = this.inputElement
    if (!input || !event.clipboardData) {
      return
    }
    // use the actual selectionStart & selectionEnd instead of the one stored
    // in state to ensure copy & paste also works on disabled inputs & textareas
    const selectionStart = input.selectionStart ?? 0
    const selectionEnd = input.selectionEnd ?? selectionStart
    const { children, value } = this.props
    const valueText = value ?? ''
    const clipboardData = event.clipboardData

    const config = readConfigFromChildren(children)

    const markupStartIndex = mapPlainTextIndex(valueText, config, selectionStart, 'START') as number
    const markupEndIndex = mapPlainTextIndex(valueText, config, selectionEnd, 'END') as number

    clipboardData.setData('text/plain', input.value.slice(selectionStart, selectionEnd))
    clipboardData.setData('text/react-mentions', valueText.slice(markupStartIndex, markupEndIndex))
  }

  supportsClipboardActions(event: ClipboardEvent): boolean {
    return !!event.clipboardData
  }

  handleCopy(event: ClipboardEvent): void {
    if (event.target !== this.inputElement) {
      return
    }
    if (!this.supportsClipboardActions(event)) {
      return
    }

    event.preventDefault()

    this.saveSelectionToClipboard(event)
  }

  handleCut(event: ClipboardEvent): void {
    if (event.target !== this.inputElement) {
      return
    }
    if (!this.supportsClipboardActions(event) || !event.clipboardData) {
      return
    }

    event.preventDefault()

    this.saveSelectionToClipboard(event)

    const { selectionStart, selectionEnd } = this.state
    const { children, value } = this.props
    const valueText = value ?? ''

    const config = readConfigFromChildren(children)
    const safeSelectionStart = selectionStart ?? 0
    const safeSelectionEnd = selectionEnd ?? safeSelectionStart

    const markupStartIndex = mapPlainTextIndex(
      valueText,
      config,
      safeSelectionStart,
      'START'
    ) as number
    const markupEndIndex = mapPlainTextIndex(valueText, config, safeSelectionEnd, 'END') as number

    const newValue = [valueText.slice(0, markupStartIndex), valueText.slice(markupEndIndex)].join(
      ''
    )
    const newPlainTextValue = getPlainText(newValue, config)

    const eventMock = {
      target: { value: newPlainTextValue },
    }

    // TODO: check if this should be getMentions(newValue, config)
    this.executeOnChange(eventMock, newValue, newPlainTextValue, getMentions(valueText, config))
  }

  // Handle input element's change event
  handleChange = (ev: ChangeEvent<InputElement>) => {
    const native = ev.nativeEvent
    if ('isComposing' in native && typeof native.isComposing === 'boolean') {
      this._isComposing = native.isComposing
    }
    if (isIE()) {
      // if we are inside iframe, we need to find activeElement within its contentDocument
      const activeElement = document.activeElement as
        | (HTMLIFrameElement & { contentDocument: Document })
        | null
      const currentDocument = activeElement?.contentDocument ?? document
      if (currentDocument.activeElement !== ev.target) {
        // fix an IE bug (blur from empty input element with placeholder attribute trigger "input" event)
        return
      }
    }

    const value = this.props.value || ''
    const config = readConfigFromChildren(this.props.children)

    let newPlainTextValue = ev.target.value

    let selectionStartBefore = this.state.selectionStart
    if (selectionStartBefore == undefined) {
      selectionStartBefore = ev.target.selectionStart ?? 0
    }

    let selectionEndBefore = this.state.selectionEnd
    if (selectionEndBefore == undefined) {
      selectionEndBefore = ev.target.selectionEnd ?? selectionStartBefore
    }

    // Derive the new value to set by applying the local change in the textarea's plain text
    const newValue = applyChangeToValue(
      value,
      newPlainTextValue,
      {
        selectionStartBefore,
        selectionEndBefore,
        selectionEndAfter: ev.target.selectionEnd ?? selectionEndBefore,
      },
      config
    )

    // In case a mention is deleted, also adjust the new plain text value
    newPlainTextValue = getPlainText(newValue, config)

    // Save current selection after change to be able to restore caret position after rerendering
    let selectionStart = ev.target.selectionStart ?? selectionStartBefore
    let selectionEnd = ev.target.selectionEnd ?? selectionEndBefore
    let setSelectionAfterMentionChange = false
    const nativeEvent = ev.nativeEvent as unknown as CompositionEvent<InputElement> & {
      data?: string | null
      isComposing?: boolean
    }

    // Adjust selection range in case a mention will be deleted by the characters outside of the
    // selection range that are automatically deleted
    const startOfMention = findStartOfMentionInPlainText(value, config, selectionStart)

    if (
      startOfMention !== undefined &&
      this.state.selectionEnd !== null &&
      this.state.selectionEnd > startOfMention
    ) {
      // only if a deletion has taken place
      selectionStart = startOfMention + (nativeEvent.data ? nativeEvent.data.length : 0)
      selectionEnd = selectionStart
      setSelectionAfterMentionChange = true
    }

    this.setState({
      selectionStart,
      selectionEnd,
      setSelectionAfterMentionChange: setSelectionAfterMentionChange,
    })

    const mentions = getMentions(newValue, config)

    if (nativeEvent.isComposing && selectionStart === selectionEnd && this.inputElement) {
      this.updateMentionsQueries(this.inputElement.value, selectionStart)
    }

    // Propagate change
    // let handleChange = this.getOnChange(this.props) || emptyFunction;
    const eventMock = { target: { value: newValue } }
    // this.props.onChange.call(this, eventMock, newValue, newPlainTextValue, mentions);
    this.executeOnChange(eventMock, newValue, newPlainTextValue, mentions)
  }

  // Handle input element's select event
  handleSelect = (ev: SyntheticEvent<InputElement>) => {
    // keep track of selection range / caret position
    const target = ev.target as InputElement
    this.setState({
      selectionStart: target.selectionStart ?? null,
      selectionEnd: target.selectionEnd ?? null,
    })

    // do nothing while a IME composition session is active
    if (this._isComposing) {
      return
    }

    // refresh suggestions queries
    const el = this.inputElement
    if (el && target.selectionStart === target.selectionEnd) {
      this.updateMentionsQueries(el.value, target.selectionStart ?? 0)
    } else {
      this.clearSuggestions()
    }

    // sync highlighters scroll position
    this.updateHighlighterScroll()

    this.props.onSelect?.(ev)
  }

  handleKeyDown = (ev: KeyboardEvent<InputElement>) => {
    const inlineAutocomplete = this.isInlineAutocomplete()

    if (inlineAutocomplete) {
      const inlineSuggestion = this.getInlineSuggestionDetails()
      if (!inlineSuggestion) {
        this.props.onKeyDown?.(ev)
        return
      }

      switch (ev.key) {
        case KEY.ESC: {
          const suggestionsCount = countSuggestions(this.state.suggestions)
          if (suggestionsCount > 0) {
            ev.preventDefault()
            ev.stopPropagation()
            this.shiftFocus(+1)
            return
          }
          break
        }
        case KEY.RETURN:
        case KEY.TAB:
        case KEY.RIGHT: {
          if ((ev.key === KEY.TAB && ev.shiftKey) || !this.canApplyInlineSuggestion()) {
            break
          }
          ev.preventDefault()
          ev.stopPropagation()
          this.selectFocused()
          return
        }
        default:
      }

      this.props.onKeyDown?.(ev)
      return
    }

    // do not intercept key events if the suggestions overlay is not shown
    const suggestionsCount = countSuggestions(this.state.suggestions)

    if (suggestionsCount === 0 || !this.suggestionsElement) {
      this.props.onKeyDown?.(ev)

      return
    }

    if (suggestionHandledKeys.has(ev.key)) {
      ev.preventDefault()
      ev.stopPropagation()
    }

    switch (ev.key) {
      case KEY.ESC: {
        this.clearSuggestions()
        return
      }
      case KEY.DOWN: {
        this.shiftFocus(+1)
        return
      }
      case KEY.UP: {
        this.shiftFocus(-1)
        return
      }
      case KEY.RETURN:
      case KEY.TAB: {
        this.selectFocused()
        return
      }
      case KEY.SPACE: {
        if (suggestionsCount === 1 && this.props.selectLastSuggestionOnSpace === true) {
          this.selectFocused()
        }
        break
      }
      default:
    }
  }

  shiftFocus = (delta: number) => {
    const suggestionsCount = countSuggestions(this.state.suggestions)

    if (suggestionsCount === 0) {
      return
    }

    this.setState({
      focusIndex: (suggestionsCount + this.state.focusIndex + delta) % suggestionsCount,
      scrollFocusedIntoView: true,
    })
  }

  selectFocused = () => {
    const entry = this.getFocusedSuggestionEntry()
    if (!entry) {
      return
    }

    this.addMention(entry.result, entry.queryInfo)

    this.setState({
      focusIndex: 0,
    })
  }

  handleBlur = (ev: ReactFocusEvent<InputElement>) => {
    const clickedSuggestion = this._suggestionsMouseDown
    this._suggestionsMouseDown = false

    // only reset selection if the mousedown happened on an element
    // other than the suggestions overlay
    if (!clickedSuggestion) {
      this.setState({
        selectionStart: null,
        selectionEnd: null,
      })
    }

    setTimeout(() => {
      this.updateHighlighterScroll()
    }, 1)

    this.props.onBlur?.(ev, clickedSuggestion)
  }

  handleSuggestionsMouseDown = (_ev: ReactMouseEvent<HTMLDivElement>) => {
    this._suggestionsMouseDown = true
  }

  handleSuggestionsMouseEnter = (focusIndex: number) => {
    this.setState({
      focusIndex,
      scrollFocusedIntoView: false,
    })
  }

  updateSuggestionsPosition = (): void => {
    const { caretPosition } = this.state
    const { allowSuggestionsAboveCursor, forceSuggestionsAboveCursor } = this.props
    const resolvedPortalHost = this.resolvePortalHost()

    const suggestions = this.suggestionsElement
    const highlighter = this.highlighterElement
    const container = this.containerElement

    if (!caretPosition || !suggestions || !highlighter || !container) {
      return
    }

    // first get viewport-relative position (highlighter is offsetParent of caret):
    const caretOffsetParentRect = highlighter.getBoundingClientRect()
    const caretHeight = getComputedStyleLengthProp(highlighter, 'font-size')
    const viewportRelative = {
      left: caretOffsetParentRect.left + caretPosition.left,
      top: caretOffsetParentRect.top + caretPosition.top + caretHeight,
    }
    const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
    const desiredWidth = highlighter.offsetWidth

    const position: SuggestionsPosition = {}

    // if suggestions menu is in a portal, update position to be releative to its portal node
    if (resolvedPortalHost) {
      const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
      const width = Math.min(desiredWidth, viewportWidth)
      position.width = width
      position.position = 'fixed'
      let { left, top } = viewportRelative
      // absolute/fixed positioned elements are positioned according to their entire box including margins; so we remove margins here:
      left -= getComputedStyleLengthProp(suggestions, 'margin-left')
      top -= getComputedStyleLengthProp(suggestions, 'margin-top')
      // take into account highlighter/textinput scrolling:
      left -= highlighter.scrollLeft
      top -= highlighter.scrollTop
      // guard for mentions suggestions list clipped by window edges
      const maxLeft = Math.max(0, viewportWidth - width)
      position.left = Math.min(maxLeft, Math.max(0, left))
      // guard for mentions suggestions list clipped by bottom edge of window if allowSuggestionsAboveCursor set to true.
      // Move the list up above the caret if it's getting cut off by the bottom of the window, provided that the list height
      // is small enough to NOT cover up the caret
      position.top =
        (allowSuggestionsAboveCursor &&
          top + suggestions.offsetHeight > viewportHeight &&
          suggestions.offsetHeight < top - caretHeight) ||
        forceSuggestionsAboveCursor
          ? Math.max(0, top - suggestions.offsetHeight - caretHeight)
          : top
    } else {
      const containerWidth = container.offsetWidth
      const width = Math.min(desiredWidth, containerWidth)
      position.width = width
      const left = caretPosition.left - highlighter.scrollLeft
      const top = caretPosition.top - highlighter.scrollTop
      // guard for mentions suggestions list clipped by right edge of window
      if (left + width > containerWidth) {
        position.right = 0
      } else {
        position.left = left
      }
      // guard for mentions suggestions list clipped by bottom edge of window if allowSuggestionsAboveCursor set to true.
      // move the list up above the caret if it's getting cut off by the bottom of the window, provided that the list height
      // is small enough to NOT cover up the caret
      position.top =
        (allowSuggestionsAboveCursor &&
          viewportRelative.top - highlighter.scrollTop + suggestions.offsetHeight >
            viewportHeight &&
          suggestions.offsetHeight <
            caretOffsetParentRect.top - caretHeight - highlighter.scrollTop) ||
        forceSuggestionsAboveCursor
          ? top - suggestions.offsetHeight - caretHeight
          : top
    }

    if (
      position.left === this.state.suggestionsPosition.left &&
      position.top === this.state.suggestionsPosition.top &&
      position.position === this.state.suggestionsPosition.position &&
      position.width === this.state.suggestionsPosition.width
    ) {
      return
    }

    this.setState({
      suggestionsPosition: position,
    })
  }

  updateHighlighterScroll = (): void => {
    const input = this.inputElement
    const highlighter = this.highlighterElement
    if (!input || !highlighter) {
      // since the invocation of this function is deferred,
      // the whole component may have been unmounted in the meanwhile
      return
    }
    highlighter.scrollLeft = input.scrollLeft
    highlighter.scrollTop = input.scrollTop
    const inputHeight = input.clientHeight
    if (inputHeight) {
      highlighter.style.height = `${inputHeight}px`
    }
  }

  handleDocumentScroll = (): void => {
    if (!this.suggestionsElement) {
      return
    }

    this.updateSuggestionsPosition()
  }

  handleCompositionStart = (): void => {
    this._isComposing = true
  }

  handleCompositionEnd = (): void => {
    this._isComposing = false
  }

  setSelection = (selectionStart: number | null, selectionEnd: number | null): void => {
    if (selectionStart === null || selectionEnd === null) {
      return
    }

    const el = this.inputElement
    if (!el) {
      return
    }
    if (el.setSelectionRange) {
      el.setSelectionRange(selectionStart, selectionEnd)
    } else if ('createTextRange' in el) {
      const range = (
        el as unknown as {
          createTextRange: () => {
            collapse: (val: boolean) => void
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
    }
  }

  updateMentionsQueries = (plainTextValue: string, caretPosition: number): void => {
    // Invalidate previous queries. Async results for previous queries will be neglected.
    this._queryId++
    this.suggestions = {}
    this.setState({
      suggestions: {},
    })

    const value = this.props.value ?? ''
    const { children, allowSpaceInQuery } = this.props
    const config = readConfigFromChildren(children)

    const positionInValue = mapPlainTextIndex(value, config, caretPosition, 'NULL')

    // If caret is inside of mention, do not query
    if (positionInValue === null || positionInValue === undefined) {
      return
    }

    // Extract substring in between the end of the previous mention and the caret
    const substringStartIndex = getEndOfLastMention(
      value.slice(0, Math.max(0, positionInValue)),
      config
    )
    const substring = plainTextValue.slice(substringStartIndex, caretPosition)

    // Check if suggestions have to be shown:
    // Match the trigger patterns of all Mention children on the extracted substring
    React.Children.forEach(children, (child, childIndex) => {
      const trigger = (child as React.ReactElement<MentionComponentProps>).props.trigger ?? '@'
      const regex = makeTriggerRegex(trigger, { allowSpaceInQuery })
      // eslint-disable-next-line sonarjs/prefer-regexp-exec
      const match = substring.match(regex)
      if (match) {
        const querySequenceStart = substringStartIndex + substring.indexOf(match[1], match.index)
        this.queryData(
          match[2],
          childIndex,
          querySequenceStart,
          querySequenceStart + match[1].length,
          plainTextValue
        )
      }
    })
  }

  clearSuggestions = () => {
    // Invalidate previous queries. Async results for previous queries will be neglected.
    this._queryId++
    this.suggestions = {}
    this.setState({
      suggestions: {},
      focusIndex: 0,
    })
  }

  queryData = (
    query: string,
    childIndex: number,
    querySequenceStart: number,
    querySequenceEnd: number,
    plainTextValue: string
  ): void => {
    const { children, ignoreAccents } = this.props
    const mentionChild = Children.toArray(children)[
      childIndex
    ] as React.ReactElement<MentionComponentProps>
    const dataSource = mentionChild.props.data
    if (!dataSource) {
      return
    }
    const provideData = getDataProvider(dataSource, ignoreAccents)
    const syncResult = provideData(query)
    void this.updateSuggestions(
      this._queryId,
      childIndex,
      query,
      querySequenceStart,
      querySequenceEnd,
      plainTextValue,
      syncResult
    )
  }

  updateSuggestions = async (
    queryId: number,
    childIndex: number,
    query: string,
    querySequenceStart: number,
    querySequenceEnd: number,
    plainTextValue: string,
    results: MentionDataItem[] | Promise<MentionDataItem[]>
  ): Promise<void> => {
    if (queryId !== this._queryId) {
      // neglect async results from previous queries
      return
    }
    const data: MentionDataItem[] = await Promise.resolve(results)
    // save in property so that multiple sync state updates from different mentions sources
    // won't overwrite each other
    this.suggestions = {
      ...this.suggestions,
      [childIndex]: {
        queryInfo: {
          childIndex,
          query,
          querySequenceStart,
          querySequenceEnd,
          plainTextValue,
        },
        results: data,
      },
    }

    const { focusIndex } = this.state
    const suggestionsCount = countSuggestions(this.suggestions)
    const nextFocusIndex = this.isInlineAutocomplete()
      ? 0
      : focusIndex >= suggestionsCount
        ? Math.max(suggestionsCount - 1, 0)
        : focusIndex
    this.setState({
      suggestions: this.suggestions,
      focusIndex: nextFocusIndex,
    })
  }

  addMention = (
    suggestion: SuggestionDataItem | string,
    { childIndex, querySequenceStart, querySequenceEnd, plainTextValue }: QueryInfo
  ): void => {
    const { id, display } = this.getSuggestionData(suggestion)
    // Insert mention in the marked up value at the correct position
    const value = this.props.value || ''
    const config = readConfigFromChildren(this.props.children)
    const mentionsChild = Children.toArray(this.props.children)[
      childIndex
    ] as React.ReactElement<MentionComponentProps>
    const {
      markup = DEFAULT_MENTION_PROPS.markup,
      displayTransform = DEFAULT_MENTION_PROPS.displayTransform,
      appendSpaceOnAdd = DEFAULT_MENTION_PROPS.appendSpaceOnAdd,
      onAdd = DEFAULT_MENTION_PROPS.onAdd,
    } = mentionsChild.props

    const start = mapPlainTextIndex(value, config, querySequenceStart, 'START') as number
    const end = start + querySequenceEnd - querySequenceStart

    const mentionDisplay = display
    let insert = makeMentionsMarkup(markup, id, mentionDisplay)

    if (appendSpaceOnAdd) {
      insert += ' '
    }
    const newValue = spliceString(value, start, end, insert)

    // Refocus input and set caret position to end of mention
    this.inputElement?.focus()

    let displayValue = displayTransform(id, mentionDisplay)
    if (appendSpaceOnAdd) {
      displayValue += ' '
    }
    const newCaretPosition = querySequenceStart + displayValue.length
    this.setState({
      selectionStart: newCaretPosition,
      selectionEnd: newCaretPosition,
      setSelectionAfterMentionChange: true,
    })

    // Propagate change
    const eventMock = { target: { value: newValue } }
    const mentions = getMentions(newValue, config)
    const newPlainTextValue = spliceString(
      plainTextValue,
      querySequenceStart,
      querySequenceEnd,
      displayValue
    )

    this.executeOnChange(eventMock, newValue, newPlainTextValue, mentions)

    if (onAdd) {
      onAdd(id, mentionDisplay, start, end)
    }

    // Make sure the suggestions overlay is closed
    this.clearSuggestions()
  }

  isLoading = (): boolean => {
    let loading = false
    React.Children.forEach(this.props.children, (child) => {
      if (!child) {
        return
      }
      const element = child as React.ReactElement<MentionComponentProps>
      loading = loading || Boolean(element.props.isLoading)
    })
    return loading
  }

  isOpened = (): boolean =>
    isNumber(this.state.selectionStart) &&
    (countSuggestions(this.state.suggestions) !== 0 || this.isLoading())
}

/**
 * Returns the computed length property value for the provided element.
 * Note: According to spec and testing, can count on length values coming back in pixels. See https://developer.mozilla.org/en-US/docs/Web/CSS/used_value#Difference_from_computed_value
 */
const getComputedStyleLengthProp = (forElement: Element, propertyName: string): number => {
  const view = forElement.ownerDocument.defaultView ?? globalThis
  const length = Number.parseFloat(
    view.getComputedStyle(forElement, null).getPropertyValue(propertyName)
  )
  return Number.isFinite(length) ? length : 0
}

const isMobileSafari =
  typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

export default MentionsInput
