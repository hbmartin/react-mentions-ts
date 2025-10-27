import type { MentionChildConfig, MentionOccurrence } from '../types'
import iterateMentionsMarkup from './iterateMentionsMarkup'

const getMentionsAndPlainText = (
  value: string,
  config: ReadonlyArray<MentionChildConfig>
): { mentions: MentionOccurrence[]; plainText: string } => {
  const mentions: MentionOccurrence[] = []
  let plainText = ''

  iterateMentionsMarkup(
    value,
    config,
    (match, index, plainTextIndex, id, display, childIndex, _lastMentionEndIndex) => {
      mentions.push({
        id,
        display,
        childIndex,
        index,
        plainTextIndex,
      })
      plainText += display
    },
    (text) => {
      plainText += text
    }
  )

  return { mentions, plainText }
}

export default getMentionsAndPlainText
