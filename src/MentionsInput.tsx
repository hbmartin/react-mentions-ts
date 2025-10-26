import type {
  ChangeEvent,
  CompositionEvent,
  CSSProperties,
  KeyboardEvent,
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
  SyntheticEvent,
} from 'react'
import React, { Children, useLayoutEffect } from 'react'
import { cva } from 'class-variance-authority'
import { createPortal } from 'react-dom'
import Highlighter from './Highlighter'
import Mention from './Mention'
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
  isNumber,
  flattenSuggestions,
  mapPlainTextIndex,
  omit,
  readConfigFromChildren,
  spliceString,
  cn,
} from './utils'
import { makeTriggerRegex } from './utils/makeTriggerRegex'
import { useEffectEvent } from './utils/useEffectEvent'
import type {
  CaretCoordinates,
  DataSource,
  InputComponentProps,
  MentionComponentProps,
  MentionDataItem,
  MentionIdentifier,
  MentionOccurrence,
  MentionsInputProps,
  MentionsInputState,
  MentionsInputClassNames,
  MentionsInputChangeTrigger,
  QueryInfo,
  SuggestionDataItem,
  SuggestionsMap,
  SuggestionsPosition,
  InputElement,
} from './types'
import type { FlattenedSuggestion } from './utils/flattenSuggestions'

const getDataProvider = <Extra extends Record<string, unknown>>(
  data: DataSource<Extra>,
  ignoreAccents: boolean
): ((query: string) => Promise<MentionDataItem<Extra>[]>) => {
  if (Array.isArray(data)) {
    const items = data as ReadonlyArray<MentionDataItem<Extra>>
    // eslint-disable-next-line @typescript-eslint/require-await
    return async (query: string) =>
      items.flatMap((item) => {
        const index = getSubstringIndex(item.display || String(item.id), query, ignoreAccents)
        return index >= 0
          ? [
              {
                ...item,
                highlights: [{ start: index, end: index + query.length }],
              },
            ]
          : []
      })
  }

  return async (query: string) => {
    const provider = data as (
      query: string
    ) => Promise<ReadonlyArray<MentionDataItem<Extra>>> | ReadonlyArray<MentionDataItem<Extra>>
    const result = await Promise.resolve(provider(query))
    return [...result]
  }
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

const resolveTriggerRegex = (trigger: string | RegExp): RegExp => {
  // TODO move this into makeTriggerRegex
  if (typeof trigger === 'string') {
    return makeTriggerRegex(trigger)
  }

  const flags = trigger.flags.replaceAll('g', '')
  return new RegExp(trigger.source, flags)
}

interface InlineSuggestionDetails<Extra extends Record<string, unknown> = Record<string, unknown>> {
  hiddenPrefix: string
  visibleText: string
  queryInfo: QueryInfo
  suggestion: SuggestionDataItem<Extra>
  announcement: string
}

const INLINE_AUTOCOMPLETE_FALLBACK_ANNOUNCEMENT = 'No inline suggestions available'

const visuallyHiddenStyles: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  border: 0,
  margin: -1,
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
}

const HANDLED_PROPS: Array<keyof MentionsInputProps<any>> = [
  'singleLine',
  'suggestionsPlacement',
  'a11ySuggestionsListLabel',
  'value',
  'onKeyDown',
  'customSuggestionsContainer',
  'onSelect',
  'onMentionBlur',
  'onMentionsChange',
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
]

class MentionsInput<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> extends React.Component<MentionsInputProps<Extra>, MentionsInputState<Extra>> {
  static readonly defaultProps: Partial<MentionsInputProps<any>> = {
    singleLine: false,
    suggestionsPlacement: 'below',
    onKeyDown: () => null,
    onSelect: () => null,
    suggestionsDisplay: 'overlay',
    spellCheck: false,
  }

