import type { MentionChildConfig } from '../types'
import getMentions from './getMentions'

const getEndOfLastMention = <Extra extends Record<string, unknown> = Record<string, unknown>>(
  value: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>
): number => {
  const mentions = getMentions<Extra>(value, config)
  const lastMention = mentions.at(-1)
  return lastMention ? lastMention.plainTextIndex + lastMention.display.length : 0
}

export default getEndOfLastMention
