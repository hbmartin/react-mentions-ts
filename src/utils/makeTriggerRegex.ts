import type { MentionTrigger } from '../types'
import escapeRegex from './escapeRegex'

interface TriggerOptions {
  allowSpaceInQuery?: boolean
}
export const makeTriggerRegex = (
  trigger: MentionTrigger = '@',
  options: TriggerOptions = {}
): RegExp => {
  if (trigger instanceof RegExp) {
    return trigger
  }

  const { allowSpaceInQuery } = options
  const escapedTriggerChar = escapeRegex(trigger)

  // first capture group is the part to be replaced on completion
  // second capture group is for extracting the search query
  return new RegExp(
    // eslint-disable-next-line unicorn/prefer-string-raw
    `(?:^|\\s)(${escapedTriggerChar}([^${allowSpaceInQuery === true ? '' : '\\s'}${escapedTriggerChar}]*))$`
  )
}
