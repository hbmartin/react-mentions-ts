import type { MentionTrigger } from '../types'
import escapeRegex from './escapeRegex'
import lettersDiacritics from './diacritics'

interface TriggerOptions {
  allowSpaceInQuery?: boolean
  ignoreAccents?: boolean
}

const escapeCharForCharClass = (char: string): string => {
  if (['-', '\\', ']', '^'].includes(char)) {
    return `\\${char}`
  }
  return char
}

const buildAccentCharClass = (): string => {
  const set = new Set<string>()

  const addChar = (char: string) => {
    if (!char) {
      return
    }
    set.add(char)
    const normalized = char.normalize('NFC')
    set.add(normalized)
  }

  const addRange = (startHex: string, endHex: string) => {
    const start = Number.parseInt(startHex, 16)
    const end = Number.parseInt(endHex, 16)
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return
    }
    for (let code = start; code <= end; code++) {
      addChar(String.fromCharCode(code))
    }
  }

  const parseToken = (content: string, index: number): { char: string; nextIndex: number } => {
    if (content[index] === '\\') {
      const marker = content[index + 1]
      if (marker === 'u' || marker === 'U') {
        const hex = content.slice(index + 2, index + 6)
        return { char: String.fromCharCode(Number.parseInt(hex, 16)), nextIndex: index + 6 }
      }
      return { char: content[index + 1] ?? '', nextIndex: index + 2 }
    }
    return { char: content[index] ?? '', nextIndex: index + 1 }
  }

  const parseBracket = (content: string) => {
    let index = 0
    while (index < content.length) {
      const { char: startChar, nextIndex } = parseToken(content, index)
      if (!startChar) {
        break
      }
      index = nextIndex
      if (content[index] === '-' && index + 1 < content.length) {
        const { char: endChar, nextIndex: afterRange } = parseToken(content, index + 1)
        if (endChar) {
          addRange(startChar.codePointAt(0)?.toString(16) ?? '', endChar.codePointAt(0)?.toString(16) ?? '')
        }
        index = afterRange
      } else {
        addChar(startChar)
      }
    }
  }

  const addFromSource = (source: string) => {
    source.replace(/\\u([0-9A-Fa-f]{4})-\\u([0-9A-Fa-f]{4})/g, (_, start, end) => {
      addRange(start, end)
      return ''
    })

    source.replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => {
      addChar(String.fromCharCode(Number.parseInt(hex, 16)))
      return ''
    })

    source.replace(/&#(\d+);/g, (_, dec) => {
      addChar(String.fromCodePoint(Number(dec)))
      return ''
    })

    const bracketMatches = source.match(/\[([^\]]+)]/g)
    bracketMatches?.forEach((match) => {
      const content = match.slice(1, -1)
      parseBracket(content)
    })
  }

  for (const { letters } of lettersDiacritics) {
    addFromSource(letters.source)
  }

  return Array.from(set)
    .filter((char) => char && char.normalize('NFD') !== char)
    .map(escapeCharForCharClass)
    .join('')
}

const ACCENT_CHAR_CLASS = buildAccentCharClass()

export const makeTriggerRegex = (
  trigger: MentionTrigger = '@',
  options: TriggerOptions = {}
): RegExp => {
  if (trigger instanceof RegExp) {
    return trigger
  }

  const { allowSpaceInQuery, ignoreAccents } = options
  const escapedTriggerChar = escapeRegex(trigger)
  const disallowed = `${allowSpaceInQuery === true ? '' : '\\s'}${escapedTriggerChar}`
  const baseCharClass = `[^${disallowed}]`
  const suffix =
    ignoreAccents === true && ACCENT_CHAR_CLASS.length > 0
      ? `(?:${baseCharClass}|[${ACCENT_CHAR_CLASS}])*`
      : `${baseCharClass}*`

  return new RegExp(
    // eslint-disable-next-line unicorn/prefer-string-raw
    `(?:^|\\s)(${escapedTriggerChar}(${suffix}))$`
  )
}
