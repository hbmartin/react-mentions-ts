import getMentions from './getMentions'
import type { MentionChildConfig } from '../types'

const getEndOfLastMention = (
  value: string,
  config: ReadonlyArray<MentionChildConfig>
): number => {
  const mentions = getMentions(value, config)
  const lastMention = mentions[mentions.length - 1]
  return lastMention
    ? lastMention.plainTextIndex + lastMention.display.length
    : 0
}

export default getEndOfLastMention
