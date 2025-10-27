import type { MentionChildConfig, MentionOccurrence } from '../types'
import iterateMentionsMarkup from './iterateMentionsMarkup'

const getMentionsAndPlainText = <Extra extends Record<string, unknown> = Record<string, unknown>>(
  value: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>
): { mentions: MentionOccurrence<Extra>[]; plainText: string } => {
  const mentions: MentionOccurrence<Extra>[] = []
  let plainText = ''

  iterateMentionsMarkup(
    value,
    config,
    (_match, index, plainTextIndex, id, display, childIndex, _lastMentionEndIndex) => {
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
