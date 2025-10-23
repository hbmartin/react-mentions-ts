import type { MentionComponentProps } from './types'

export const DEFAULT_MENTION_PROPS = {
  trigger: '@',
  markup: '@[__display__](__id__)',
  onAdd: () => undefined,
  onRemove: () => undefined,
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/strict-boolean-expressions
  displayTransform: (id: string | number, display?: string | null) => display || String(id),
  renderSuggestion: null,
  isLoading: false,
  appendSpaceOnAdd: false,
} satisfies Partial<MentionComponentProps<any>> & {
  onAdd: NonNullable<MentionComponentProps<any>['onAdd']>
  onRemove: NonNullable<MentionComponentProps<any>['onRemove']>
  displayTransform: NonNullable<MentionComponentProps<any>['displayTransform']>
  renderSuggestion: MentionComponentProps<any>['renderSuggestion']
  isLoading: boolean
  appendSpaceOnAdd: boolean
}
