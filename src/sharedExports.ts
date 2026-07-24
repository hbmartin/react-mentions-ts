/**
 * Export surface shared by the root and `/core` entries. The entries differ
 * only in which MentionsInput/Mention preset they ship.
 */
export { default as MentionsText } from './MentionsText'
export type { MentionsTextProps } from './MentionsText'
export { parseMentionsMarkup, renderMentionsToReact } from './renderMentionsMarkup'
export type {
  MentionsTextMention,
  MentionsTextSegment,
  ParseMentionsMarkupOptions,
  RenderMentionsOptions,
} from './renderMentionsMarkup'
export type {
  ClassNameJoiner,
  ClassNameValue,
  MentionsInputProps,
  MentionsInputHandle,
  MentionsInputClassNames,
  MentionComponentProps,
  MentionDataItem,
  MentionDataPage,
  MentionDataProviderResult,
  MentionPageCursor,
  MentionRenderEmpty,
  MentionRenderError,
  MentionSearchContext,
  MentionSearchReason,
  MentionsInputChangeEvent,
  MentionsInputChangeHandler,
  MentionsInputChangeTrigger,
  MentionsInputChangeTriggerType,
  MentionSerializer,
  MentionSerializerMatch,
  MentionSelection,
  MentionSelectionState,
  SuggestionQueryState,
} from './types'
export { default as createMarkupSerializer } from './utils/createMarkupSerializer'
export { makeTriggerRegex } from './utils/makeTriggerRegex'
export { default as getSubstringIndex } from './utils/getSubstringIndex'
