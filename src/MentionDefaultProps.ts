import type { MentionComponentProps } from './types'
import createMarkupSerializer from './serializers/createMarkupSerializer'

const DEFAULT_MARKUP = '@[__display__](__id__)'

export const DEFAULT_MENTION_PROPS = {
  trigger: '@',
  markup: DEFAULT_MARKUP,
  serializer: createMarkupSerializer(DEFAULT_MARKUP),
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
