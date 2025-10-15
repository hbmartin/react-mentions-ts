import type React from "react";
import type {
	ChangeEvent,
	FocusEvent,
	KeyboardEvent,
	MouseEvent,
	ReactElement,
	ReactNode,
	RefObject,
} from "react";
import type useStyles from "substyle";

export type MentionTrigger = string | RegExp;

export interface MentionDataItem {
	id: string | number;
	display?: string;
	[key: string]: unknown;
}

export type SuggestionDataItem = MentionDataItem;

export type DataProviderFn = (
	query: string,
) => MentionDataItem[] | Promise<MentionDataItem[]>;

export type DataSource = MentionDataItem[] | DataProviderFn;

export interface QueryInfo {
	childIndex: number;
	query: string;
	querySequenceStart: number;
	querySequenceEnd: number;
	plainTextValue: string;
}

export type SuggestionsMap = Record<
	number,
	{
		queryInfo: QueryInfo;
		results: SuggestionDataItem[];
	}
>;

export type MentionRenderSuggestion = (
	suggestion: SuggestionDataItem | string,
	query: string,
	highlightedDisplay: ReactNode,
	index: number,
	focused: boolean,
) => ReactNode;

export type DisplayTransform = (
	id: MentionDataItem["id"],
	display?: string | null,
) => string;

export interface MentionComponentProps {
	trigger?: MentionTrigger;
	markup?: string;
	displayTransform?: DisplayTransform;
	renderSuggestion?: MentionRenderSuggestion | null;
	regex?: RegExp;
	data?: DataSource;
	onAdd?: (
		id: MentionDataItem["id"],
		display: string,
		startPos: number,
		endPos: number,
	) => void;
	onRemove?: (id: MentionDataItem["id"]) => void;
	isLoading?: boolean;
	appendSpaceOnAdd?: boolean;
	allowSpaceInQuery?: boolean;
	ignoreAccents?: boolean;
}

export interface MentionsInputEventData {
	event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
	value: string;
	plainTextValue: string;
	mentions: MentionOccurrence[];
}

export type MentionsInputChangeHandler = (
	event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	newValue: string,
	newPlainTextValue: string,
	mentions: MentionOccurrence[],
) => void;

export type MentionsInputKeyDownHandler = (
	event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
) => void;

export type MentionsInputSelectHandler = (
	event: MouseEvent<HTMLInputElement | HTMLTextAreaElement>,
) => void;

export interface CaretCoordinates {
	top: number;
	left: number;
}

export interface SuggestionsPosition {
	position?: "absolute" | "fixed";
	left?: number;
	right?: number;
	top?: number;
}

export type InputComponentProps = React.ComponentPropsWithoutRef<"input"> &
	React.ComponentPropsWithoutRef<"textarea">;

export type InputComponent =
	| React.ComponentType<InputComponentProps>
	| React.ForwardRefExoticComponent<
			InputComponentProps &
				React.RefAttributes<HTMLInputElement | HTMLTextAreaElement>
	  >;

export interface MentionsInputProps
	extends Omit<
		React.TextareaHTMLAttributes<HTMLTextAreaElement>,
		"children" | "onChange" | "value" | "defaultValue" | "style" | "valueLink"
	> {
	a11ySuggestionsListLabel?: string;
	allowSpaceInQuery?: boolean;
	allowSuggestionsAboveCursor?: boolean;
	appendSpaceOnAdd?: boolean;
	customSuggestionsContainer?: (children: ReactElement) => ReactElement;
	disabled?: boolean;
	forceSuggestionsAboveCursor?: boolean;
	ignoreAccents?: boolean;
	inputComponent?: InputComponent;
	inputRef?:
		| RefObject<HTMLInputElement | HTMLTextAreaElement>
		| ((el: HTMLInputElement | HTMLTextAreaElement | null) => void);
	onBlur?: (...args: any[]) => void;
	onChange?: MentionsInputChangeHandler;
	onKeyDown?: MentionsInputKeyDownHandler;
	onSelect?: (...args: any[]) => void;
	readOnly?: boolean;
	selectLastSuggestionOnSpace?: boolean;
	singleLine?: boolean;
	style?: StyleOverride;
	className?: string;
	classNames?: Parameters<typeof useStyles>[1]["classNames"];
	suggestionsPortalHost?: Element | Document | null;
	value?: string;
	valueLink?: {
		value: string;
		requestChange: (
			value: string,
			...args: [string, string, MentionOccurrence[]?]
		) => void;
	};
	children: ReactElement | ReactElement[];
}

export interface MentionsInputState {
	focusIndex: number;
	selectionStart: number | null;
	selectionEnd: number | null;
	suggestions: SuggestionsMap;
	caretPosition: CaretCoordinates | null;
	suggestionsPosition: SuggestionsPosition;
	scrollFocusedIntoView?: boolean;
	setSelectionAfterMentionChange?: boolean;
	setSelectionAfterHandlePaste: boolean;
}

export type Substyle = ReturnType<typeof useStyles>;
export type StyleOverride = Parameters<typeof useStyles>[1]["style"];
export type ClassNamesProp = Parameters<typeof useStyles>[1]["classNames"];

export type MentionChildConfig = MentionComponentProps & {
	markup: string;
	regex: RegExp;
	displayTransform: DisplayTransform;
};

export interface MentionOccurrence {
	id: string;
	display: string;
	childIndex: number;
	index: number;
	plainTextIndex: number;
}
