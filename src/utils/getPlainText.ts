import type { MentionChildConfig } from '../types'
import iterateMentionsMarkup from './iterateMentionsMarkup'

const getPlainText = <Extra extends Record<string, unknown> = Record<string, unknown>>(
  value: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>
): string => {
  let result = ''
  iterateMentionsMarkup(
    value,
    config,
    (_match, _index, _plainTextIndex, _id, display) => {
      result += display
    },
    (plainText) => {
      result += plainText
    }
  )
  return result
}

export default getPlainText