  private suggestions: SuggestionsMap<Extra> = {}
  private readonly uuidSuggestionsOverlay: string
  private readonly inlineAutocompleteLiveRegionId: string
  private containerElement: HTMLDivElement | null = null
  private inputElement: HTMLInputElement | HTMLTextAreaElement | null = null
  private highlighterElement: HTMLDivElement | null = null
  private suggestionsElement: HTMLDivElement | null = null
  private _queryId = 0
  private _suggestionsMouseDown = false
  private _isComposing = false
  private readonly defaultSuggestionsPortalHost: HTMLElement | null
  private _isScrolling = false
  private _pendingHighlighterRecompute = false
  private _didUnmount = false
  private _scrollSyncFrame: number | null = null

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

  constructor(props: MentionsInputProps<Extra>) {
    super(props)
    this.uuidSuggestionsOverlay = Math.random().toString(16).slice(2)
    this.inlineAutocompleteLiveRegionId = `${this.uuidSuggestionsOverlay}-inline-live`
    this.defaultSuggestionsPortalHost = typeof document === 'undefined' ? null : document.body

    this.handleCopy = this.handleCopy.bind(this)
    this.handleCut = this.handleCut.bind(this)
    this.handlePaste = this.handlePaste.bind(this)
    this.handleDocumentScroll = this.handleDocumentScroll.bind(this)

    this.state = {
      focusIndex: 0,
      selectionStart: null,
      selectionEnd: null,
      suggestions: {},
      caretPosition: null,
      suggestionsPosition: {},
      pendingSelectionUpdate: false,
      highlighterRecomputeVersion: 0,
      config: readConfigFromChildren(props.children),
    } satisfies MentionsInputState<Extra>
  }

  private validateChildren(): void {
    const seenChildren = new Set<string>()

    React.Children.forEach(this.props.children, (child) => {
      if (!React.isValidElement(child)) {
        throw new Error(
          'MentionsInput only accepts Mention components as children. Found invalid element.'
        )
      }
      if (child.type !== Mention) {
        throw new Error(
          `MentionsInput only accepts Mention components as children. Found: ${
            typeof child.type === 'string' ? child.type : child.type?.name || 'unknown component'
          }`
        )
      }
      const trigger =
        child.props.trigger === undefined
          ? DEFAULT_MENTION_PROPS.trigger
          : typeof child.props.trigger === 'string'
            ? child.props.trigger
            : child.props.trigger.source
      if (seenChildren.has(trigger)) {
        throw new Error(
          `MentionsInput does not support Mention children with duplicate triggers: ${trigger}.`
        )
      }
      seenChildren.add(trigger)
    })

    // Compute new config and update state if changed
    const newConfig = readConfigFromChildren(this.props.children)
    if (!this.configsEqual(this.state.config, newConfig)) {
      this.setState({ config: newConfig })
    }
  }

  private configsEqual(
    config1: ReturnType<typeof readConfigFromChildren>,
    config2: ReturnType<typeof readConfigFromChildren>
  ): boolean {
    if (config1.length !== config2.length) {
      return false
    }

    // eslint-disable-next-line code-complete/enforce-meaningful-names
    return config1.every((cfg1, index) => {
      // eslint-disable-next-line code-complete/enforce-meaningful-names
      const cfg2 = config2[index]

      // Compare key properties that determine config identity
      return (
        ((typeof cfg1.trigger === 'string' &&
          typeof cfg2.trigger === 'string' &&
          cfg1.trigger === cfg2.trigger) ||
          (cfg1.trigger instanceof RegExp &&
            cfg2.trigger instanceof RegExp &&
            cfg1.trigger.source === cfg2.trigger.source)) &&
        cfg1.serializer.id === cfg2.serializer.id
      )
    })
  }

  componentDidMount(): void {
    this.validateChildren()

    document.addEventListener('copy', this.handleCopy)
    document.addEventListener('cut', this.handleCut)
    document.addEventListener('paste', this.handlePaste)
    document.addEventListener('scroll', this.handleDocumentScroll, true)
    document.addEventListener('selectionchange', this.handleDocumentSelectionChange)

    this.updateSuggestionsPosition()
  }

