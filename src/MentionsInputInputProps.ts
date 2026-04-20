import type { KeyboardEvent } from 'react'
import type { InputComponentProps, InputElement, MentionsInputProps } from './types'
import type { InlineSuggestionDetails } from './MentionsInputSelectors'
import { getInputInlineStyle } from './MentionsInputLayout'
import { getSuggestionHtmlId, omit } from './utils'

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

export const defaultMentionsInputProps = {
  singleLine: false,
  autoResize: false,
  anchorMode: 'caret',
  suggestionsPlacement: 'below',
  onKeyDown: () => null,
  onSelect: () => null,
  suggestionsDisplay: 'overlay',
  spellCheck: false,
} satisfies Partial<MentionsInputProps> & {
  singleLine: boolean
}

interface BuildMentionsInputInputPropsArgs<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> {
  props: MentionsInputProps<Extra>
  inputClassName: string
  plainTextValue: string
  singleLine: boolean
  isInlineAutocomplete: boolean
  inlineSuggestion: InlineSuggestionDetails<Extra> | null
  isSuggestionsOpened: boolean
  suggestionsOverlayId?: string
  inlineAutocompleteLiveRegionId?: string
  focusIndex: number
  onScroll: InputComponentProps['onScroll']
  onChange: InputComponentProps['onChange']
  onSelect: InputComponentProps['onSelect']
  onKeyDown: (event: KeyboardEvent<InputElement>) => void
  onBlur: InputComponentProps['onBlur']
  onCompositionStart: InputComponentProps['onCompositionStart']
  onCompositionEnd: InputComponentProps['onCompositionEnd']
}

const mergeDescribedBy = (
  existingDescribedBy: unknown,
  liveRegionId: string | undefined
): string | undefined => {
  const describedBy = [
    typeof existingDescribedBy === 'string' ? existingDescribedBy : undefined,
    liveRegionId,
  ]
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .join(' ')

  return describedBy.length > 0 ? describedBy : undefined
}

interface BuildComboboxAriaPropsArgs {
  existingDescribedBy: unknown
  isInlineAutocomplete: boolean
  hasInlineSuggestion: boolean
  isSuggestionsOpened: boolean
  suggestionsOverlayId?: string
  inlineAutocompleteLiveRegionId?: string
  focusIndex: number
}

const getAriaExpanded = (
  isInlineAutocomplete: boolean,
  isSuggestionsOpened: boolean
): 'true' | 'false' => {
  if (isInlineAutocomplete) {
    return 'false'
  }

  return isSuggestionsOpened ? 'true' : 'false'
}

const buildComboboxAriaProps = ({
  existingDescribedBy,
  isInlineAutocomplete,
  hasInlineSuggestion,
  isSuggestionsOpened,
  suggestionsOverlayId,
  inlineAutocompleteLiveRegionId,
  focusIndex,
}: BuildComboboxAriaPropsArgs): Record<string, unknown> => {
  const isOverlayOpen = !isInlineAutocomplete && isSuggestionsOpened
  const hasOverlayId = suggestionsOverlayId !== undefined
  const ariaProps: Record<string, unknown> = {
    role: 'combobox',
    'aria-autocomplete': isInlineAutocomplete ? 'inline' : 'list',
    'aria-expanded': getAriaExpanded(isInlineAutocomplete, isSuggestionsOpened),
    'aria-haspopup': isInlineAutocomplete ? undefined : 'listbox',
    'aria-controls': isOverlayOpen && hasOverlayId ? suggestionsOverlayId : undefined,
    'aria-activedescendant':
      isOverlayOpen && hasOverlayId
        ? getSuggestionHtmlId(suggestionsOverlayId, focusIndex)
        : undefined,
  }

  if (isInlineAutocomplete && hasInlineSuggestion) {
    ariaProps['aria-describedby'] = mergeDescribedBy(
      existingDescribedBy,
      inlineAutocompleteLiveRegionId
    )
  }

  return ariaProps
}

export const buildMentionsInputInputProps = <
  Extra extends Record<string, unknown> = Record<string, unknown>,
>({
  props,
  inputClassName,
  plainTextValue,
  singleLine,
  isInlineAutocomplete,
  inlineSuggestion,
  isSuggestionsOpened,
  suggestionsOverlayId,
  inlineAutocompleteLiveRegionId,
  focusIndex,
  onScroll,
  onChange,
  onSelect,
  onKeyDown,
  onBlur,
  onCompositionStart,
  onCompositionEnd,
}: BuildMentionsInputInputPropsArgs<Extra>): InputComponentProps => {
  const { readOnly, disabled } = props
  const passthroughProps = omit(
    props as unknown as Record<string, unknown>,
    HANDLED_PROPS as ReadonlyArray<keyof MentionsInputProps>
  ) as Partial<InputComponentProps>
  const inputProps: Record<string, unknown> = {
    ...passthroughProps,
    className: inputClassName,
    spellCheck: props.spellCheck ?? defaultMentionsInputProps.spellCheck,
    value: plainTextValue,
    onScroll,
    'data-slot': 'input',
    'data-single-line': singleLine ? 'true' : undefined,
    'data-multi-line': singleLine ? undefined : 'true',
  }
  const inlineStyle = getInputInlineStyle(singleLine)

  if (Object.keys(inlineStyle).length > 0) {
    inputProps.style = inlineStyle
  }

  if (readOnly !== true && disabled !== true) {
    Object.assign(inputProps, {
      onChange,
      onSelect,
      onKeyDown,
      onBlur,
      onCompositionStart,
      onCompositionEnd,
    })
  }

  Object.assign(
    inputProps,
    buildComboboxAriaProps({
      existingDescribedBy: inputProps['aria-describedby'],
      isInlineAutocomplete,
      hasInlineSuggestion: inlineSuggestion !== null,
      isSuggestionsOpened,
      suggestionsOverlayId,
      inlineAutocompleteLiveRegionId,
      focusIndex,
    })
  )

  return inputProps as InputComponentProps
}
