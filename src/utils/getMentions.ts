import type { MentionChildConfig, MentionOccurrence } from '../types'
import iterateMentionsMarkup from './iterateMentionsMarkup'

const getMentions = (
  value: string,
  config: ReadonlyArray<MentionChildConfig>
): MentionOccurrence[] => {
  const mentions: MentionOccurrence[] = []
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
