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

export type DataSource<Extra extends Record<string, unknown> = Record<string, unknown>> =
  | ReadonlyArray<MentionDataItem<Extra>>
  | ((query: string) => MaybePromise<ReadonlyArray<MentionDataItem<Extra>>>)

export interface QueryInfo {
  childIndex: number
  query: string
  querySequenceStart: number
  querySequenceEnd: number
  plainTextValue: string
}

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

export type DisplayTransform = (id: MentionIdentifier, display?: string | null) => string

export type MentionSelectionState = 'inside' | 'boundary' | 'partial' | 'full'

export interface MentionComponentProps<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> {
  trigger?: MentionTrigger
  markup?: string | MentionSerializer
  displayTransform?: DisplayTransform
  renderSuggestion?: MentionRenderSuggestion<Extra> | null
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

export interface MentionSelection<Extra extends Record<string, unknown> = Record<string, unknown>>
  extends MentionOccurrence<Extra> {
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

export interface SuggestionsPosition {
  position?: 'absolute' | 'fixed'
  left?: number
  right?: number
  top?: number
  width?: number
}

export type InputComponentProps = React.ComponentPropsWithoutRef<'input'> &
  React.ComponentPropsWithoutRef<'textarea'>

export type InputComponent =
  | React.ComponentType<InputComponentProps>
  | React.ForwardRefExoticComponent<
      InputComponentProps & React.RefAttributes<HTMLInputElement | HTMLTextAreaElement>
    >

export interface MentionsInputProps<Extra extends Record<string, unknown> = Record<string, unknown>>
  extends Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    'children' | 'onChange' | 'value' | 'defaultValue' | 'style' | 'onBlur'
  > {
  a11ySuggestionsListLabel?: string
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
  suggestions: SuggestionsMap<Extra>
  caretPosition: CaretCoordinates | null
  suggestionsPosition: SuggestionsPosition
  scrollFocusedIntoView?: boolean
  pendingSelectionUpdate: boolean
  highlighterRecomputeVersion: number
  config: MentionChildConfig[]
}

export type MentionsInputClassNames = Partial<{
  control: string
  highlighter: string
  highlighterSubstring: string
  highlighterCaret: string
  input: string
  inlineSuggestion: string
  inlineSuggestionText: string
  inlineSuggestionPrefix: string
  inlineSuggestionSuffix: string
  suggestions: string
  suggestionsList: string
  suggestionItem: string
  suggestionItemFocused: string
  suggestionDisplay: string
  suggestionHighlight: string
  loadingIndicator: string
  loadingSpinner: string
  loadingSpinnerElement: string
}>

export type MentionChildConfig = MentionComponentProps & {
  displayTransform: DisplayTransform
  serializer: MentionSerializer
}

export type InputElement = HTMLInputElement | HTMLTextAreaElement
