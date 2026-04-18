import type React from 'react'
import type {
  ChangeEvent,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
  RefObject,
  FocusEvent as ReactFocusEvent,
  SyntheticEvent,
} from 'react'

export type MentionTrigger = string | RegExp
export type MentionIdentifier = string | number

export interface MentionSerializerMatch {
  markup: string
  index: number
  id: string
  display?: string | null
}

export interface MentionSerializer {
  id: string
  insert: (input: { id: MentionIdentifier; display: string }) => string
  findAll: (value: string) => MentionSerializerMatch[]
}

export type MentionDataItem<Extra extends Record<string, unknown> = Record<string, unknown>> = {
  id: MentionIdentifier
  display?: string
  highlights?: { start: number; end: number }[]
} & Omit<Extra, 'id' | 'display' | 'highlights'>

export type SuggestionDataItem<Extra extends Record<string, unknown> = Record<string, unknown>> =
  MentionDataItem<Extra>

type MaybePromise<T> = T | Promise<T>

export interface MentionSearchContext {
  signal: AbortSignal
}

export type DataSource<Extra extends Record<string, unknown> = Record<string, unknown>> =
  | ReadonlyArray<MentionDataItem<Extra>>
  | ((
      query: string,
      context: MentionSearchContext
    ) => MaybePromise<ReadonlyArray<MentionDataItem<Extra>>>)

export function isDataSource<Extra extends Record<string, unknown> = Record<string, unknown>>(
  value: unknown
): value is DataSource<Extra> {
  return (
    typeof value === 'function' ||
    (Array.isArray(value) &&
      value.every((item) => typeof item === 'object' && item !== null && 'id' in item))
  )
}

export interface QueryInfo {
  childIndex: number
  query: string
  querySequenceStart: number
  querySequenceEnd: number
}

export interface SuggestionQueryState<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> {
  queryInfo: QueryInfo
  results: SuggestionDataItem<Extra>[]
  status: 'loading' | 'success' | 'error'
  error?: unknown
}

export type SuggestionQueryStateMap<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> = Record<number, SuggestionQueryState<Extra>>

export type SuggestionsMap<Extra extends Record<string, unknown> = Record<string, unknown>> =
  Record<
    number,
    {
      queryInfo: QueryInfo
      results: SuggestionDataItem<Extra>[]
    }
  >

export type MentionRenderSuggestion<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> = (
  suggestion: SuggestionDataItem<Extra>,
  query: string,
  highlightedDisplay: ReactNode,
  index: number,
  focused: boolean
) => ReactNode

export type MentionRenderEmpty = (query: string) => ReactNode

export type MentionRenderError = (query: string, error: unknown) => ReactNode

export type DisplayTransform = (id: MentionIdentifier, display?: string | null) => string

export type MentionSelectionState = 'inside' | 'boundary' | 'partial' | 'full'

export interface MentionComponentProps<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> {
  trigger?: MentionTrigger
  markup?: string | MentionSerializer
  displayTransform?: DisplayTransform
  renderSuggestion?: MentionRenderSuggestion<Extra> | null
  renderEmpty?: MentionRenderEmpty | null
  renderError?: MentionRenderError | null
  data: DataSource<Extra>
  onAdd?: (params: {
    id: MentionIdentifier
    display: string
    startPos: number
    endPos: number
    serializerId: string
  }) => void
  onRemove?: (id: MentionIdentifier) => void
  isLoading?: boolean
  appendSpaceOnAdd?: boolean
  debounceMs?: number
  maxSuggestions?: number
  selectionState?: MentionSelectionState
}

export type MentionsInputChangeTriggerType =
  | 'input'
  | 'paste'
  | 'cut'
  | 'mention-add'
  | 'mention-remove'

export interface MentionsInputChangeTrigger {
  type: MentionsInputChangeTriggerType
  nativeEvent?: Event
}

export interface MentionOccurrence<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> {
  id: MentionIdentifier
  display: string
  childIndex: number
  index: number
  plainTextIndex: number
  data?: MentionDataItem<Extra>
}

export interface MentionSelection<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> extends MentionOccurrence<Extra> {
  selection: MentionSelectionState
  plainTextStart: number
  plainTextEnd: number
  serializerId: string
}

export interface MentionSelectionChangeEvent<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> {
  value: string
  plainTextValue: string
  idValue: string
  mentions: MentionOccurrence<Extra>[]
  mentionIds: MentionIdentifier[]
  mentionId?: MentionIdentifier
}

export interface MentionsInputChangeEvent<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> {
  trigger: MentionsInputChangeTrigger
  value: string
  plainTextValue: string
  idValue: string
  mentionId?: MentionIdentifier
  mentions: MentionOccurrence<Extra>[]
  previousValue: string
}

export type MentionsInputEventData<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> = MentionsInputChangeEvent<Extra>

export type MentionsInputChangeHandler<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> = (change: MentionsInputChangeEvent<Extra>) => void

export type MentionSelectionChangeHandler<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> = (selection: MentionSelection<Extra>[], context?: MentionSelectionChangeEvent<Extra>) => void

export type MentionsInputKeyDownHandler = (
  event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
) => void

export type MentionsInputSelectHandler = (
  event: MouseEvent<HTMLInputElement | HTMLTextAreaElement>
) => void

