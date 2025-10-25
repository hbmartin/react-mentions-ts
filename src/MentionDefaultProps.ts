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
  isLoading: false,
  appendSpaceOnAdd: false,
} satisfies Partial<MentionComponentProps<any>> & {
  onRemove: NonNullable<MentionComponentProps<any>['onRemove']>
  displayTransform: NonNullable<MentionComponentProps<any>['displayTransform']>
  renderSuggestion: MentionComponentProps<any>['renderSuggestion']
  isLoading: boolean
  appendSpaceOnAdd: boolean
}
