import type { MentionComponentProps } from './types'

const DEFAULT_MARKUP = '@[__display__](__id__)'

export const DEFAULT_MENTION_PROPS = {
  trigger: '@',
  markup: DEFAULT_MARKUP,
  onAdd: undefined,
  onRemove: () => undefined,
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  displayTransform: (id: string | number, display?: string | null) => display || String(id),
  renderSuggestion: null,
  renderEmpty: null,
  renderError: null,
  isLoading: false,
  appendSpaceOnAdd: false,
  debounceMs: 0,
  maxSuggestions: undefined,
} satisfies Partial<MentionComponentProps> & {
  onRemove: NonNullable<MentionComponentProps['onRemove']>
  displayTransform: NonNullable<MentionComponentProps['displayTransform']>
  renderSuggestion: MentionComponentProps['renderSuggestion']
  renderEmpty: MentionComponentProps['renderEmpty']
  renderError: MentionComponentProps['renderError']
  isLoading: boolean
  appendSpaceOnAdd: boolean
  debounceMs: number
  maxSuggestions: number | undefined
}