  componentDidUpdate(
    prevProps: MentionsInputProps<Extra>,
    prevState: MentionsInputState<Extra>
  ): void {
    // Validate children if they've changed
    if (prevProps.children !== this.props.children) {
      this.validateChildren()
    }

    // Update position of suggestions unless this componentDidUpdate was
    // triggered by an update to suggestionsPosition.
    if (prevState.suggestionsPosition === this.state.suggestionsPosition) {
      this.updateSuggestionsPosition()
    }

    // maintain selection in case a mention is added/removed causing
    // the cursor to jump to the end
    if (this.state.pendingSelectionUpdate) {
      this.setState({ pendingSelectionUpdate: false })
      this.setSelection(this.state.selectionStart, this.state.selectionEnd)
    }
  }

  componentWillUnmount(): void {
    document.removeEventListener('copy', this.handleCopy)
    document.removeEventListener('cut', this.handleCut)
    document.removeEventListener('paste', this.handlePaste)
    document.removeEventListener('scroll', this.handleDocumentScroll, true)
    document.removeEventListener('selectionchange', this.handleDocumentSelectionChange)
    if (this._scrollSyncFrame !== null && globalThis.window !== undefined) {
      globalThis.cancelAnimationFrame(this._scrollSyncFrame)
      this._scrollSyncFrame = null
    }
    this._pendingHighlighterRecompute = false
    this._didUnmount = true
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
        {this.renderMeasurementBridge()}
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
      HANDLED_PROPS as ReadonlyArray<keyof MentionsInputProps<any>>
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

    const isInlineAutocomplete = this.isInlineAutocomplete()
    const inlineSuggestion = isInlineAutocomplete ? this.getInlineSuggestionDetails() : null
    const isOverlayOpen = !isInlineAutocomplete && this.isOpened()

    Object.assign(props, {
      role: 'combobox',
      'aria-autocomplete': isInlineAutocomplete ? 'inline' : 'list',
      'aria-expanded': isInlineAutocomplete ? 'false' : this.isOpened() ? 'true' : 'false',
      'aria-controls': isInlineAutocomplete ? undefined : this.uuidSuggestionsOverlay,
      'aria-haspopup': isInlineAutocomplete ? undefined : 'listbox',
      'aria-activedescendant': isOverlayOpen
        ? getSuggestionHtmlId(this.uuidSuggestionsOverlay, this.state.focusIndex)
        : undefined,
    })

    if (isInlineAutocomplete && inlineSuggestion) {
      const existingDescribedBy =
        typeof props['aria-describedby'] === 'string' ? props['aria-describedby'] : undefined
      const describedBy = [existingDescribedBy, this.inlineAutocompleteLiveRegionId]
        .filter((value): value is string => Boolean(value && value.trim().length > 0))
        .join(' ')
      props['aria-describedby'] = describedBy || undefined
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
        {this.renderInlineSuggestionLiveRegion()}
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
      <SuggestionsOverlay<Extra>
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

  renderInlineSuggestionLiveRegion = (): React.ReactNode => {
    if (!this.isInlineAutocomplete()) {
      return null
    }

    const inlineSuggestion = this.getInlineSuggestionDetails()
    const announcement = this.getInlineSuggestionAnnouncement(inlineSuggestion)

    return (
      <div
        id={this.inlineAutocompleteLiveRegionId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={visuallyHiddenStyles}
        data-slot="inline-suggestion-live-region"
      >
        {announcement}
      </div>
    )
  }

  private readonly getInlineSuggestionAnnouncement = (
    inlineSuggestion: InlineSuggestionDetails<Extra> | null
  ): string => {
    if (!inlineSuggestion) {
      return INLINE_AUTOCOMPLETE_FALLBACK_ANNOUNCEMENT
    }

    return inlineSuggestion.announcement
  }

  renderMeasurementBridge = (): React.ReactNode => {
    return (
      <MeasurementBridge
        container={this.containerElement}
        highlighter={this.highlighterElement}
        input={this.inputElement}
        suggestions={this.suggestionsElement}
        onSyncScroll={this.updateHighlighterScroll}
        onUpdateSuggestionsPosition={this.updateSuggestionsPosition}
      />
    )
  }

  renderHighlighter = (): React.ReactElement => {
    const { selectionStart, selectionEnd, highlighterRecomputeVersion } = this.state
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
        recomputeVersion={highlighterRecomputeVersion}
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
    this.setState({ caretPosition: position }, () => {
      if (position) {
        this.updateSuggestionsPosition()
      }
    })
    this.scheduleHighlighterRecompute()
  }

  scheduleHighlighterRecompute = (): void => {
    // Each queued setState updater runs in order, so if this fires twice before the first update finishes
    // we'll end up at highlighterRecomputeVersion + 2, not +1. The _pendingHighlighterRecompute flag stops
    // that, so the highlighter only recomputes once per render cycle. Paths like handleCaretPositionChange
    // and updateHighlighterScroll can trigger the scheduler multiple times in rapid succession.
    // React's batching trims render passes, but it won't deduplicate the updates.
    if (this._pendingHighlighterRecompute || this._didUnmount) {
      return
    }

    this._pendingHighlighterRecompute = true
    this.setState(
      (prevState) => ({
        highlighterRecomputeVersion: prevState.highlighterRecomputeVersion + 1,
      }),
      () => {
        this._pendingHighlighterRecompute = false
      }
    )
  }

  isInlineAutocomplete = (): boolean => this.props.suggestionsDisplay === 'inline'

  getFlattenedSuggestions = (): FlattenedSuggestion<Extra>[] => {
    return flattenSuggestions<Extra>(this.props.children, this.state.suggestions)
  }

  getFocusedSuggestionEntry = (): {
    result: SuggestionDataItem<Extra>
    queryInfo: QueryInfo
  } | null => {
    const flattened = this.getFlattenedSuggestions()
    if (flattened.length === 0) {
      return null
    }
    return flattened[this.state.focusIndex] ?? flattened[0]
  }

  getSuggestionData = (
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

  getInlineSuggestionDetails = (): InlineSuggestionDetails<Extra> | null => {
    if (!this.isInlineAutocomplete()) {
      return null
    }

    const entry = this.getFocusedSuggestionEntry()
    if (!entry) {
      return null
    }

    const { queryInfo, result } = entry
    const mentionChild = Children.toArray(this.props.children)[queryInfo.childIndex] as
      | React.ReactElement<MentionComponentProps<Extra>>
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

    const visibleText = this.getInlineSuggestionRemainder(displayValue, queryInfo)

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

  canApplyInlineSuggestion = (): boolean => {
    if (!this.isInlineAutocomplete()) {
      return false
    }

    const inlineSuggestion = this.getInlineSuggestionDetails()
    if (!inlineSuggestion) {
      return false
    }

    const { selectionStart, selectionEnd } = this.state
    if (selectionStart === null || selectionEnd === null || selectionStart !== selectionEnd) {
      return false
    }

    return selectionEnd === inlineSuggestion.queryInfo.querySequenceEnd
  }

  // Returns the text to set as the value of the textarea with all markups removed
  getPlainText = (): string => {
    return getPlainText(this.props.value || '', this.state.config)
  }

  executeOnChange = (
    trigger: MentionsInputChangeTrigger,
    newValue: string,
    newPlainTextValue: string,
    mentions: MentionOccurrence[],
    previousValue: string
  ): void => {
    if (this.props.onMentionsChange) {
      this.props.onMentionsChange({
        trigger,
        value: newValue,
        plainTextValue: newPlainTextValue,
        mentions: mentions as MentionOccurrence<Extra>[],
        previousValue,
      })
    }
  }

  handlePaste = (event: ClipboardEvent): void => {
    if (event.target !== this.inputElement) {
      return
    }
    if (!this.supportsClipboardActions(event) || !event.clipboardData) {
      return
    }

    event.preventDefault()

    const { selectionStart, selectionEnd } = this.state
    const { value } = this.props
    const valueText = value ?? ''

    const safeSelectionStart = selectionStart ?? 0
    const safeSelectionEnd = selectionEnd ?? safeSelectionStart

    const markupStartIndex = mapPlainTextIndex(
      valueText,
      this.state.config,
      safeSelectionStart,
      'START'
    ) as number
    const markupEndIndex = mapPlainTextIndex(
      valueText,
      this.state.config,
      safeSelectionEnd,
      'END'
    ) as number

    const clipboardData = event.clipboardData
    const pastedMentions = clipboardData.getData('text/react-mentions')
    const pastedData = clipboardData.getData('text/plain')

    const newValue = spliceString(
      valueText,
      markupStartIndex,
      markupEndIndex,
      pastedMentions || pastedData
    ).replaceAll('\r', '')

    const newPlainTextValue = getPlainText(newValue, this.state.config)

    const mentions = getMentions(newValue, this.state.config)

    this.executeOnChange(
      { type: 'paste', nativeEvent: event },
      newValue,
      newPlainTextValue,
      mentions,
      valueText
    )

    // Move the cursor position to the end of the pasted data
    const startOfMention =
      selectionStart === null
        ? undefined
        : findStartOfMentionInPlainText(valueText, this.state.config, selectionStart)
    const nextPos =
      (startOfMention ?? safeSelectionStart) +
      getPlainText(pastedMentions || pastedData, this.state.config).length
    this.setState({
      selectionStart: nextPos,
      selectionEnd: nextPos,
      pendingSelectionUpdate: true,
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
    const { value } = this.props
    const valueText = value ?? ''
    const clipboardData = event.clipboardData

    const markupStartIndex = mapPlainTextIndex(
      valueText,
      this.state.config,
      selectionStart,
      'START'
    ) as number
    const markupEndIndex = mapPlainTextIndex(
      valueText,
      this.state.config,
      selectionEnd,
      'END'
    ) as number

    clipboardData.setData('text/plain', input.value.slice(selectionStart, selectionEnd))
    clipboardData.setData('text/react-mentions', valueText.slice(markupStartIndex, markupEndIndex))
  }

  supportsClipboardActions(event: ClipboardEvent): boolean {
    return !!event.clipboardData
  }

  handleCopy = (event: ClipboardEvent): void => {
    if (event.target !== this.inputElement) {
      return
    }
    if (!this.supportsClipboardActions(event)) {
      return
    }

    event.preventDefault()

    this.saveSelectionToClipboard(event)
  }

  handleCut = (event: ClipboardEvent): void => {
    if (event.target !== this.inputElement) {
      return
    }
    if (!this.supportsClipboardActions(event) || !event.clipboardData) {
      return
    }

    event.preventDefault()

    this.saveSelectionToClipboard(event)

    const { selectionStart, selectionEnd } = this.state
    const { value } = this.props
    const valueText = value ?? ''

    const safeSelectionStart = selectionStart ?? 0
    const safeSelectionEnd = selectionEnd ?? safeSelectionStart

    const markupStartIndex = mapPlainTextIndex(
      valueText,
      this.state.config,
      safeSelectionStart,
      'START'
    ) as number
    const markupEndIndex = mapPlainTextIndex(
      valueText,
      this.state.config,
      safeSelectionEnd,
      'END'
    ) as number

    const newValue = [valueText.slice(0, markupStartIndex), valueText.slice(markupEndIndex)].join(
      ''
    )
    const newPlainTextValue = getPlainText(newValue, this.state.config)

    const mentions = getMentions(newValue, this.state.config)

    this.setState({
      selectionStart: safeSelectionStart,
      selectionEnd: safeSelectionStart,
      pendingSelectionUpdate: true,
    })

    this.executeOnChange(
      { type: 'cut', nativeEvent: event },
      newValue,
      newPlainTextValue,
      mentions,
      valueText
    )
  }

  // Handle input element's change event
  handleChange = (ev: ChangeEvent<InputElement>) => {
    const native = ev.nativeEvent
    if ('isComposing' in native && typeof native.isComposing === 'boolean') {
      this._isComposing = native.isComposing
    }
    const value = this.props.value || ''

    let newPlainTextValue = ev.target.value

    let selectionStartBefore = this.state.selectionStart
    if (selectionStartBefore === null) {
      selectionStartBefore = ev.target.selectionStart ?? 0
    }

    let selectionEndBefore = this.state.selectionEnd
    if (selectionEndBefore === null) {
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
      this.state.config
    )

    // In case a mention is deleted, also adjust the new plain text value
    newPlainTextValue = getPlainText(newValue, this.state.config)

    // Save current selection after change to be able to restore caret position after rerendering
    let selectionStart = ev.target.selectionStart ?? selectionStartBefore
    let selectionEnd = ev.target.selectionEnd ?? selectionEndBefore
    let shouldRestoreSelection = false
    const nativeEvent = ev.nativeEvent as unknown as CompositionEvent<InputElement> & {
      data?: string | null
      isComposing?: boolean
    }

    // Adjust selection range in case a mention will be deleted by the characters outside of the
    // selection range that are automatically deleted
    const startOfMention = findStartOfMentionInPlainText(value, this.state.config, selectionStart)

    if (
      startOfMention !== undefined &&
      this.state.selectionEnd !== null &&
      this.state.selectionEnd > startOfMention
    ) {
      // only if a deletion has taken place
      selectionStart = startOfMention + (nativeEvent.data ? nativeEvent.data.length : 0)
      selectionEnd = selectionStart
      shouldRestoreSelection = true
    }

    this.setState((prevState) => ({
      selectionStart,
      selectionEnd,
      pendingSelectionUpdate: prevState.pendingSelectionUpdate || shouldRestoreSelection,
    }))

    const mentions = getMentions(newValue, this.state.config)

    if (nativeEvent.isComposing && selectionStart === selectionEnd && this.inputElement) {
      this.updateMentionsQueries(this.inputElement.value, selectionStart)
    }

    // Propagate change
    this.executeOnChange(
      { type: 'input', nativeEvent: ev.nativeEvent },
      newValue,
      newPlainTextValue,
      mentions,
      value
    )

    this.props.onChange?.(ev)
  }

  // Handle input element's select event
  handleSelect = (ev: SyntheticEvent<InputElement>) => {
    this.syncSelectionFromInput('select')
    this.props.onSelect?.(ev)
  }

  private readonly syncSelectionFromInput = (
    reason: 'select' | 'selectionchange' = 'selectionchange'
  ): void => {
    const input = this.inputElement
    if (!input) {
      return
    }

    if (reason === 'selectionchange') {
      const ownerDocument = input.ownerDocument ?? document
      if (ownerDocument.activeElement !== input) {
        return
      }
    }

    const selectionStart = input.selectionStart ?? null
    const selectionEnd = input.selectionEnd ?? null
    const selectionChanged =
      selectionStart !== this.state.selectionStart || selectionEnd !== this.state.selectionEnd

    if (selectionChanged) {
      this.setState({
        selectionStart,
        selectionEnd,
      })
    }

    if (this._isComposing) {
      return
    }

    if (selectionStart !== null && selectionStart === selectionEnd) {
      this.updateMentionsQueries(input.value, selectionStart)
    } else {
      this.clearSuggestions()
    }

    this.requestHighlighterScrollSync()
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

    this.requestHighlighterScrollSync()

    this.props.onMentionBlur?.(ev, clickedSuggestion)
    this.props.onBlur?.(ev)
  }

  handleSuggestionsMouseDown = (_ev: ReactMouseEvent<Element>) => {
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
    const { suggestionsPlacement = 'below' } = this.props
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
      const shouldShowAboveCaret =
        suggestionsPlacement === 'above' ||
        (suggestionsPlacement === 'auto' &&
          top + suggestions.offsetHeight > viewportHeight &&
          suggestions.offsetHeight < top - caretHeight)

      // guard for mentions suggestions list clipped by the bottom edge of the window when using automatic placement.
      position.top = shouldShowAboveCaret
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
      const shouldShowAboveCaret =
        suggestionsPlacement === 'above' ||
        (suggestionsPlacement === 'auto' &&
          viewportRelative.top - highlighter.scrollTop + suggestions.offsetHeight >
            viewportHeight &&
          suggestions.offsetHeight <
            caretOffsetParentRect.top - caretHeight - highlighter.scrollTop)

      // guard for mentions suggestions list clipped by the bottom edge of the container when using automatic placement.
      position.top = shouldShowAboveCaret ? top - suggestions.offsetHeight - caretHeight : top
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

    const nextScrollLeft = input.scrollLeft
    const nextScrollTop = input.scrollTop
    const prevScrollLeft = highlighter.scrollLeft
    const prevScrollTop = highlighter.scrollTop

    if (prevScrollLeft !== nextScrollLeft) {
      highlighter.scrollLeft = nextScrollLeft
    }
    if (prevScrollTop !== nextScrollTop) {
      highlighter.scrollTop = nextScrollTop
    }
    const inputHeight = input.clientHeight
    let heightChanged = false
    if (inputHeight) {
      const nextHeight = `${inputHeight}px`
      if (highlighter.style.height !== nextHeight) {
        highlighter.style.height = nextHeight
        heightChanged = true
      }
    }

    if (prevScrollLeft !== nextScrollLeft || prevScrollTop !== nextScrollTop || heightChanged) {
      this.scheduleHighlighterRecompute()
    }
  }

  private readonly requestHighlighterScrollSync = (): void => {
    // This first updateHighlighterScroll() call keeps the overlay in sync immediately,
    // so any work done later in the same tick—like scheduleHighlighterRecompute() triggered by
    // updateHighlighterScroll() or updateSuggestionsPosition() reads the up-to-date scroll and height.
    this.updateHighlighterScroll()

    if (globalThis.window === undefined) {
      return
    }

    if (this._scrollSyncFrame !== null) {
      globalThis.cancelAnimationFrame(this._scrollSyncFrame)
      this._scrollSyncFrame = null
    }

    this._scrollSyncFrame = globalThis.requestAnimationFrame(() => {
      this._scrollSyncFrame = null
      // This second updateHighlighterScroll() call picks up any DOM adjustments that happen once
      // the browser has painted (e.g., layout shifts from the just-updated input).
      // Dropping either updateHighlighterScroll call introduces a one-frame visual lag (removing the first)
      // or risks missing a final adjustment after the frame (removing the second)
      this.updateHighlighterScroll()
    })
  }

  handleDocumentScroll = (): void => {
    if (this._isScrolling || !this.suggestionsElement) {
      return
    }

    this._isScrolling = true
    globalThis.requestAnimationFrame(() => {
      this.updateSuggestionsPosition()
      this._isScrolling = false
    })
  }

  handleDocumentSelectionChange = (): void => {
    this.syncSelectionFromInput('selectionchange')
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
    let selectionApplied = false
    if (el.setSelectionRange) {
      el.setSelectionRange(selectionStart, selectionEnd)
      selectionApplied = true
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
      selectionApplied = true
    }
    if (selectionApplied) {
      this.requestHighlighterScrollSync()
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
    const { children } = this.props

    const positionInValue = mapPlainTextIndex(value, this.state.config, caretPosition, 'NULL')

    // If caret is inside of mention, do not query
    if (positionInValue === null || positionInValue === undefined) {
      return
    }

    // Extract substring in between the end of the previous mention and the caret
    const substringStartIndex = getEndOfLastMention(
      value.slice(0, Math.max(0, positionInValue)),
      this.state.config
    )
    const substring = plainTextValue.slice(substringStartIndex, caretPosition)

    // Check if suggestions have to be shown:
    // Match the trigger patterns of all Mention children on the extracted substring
    React.Children.forEach(children, (child, childIndex) => {
      if (!React.isValidElement<MentionComponentProps<Extra>>(child)) {
        return
      }
      const triggerProp = child.props.trigger ?? '@'
      const regex = resolveTriggerRegex(triggerProp)
      const match = substring.match(regex)
      if (match?.[1] !== undefined && match[2] !== undefined) {
        const querySequenceStart = substringStartIndex + substring.indexOf(match[1], match.index)
        const dataSource = child.props.data
        const provideData = getDataProvider<Extra>(dataSource, regex.flags.includes('u'))
        const resultPromise = provideData(match[2])
        void this.updateSuggestions(
          this._queryId,
          childIndex,
          match[2],
          querySequenceStart,
          querySequenceStart + match[1].length,
          plainTextValue,
          resultPromise
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

  updateSuggestions = async (
    queryId: number,
    childIndex: number,
    query: string,
    querySequenceStart: number,
    querySequenceEnd: number,
    plainTextValue: string,
    results: MentionDataItem<Extra>[] | Promise<MentionDataItem<Extra>[]>
  ): Promise<void> => {
    if (queryId !== this._queryId) {
      // neglect async results from previous queries
      return
    }
    const data: MentionDataItem<Extra>[] = await Promise.resolve(results)
    // save in property so that multiple sync state updates from different mentions sources
    // won't overwrite each other
    const queryInfo: QueryInfo = {
      childIndex,
      query,
      querySequenceStart,
      querySequenceEnd,
      plainTextValue,
    }

    this.suggestions = {
      ...this.suggestions,
      [childIndex]: {
        queryInfo,
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
    suggestion: SuggestionDataItem<Extra>,
    { childIndex, querySequenceStart, querySequenceEnd, plainTextValue }: QueryInfo
  ): void => {
    const { id, display } = this.getSuggestionData(suggestion)
    // Insert mention in the marked up value at the correct position
    const value = this.props.value || ''
    const mentionsChild = Children.toArray(this.props.children)[childIndex]
    if (!React.isValidElement<MentionComponentProps<Extra>>(mentionsChild)) {
      return
    }
    const {
      serializer,
      displayTransform = DEFAULT_MENTION_PROPS.displayTransform,
      appendSpaceOnAdd = DEFAULT_MENTION_PROPS.appendSpaceOnAdd,
      onAdd = DEFAULT_MENTION_PROPS.onAdd,
    } = this.state.config[childIndex]

    const start = mapPlainTextIndex(value, this.state.config, querySequenceStart, 'START') as number
    const end = start + querySequenceEnd - querySequenceStart

    const mentionDisplay = display
    let insert = serializer.insert({ id, display: mentionDisplay })

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
      pendingSelectionUpdate: true,
    })

    // Propagate change
    const mentions = getMentions(newValue, this.state.config)
    const newPlainTextValue = spliceString(
      plainTextValue,
      querySequenceStart,
      querySequenceEnd,
      displayValue
    )

    this.executeOnChange({ type: 'mention-add' }, newValue, newPlainTextValue, mentions, value)

    if (onAdd !== undefined) {
      onAdd({
        id,
        display: mentionDisplay,
        startPos: start,
        endPos: end,
        serializerId: serializer.id,
      })
    }

    // Make sure the suggestions overlay is closed
    this.clearSuggestions()
  }

  isLoading = (): boolean => {
    let loading = false
    React.Children.forEach(this.props.children, (child) => {
      if (!React.isValidElement<MentionComponentProps<Extra>>(child)) {
        return
      }
      loading = loading || Boolean(child.props.isLoading)
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

interface MeasurementBridgeProps {
  readonly container: HTMLDivElement | null
  readonly highlighter: HTMLDivElement | null
  readonly input: InputElement | null
  readonly suggestions: HTMLDivElement | null
  readonly onSyncScroll: () => void
  readonly onUpdateSuggestionsPosition: () => void
}

const MeasurementBridge = ({
  container,
  highlighter,
  input,
  suggestions,
  onSyncScroll,
  onUpdateSuggestionsPosition,
}: MeasurementBridgeProps) => {
  const updateSuggestions = useEffectEvent(() => {
    onUpdateSuggestionsPosition()
  })

  const syncScroll = useEffectEvent(() => {
    onSyncScroll()
  })

  const updateAll = useEffectEvent(() => {
    updateSuggestions()
    syncScroll()
  })

  const observe = useEffectEvent((element: Element | null, callback: () => void) => {
    if (!element || typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const observer = new ResizeObserver(() => {
      callback()
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  })

  useLayoutEffect(() => {
    updateAll()
  }, [updateAll])

  useLayoutEffect(() => observe(container, updateAll), [container, observe, updateAll])
  useLayoutEffect(() => observe(highlighter, updateAll), [highlighter, observe, updateAll])
  useLayoutEffect(() => observe(input, updateAll), [input, observe, updateAll])
  useLayoutEffect(
    () => observe(suggestions, updateSuggestions),
    [observe, suggestions, updateSuggestions]
  )

  useLayoutEffect(() => {
    if (!input) {
      return undefined
    }

    const handleScroll = () => {
      syncScroll()
      updateSuggestions()
    }

    input.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      input.removeEventListener('scroll', handleScroll)
    }
  }, [input, syncScroll, updateSuggestions])

  return null
}

export default MentionsInput
