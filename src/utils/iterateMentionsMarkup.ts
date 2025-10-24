import type { MentionChildConfig } from '../types'

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
  const collectedMatches = config.flatMap((childConfig, childIndex) => {
    return childConfig.serializer.findAll(value).map((match) => ({
      match,
      childIndex,
    }))
  })

  collectedMatches.sort((a, b) => {
    if (a.match.index === b.match.index) {
      if (a.match.markup.length === b.match.markup.length) {
        return a.childIndex - b.childIndex
      }
      return b.match.markup.length - a.match.markup.length
    }
    return a.match.index - b.match.index
  })

  const seen = new Set<string>()
  let start = 0
  let currentPlainTextIndex = 0

  for (const { match, childIndex } of collectedMatches) {
    const key = `${match.index}:${match.markup}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)

    if (match.index < start) {
      continue
    }

    const { displayTransform } = config[childIndex]
    const display = displayTransform(match.id, match.display ?? match.id)

    const substr = value.substring(start, match.index)
    textIteratee(substr, start, currentPlainTextIndex)
    currentPlainTextIndex += substr.length

    markupIteratee(
      match.markup,
      match.index,
      currentPlainTextIndex,
      match.id,
      display,
      childIndex,
      start
    )
    currentPlainTextIndex += display.length
    start = match.index + match.markup.length
  }

  if (start < value.length) {
    textIteratee(value.slice(Math.max(0, start)), start, currentPlainTextIndex)
  }
}

export default iterateMentionsMarkup
