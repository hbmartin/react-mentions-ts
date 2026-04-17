import type {
  ChangeEvent,
  CompositionEvent,
  CSSProperties,
  KeyboardEvent,
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
  SyntheticEvent,
} from 'react'
import React from 'react'
import { cva } from 'class-variance-authority'
import { createPortal } from 'react-dom'
import Highlighter from './Highlighter'
import MeasurementBridge from './MeasurementBridge'
import { DEFAULT_MENTION_PROPS } from './MentionDefaultProps'
import {
  applyHighlighterViewPatch,
  applyTextareaResizePatch,
  areInlineSuggestionPositionsEqual,
  areSuggestionsPositionsEqual,
  calculateInlineSuggestionPosition,
  calculateSuggestionsPosition,
  createPendingViewSync,
  createViewSyncPatch,
  getHighlighterViewPatch,
  getInputInlineStyle,
  getTextareaResizePatch,
  hasPendingViewSync,
  mergePendingViewSync,
} from './MentionsInputLayout'
import type { PendingViewSync, ViewSyncPatch } from './MentionsInputLayout'
import {
  getDataProvider,
  getInlineSuggestionAnnouncement,
  getFocusedSuggestionEntryForMentionChildren,
  getInlineSuggestionDetailsForMentionChildren,
  getMentionChildFromArray,
  getSuggestionData,
  getSuggestionQueryStateEntries,
  getSuggestionsStatusContentForMentionChildren,
} from './MentionsInputSelectors'
import type { InlineSuggestionDetails } from './MentionsInputSelectors'
import MentionsInputView from './MentionsInputView'
import SuggestionsOverlay from './SuggestionsOverlay'
import {
  applyCutToMentionsValue,
  applyInputChangeToMentionsValue,
  applyPasteToMentionsValue,
  getMarkupSelectionRange,
} from './MentionsInputEditing'
import {
  countSuggestions,
  getEndOfLastMention,
  getPlainText,
  getMentionsAndPlainText,
  getSubstringIndex,
  getSuggestionHtmlId,
  isNumber,
  mapPlainTextIndex,
  omit,
  spliceString,
  cn,
} from './utils'
import { areMentionSelectionsEqual } from './utils/areMentionSelectionsEqual'
import { makeTriggerRegex } from './utils/makeTriggerRegex'
import { areMentionConfigsEqual, prepareMentionsInputChildren } from './MentionsInputChildren'
import { createMentionSelectionContext, deriveMentionValueSnapshot } from './MentionsInputDerived'
import {
  applyErroredQueryResult,
  applySuccessfulQueryResult,
  createClearedSuggestionsState,
  createLoadingQueryState,
  isAbortError,
} from './MentionsInputQueryState'
import {
  areMentionOccurrencesEqual,
  computeMentionSelectionDetails,
  getMentionSelectionMap,
} from './MentionsInputSelection'
import type {
  CaretCoordinates,
  InputComponentProps,
  MentionComponentProps,
  MentionDataItem,
  MentionIdentifier,
  MentionOccurrence,
  MentionSelectionState,
  MentionsInputProps,
  MentionsInputState,
  MentionsInputClassNames,
  MentionsInputChangeTrigger,
  QueryInfo,
  SuggestionDataItem,
  SuggestionQueryState,
  SuggestionQueryStateMap,
  SuggestionsMap,
  InputElement,
} from './types'

let generatedIdCounter = 0

const createGeneratedId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `mentions-${globalThis.crypto.randomUUID()}`
  }

  generatedIdCounter += 1
  return `mentions-${generatedIdCounter.toString()}`
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
const inlineSuggestionStyles = cva(
  'absolute inline-block pointer-events-none [color:inherit] opacity-80 whitespace-pre z-[2] [font-family:inherit] [font-size:inherit] [letter-spacing:inherit]'
)
const inlineSuggestionTextStyles = 'relative inline-block items-baseline text-muted-foreground'
const inlineSuggestionPrefixStyles = 'sr-only'
const inlineSuggestionSuffixStyles = 'whitespace-pre text-muted-foreground'

const resolveTriggerRegex = (trigger: string | RegExp): RegExp => {
  // TODO move this into makeTriggerRegex
  if (typeof trigger === 'string') {
    return makeTriggerRegex(trigger)
  }

  const flags = trigger.flags.replaceAll('g', '')
  // Reconstruct provided RegExp without global flag; whitelist flags to avoid surprises.
  /* eslint-disable-next-line security/detect-non-literal-regexp -- reconstructing a vetted RegExp to strip 'g' */
  return new RegExp(trigger.source, flags)
}

interface ActiveSuggestionQuery<Extra extends Record<string, unknown>> {
  childIndex: number
  queryInfo: QueryInfo
  mentionChild: React.ReactElement<MentionComponentProps<Extra>>
  ignoreAccents: boolean
}

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

class MentionsInput<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> extends React.Component<MentionsInputProps<Extra>, MentionsInputState<Extra>> {
  static readonly defaultProps: Partial<MentionsInputProps> & {
    singleLine: boolean
  } = {
    singleLine: false,
    autoResize: false,
    anchorMode: 'caret',
    suggestionsPlacement: 'below',
    onKeyDown: () => null,
    onSelect: () => null,
    suggestionsDisplay: 'overlay',
    spellCheck: false,
  }

