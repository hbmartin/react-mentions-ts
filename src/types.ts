import type React from 'react'
import type {
	ChangeEvent,
	FocusEvent,
	KeyboardEvent,
	MouseEvent,
	ReactElement,
	ReactNode,
	RefObject,
} from 'react'

export type MentionTrigger = string | RegExp

export interface MentionDataItem {
	id: string
	display?: string
	[key: string]: unknown
}

export type SuggestionDataItem = MentionDataItem

export type DataCallback = (items: MentionDataItem[]) => void

export type DataProviderFn = (
	query: string,
	callback: DataCallback,
) => void | MentionDataItem[] | Promise<MentionDataItem[]>

export type DataSource =
	| MentionDataItem[]
	| DataProviderFn

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
	suggestion: SuggestionDataItem,
	query: string,
	highlightedDisplay: ReactNode,
	index: number,
	focused: boolean,
) => ReactNode

export interface MentionComponentProps {
	trigger?: MentionTrigger
	markup?: string
	displayTransform?: (id: string, display?: string | null) => string
	renderSuggestion?: MentionRenderSuggestion | null
	regex?: RegExp
	data?: DataSource
	onAdd?: (id: string, display?: string | null) => void
	onRemove?: (id: string) => void
	isLoading?: boolean
	appendSpaceOnAdd?: boolean
	allowSpaceInQuery?: boolean
	ignoreAccents?: boolean
}

export interface MentionsInputEventData {
	event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	value: string
	plainTextValue: string
	mentions: MentionDataItem[]
}

export type MentionsInputChangeHandler = (
	event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	newValue: string,
	newPlainTextValue: string,
	mentions: MentionDataItem[],
) => void

export type MentionsInputKeyDownHandler = (
	event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
) => void

export type MentionsInputSelectHandler = (
	event: MouseEvent<HTMLInputElement | HTMLTextAreaElement>,
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
		'children' | 'onChange' | 'value' | 'defaultValue'
	> {
	a11ySuggestionsListLabel?: string
	allowSpaceInQuery?: boolean
	allowSuggestionsAboveCursor?: boolean
	appendSpaceOnAdd?: boolean
	customSuggestionsContainer?: (children: ReactElement) => ReactElement
	disabled?: boolean
	forceSuggestionsAboveCursor?: boolean
	ignoreAccents?: boolean
	inputComponent?: InputComponent
	inputRef?:
		| RefObject<HTMLInputElement | HTMLTextAreaElement>
		| ((el: HTMLInputElement | HTMLTextAreaElement | null) => void)
	onBlur?: (...args: any[]) => void
	onChange?: MentionsInputChangeHandler
	onKeyDown?: MentionsInputKeyDownHandler
	onSelect?: (...args: any[]) => void
	readOnly?: boolean
	selectLastSuggestionOnSpace?: boolean
	singleLine?: boolean
	style?: any
	className?: string
	classNames?: Record<string, unknown> | string | string[]
	suggestionsPortalHost?: Element | Document | null
	value?: string
	valueLink?: {
		value: string
		requestChange: (
			value: string,
			...args: [string, string, MentionDataItem[]?]
		) => void
	}
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
	setSelectionAfterMentionChange?: boolean
	setSelectionAfterHandlePaste: boolean
}
