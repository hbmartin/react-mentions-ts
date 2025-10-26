import escapeRegex from './escapeRegex'

interface TriggerOptions {
  allowSpaceInQuery?: boolean
  ignoreAccents?: boolean
}

// eslint-disable-next-line code-complete/low-function-cohesion
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
    // When ignoreAccents is true, use a Unicode-aware pattern.
    // The 'u' flag enables Unicode mode, which makes the regex
    // correctly handle astral symbols and complex characters.
    const spacePattern = allowSpaceInQuery === true ? '' : '\\s'

    // Match Unicode letters and combining marks, but exclude the trigger and optionally spaces
    // The pattern allows letters followed by zero or more combining marks
    return new RegExp(
      `(?:^|\\s)(${escapedTriggerChar}((?:[^${spacePattern}${escapedTriggerChar}])*))$`,
      'u' // Unicode flag enables \p{} syntax
    )
  }

  // Default behavior without accent support
  // first capture group is the part to be replaced on completion
  // second capture group is for extracting the search query
  return new RegExp(
    `(?:^|\\s)(${escapedTriggerChar}([^${allowSpaceInQuery === true ? '' : '\\s'}${escapedTriggerChar}]*))$`
  )
}
