import type { MentionChildConfig } from '../types'
import iterateMentionsMarkup from './iterateMentionsMarkup'

// For a given indexInPlainText that lies inside a mention,
// returns the index of the first char of the mention in the plain text.
// If indexInPlainText does not lie inside a mention, returns undefined.
const findStartOfMentionInPlainText = <
  Extra extends Record<string, unknown> = Record<string, unknown>,
>(
  value: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>,
  indexInPlainText: number
): number | undefined => {
  let result = indexInPlainText
  let foundMention = false

  const markupIteratee = (
    _markup: string,
    _index: number,
    mentionPlainTextIndex: number,
    _id: string,
    display: string
  ): void => {
    if (
      mentionPlainTextIndex <= indexInPlainText &&
      mentionPlainTextIndex + display.length > indexInPlainText
    ) {
      result = mentionPlainTextIndex
      foundMention = true
    }
  }

  iterateMentionsMarkup(value, config, markupIteratee)

  if (foundMention) {
    return result
  }

  return undefined
}

export default findStartOfMentionInPlainText
