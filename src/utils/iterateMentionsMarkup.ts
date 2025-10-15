import type { MentionChildConfig } from '../types'
import combineRegExps from './combineRegExps'
import countPlaceholders from './countPlaceholders'
import findPositionOfCapturingGroup from './findPositionOfCapturingGroup'

type MarkupIteratee = (
  match: string,
  index: number,
  plainTextIndex: number,
  id: string,
  display: string,
  childIndex: number,
  lastMentionEndIndex: number
) => void

type TextIteratee = (substring: string, index: number, substrPlainTextIndex: number) => void

const emptyFn: TextIteratee = () => {}

// Finds all occurrences of the markup in the value and calls the `markupIteratee` callback for each of them.
// The optional `textIteratee` callback is called for each plain text ranges in between these markup occurrences.
const iterateMentionsMarkup = (
  value: string,
  config: ReadonlyArray<MentionChildConfig>,
  markupIteratee: MarkupIteratee,
  textIteratee: TextIteratee = emptyFn
): void => {
  const regex = combineRegExps(config.map((c) => c.regex))

  let accOffset = 2 // first is whole match, second is the for the capturing group of first regexp component
  const captureGroupOffsets = config.map(({ markup }) => {
    const result = accOffset
    // + 1 is for the capturing group we add around each regexp component in combineRegExps
    accOffset += countPlaceholders(markup) + 1
    return result
  })

  let match: RegExpExecArray | null
  let start = 0
  let currentPlainTextIndex = 0

  // detect all mention markup occurrences in the value and iterate the matches

  while ((match = regex.exec(value)) !== null) {
    const offset = captureGroupOffsets.find((o) => Boolean(match?.[o]))
    if (offset === undefined) {
      continue
    }

    const mentionChildIndex = captureGroupOffsets.indexOf(offset)
    if (mentionChildIndex === -1) {
      continue
    }

    const { markup, displayTransform } = config[mentionChildIndex]
    const idPos = offset + findPositionOfCapturingGroup(markup, 'id')
    const displayPos = offset + findPositionOfCapturingGroup(markup, 'display')

    const idMatch = match[idPos]
    if (idMatch == undefined) {
      continue
    }

    const displayMatch = match[displayPos]
    const display = displayTransform(idMatch, displayMatch ?? idMatch)

    const substr = value.substring(start, match.index)
    textIteratee(substr, start, currentPlainTextIndex)
    currentPlainTextIndex += substr.length

    markupIteratee(
      match[0],
      match.index,
      currentPlainTextIndex,
      idMatch,
      display,
      mentionChildIndex,
      start
    )
    currentPlainTextIndex += display.length
    start = regex.lastIndex
  }

  if (start < value.length) {
    textIteratee(value.slice(Math.max(0, start)), start, currentPlainTextIndex)
  }
}

export default iterateMentionsMarkup
