import type React from 'react'
import type {
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
  RefObject,
  FocusEvent as ReactFocusEvent,
  SyntheticEvent,
} from 'react'
export type MentionTrigger = string | RegExp

export interface MentionDataItem {
  id: string | number
  display?: string
  [key: string]: unknown
}

export type SuggestionDataItem = MentionDataItem
export type DataSource = MentionDataItem[] | ((query: string) => Promise<MentionDataItem[]>)

export interface QueryInfo {
  childIndex: number
  query: string
  querySequenceStart: number
  querySequenceEnd: number
  plainTextValue: string
}

export type SuggestionsMap = Record<
  number,
  {
    queryInfo: QueryInfo
    results: SuggestionDataItem[]
  }
>

export type MentionRenderSuggestion = (
  suggestion: SuggestionDataItem | string,
  query: string,
  highlightedDisplay: ReactNode,
  index: number,
  focused: boolean
) => ReactNode

export type DisplayTransform = (id: MentionDataItem['id'], display?: string | null) => string

export interface MentionComponentProps {
  trigger?: MentionTrigger
  markup?: string
  displayTransform?: DisplayTransform
  renderSuggestion?: MentionRenderSuggestion | null
  regex?: RegExp
  data?: DataSource
  onAdd?: (id: MentionDataItem['id'], display: string, startPos: number, endPos: number) => void
  onRemove?: (id: MentionDataItem['id']) => void
  isLoading?: boolean
  appendSpaceOnAdd?: boolean
  allowSpaceInQuery?: boolean
  ignoreAccents?: boolean
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

export interface MentionsInputChangeEvent {
  trigger: MentionsInputChangeTrigger
  value: string
  plainTextValue: string
  mentions: MentionOccurrence[]
  previousValue: string
}

export type MentionsInputEventData = MentionsInputChangeEvent

export type MentionsInputChangeHandler = (change: MentionsInputChangeEvent) => void

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

export interface MentionsInputProps
  extends Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    'children' | 'onChange' | 'value' | 'defaultValue' | 'style' | 'onBlur'
  > {
  a11ySuggestionsListLabel?: string
  suggestionsPlacement?: 'auto' | 'above' | 'below'
  appendSpaceOnAdd?: boolean
  customSuggestionsContainer?: (children: ReactElement) => ReactElement
  disabled?: boolean
  ignoreAccents?: boolean
  inputComponent?: InputComponent
  inputRef?:
    | RefObject<HTMLInputElement | HTMLTextAreaElement>
    | ((el: HTMLInputElement | HTMLTextAreaElement | null) => void)
  onBlur?: (event: ReactFocusEvent<InputElement>, clickedSuggestion: boolean) => void
  onChange?: MentionsInputChangeHandler
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
  children: ReactElement | ReactElement[]
}

export interface MentionsInputState {
  focusIndex: number
  selectionStart: number | null
  selectionEnd: number | null
  suggestions: SuggestionsMap
  caretPosition: CaretCoordinates | null
  suggestionsPosition: SuggestionsPosition
  scrollFocusedIntoView?: boolean
  pendingSelectionUpdate: boolean
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
  markup: string
  regex: RegExp
  displayTransform: DisplayTransform
}

export interface MentionOccurrence {
  id: string
  display: string
  childIndex: number
  index: number
  plainTextIndex: number
}

export type InputElement = HTMLInputElement | HTMLTextAreaElement