  private suggestions: SuggestionsMap<Extra> = {}
  private containerElement: HTMLDivElement | null = null
  private inputElement: HTMLInputElement | HTMLTextAreaElement | null = null
  private highlighterElement: HTMLDivElement | null = null
  private suggestionsElement: HTMLDivElement | null = null
  private mentionChildren: React.ReactElement<MentionComponentProps<Extra>>[] = []
  private _queryId = 0
  private _suggestionsMouseDown = false
  private _isComposing = false
  private readonly defaultSuggestionsPortalHost: HTMLElement | null
  private _pendingHighlighterRecompute = false
  private _queuedHighlighterRecompute = false
  private _didUnmount = false
  private _scrollSyncFrame: number | null = null
  private _autoResizeFrame: number | null = null
  private _cachedMarkupValue = ''
  private _pendingViewSync: PendingViewSync = createPendingViewSync()
  private _isFlushingViewSync = false
  private readonly _queryDebounceTimers = new Map<number, ReturnType<typeof setTimeout>>()
  private readonly _queryAbortControllers = new Map<number, AbortController>()

  private cancelScheduledFrame(frameKey: '_scrollSyncFrame' | '_autoResizeFrame'): void {
    const frame = this[frameKey]
    if (
      frame !== null &&
      globalThis.window !== undefined &&
      typeof globalThis.cancelAnimationFrame === 'function'
    ) {
      globalThis.cancelAnimationFrame(frame)
      this[frameKey] = null
    }
  }

  private clearPendingSuggestionRequests(): void {
    for (const timeoutId of this._queryDebounceTimers.values()) {
      clearTimeout(timeoutId)
    }
    this._queryDebounceTimers.clear()

    for (const controller of this._queryAbortControllers.values()) {
      controller.abort()
    }
    this._queryAbortControllers.clear()
  }

  requestViewSync = (
    flags: Partial<PendingViewSync>,
    options: {
      flushNow?: boolean
    } = {}
  ): void => {
    this._pendingViewSync = mergePendingViewSync(this._pendingViewSync, flags)

    if (!hasPendingViewSync(this._pendingViewSync)) {
      return
    }

    if (options.flushNow) {
      this.flushPendingViewSync()
      return
    }

    if (globalThis.window === undefined || typeof globalThis.requestAnimationFrame !== 'function') {
      this.flushPendingViewSync()
      return
    }

    if (this._scrollSyncFrame !== null) {
      return
    }

    this._scrollSyncFrame = globalThis.requestAnimationFrame(() => {
      this._scrollSyncFrame = null
      this.flushPendingViewSync()
    })
  }

  private ensureGeneratedId(): void {
    const explicitId = this.getExplicitId()
    if (explicitId !== null || this.state.generatedId !== null) {
      return
    }

    this.setState({ generatedId: createGeneratedId() })
  }

  private getExplicitId(): string | null {
    const { id } = this.props
    return typeof id === 'string' && id.trim().length > 0 ? id.trim() : null
  }

  private getBaseId(): string | null {
    return this.getExplicitId() ?? this.state.generatedId
  }

  private getSuggestionsOverlayId(): string | undefined {
    const baseId = this.getBaseId()
    return baseId === null ? undefined : `${baseId}-suggestions`
  }

  private getInlineAutocompleteLiveRegionId(): string | undefined {
    const baseId = this.getBaseId()
    return baseId === null ? undefined : `${baseId}-inline-live`
  }

  private getMentionChildren() {
    return this.mentionChildren
  }

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

  flushPendingViewSync = (): ViewSyncPatch => {
    if (
      this._didUnmount ||
      this._isFlushingViewSync ||
      !hasPendingViewSync(this._pendingViewSync)
    ) {
      return createViewSyncPatch()
    }

    if (this._scrollSyncFrame !== null) {
      this.cancelScheduledFrame('_scrollSyncFrame')
    }

    this._isFlushingViewSync = true
    const pendingViewSync = this._pendingViewSync
    this._pendingViewSync = createPendingViewSync()
    const patch = createViewSyncPatch()

    if (pendingViewSync.restoreSelection && this.state.pendingSelectionUpdate) {
      this.setState({ pendingSelectionUpdate: false })
      this.setSelection(this.state.selectionStart, this.state.selectionEnd)
      patch.restoredSelection = true
    }

    let layoutDidChange = false

    if (pendingViewSync.syncScroll) {
      patch.syncedScroll = true
      layoutDidChange = this.updateHighlighterScroll() || layoutDidChange
      layoutDidChange = this.resetTextareaHeight() || layoutDidChange
    }

    if (pendingViewSync.measureSuggestions) {
      patch.measuredSuggestions = this.updateSuggestionsPosition()
    }

    if (pendingViewSync.measureInline) {
      patch.measuredInline = this.updateInlineSuggestionPosition()
    }

    if (pendingViewSync.recomputeHighlighter || layoutDidChange) {
      this.scheduleHighlighterRecompute()
      patch.recomputedHighlighter = true
    }

    this._isFlushingViewSync = false

    return patch
  }

