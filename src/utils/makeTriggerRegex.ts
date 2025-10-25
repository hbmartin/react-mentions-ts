import escapeRegex from './escapeRegex'

interface TriggerOptions {
  allowSpaceInQuery?: boolean
  ignoreAccents?: boolean
}

export const makeTriggerRegex = (
  trigger: string | RegExp = '@',
  options: TriggerOptions = {}
): RegExp => {
  if (trigger instanceof RegExp) {
    return trigger
  }

  const { allowSpaceInQuery, ignoreAccents } = options
  const escapedTriggerChar = escapeRegex(trigger)

  if (ignoreAccents) {
    // When ignoreAccents is true, use Unicode-aware pattern that matches
    // any Unicode letter including those with diacritical marks
    // \p{L} matches any Unicode letter
    // \p{M} matches combining marks (diacritics)
    const spacePattern = allowSpaceInQuery === true ? '' : '\\s'

    // Match Unicode letters and combining marks, but exclude the trigger and optionally spaces
    // The pattern allows letters followed by zero or more combining marks
    return new RegExp(
      // eslint-disable-next-line unicorn/prefer-string-raw
      `(?:^|\\s)(${escapedTriggerChar}((?:[^${spacePattern}${escapedTriggerChar}])*))$`,
      'u' // Unicode flag enables \p{} syntax
    )
  }

  // Default behavior without accent support
  // first capture group is the part to be replaced on completion
  // second capture group is for extracting the search query
  return new RegExp(
    // eslint-disable-next-line unicorn/prefer-string-raw
    `(?:^|\\s)(${escapedTriggerChar}([^${allowSpaceInQuery === true ? '' : '\\s'}${escapedTriggerChar}]*))$`
  )
}
