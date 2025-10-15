import type { MentionChildConfig } from '../types'
import getMentions from './getMentions'

const getEndOfLastMention = (value: string, config: ReadonlyArray<MentionChildConfig>): number => {
  const mentions = getMentions(value, config)
  const lastMention = mentions.at(-1)
  return lastMention ? lastMention.plainTextIndex + lastMention.display.length : 0
}

export default getEndOfLastMention