  constructor(props: MentionsInputProps<Extra>) {
    super(props)
    this.defaultSuggestionsPortalHost = typeof document === 'undefined' ? null : document.body
    const { mentionChildren, config: initialConfig } = prepareMentionsInputChildren<Extra>(
      props.children
    )
    this.mentionChildren = mentionChildren
    const initialValue = props.value ?? ''
    const initialSnapshot = deriveMentionValueSnapshot<Extra>(initialValue, initialConfig)
    this._cachedMarkupValue = initialValue

    this.handleCopy = this.handleCopy.bind(this)
    this.handleCut = this.handleCut.bind(this)
    this.handlePaste = this.handlePaste.bind(this)
    this.handleDocumentScroll = this.handleDocumentScroll.bind(this)

    this.state = {
      focusIndex: 0,
      selectionStart: null,
      selectionEnd: null,
      cachedMentions: initialSnapshot.mentions,
      cachedPlainText: initialSnapshot.plainText,
      cachedIdValue: initialSnapshot.idValue,
      suggestions: {},
      queryStates: {},
      caretPosition: null,
      suggestionsPosition: {},
      inlineSuggestionPosition: null,
      pendingSelectionUpdate: false,
      highlighterRecomputeVersion: 0,
      config: initialConfig,
      generatedId: null,
    } satisfies MentionsInputState<Extra>
  }

  private validateChildren(): void {
    const { mentionChildren, config: newConfig } = prepareMentionsInputChildren<Extra>(
      this.props.children
    )
    this.mentionChildren = mentionChildren

    if (!areMentionConfigsEqual(this.state.config, newConfig)) {
      const currentValue = this.props.value ?? ''
      const nextSnapshot = deriveMentionValueSnapshot<Extra>(currentValue, newConfig)
      this.setState({
        config: newConfig,
        cachedMentions: nextSnapshot.mentions,
        cachedPlainText: nextSnapshot.plainText,
        cachedIdValue: nextSnapshot.idValue,
      })
      this._cachedMarkupValue = currentValue
    }
  }

  componentDidMount(): void {
    this.validateChildren()
    this.ensureGeneratedId()

    document.addEventListener('copy', this.handleCopy)
    document.addEventListener('cut', this.handleCut)
    document.addEventListener('paste', this.handlePaste)
    document.addEventListener('scroll', this.handleDocumentScroll, true)
    document.addEventListener('selectionchange', this.handleDocumentSelectionChange)

    this.requestViewSync(
      {
        syncScroll: true,
        measureSuggestions: true,
        measureInline: true,
      },
      { flushNow: true }
    )
  }

  // eslint-disable-next-line code-complete/low-function-cohesion
  componentDidUpdate(
    prevProps: MentionsInputProps<Extra>,
    prevState: MentionsInputState<Extra>
  ): void {
    if (prevProps.children !== this.props.children) {
      this.validateChildren()
    }

    const selectionPositionsChanged =
      this.state.selectionStart !== prevState.selectionStart ||
      this.state.selectionEnd !== prevState.selectionEnd

    const previousValue = prevProps.value ?? ''
    const currentValue = this.props.value ?? ''
    const configChanged = this.state.config !== prevState.config
    const valueChanged = currentValue !== previousValue || configChanged

    if (this.getExplicitId() === null && this.state.generatedId === null) {
      this.ensureGeneratedId()
    }

    const recalculatedSnapshot = valueChanged
      ? deriveMentionValueSnapshot<Extra>(currentValue, this.state.config)
      : null
    const snapshotForSelection = recalculatedSnapshot ?? {
      mentions: this.state.cachedMentions,
      plainText: this.state.cachedPlainText,
      idValue: this.state.cachedIdValue,
    }

    if (recalculatedSnapshot) {
      const {
        mentions: nextMentions,
        plainText: nextPlainText,
        idValue: nextIdValue,
      } = recalculatedSnapshot

      if (
        !areMentionOccurrencesEqual(nextMentions, this.state.cachedMentions) ||
        nextPlainText !== this.state.cachedPlainText ||
        nextIdValue !== this.state.cachedIdValue
      ) {
        this.setState({
          cachedMentions: nextMentions,
          cachedPlainText: nextPlainText,
          cachedIdValue: nextIdValue,
        })
      }
    }

    if (valueChanged) {
      this._cachedMarkupValue = currentValue
    }

    if (this.state.pendingSelectionUpdate) {
      this.requestViewSync({ restoreSelection: true })
    }

    if (valueChanged || prevProps.autoResize !== this.props.autoResize) {
      this.requestViewSync({
        syncScroll: true,
        measureSuggestions: true,
        measureInline: true,
      })
    }

    if (selectionPositionsChanged) {
      this.requestViewSync({
        measureSuggestions: true,
        measureInline: true,
      })
    }

    if (
      prevState.generatedId !== this.state.generatedId ||
      prevState.caretPosition !== this.state.caretPosition
    ) {
      this.requestViewSync({
        measureSuggestions: true,
        measureInline: true,
      })
    }

    this.flushPendingViewSync()

    if (selectionPositionsChanged || valueChanged) {
      const currentSelection = computeMentionSelectionDetails(
        snapshotForSelection.mentions,
        this.state.config,
        this.state.selectionStart,
        this.state.selectionEnd
      )
      let shouldEmit = selectionPositionsChanged

      if (!shouldEmit && valueChanged) {
        const previousSelection = computeMentionSelectionDetails(
          prevState.cachedMentions,
          prevState.config,
          prevState.selectionStart,
          prevState.selectionEnd
        )
        shouldEmit = !areMentionSelectionsEqual(
          previousSelection.selections,
          currentSelection.selections
        )
      }

      if (shouldEmit && this.props.onMentionSelectionChange) {
        const selectionMentionIds = currentSelection.selections.map((selection) => selection.id)
        const selectionContext = createMentionSelectionContext(
          currentValue,
          snapshotForSelection,
          selectionMentionIds
        )

        this.props.onMentionSelectionChange(currentSelection.selections, selectionContext)
      }
    }
  }

