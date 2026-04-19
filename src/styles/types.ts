import type { CSSProperties } from 'react'

export type ClassNameValue = string | false | null | undefined
export type ClassNameJoiner = (...classNames: ClassNameValue[]) => string

export interface MentionStyleConfig {
  readonly mergeClassNames: ClassNameJoiner
  readonly className: string
  readonly requiredClassName: string
  readonly style?: CSSProperties
}

export interface HighlighterStyleConfig {
  readonly mergeClassNames: ClassNameJoiner
  readonly rootClassName: (options: { singleLine: boolean }) => string
  readonly rootStyle?: (options: { singleLine: boolean }) => CSSProperties | undefined
  readonly substringClassName: string
  readonly caretClassName: string
}

export interface SuggestionStyleConfig {
  readonly mergeClassNames: ClassNameJoiner
  readonly itemClassName: string
  readonly focusedItemClassName?: string
  readonly itemStyle?: CSSProperties
  readonly focusedItemStyle?: CSSProperties
  readonly displayClassName: string
  readonly displayStyle?: CSSProperties
  readonly highlightClassName: string
  readonly highlightStyle?: CSSProperties
}

export interface LoadingIndicatorStyleConfig {
  readonly mergeClassNames: ClassNameJoiner
  readonly containerClassName: string
  readonly screenReaderClassName: string
  readonly screenReaderStyle?: CSSProperties
  readonly spinnerClassName: string
  readonly spinnerButtonClassName: string
  readonly spinnerDotClassName: string
  readonly spinnerStyle?: CSSProperties
  readonly spinnerButtonStyle?: CSSProperties
  readonly spinnerDotStyle?: CSSProperties
}

export interface SuggestionsOverlayStyleConfig {
  readonly mergeClassNames: ClassNameJoiner
  readonly overlayClassName: string
  readonly overlayStyle?: CSSProperties
  readonly listClassName: string
  readonly statusClassName: (options: { type: 'empty' | 'error' }) => string
  readonly statusStyle?: (options: { type: 'empty' | 'error' }) => CSSProperties | undefined
  readonly suggestion: SuggestionStyleConfig
  readonly loadingIndicator: LoadingIndicatorStyleConfig
}

export interface MentionsInputStyleConfig {
  readonly mergeClassNames: ClassNameJoiner
  readonly rootClassName: string
  readonly rootStyle?: CSSProperties
  readonly controlClassName: string
  readonly controlStyle?: CSSProperties
  readonly inputClassName: (options: { singleLine?: boolean }) => string
  readonly inputStyle?: (options: { singleLine?: boolean }) => CSSProperties | undefined
  readonly inlineSuggestionClassName: string
  readonly inlineSuggestionStyle?: CSSProperties
  readonly inlineSuggestionTextClassName: string
  readonly inlineSuggestionTextStyle?: CSSProperties
  readonly inlineSuggestionPrefixClassName: string
  readonly inlineSuggestionPrefixStyle?: CSSProperties
  readonly inlineSuggestionSuffixClassName: string
  readonly inlineSuggestionSuffixStyle?: CSSProperties
  readonly mention: MentionStyleConfig
  readonly highlighter: HighlighterStyleConfig
  readonly suggestionsOverlay: SuggestionsOverlayStyleConfig
}