export interface CaretCoordinates {
  top: number
  left: number
}

export type MentionsInputAnchorMode = 'caret' | 'left'

export interface SuggestionsPosition {
  position?: 'absolute' | 'fixed'
  left?: number
  right?: number
  top?: number
  width?: number
}

export interface InlineSuggestionPosition {
  left: number
  top: number
}

export type InputComponentProps = React.ComponentPropsWithoutRef<'input'> &
  React.ComponentPropsWithoutRef<'textarea'>

export type InputComponent =
  | React.ComponentType<InputComponentProps>
  | React.ForwardRefExoticComponent<
      InputComponentProps & React.RefAttributes<HTMLInputElement | HTMLTextAreaElement>
    >

export interface MentionsInputProps<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'children' | 'onChange' | 'value' | 'defaultValue' | 'style' | 'onBlur'
> {
  a11ySuggestionsListLabel?: string
  anchorMode?: MentionsInputAnchorMode
  suggestionsPlacement?: 'auto' | 'above' | 'below'
  customSuggestionsContainer?: (children: ReactElement) => ReactElement
  disabled?: boolean
  inputComponent?: InputComponent
  inputRef?:
    | RefObject<HTMLInputElement | HTMLTextAreaElement>
    | ((el: HTMLInputElement | HTMLTextAreaElement | null) => void)
  spellCheck?: boolean
  onBlur?: (event: ReactFocusEvent<InputElement>) => void
  onMentionBlur?: (event: ReactFocusEvent<InputElement>, clickedSuggestion: boolean) => void
  onChange?: (event: ChangeEvent<InputElement>) => void
  onMentionsChange?: MentionsInputChangeHandler<Extra>
  onMentionSelectionChange?: MentionSelectionChangeHandler<Extra>
  onKeyDown?: MentionsInputKeyDownHandler
  onSelect?: (event: SyntheticEvent<InputElement>) => void
  readOnly?: boolean
  singleLine?: boolean
  autoResize?: boolean
  style?: React.CSSProperties
  className?: string
  classNames?: MentionsInputClassNames
  suggestionsPortalHost?: Element | Document | null
  suggestionsDisplay?: 'overlay' | 'inline'
  value?: string
  children:
    | ReactElement<MentionComponentProps<Extra>>
    | Array<ReactElement<MentionComponentProps<Extra>>>
}

export interface MentionsInputState<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> {
  focusIndex: number
  selectionStart: number | null
  selectionEnd: number | null
  cachedMentions: MentionOccurrence<Extra>[]
  cachedPlainText: string
  cachedIdValue: string
  suggestions: SuggestionsMap<Extra>
  queryStates: SuggestionQueryStateMap<Extra>
  caretPosition: CaretCoordinates | null
  suggestionsPosition: SuggestionsPosition
  inlineSuggestionPosition: InlineSuggestionPosition | null
  scrollFocusedIntoView?: boolean
  pendingSelectionUpdate: boolean
  highlighterRecomputeVersion: number
  generatedId: string | null
}

/**
 * CSS class names for customizing the appearance of MentionsInput components.
 * All fields are optional and will be merged with the default styles.
 */
export type MentionsInputClassNames = Partial<{
  /** The outer wrapper div that contains the highlighter, input, and inline suggestions */
  control: string
  /** The highlighter div that overlays the input to display mentions with custom styling */
  highlighter: string
  /** The span elements within the highlighter that render plain text substrings */
  highlighterSubstring: string
  /** The span element that marks the caret position in the highlighter for positioning inline suggestions */
  highlighterCaret: string
  /** The input or textarea element where the user types */
  input: string
  /** The wrapper div for inline autocomplete suggestions (when suggestionsDisplay='inline') */
  inlineSuggestion: string
  /** The span that wraps the inline suggestion text content */
  inlineSuggestionText: string
  /** The hidden prefix span shown before the visible inline suggestion text (for screen readers) */
  inlineSuggestionPrefix: string
  /** The visible suffix span containing the remaining suggestion text after the user's input */
  inlineSuggestionSuffix: string
  /** The outer container div for the suggestions overlay (when suggestionsDisplay='overlay') */
  suggestions: string
  /** Status content rendered when async results are empty or fail */
  suggestionsStatus: string
  /** The ul element that contains the list of suggestion items */
  suggestionsList: string
  /** The li element for each individual suggestion item */
  suggestionItem: string
  /** Additional class applied to the currently focused/highlighted suggestion item */
  suggestionItemFocused: string
  /** The span that wraps the display text of a suggestion */
  suggestionDisplay: string
  /** The b element used to highlight matching text within a suggestion */
  suggestionHighlight: string
  /** The outer div wrapper for the loading indicator */
  loadingIndicator: string
  /** The inner div that contains the loading spinner animation elements */
  loadingSpinner: string
  /** The individual span elements that make up the loading spinner dots */
  loadingSpinnerElement: string
}>

export type MentionChildConfig<Extra extends Record<string, unknown> = Record<string, unknown>> =
  MentionComponentProps<Extra> & {
    displayTransform: DisplayTransform
    serializer: MentionSerializer
  }

export type InputElement = HTMLInputElement | HTMLTextAreaElement