  componentWillUnmount(): void {
    document.removeEventListener('copy', this.handleCopy)
    document.removeEventListener('cut', this.handleCut)
    document.removeEventListener('paste', this.handlePaste)
    document.removeEventListener('scroll', this.handleDocumentScroll, true)
    document.removeEventListener('selectionchange', this.handleDocumentSelectionChange)
    this.clearPendingSuggestionRequests()
    this.cancelScheduledFrame('_scrollSyncFrame')
    this.cancelScheduledFrame('_autoResizeFrame')
    this._pendingHighlighterRecompute = false
    this._queuedHighlighterRecompute = false
    this._didUnmount = true
  }

  render(): React.ReactNode {
    const { className, style, singleLine } = this.props
    const rootClassName = cn(rootStyles(), className)

    return (
      <MentionsInputView
        rootRef={this.setContainerElement}
        rootClassName={rootClassName}
        style={style}
        singleLine={singleLine ?? MentionsInput.defaultProps.singleLine}
        controlClassName={this.getSlotClassName('control', controlStyles())}
        highlighter={this.renderHighlighter()}
        input={this.renderInputControl()}
        inlineSuggestion={this.renderInlineSuggestion()}
        inlineSuggestionLiveRegion={this.renderInlineSuggestionLiveRegion()}
        suggestionsOverlay={this.renderSuggestionsOverlay()}
        measurementBridge={this.renderMeasurementBridge()}
      />
    )
  }

  setContainerElement = (el: HTMLDivElement | null) => {
    this.containerElement = el
  }

  // eslint-disable-next-line code-complete/low-function-cohesion, sonarjs/cognitive-complexity
  getInputProps = (): InputComponentProps => {
    const { readOnly, disabled, singleLine } = this.props

    const passthroughProps = omit(
      this.props,
      HANDLED_PROPS as ReadonlyArray<keyof MentionsInputProps>
    ) as Partial<InputComponentProps>

    const { ...restPassthrough } = passthroughProps

    const baseClassName = this.getSlotClassName('input', inputStyles({ singleLine }))

    const props: Record<string, unknown> = {
      ...restPassthrough,
      className: baseClassName,
      value: getPlainText(this.props.value ?? '', this.state.config),
      onScroll: this.handleInputScroll,
      'data-slot': 'input',
      'data-single-line': singleLine ? 'true' : undefined,
      'data-multi-line': singleLine ? undefined : 'true',
    }

    const inlineStyle = getInputInlineStyle(singleLine)

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
    const overlayId = this.getSuggestionsOverlayId()

    Object.assign(props, {
      role: 'combobox',
      'aria-autocomplete': isInlineAutocomplete ? 'inline' : 'list',
      'aria-expanded': isInlineAutocomplete ? 'false' : this.isOpened() ? 'true' : 'false',
      'aria-haspopup': isInlineAutocomplete ? undefined : 'listbox',
      'aria-controls': isOverlayOpen && overlayId ? overlayId : undefined,
      'aria-activedescendant':
        isOverlayOpen && overlayId
          ? getSuggestionHtmlId(overlayId, this.state.focusIndex)
          : undefined,
    })

    if (isInlineAutocomplete && inlineSuggestion) {
      const liveRegionId = this.getInlineAutocompleteLiveRegionId()
      const existingDescribedBy =
        typeof props['aria-describedby'] === 'string' ? props['aria-describedby'] : undefined
      const describedBy = [existingDescribedBy, liveRegionId]
        .filter((value): value is string => Boolean(value && value.trim().length > 0))
        .join(' ')
      props['aria-describedby'] = describedBy || undefined
    }

    return props as InputComponentProps
  }

