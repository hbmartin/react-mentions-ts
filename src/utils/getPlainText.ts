import type { MentionChildConfig } from '../types'
import iterateMentionsMarkup from './iterateMentionsMarkup'

const getPlainText = (value: string, config: ReadonlyArray<MentionChildConfig>): string => {
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
