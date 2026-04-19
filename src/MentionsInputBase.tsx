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
import { createPortal } from 'react-dom'
import HighlighterBase from './HighlighterBase'
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
  getSuggestionData,
  getSuggestionQueryStateEntries,
  getSuggestionsStatusContentForMentionChildren,
} from './MentionsInputSelectors'
import type { InlineSuggestionDetails } from './MentionsInputSelectors'
import MentionsInputView from './MentionsInputView'
import SuggestionsOverlayBase from './SuggestionsOverlayBase'
import {
  applyCutToMentionsValue,
  applyInputChangeToMentionsValue,
  applyInsertTextToMentionsValue,
  applyPasteToMentionsValue,
  getMarkupSelectionRange,
} from './MentionsInputEditing'
import countSuggestions from './utils/countSuggestions'
import getEndOfLastMention from './utils/getEndOfLastMention'
import getMentionsAndPlainText from './utils/getMentionsAndPlainText'
import getSubstringIndex from './utils/getSubstringIndex'
import getSuggestionHtmlId from './utils/getSuggestionHtmlId'
import isNumber from './utils/isNumber'
import mapPlainTextIndex from './utils/mapPlainTextIndex'
import omit from './utils/omit'
import spliceString from './utils/spliceString'
import { areMentionSelectionsEqual } from './utils/areMentionSelectionsEqual'
import { makeTriggerRegex } from './utils/makeTriggerRegex'
import type { PreparedMentionsInputChildren } from './MentionsInputChildren'
import { areMentionConfigsEqual, prepareMentionsInputChildren } from './MentionsInputChildren'
import type { MentionValueSnapshot } from './MentionsInputDerived'
import { createMentionSelectionContext, deriveMentionValueSnapshot } from './MentionsInputDerived'
import {
  applyErroredQueryResult,
  applySuccessfulQueryResult,
  createClearedSuggestionsState,
  createLoadingQueryState,
  isAbortError,
} from './MentionsInputQueryState'
import { computeMentionSelectionDetails, getMentionSelectionMap } from './MentionsInputSelection'
import type {
  CaretCoordinates,
  InputComponentProps,
  MentionChildConfig,
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
import type { MentionsInputStyleConfig } from './styles/types'
import mergeStyles from './styles/mergeStyles'

let generatedIdCounter = 0

const createGeneratedId = (): string => {
  const cryptoObject = (globalThis as { crypto?: Crypto }).crypto

  if (typeof cryptoObject?.randomUUID === 'function') {
    return `mentions-${cryptoObject.randomUUID()}`
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

const getMentionDiffKey = <Extra extends Record<string, unknown>>(
  mention: MentionOccurrence<Extra>
): string => {
  return JSON.stringify([mention.childIndex, String(mention.id), mention.display])
}

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

abstract class MentionsInputBase<
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

  private containerElement: HTMLDivElement | null = null
  private inputElement: HTMLInputElement | HTMLTextAreaElement | null = null
  private highlighterElement: HTMLDivElement | null = null
  private suggestionsElement: HTMLDivElement | null = null
  private preparedChildrenCache: {
    source: MentionsInputProps<Extra>['children']
    value: PreparedMentionsInputChildren<Extra>
  } | null = null
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
  private _cachedConfig: ReadonlyArray<MentionChildConfig<Extra>> = []
  private _lastCommittedConfig: ReadonlyArray<MentionChildConfig<Extra>> = []
  private _cachedSnapshot: MentionValueSnapshot<Extra> = {
    mentions: [],
    plainText: '',
    idValue: '',
  }
  private _pendingViewSync: PendingViewSync = createPendingViewSync()
  private _isFlushingViewSync = false
  private readonly _queryDebounceTimers = new Map<number, ReturnType<typeof setTimeout>>()
  private readonly _queryAbortControllers = new Map<number, AbortController>()
  protected abstract readonly styles: MentionsInputStyleConfig

  private cancelScheduledFrame(frameKey: '_scrollSyncFrame' | '_autoResizeFrame'): void {
    const frame = this[frameKey]
    if (frame !== null && typeof globalThis.cancelAnimationFrame === 'function') {
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

  private cacheSnapshot(
    value: string,
    config: ReadonlyArray<MentionChildConfig<Extra>>,
    snapshot: MentionValueSnapshot<Extra>
  ): MentionValueSnapshot<Extra> {
    this._cachedMarkupValue = value
    this._cachedConfig = [...config]
    this._cachedSnapshot = snapshot
    return snapshot
  }

  private getCurrentSnapshot(
    value: string = this.props.value ?? '',
    config: ReadonlyArray<MentionChildConfig<Extra>> = this.getCurrentConfig()
  ): MentionValueSnapshot<Extra> {
    if (value === this._cachedMarkupValue && areMentionConfigsEqual(config, this._cachedConfig)) {
      return this._cachedSnapshot
    }

    return this.cacheSnapshot(value, config, deriveMentionValueSnapshot<Extra>(value, config))
  }

  private shouldMeasureSuggestions(): boolean {
    return !this.isInlineAutocomplete() && isNumber(this.state.selectionStart)
  }

  private shouldMeasureInline(): boolean {
    return this.isInlineAutocomplete() && isNumber(this.state.selectionStart)
  }

  private resolveViewSyncFlags(flags: Partial<PendingViewSync>): Partial<PendingViewSync> {
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
    if (flags.measureSuggestions === true && this.shouldMeasureSuggestions()) {
      nextFlags.measureSuggestions = true
    }
    if (flags.measureInline === true && this.shouldMeasureInline()) {
      nextFlags.measureInline = true
    }

    return nextFlags
  }

  requestViewSync = (
    flags: Partial<PendingViewSync>,
    options: {
      flushNow?: boolean
    } = {}
  ): void => {
    const filteredFlags = this.resolveViewSyncFlags(flags)
    this._pendingViewSync = mergePendingViewSync(this._pendingViewSync, filteredFlags)

    if (!hasPendingViewSync(this._pendingViewSync)) {
      return
    }

    if (options.flushNow === true) {
      this.flushPendingViewSync()
      return
    }

    if (typeof globalThis.requestAnimationFrame !== 'function') {
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

  private getPreparedChildren(
    children: MentionsInputProps<Extra>['children'] = this.props.children
  ): PreparedMentionsInputChildren<Extra> {
    if (this.preparedChildrenCache?.source === children) {
      return this.preparedChildrenCache.value
    }

    const preparedChildren = prepareMentionsInputChildren<Extra>(children)

    if (children === this.props.children) {
      this.preparedChildrenCache = {
        source: children,
        value: preparedChildren,
      }
    }

    return preparedChildren
  }

  private getMentionChildren(): PreparedMentionsInputChildren<Extra>['mentionChildren'] {
    return this.getPreparedChildren().mentionChildren
  }

  private getCurrentConfig(): PreparedMentionsInputChildren<Extra>['config'] {
    return this.getPreparedChildren().config
  }

  private getSlotClassName(slot: keyof MentionsInputClassNames, baseClass: string) {
    const { classNames } = this.props
    const extra = classNames?.[slot]
    return this.styles.mergeClassNames(baseClass, extra)
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
    const preparedChildren = prepareMentionsInputChildren<Extra>(props.children)
    this.preparedChildrenCache = {
      source: props.children,
      value: preparedChildren,
    }
    const initialConfig = preparedChildren.config
    const initialValue = props.value ?? ''
    const initialSnapshot = deriveMentionValueSnapshot<Extra>(initialValue, initialConfig)
    this.cacheSnapshot(initialValue, initialConfig, initialSnapshot)
    this._lastCommittedConfig = [...initialConfig]

    this.handleCopy = this.handleCopy.bind(this)
    this.handleCut = this.handleCut.bind(this)
    this.handlePaste = this.handlePaste.bind(this)
    this.handleDocumentScroll = this.handleDocumentScroll.bind(this)

    this.state = {
      focusIndex: 0,
      selectionStart: null,
      selectionEnd: null,
      suggestions: {},
      queryStates: {},
      caretPosition: null,
      suggestionsPosition: {},
      inlineSuggestionPosition: null,
      pendingSelectionUpdate: false,
      highlighterRecomputeVersion: 0,
      generatedId: null,
    } satisfies MentionsInputState<Extra>
  }

  componentDidMount(): void {
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

  private ensureGeneratedIdIfNeeded(): void {
    if (this.getExplicitId() === null && this.state.generatedId === null) {
      this.ensureGeneratedId()
    }
  }

  private scheduleViewSyncAfterUpdate(
    prevProps: MentionsInputProps<Extra>,
    prevState: MentionsInputState<Extra>,
    valueChanged: boolean,
    selectionPositionsChanged: boolean
  ): void {
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
  }

  private emitMentionSelectionChangeIfNeeded(
    currentValue: string,
    currentConfig: ReadonlyArray<MentionChildConfig<Extra>>,
    currentSnapshot: MentionValueSnapshot<Extra>,
    previousValue: string,
    previousConfig: ReadonlyArray<MentionChildConfig<Extra>>,
    prevState: MentionsInputState<Extra>,
    valueChanged: boolean,
    selectionPositionsChanged: boolean
  ): void {
    if ((!selectionPositionsChanged && !valueChanged) || !this.props.onMentionSelectionChange) {
      return
    }

    const currentSelection = computeMentionSelectionDetails<Extra>(
      currentSnapshot.mentions,
      currentConfig,
      this.state.selectionStart,
      this.state.selectionEnd
    )
    let shouldEmit = selectionPositionsChanged

    if (!shouldEmit && valueChanged) {
      const previousSnapshot = deriveMentionValueSnapshot<Extra>(previousValue, previousConfig)
      const previousSelection = computeMentionSelectionDetails<Extra>(
        previousSnapshot.mentions,
        previousConfig,
        prevState.selectionStart,
        prevState.selectionEnd
      )
      shouldEmit = !areMentionSelectionsEqual(
        previousSelection.selections,
        currentSelection.selections
      )
    }

    if (!shouldEmit) {
      return
    }

    const selectionMentionIds = currentSelection.selections.map((selection) => selection.id)
    const selectionContext = createMentionSelectionContext(
      currentValue,
      currentSnapshot,
      selectionMentionIds
    )

    this.props.onMentionSelectionChange(currentSelection.selections, selectionContext)
  }

  componentDidUpdate(
    prevProps: MentionsInputProps<Extra>,
    prevState: MentionsInputState<Extra>
  ): void {
    const selectionPositionsChanged =
      this.state.selectionStart !== prevState.selectionStart ||
      this.state.selectionEnd !== prevState.selectionEnd

    const previousValue = prevProps.value ?? ''
    const currentValue = this.props.value ?? ''
    const previousConfig = this._lastCommittedConfig
    const currentConfig = this.getCurrentConfig()
    const configChanged = !areMentionConfigsEqual(previousConfig, currentConfig)
    const valueChanged = currentValue !== previousValue || configChanged
    const currentSnapshot = this.getCurrentSnapshot(currentValue, currentConfig)

    this.ensureGeneratedIdIfNeeded()
    this.scheduleViewSyncAfterUpdate(prevProps, prevState, valueChanged, selectionPositionsChanged)
    this.emitMentionSelectionChangeIfNeeded(
      currentValue,
      currentConfig,
      currentSnapshot,
      previousValue,
      previousConfig,
      prevState,
      valueChanged,
      selectionPositionsChanged
    )
    this._lastCommittedConfig = [...currentConfig]
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
    const rootClassName = this.styles.mergeClassNames(this.styles.rootClassName, className)

    return (
      <MentionsInputView
        rootRef={this.setContainerElement}
        rootClassName={rootClassName}
        style={mergeStyles(this.styles.rootStyle, style)}
        singleLine={singleLine ?? MentionsInputBase.defaultProps.singleLine}
        controlClassName={this.getSlotClassName('control', this.styles.controlClassName)}
        controlStyle={this.styles.controlStyle}
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

  // eslint-disable-next-line sonarjs/cognitive-complexity
  getInputProps = (): InputComponentProps => {
    const { readOnly, disabled, singleLine } = this.props
    const currentSnapshot = this.getCurrentSnapshot()

    const passthroughProps = omit(
      this.props,
      HANDLED_PROPS as ReadonlyArray<keyof MentionsInputProps>
    ) as Partial<InputComponentProps>

    const { ...restPassthrough } = passthroughProps

    const baseClassName = this.getSlotClassName('input', this.styles.inputClassName({ singleLine }))

    const props: Record<string, unknown> = {
      ...restPassthrough,
      className: baseClassName,
      value: currentSnapshot.plainText,
      onScroll: this.handleInputScroll,
      'data-slot': 'input',
      'data-single-line': singleLine === true ? 'true' : undefined,
      'data-multi-line': singleLine === true ? undefined : 'true',
    }

    const inlineStyle = {
      ...this.styles.inputStyle?.({ singleLine }),
      ...getInputInlineStyle(singleLine),
    }

    if (Object.keys(inlineStyle).length > 0) {
      props.style = inlineStyle
    }

    if (readOnly !== true && disabled !== true) {
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
    const hasOverlayId = overlayId !== undefined

    Object.assign(props, {
      role: 'combobox',
      'aria-autocomplete': isInlineAutocomplete ? 'inline' : 'list',
      'aria-expanded': isInlineAutocomplete ? 'false' : this.isOpened() ? 'true' : 'false',
      'aria-haspopup': isInlineAutocomplete ? undefined : 'listbox',
      'aria-controls': isOverlayOpen && hasOverlayId ? overlayId : undefined,
      'aria-activedescendant':
        isOverlayOpen && hasOverlayId
          ? getSuggestionHtmlId(overlayId, this.state.focusIndex)
          : undefined,
    })

    if (isInlineAutocomplete && inlineSuggestion) {
      const liveRegionId = this.getInlineAutocompleteLiveRegionId()
      const existingDescribedBy =
        typeof props['aria-describedby'] === 'string' ? props['aria-describedby'] : undefined
      const describedBy = [existingDescribedBy, liveRegionId]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join(' ')
      props['aria-describedby'] = describedBy.length > 0 ? describedBy : undefined
    }

    return props as InputComponentProps
  }

  renderInputControl = (): React.ReactElement => {
    const { singleLine, inputComponent: CustomInput } = this.props
    const inputProps = this.getInputProps()

    if (CustomInput === undefined) {
      return singleLine === true ? this.renderInput(inputProps) : this.renderTextarea(inputProps)
    }

    return <CustomInput ref={this.setInputRef} {...inputProps} />
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
    } else if (inputRef !== null && inputRef !== undefined) {
      ;(inputRef as React.RefObject<InputElement | null>).current = el
    }
  }

  private readonly resetTextareaHeight = (): boolean => {
    if (!(this.inputElement instanceof HTMLTextAreaElement)) {
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
    const mentionChildren = this.getMentionChildren()

    const suggestionsNode = (
      <SuggestionsOverlayBase<Extra>
        id={overlayId}
        mentionChildren={mentionChildren}
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
        styles={this.styles.suggestionsOverlay}
      >
        {this.props.children}
      </SuggestionsOverlayBase>
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
    const inlineSuggestionPosition = this.state.inlineSuggestionPosition
    if (!inlineSuggestion || !inlineSuggestionPosition) {
      return null
    }

    const wrapperClassName = this.getSlotClassName(
      'inlineSuggestion',
      this.styles.inlineSuggestionClassName
    )
    const wrapperStyle = mergeStyles(this.styles.inlineSuggestionStyle, inlineSuggestionPosition)
    const textWrapperClassName = this.getSlotClassName(
      'inlineSuggestionText',
      this.styles.inlineSuggestionTextClassName
    )
    const prefixClassName = this.getSlotClassName(
      'inlineSuggestionPrefix',
      this.styles.inlineSuggestionPrefixClassName
    )
    const suffixClassName = this.getSlotClassName(
      'inlineSuggestionSuffix',
      this.styles.inlineSuggestionSuffixClassName
    )

    return (
      <div
        aria-hidden="true"
        className={wrapperClassName}
        data-slot="inline-suggestion"
        style={wrapperStyle}
      >
        <span className={textWrapperClassName} style={this.styles.inlineSuggestionTextStyle}>
          {inlineSuggestion.hiddenPrefix ? (
            <span
              className={prefixClassName}
              style={this.styles.inlineSuggestionPrefixStyle}
              aria-hidden="true"
            >
              {inlineSuggestion.hiddenPrefix}
            </span>
          ) : null}
          <span className={suffixClassName} style={this.styles.inlineSuggestionSuffixStyle}>
            {inlineSuggestion.visibleText}
          </span>
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
    const mentionChildren = this.getMentionChildren()
    const config = this.getCurrentConfig()
    return (
      <HighlighterBase
        containerRef={this.setHighlighterElement}
        className={classNames?.highlighter}
        substringClassName={classNames?.highlighterSubstring}
        caretClassName={classNames?.highlighterCaret}
        mentionChildren={mentionChildren}
        config={config}
        value={value}
        singleLine={singleLine ?? MentionsInputBase.defaultProps.singleLine}
        selectionStart={selectionStart}
        selectionEnd={selectionEnd}
        recomputeVersion={highlighterRecomputeVersion}
        onCaretPositionChange={this.handleCaretPositionChange}
        mentionSelectionMap={mentionSelectionMap}
        styles={this.styles.highlighter}
      >
        {children}
      </HighlighterBase>
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
      this.getMentionChildren(),
      this.state.suggestions,
      this.state.focusIndex
    )

  getSuggestionData = (suggestion: SuggestionDataItem<Extra>) => getSuggestionData(suggestion)

  getInlineSuggestionDetails = (): InlineSuggestionDetails<Extra> | null =>
    this.isInlineAutocomplete()
      ? getInlineSuggestionDetailsForMentionChildren<Extra>(
          this.getMentionChildren(),
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
      this.getMentionChildren(),
      this.state.suggestions,
      this.state.queryStates
    )

  private readonly getCurrentMentionSelectionMap = (): Record<string, MentionSelectionState> => {
    const { selectionStart, selectionEnd } = this.state
    if (selectionStart === null || selectionEnd === null) {
      return {}
    }

    const currentConfig = this.getCurrentConfig()
    const { mentions } = this.getCurrentSnapshot(this.props.value ?? '', currentConfig)

    return getMentionSelectionMap(mentions, currentConfig, selectionStart, selectionEnd)
  }

  private emitOnRemoveCallbacks(
    previousSnapshot: MentionValueSnapshot<Extra>,
    nextSnapshot: MentionValueSnapshot<Extra>,
    config: ReadonlyArray<MentionChildConfig<Extra>>
  ): MentionOccurrence<Extra>[] {
    const removedMentions = getRemovedMentions(previousSnapshot.mentions, nextSnapshot.mentions)

    for (const mention of removedMentions) {
      const onRemove = config[mention.childIndex]?.onRemove ?? DEFAULT_MENTION_PROPS.onRemove
      onRemove(mention.id)
    }

    return removedMentions
  }

  executeOnChange = (
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
        : this.emitOnRemoveCallbacks(previousSnapshot, nextSnapshot, config)
    const trigger =
      removedMentions.length > 0
        ? {
            type: 'mention-remove' as const,
            nativeEvent: baseTrigger.nativeEvent,
          }
        : baseTrigger
    const resolvedMentionId =
      mentionId ?? (removedMentions.length === 1 ? removedMentions[0]?.id : undefined)

    if (this.props.onMentionsChange) {
      this.props.onMentionsChange({
        trigger,
        value: newValue,
        plainTextValue: nextSnapshot.plainText,
        idValue: nextSnapshot.idValue,
        mentions: nextSnapshot.mentions,
        previousValue,
        mentionId: resolvedMentionId,
      })
    }
  }

  insertText = (text: string): void => {
    const input = this.inputElement
    const selectionStart = input?.selectionStart ?? this.state.selectionStart
    const selectionEnd = input?.selectionEnd ?? this.state.selectionEnd
    const value = this.props.value ?? ''
    const config = this.getCurrentConfig()
    const previousSnapshot = this.getCurrentSnapshot(value, config)
    const insertResult = applyInsertTextToMentionsValue<Extra>(
      value,
      config,
      selectionStart,
      selectionEnd,
      text
    )

    this.cacheSnapshot(insertResult.value, config, insertResult.snapshot)
    input?.focus()
    this.setState({
      selectionStart: insertResult.nextSelectionStart,
      selectionEnd: insertResult.nextSelectionStart,
      pendingSelectionUpdate: true,
    })

    this.executeOnChange(
      { type: 'insert-text' },
      insertResult.value,
      insertResult.snapshot,
      value,
      previousSnapshot,
      config
    )

    this.updateMentionsQueries(
      insertResult.snapshot.plainText,
      insertResult.nextSelectionStart,
      insertResult.value
    )
    this.requestHighlighterScrollSync()
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
    const config = this.getCurrentConfig()
    const previousSnapshot = this.getCurrentSnapshot(valueText, config)
    const pasteResult = applyPasteToMentionsValue<Extra>(
      valueText,
      config,
      selectionStart,
      selectionEnd,
      pastedMentions || pastedData
    )
    this.cacheSnapshot(pasteResult.value, config, pasteResult.snapshot)

    this.executeOnChange(
      { type: 'paste', nativeEvent: event },
      pasteResult.value,
      pasteResult.snapshot,
      valueText,
      previousSnapshot,
      config
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
    const config = this.getCurrentConfig()

    const { markupStartIndex, markupEndIndex } = getMarkupSelectionRange(
      valueText,
      config,
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
    const config = this.getCurrentConfig()
    const previousSnapshot = this.getCurrentSnapshot(valueText, config)
    const cutResult = applyCutToMentionsValue<Extra>(
      valueText,
      config,
      selectionStart,
      selectionEnd
    )
    this.cacheSnapshot(cutResult.value, config, cutResult.snapshot)

    this.setState({
      selectionStart: cutResult.nextSelectionStart,
      selectionEnd: cutResult.nextSelectionStart,
      pendingSelectionUpdate: true,
    })

    this.executeOnChange(
      { type: 'cut', nativeEvent: event },
      cutResult.value,
      cutResult.snapshot,
      valueText,
      previousSnapshot,
      config
    )
  }

  // Handle input element's change event
  handleChange = (ev: ChangeEvent<InputElement>) => {
    const native = ev.nativeEvent
    if ('isComposing' in native && typeof native.isComposing === 'boolean') {
      this._isComposing = native.isComposing
    }
    const value = this.props.value ?? ''

    const newPlainTextValue = ev.target.value

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
    const config = this.getCurrentConfig()
    const previousSnapshot = this.getCurrentSnapshot(value, config)
    const inputChangeResult = applyInputChangeToMentionsValue<Extra>(
      value,
      newPlainTextValue,
      config,
      selectionStartBefore,
      selectionEndBefore,
      ev.target.selectionEnd ?? selectionEndBefore,
      this.state.selectionEnd,
      nativeEvent.data
    )
    this.cacheSnapshot(inputChangeResult.value, config, inputChangeResult.snapshot)

    this.setState((prevState) => ({
      selectionStart: inputChangeResult.nextSelectionStart,
      selectionEnd: inputChangeResult.nextSelectionEnd,
      pendingSelectionUpdate:
        prevState.pendingSelectionUpdate || inputChangeResult.shouldRestoreSelection,
    }))

    if (
      nativeEvent.isComposing === true &&
      inputChangeResult.nextSelectionStart === inputChangeResult.nextSelectionEnd &&
      this.inputElement !== null
    ) {
      this.updateMentionsQueries(this.inputElement.value, inputChangeResult.nextSelectionStart)
    }

    // Propagate change
    this.executeOnChange(
      { type: 'input', nativeEvent: ev.nativeEvent },
      inputChangeResult.value,
      inputChangeResult.snapshot,
      value,
      previousSnapshot,
      config
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

  private readonly syncSelectionFromInput = (
    reason: 'select' | 'selectionchange' = 'selectionchange'
  ): void => {
    const input = this.inputElement
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
            this.shiftFocus(1)
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
        this.shiftFocus(1)
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
    if (!this.shouldMeasureSuggestions() && !this.shouldMeasureInline()) {
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

  setSelection = (selectionStart: number | null, selectionEnd: number | null): void => {
    if (selectionStart === null || selectionEnd === null) {
      return
    }

    const el = this.inputElement
    if (!el) {
      return
    }
    let selectionApplied = false
    if (typeof el.setSelectionRange === 'function') {
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
    computeNextState: (
      prevState: MentionsInputState<Extra>
    ) => Pick<MentionsInputState<Extra>, 'suggestions' | 'queryStates' | 'focusIndex'>
  ): void {
    this.setState<'suggestions' | 'queryStates' | 'focusIndex'>((prevState) =>
      computeNextState(prevState)
    )
  }

  private getActiveSuggestionQueries(
    plainTextValue: string,
    caretPosition: number,
    value: string = this.props.value ?? ''
  ): ActiveSuggestionQuery<Extra>[] {
    const mentionChildren = this.getMentionChildren()
    const config = this.getCurrentConfig()
    const positionInValue = mapPlainTextIndex(value, config, caretPosition, 'NULL')

    // If caret is inside of mention, do not query
    if (positionInValue === null || positionInValue === undefined) {
      return []
    }

    // Extract substring in between the end of the previous mention and the caret
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

  private getLoadingQueryStates(
    activeQueries: ReadonlyArray<ActiveSuggestionQuery<Extra>>,
    nextSuggestions: SuggestionsMap<Extra>
  ): SuggestionQueryStateMap<Extra> {
    return activeQueries.reduce<SuggestionQueryStateMap<Extra>>((queryStates, activeQuery) => {
      const previousResults = Object.hasOwn(nextSuggestions, activeQuery.childIndex)
        ? nextSuggestions[activeQuery.childIndex].results
        : []
      queryStates[activeQuery.childIndex] = {
        ...createLoadingQueryState<Extra>(activeQuery.queryInfo),
        results: previousResults,
      }
      return queryStates
    }, {})
  }

  private getPreservedSuggestions(
    activeQueries: ReadonlyArray<ActiveSuggestionQuery<Extra>>,
    currentSuggestions: SuggestionsMap<Extra>
  ): SuggestionsMap<Extra> {
    return activeQueries.reduce<SuggestionsMap<Extra>>((nextSuggestions, activeQuery) => {
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

  updateMentionsQueries = (plainTextValue: string, caretPosition: number, value?: string): void => {
    const activeQueries = this.getActiveSuggestionQueries(plainTextValue, caretPosition, value)

    // Invalidate previous queries. Async results for previous queries will be neglected.
    const queryId = this._queryId + 1
    this._queryId = queryId
    this.clearPendingSuggestionRequests()

    if (activeQueries.length === 0) {
      this.replaceSuggestions(() => ({
        suggestions: {},
        queryStates: {},
        focusIndex: 0,
      }))
      return
    }

    this.replaceSuggestions((prevState) => {
      const suggestions = this.getPreservedSuggestions(activeQueries, prevState.suggestions)

      return {
        suggestions,
        queryStates: this.getLoadingQueryStates(activeQueries, suggestions),
        focusIndex: 0,
      }
    })

    for (const { childIndex, queryInfo, mentionChild, ignoreAccents } of activeQueries) {
      this.scheduleSuggestionQuery(queryId, childIndex, queryInfo, mentionChild, ignoreAccents)
    }
  }

  clearSuggestions = () => {
    // Invalidate previous queries. Async results for previous queries will be neglected.
    this._queryId++
    this.clearPendingSuggestionRequests()
    const clearedState = createClearedSuggestionsState<Extra>()
    this.replaceSuggestions(() => ({
      suggestions: clearedState.suggestions,
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

      this.replaceSuggestions((prevState) =>
        applySuccessfulQueryResult(
          prevState.suggestions,
          prevState.queryStates,
          childIndex,
          queryInfo,
          data,
          prevState.focusIndex,
          this.isInlineAutocomplete()
        )
      )
    } catch (error) {
      if (this._queryAbortControllers.get(childIndex) === controller) {
        this._queryAbortControllers.delete(childIndex)
      }

      if (queryId !== this._queryId || controller.signal.aborted || isAbortError(error)) {
        return
      }

      this.replaceSuggestions((prevState) =>
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

  addMention = (
    suggestion: SuggestionDataItem<Extra>,
    { childIndex, querySequenceStart, querySequenceEnd }: QueryInfo
  ): void => {
    const { id, display } = this.getSuggestionData(suggestion)
    // Insert mention in the marked up value at the correct position
    const value = this.props.value ?? ''
    const config = this.getCurrentConfig()
    const previousSnapshot = this.getCurrentSnapshot(value, config)
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

    // Refocus input and set caret position to end of mention
    this.inputElement?.focus()

    let displayValue = childConfig.displayTransform(id, mentionDisplay)
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
    } = getMentionsAndPlainText<Extra>(newValue, config)
    const nextSnapshot = this.cacheSnapshot(newValue, config, {
      mentions,
      plainText: newPlainTextValue,
      idValue: newIdValue,
    })

    this.executeOnChange(
      { type: 'mention-add' },
      newValue,
      nextSnapshot,
      value,
      previousSnapshot,
      config,
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

export default MentionsInputBase
