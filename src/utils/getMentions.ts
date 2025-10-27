import type { MentionChildConfig, MentionOccurrence } from '../types'
import iterateMentionsMarkup from './iterateMentionsMarkup'

const getMentions = <Extra extends Record<string, unknown> = Record<string, unknown>>(
  value: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>
): MentionOccurrence<Extra>[] => {
  const mentions: MentionOccurrence<Extra>[] = []
  iterateMentionsMarkup(value, config, (_match, index, plainTextIndex, id, display, childIndex) => {
    mentions.push({
      id,
      display,
      childIndex,
      index,
      plainTextIndex,
    })
  })
  return mentions
}

export default getMentions
