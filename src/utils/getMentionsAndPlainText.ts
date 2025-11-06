import type { MentionChildConfig, MentionOccurrence } from '../types'
import iterateMentionsMarkup from './iterateMentionsMarkup'

const getMentionsAndPlainText = <Extra extends Record<string, unknown> = Record<string, unknown>>(
  value: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>
): { mentions: MentionOccurrence<Extra>[]; plainText: string; idValue: string } => {
  const mentions: MentionOccurrence<Extra>[] = []
  let plainText = ''
  let idValue = ''

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
      idValue += id
    },
    (text) => {
      plainText += text
      idValue += text
    }
  )

  return { mentions, plainText, idValue }
}

export default getMentionsAndPlainText
