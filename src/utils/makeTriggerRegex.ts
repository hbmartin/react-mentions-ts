import escapeRegex from './escapeRegex'

interface TriggerOptions {
  allowSpaceInQuery?: boolean
  ignoreAccents?: boolean
}

/**
 * Normalizes a string by removing diacritical marks (accents) using Unicode normalization
 * and handling special characters that don't decompose with NFD
 */
const normalizeAccents = (str: string): string => {
  // Map of special characters that don't decompose with NFD normalization
  const specialChars: Record<string, string> = {
    'ø': 'o', 'Ø': 'o',
    'æ': 'ae', 'Æ': 'ae',
    'œ': 'oe', 'Œ': 'oe',
    'ð': 'd', 'Ð': 'd',
    'þ': 'th', 'Þ': 'th',
    'ß': 'ss',
    'ł': 'l', 'Ł': 'l',
    'đ': 'd', 'Đ': 'd',
    'ħ': 'h', 'Ħ': 'h',
    'ı': 'i', 'İ': 'i',
    'ŋ': 'n', 'Ŋ': 'n',
    'ſ': 's',
  }

  // First replace special characters
  let normalized = str
  for (const [char, replacement] of Object.entries(specialChars)) {
    normalized = normalized.replaceAll(char, replacement)
  }

  // Then apply NFD normalization and remove combining diacritical marks
  return normalized
    .normalize('NFD') // Decompose characters into base + combining marks
    .replace(/\p{Diacritic}/gu, '') // Remove all diacritical marks
    .toLowerCase()
}

export const makeTriggerRegex = (
  trigger: string | RegExp = '@',
  options: TriggerOptions = {}
): RegExp => {
  if (trigger instanceof RegExp) {
    return trigger
  }

  const { allowSpaceInQuery, ignoreAccents } = options

  if (ignoreAccents) {
    // When ignoreAccents is true, create a custom regex that normalizes captures
    const escapedTriggerChar = escapeRegex(trigger)
    const spacePattern = allowSpaceInQuery === true ? '' : '\\s'

    // Create a regex with the `u` flag for Unicode support
    const pattern = new RegExp(
      // eslint-disable-next-line unicorn/prefer-string-raw
      `(?:^|\\s)(${escapedTriggerChar}([^${spacePattern}${escapedTriggerChar}]*))$`,
      'u'
    )

    // Extend the RegExp to normalize captures after matching
    const originalExec = pattern.exec.bind(pattern)
    pattern.exec = (str: string) => {
      const match = originalExec(str)
      if (match) {
        // Normalize the captured groups
        if (match[1] !== undefined) {
          match[1] = normalizeAccents(match[1])
        }
        if (match[2] !== undefined) {
          match[2] = normalizeAccents(match[2])
        }
      }
      return match
    }

    return pattern
  }

  // Default behavior without accent normalization
  const escapedTriggerChar = escapeRegex(trigger)

  // first capture group is the part to be replaced on completion
  // second capture group is for extracting the search query
  return new RegExp(
    // eslint-disable-next-line unicorn/prefer-string-raw
    `(?:^|\\s)(${escapedTriggerChar}([^${allowSpaceInQuery === true ? '' : '\\s'}${escapedTriggerChar}]*))$`
  )
}