  renderInputControl = (): React.ReactElement => {
    const { singleLine, inputComponent: CustomInput } = this.props
    const inputProps = this.getInputProps()

    return CustomInput ? (
      <CustomInput ref={this.setInputRef} {...inputProps} />
    ) : singleLine ? (
      this.renderInput(inputProps)
    ) : (
      this.renderTextarea(inputProps)
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

  // eslint-disable-next-line code-complete/low-function-cohesion
  private readonly resetTextareaHeight = (): boolean => {
    const hasTextarea =
      typeof HTMLTextAreaElement !== 'undefined' && this.inputElement instanceof HTMLTextAreaElement

    if (!hasTextarea) {
      return false
    }

    const resizePatch = getTextareaResizePatch(this.inputElement, {
      singleLine: this.props.singleLine,
      autoResize: this.props.autoResize,
    })
    const didUpdate = applyTextareaResizePatch(this.inputElement, resizePatch)

    if (
      this.props.singleLine === true ||
      this.props.autoResize !== true ||
      globalThis.window === undefined ||
      typeof globalThis.requestAnimationFrame !== 'function'
    ) {
      if (this._autoResizeFrame !== null && typeof globalThis.cancelAnimationFrame === 'function') {
        globalThis.cancelAnimationFrame(this._autoResizeFrame)
        this._autoResizeFrame = null
      }

      return didUpdate
    }

    if (this._autoResizeFrame !== null && typeof globalThis.cancelAnimationFrame === 'function') {
      globalThis.cancelAnimationFrame(this._autoResizeFrame)
    }

    this._autoResizeFrame = globalThis.requestAnimationFrame(() => {
      this._autoResizeFrame = null
      applyTextareaResizePatch(
        this.inputElement,
        getTextareaResizePatch(this.inputElement, {
          singleLine: this.props.singleLine,
          autoResize: this.props.autoResize,
        })
      )
    })

    return didUpdate
  }

  setSuggestionsElement = (el: HTMLDivElement | null) => {
    this.suggestionsElement = el
  }

  // eslint-disable-next-line code-complete/low-function-cohesion
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
    const overlayId = this.getSuggestionsOverlayId()
    const { statusContent, statusType } = this.getSuggestionsStatusContent()

    const suggestionsNode = (
      <SuggestionsOverlay<Extra>
        id={overlayId}
        mentionChildren={this.mentionChildren}
        className={this.props.classNames?.suggestions}
        statusClassName={this.props.classNames?.suggestionsStatus}
        statusContent={statusContent}
        statusType={statusType}
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

  // eslint-disable-next-line code-complete/low-function-cohesion
  renderInlineSuggestion = (): React.ReactNode => {
    if (!this.isInlineAutocomplete()) {
      return null
    }

    if (!isNumber(this.state.selectionStart)) {
      return null
    }

    const inlineSuggestion = this.getInlineSuggestionDetails()
    const inlineSuggestionPosition = this.state.inlineSuggestionPosition
    if (!inlineSuggestion || !inlineSuggestionPosition) {
      return null
    }

    const wrapperClassName = this.getSlotClassName('inlineSuggestion', inlineSuggestionStyles())
    const wrapperStyle: CSSProperties = inlineSuggestionPosition
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
    const announcement = getInlineSuggestionAnnouncement(
      inlineSuggestion,
      this.getSuggestionsStatusContent()
    )
    const liveRegionId = this.getInlineAutocompleteLiveRegionId()

    return (
      <div
        id={liveRegionId}
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

  renderMeasurementBridge = (): React.ReactNode => {
    return (
      <MeasurementBridge
        container={this.containerElement}
        highlighter={this.highlighterElement}
        input={this.inputElement}
        suggestions={this.suggestionsElement}
        requestViewSync={this.requestViewSync}
      />
    )
  }

  renderHighlighter = (): React.ReactElement => {
    const { selectionStart, selectionEnd, highlighterRecomputeVersion } = this.state
    const { singleLine, children, value, classNames } = this.props
    const mentionSelectionMap = this.getCurrentMentionSelectionMap()
    return (
      <Highlighter
        containerRef={this.setHighlighterElement}
        className={classNames?.highlighter}
        substringClassName={classNames?.highlighterSubstring}
        caretClassName={classNames?.highlighterCaret}
        mentionChildren={this.mentionChildren}
        config={this.state.config}
        value={value}
        singleLine={singleLine ?? MentionsInput.defaultProps.singleLine}
        selectionStart={selectionStart}
        selectionEnd={selectionEnd}
        recomputeVersion={highlighterRecomputeVersion}
        onCaretPositionChange={this.handleCaretPositionChange}
        mentionSelectionMap={mentionSelectionMap}
      >
        {children}
      </Highlighter>
    )
  }

  setHighlighterElement = (el: HTMLDivElement | null) => {
    this.highlighterElement = el
  }

  updateInlineSuggestionPosition = (): boolean => {
    if (!this.isInlineAutocomplete()) {
      if (this.state.inlineSuggestionPosition === null) {
        return false
      }

      this.setState({ inlineSuggestionPosition: null })
      return true
    }

    const nextPosition = this.getInlineSuggestionDetails()
      ? calculateInlineSuggestionPosition({ highlighter: this.highlighterElement })
      : null

    if (areInlineSuggestionPositionsEqual(this.state.inlineSuggestionPosition, nextPosition)) {
      return false
    }

    this.setState({ inlineSuggestionPosition: nextPosition })
    return true
  }

  handleCaretPositionChange = (position: CaretCoordinates | null) => {
    this.setState({ caretPosition: position })
    this.requestViewSync({
      measureSuggestions: true,
      measureInline: true,
    })
  }

  scheduleHighlighterRecompute = (): void => {
    if (this._didUnmount) {
      return
    }

    if (this._pendingHighlighterRecompute) {
      this._queuedHighlighterRecompute = true
      return
    }

    this._pendingHighlighterRecompute = true
    this.setState(
      (prevState) => ({
        highlighterRecomputeVersion: prevState.highlighterRecomputeVersion + 1,
      }),
      () => {
        this._pendingHighlighterRecompute = false
        if (this._queuedHighlighterRecompute) {
          this._queuedHighlighterRecompute = false
          this.scheduleHighlighterRecompute()
        }
      }
    )
  }

  isInlineAutocomplete = (): boolean => this.props.suggestionsDisplay === 'inline'

  getFocusedSuggestionEntry = () =>
    getFocusedSuggestionEntryForMentionChildren<Extra>(
      this.mentionChildren,
      this.state.suggestions,
      this.state.focusIndex
    )

  getSuggestionData = (suggestion: SuggestionDataItem<Extra>) => getSuggestionData(suggestion)

  getInlineSuggestionDetails = (): InlineSuggestionDetails<Extra> | null =>
    this.isInlineAutocomplete()
      ? getInlineSuggestionDetailsForMentionChildren<Extra>(
          this.mentionChildren,
          this.state.suggestions,
          this.state.focusIndex
        )
      : null

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

  getPreferredQueryState = (): SuggestionQueryState<Extra> | null => {
    const entries = getSuggestionQueryStateEntries(this.state.queryStates)
    return entries[0]?.[1] ?? null
  }

  getSuggestionsStatusContent = () =>
    getSuggestionsStatusContentForMentionChildren<Extra>(
      this.mentionChildren,
      this.state.suggestions,
      this.state.queryStates
    )

  private readonly getCurrentMentionSelectionMap = (): Record<string, MentionSelectionState> => {
    const { selectionStart, selectionEnd } = this.state
    if (selectionStart === null || selectionEnd === null) {
      return {}
    }

    const currentValue = this.props.value ?? ''
    const mentions =
      currentValue === this._cachedMarkupValue
        ? this.state.cachedMentions
        : deriveMentionValueSnapshot<Extra>(currentValue, this.state.config).mentions

    return getMentionSelectionMap(mentions, this.state.config, selectionStart, selectionEnd)
  }

  executeOnChange = (
    trigger: MentionsInputChangeTrigger,
    newValue: string,
    newPlainTextValue: string,
    newIdValue: string,
    mentions: MentionOccurrence<Extra>[],
    previousValue: string,
    mentionId?: MentionIdentifier
  ): void => {
    if (this.props.onMentionsChange) {
      this.props.onMentionsChange({
        trigger,
        value: newValue,
        plainTextValue: newPlainTextValue,
        idValue: newIdValue,
        mentions,
        previousValue,
        mentionId,
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

    const clipboardData = event.clipboardData
    const pastedMentions = clipboardData.getData('text/react-mentions')
    const pastedData = clipboardData.getData('text/plain')
    const pasteResult = applyPasteToMentionsValue<Extra>(
      valueText,
      this.state.config,
      selectionStart,
      selectionEnd,
      pastedMentions || pastedData
    )

    this.executeOnChange(
      { type: 'paste', nativeEvent: event },
      pasteResult.value,
      pasteResult.snapshot.plainText,
      pasteResult.snapshot.idValue,
      pasteResult.snapshot.mentions,
      valueText
    )
    this.setState({
      selectionStart: pasteResult.nextSelectionStart,
      selectionEnd: pasteResult.nextSelectionStart,
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

    const { markupStartIndex, markupEndIndex } = getMarkupSelectionRange(
      valueText,
      this.state.config,
      selectionStart,
      selectionEnd
    )

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
    const cutResult = applyCutToMentionsValue<Extra>(
      valueText,
      this.state.config,
      selectionStart,
      selectionEnd
    )

    this.setState({
      selectionStart: cutResult.nextSelectionStart,
      selectionEnd: cutResult.nextSelectionStart,
      pendingSelectionUpdate: true,
    })

    this.executeOnChange(
      { type: 'cut', nativeEvent: event },
      cutResult.value,
      cutResult.snapshot.plainText,
      cutResult.snapshot.idValue,
      cutResult.snapshot.mentions,
      valueText
    )
  }

  // Handle input element's change event
  // eslint-disable-next-line code-complete/low-function-cohesion
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

    const nativeEvent = ev.nativeEvent as unknown as CompositionEvent<InputElement> & {
      data?: string | null
      isComposing?: boolean
    }
    const inputChangeResult = applyInputChangeToMentionsValue<Extra>(
      value,
      newPlainTextValue,
      this.state.config,
      selectionStartBefore,
      selectionEndBefore,
      ev.target.selectionEnd ?? selectionEndBefore,
      this.state.selectionEnd,
      nativeEvent.data
    )
    newPlainTextValue = inputChangeResult.snapshot.plainText

    this.setState((prevState) => ({
      selectionStart: inputChangeResult.nextSelectionStart,
      selectionEnd: inputChangeResult.nextSelectionEnd,
      pendingSelectionUpdate:
        prevState.pendingSelectionUpdate || inputChangeResult.shouldRestoreSelection,
    }))

    if (
      nativeEvent.isComposing &&
      inputChangeResult.nextSelectionStart === inputChangeResult.nextSelectionEnd &&
      this.inputElement
    ) {
      this.updateMentionsQueries(this.inputElement.value, inputChangeResult.nextSelectionStart)
    }

    // Propagate change
    this.executeOnChange(
      { type: 'input', nativeEvent: ev.nativeEvent },
      inputChangeResult.value,
      newPlainTextValue,
      inputChangeResult.snapshot.idValue,
      inputChangeResult.snapshot.mentions,
      value
    )

    this.props.onChange?.(ev)

    this.requestHighlighterScrollSync()
  }

  handleSelect = (ev: SyntheticEvent<InputElement>) => {
    this.syncSelectionFromInput('select')
    this.props.onSelect?.(ev)
  }

  handleInputScroll = (): void => {
    this.requestViewSync(
      {
        syncScroll: true,
        measureSuggestions: true,
        measureInline: true,
      },
      { flushNow: true }
    )
  }

  // eslint-disable-next-line code-complete/low-function-cohesion
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

  // eslint-disable-next-line code-complete/low-function-cohesion
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

  handleSuggestionsMouseDown = (_ev: ReactMouseEvent) => {
    this._suggestionsMouseDown = true
  }

  handleSuggestionsMouseEnter = (focusIndex: number) => {
    this.setState({
      focusIndex,
      scrollFocusedIntoView: false,
    })
  }

  // eslint-disable-next-line code-complete/low-function-cohesion, sonarjs/cognitive-complexity
  updateSuggestionsPosition = (): boolean => {
    const position =
      calculateSuggestionsPosition({
        caretPosition: this.state.caretPosition,
        suggestionsPlacement: this.props.suggestionsPlacement ?? 'below',
        anchorMode: this.props.anchorMode ?? 'caret',
        resolvedPortalHost: this.resolvePortalHost(),
        suggestions: this.suggestionsElement,
        highlighter: this.highlighterElement,
        container: this.containerElement,
      }) ?? {}

    if (areSuggestionsPositionsEqual(position, this.state.suggestionsPosition)) {
      return false
    }

    this.setState({
      suggestionsPosition: position,
    })

    return true
  }

  // eslint-disable-next-line code-complete/low-function-cohesion
  updateHighlighterScroll = (): boolean =>
    applyHighlighterViewPatch(
      this.highlighterElement,
      getHighlighterViewPatch(this.inputElement, this.highlighterElement)
    )

  private readonly requestHighlighterScrollSync = (): void => {
    this.requestViewSync({
      syncScroll: true,
      measureSuggestions: true,
      measureInline: true,
    })
  }

  handleDocumentScroll = (): void => {
    const shouldMeasureInline =
      this.isInlineAutocomplete() && isNumber(this.state.selectionStart)

    if (!this.suggestionsElement && !shouldMeasureInline) {
      return
    }

    this.requestViewSync({
      measureSuggestions: true,
      measureInline: true,
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

  // eslint-disable-next-line code-complete/low-function-cohesion
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

  private replaceSuggestions(
    nextSuggestions: SuggestionsMap<Extra>,
    getStatePatch: (
      prevState: MentionsInputState<Extra>,
      syncedSuggestions: SuggestionsMap<Extra>
    ) => Partial<MentionsInputState<Extra>> = () => ({})
  ): void {
    this.suggestions = nextSuggestions
    this.setState((prevState) => {
      const statePatch = getStatePatch(prevState, nextSuggestions)

      return {
        ...statePatch,
        suggestions: nextSuggestions,
      } as Pick<MentionsInputState<Extra>, keyof MentionsInputState<Extra>>
    })
  }

  private getActiveSuggestionQueries(
    plainTextValue: string,
    caretPosition: number
  ): ActiveSuggestionQuery<Extra>[] {
    const value = this.props.value ?? ''
    const mentionChildren = this.getMentionChildren()
    const positionInValue = mapPlainTextIndex(value, this.state.config, caretPosition, 'NULL')

    // If caret is inside of mention, do not query
    if (positionInValue === null || positionInValue === undefined) {
      return []
    }

    // Extract substring in between the end of the previous mention and the caret
    const substringStartIndex = getEndOfLastMention(
      value.slice(0, Math.max(0, positionInValue)),
      this.state.config
    )
    const substring = plainTextValue.slice(substringStartIndex, caretPosition)

    return mentionChildren.flatMap((mentionChild, childIndex) => {
      const triggerProp = mentionChild.props.trigger ?? '@'
      const regex = resolveTriggerRegex(triggerProp)
      const match = substring.match(regex)

      if (match?.[1] === undefined || match[2] === undefined) {
        return []
      }

      const querySequenceStart = substringStartIndex + substring.indexOf(match[1], match.index)
      return [
        {
          childIndex,
          queryInfo: {
            childIndex,
            query: match[2],
            querySequenceStart,
            querySequenceEnd: querySequenceStart + match[1].length,
          },
          mentionChild,
          ignoreAccents: regex.flags.includes('u'),
        },
      ]
    })
  }

  private getLoadingQueryStates(
    activeQueries: ReadonlyArray<ActiveSuggestionQuery<Extra>>,
    nextSuggestions: SuggestionsMap<Extra>
  ): SuggestionQueryStateMap<Extra> {
    return activeQueries.reduce<SuggestionQueryStateMap<Extra>>((queryStates, activeQuery) => {
      queryStates[activeQuery.childIndex] = {
        ...createLoadingQueryState<Extra>(activeQuery.queryInfo),
        results: nextSuggestions[activeQuery.childIndex]?.results ?? [],
      }
      return queryStates
    }, {})
  }

  private getPreservedSuggestions(
    activeQueries: ReadonlyArray<ActiveSuggestionQuery<Extra>>
  ): SuggestionsMap<Extra> {
    return activeQueries.reduce<SuggestionsMap<Extra>>((nextSuggestions, activeQuery) => {
      const previousSuggestion = this.suggestions[activeQuery.childIndex]
      if (!previousSuggestion || previousSuggestion.results.length === 0) {
        return nextSuggestions
      }

      nextSuggestions[activeQuery.childIndex] = {
        queryInfo: activeQuery.queryInfo,
        results: previousSuggestion.results,
      }

      return nextSuggestions
    }, {})
  }

  private scheduleSuggestionQuery(
    queryId: number,
    childIndex: number,
    queryInfo: QueryInfo,
    mentionChild: React.ReactElement<MentionComponentProps<Extra>>,
    ignoreAccents: boolean
  ): void {
    const debounceMs = mentionChild.props.debounceMs ?? DEFAULT_MENTION_PROPS.debounceMs
    const maxSuggestions = mentionChild.props.maxSuggestions ?? DEFAULT_MENTION_PROPS.maxSuggestions

    const pendingTimer = this._queryDebounceTimers.get(childIndex)
    if (pendingTimer !== undefined) {
      clearTimeout(pendingTimer)
      this._queryDebounceTimers.delete(childIndex)
    }

    const previousController = this._queryAbortControllers.get(childIndex)
    previousController?.abort()

    const controller = new AbortController()
    this._queryAbortControllers.set(childIndex, controller)

    const executeQuery = () => {
      this._queryDebounceTimers.delete(childIndex)

      const provideData = getDataProvider<Extra>(mentionChild.props.data, {
        ignoreAccents,
        maxSuggestions,
        signal: controller.signal,
        getSubstringIndex,
      })

      void this.updateSuggestions(
        queryId,
        childIndex,
        queryInfo,
        provideData(queryInfo.query),
        controller
      )
    }

    if (debounceMs > 0) {
      this._queryDebounceTimers.set(childIndex, setTimeout(executeQuery, debounceMs))
      return
    }

    executeQuery()
  }

  updateMentionsQueries = (plainTextValue: string, caretPosition: number): void => {
    const activeQueries = this.getActiveSuggestionQueries(plainTextValue, caretPosition)

    // Invalidate previous queries. Async results for previous queries will be neglected.
    const queryId = this._queryId + 1
    this._queryId = queryId
    this.clearPendingSuggestionRequests()

    if (activeQueries.length === 0) {
      this.replaceSuggestions({}, () => ({
        queryStates: {},
        focusIndex: 0,
      }))
      return
    }

    const nextSuggestions = this.getPreservedSuggestions(activeQueries)
    const nextQueryStates = this.getLoadingQueryStates(activeQueries, nextSuggestions)

    this.replaceSuggestions(nextSuggestions, () => ({
      queryStates: nextQueryStates,
      focusIndex: 0,
    }))

    for (const { childIndex, queryInfo, mentionChild, ignoreAccents } of activeQueries) {
      this.scheduleSuggestionQuery(queryId, childIndex, queryInfo, mentionChild, ignoreAccents)
    }
  }

  clearSuggestions = () => {
    // Invalidate previous queries. Async results for previous queries will be neglected.
    this._queryId++
    this.clearPendingSuggestionRequests()
    const clearedState = createClearedSuggestionsState<Extra>()
    this.replaceSuggestions(clearedState.suggestions, () => ({
      queryStates: clearedState.queryStates,
      focusIndex: clearedState.focusIndex,
    }))
  }

  updateSuggestions = async (
    queryId: number,
    childIndex: number,
    queryInfo: QueryInfo,
    results: MentionDataItem<Extra>[] | Promise<MentionDataItem<Extra>[]>,
    controller: AbortController
  ): Promise<void> => {
    if (queryId !== this._queryId) {
      // neglect async results from previous queries
      return
    }
    try {
      const data: MentionDataItem<Extra>[] = await Promise.resolve(results)
      if (queryId !== this._queryId || controller.signal.aborted) {
        return
      }

      if (this._queryAbortControllers.get(childIndex) === controller) {
        this._queryAbortControllers.delete(childIndex)
      }

      const nextState = applySuccessfulQueryResult(
        this.suggestions,
        this.state.queryStates,
        childIndex,
        queryInfo,
        data,
        this.state.focusIndex,
        this.isInlineAutocomplete()
      )
      this.replaceSuggestions(nextState.suggestions, () => ({
        focusIndex: nextState.focusIndex,
        queryStates: nextState.queryStates,
      }))
    } catch (error) {
      if (this._queryAbortControllers.get(childIndex) === controller) {
        this._queryAbortControllers.delete(childIndex)
      }

      if (queryId !== this._queryId || controller.signal.aborted || isAbortError(error)) {
        return
      }

      const nextState = applyErroredQueryResult(
        this.suggestions,
        this.state.queryStates,
        childIndex,
        queryInfo,
        error,
        this.state.focusIndex
      )
      this.replaceSuggestions(nextState.suggestions, () => ({
        focusIndex: nextState.focusIndex,
        queryStates: nextState.queryStates,
      }))
    }
  }

  // eslint-disable-next-line code-complete/low-function-cohesion
  addMention = (
    suggestion: SuggestionDataItem<Extra>,
    { childIndex, querySequenceStart, querySequenceEnd }: QueryInfo
  ): void => {
    const { id, display } = this.getSuggestionData(suggestion)
    // Insert mention in the marked up value at the correct position
    const value = this.props.value || ''
    const mentionsChild = getMentionChildFromArray<Extra>(this.mentionChildren, childIndex)
    if (!mentionsChild) {
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
    const {
      mentions,
      plainText: newPlainTextValue,
      idValue: newIdValue,
    } = getMentionsAndPlainText<Extra>(newValue, this.state.config)

    this.executeOnChange(
      { type: 'mention-add' },
      newValue,
      newPlainTextValue,
      newIdValue,
      mentions,
      value,
      id
    )

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
    return (
      this.getMentionChildren().some((child) => child.props.isLoading === true) ||
      getSuggestionQueryStateEntries(this.state.queryStates).some(
        ([, queryState]) => queryState.status === 'loading'
      )
    )
  }

  isOpened = (): boolean =>
    isNumber(this.state.selectionStart) &&
    (countSuggestions(this.state.suggestions) !== 0 ||
      this.isLoading() ||
      this.getSuggestionsStatusContent().statusType !== null)
}

export default MentionsInput
