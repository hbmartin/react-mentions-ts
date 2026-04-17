import type {
  MentionChildConfig,
  MentionIdentifier,
  MentionOccurrence,
  MentionSelectionChangeEvent,
} from './types'
import { getMentionsAndPlainText } from './utils'

export interface MentionValueSnapshot<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> {
  mentions: MentionOccurrence<Extra>[]
  plainText: string
  idValue: string
}

export const deriveMentionValueSnapshot = <Extra extends Record<string, unknown>>(
  value: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>
): MentionValueSnapshot<Extra> => {
  const { mentions, plainText, idValue } = getMentionsAndPlainText<Extra>(value, config)

  return {
    mentions,
    plainText,
    idValue,
  }
}

export const createMentionSelectionContext = <Extra extends Record<string, unknown>>(
  value: string,
  snapshot: MentionValueSnapshot<Extra>,
  mentionIds: MentionIdentifier[]
): MentionSelectionChangeEvent<Extra> => ({
  value,
  plainTextValue: snapshot.plainText,
  idValue: snapshot.idValue,
  mentions: snapshot.mentions,
  mentionIds,
  mentionId: mentionIds.length === 1 ? mentionIds[0] : undefined,
})
