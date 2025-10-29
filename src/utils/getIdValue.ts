import type { MentionChildConfig } from '../types'
import iterateMentionsMarkup from './iterateMentionsMarkup'

const getIdValue = <Extra extends Record<string, unknown> = Record<string, unknown>>(
  value: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>
): string => {
  let result = ''
  iterateMentionsMarkup(
    value,
    config,
    (_match, _index, _plainTextIndex, id) => {
      result += String(id)
    },
    (plainText) => {
      result += plainText
    }
  )
  return result
}

export default getIdValue
