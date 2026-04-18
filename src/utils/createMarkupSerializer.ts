import type { MentionSerializer, MentionSerializerMatch } from '../types'
import createInternalRegExp from '../utils/createInternalRegExp'
import findPositionOfCapturingGroup from '../utils/findPositionOfCapturingGroup'
import makeMentionsMarkup from '../utils/makeMentionsMarkup'
import markupToRegex from '../utils/markupToRegex'
import PLACEHOLDERS from '../utils/placeholders'

interface SerializerMatcher {
  displayGroupIndex: number | null
  idGroupIndex: number
  regex: RegExp
}

const DUPLICATE_SERIALIZER_SUFFIX_PATTERN = /\|\d+$/u

const createSerializerMatcher = (
  markup: string,
  {
    idPattern,
  }: {
    idPattern?: string
  } = {}
): SerializerMatcher => {
  const hasDisplayPlaceholder = markup.includes(PLACEHOLDERS.display)

  return {
    displayGroupIndex: hasDisplayPlaceholder
      ? 1 + findPositionOfCapturingGroup(markup, 'display')
      : null,
    idGroupIndex: 1 + findPositionOfCapturingGroup(markup, 'id'),
    regex: markupToRegex(markup, { idPattern }),
  }
}

const createLegacyDuplicateMatcher = (markup: string): SerializerMatcher | null => {
  const suffixMatch = markup.match(DUPLICATE_SERIALIZER_SUFFIX_PATTERN)
  if (!suffixMatch || !markup.includes(PLACEHOLDERS.id)) {
    return null
  }

  const suffix = suffixMatch[0]
  const baseMarkup = markup.slice(0, -suffix.length)
  if (!baseMarkup.includes(PLACEHOLDERS.id)) {
    return null
  }

  // Accept legacy duplicate-trigger markup like @[Display](id|0) while keeping
  // the newer emitted format as @[Display](id)|0.
  const legacyMarkup = baseMarkup.replace(PLACEHOLDERS.id, `${PLACEHOLDERS.id}${suffix}`)

  return createSerializerMatcher(legacyMarkup, { idPattern: '([^)]*?)' })
}

const createMarkupSerializer = (markup: string): MentionSerializer => {
  const matchers = [createSerializerMatcher(markup)]
  const legacyDuplicateMatcher = createLegacyDuplicateMatcher(markup)
  if (legacyDuplicateMatcher !== null) {
    matchers.push(legacyDuplicateMatcher)
  }

  const insert: MentionSerializer['insert'] = ({ id, display }) => {
    return makeMentionsMarkup(markup, id, display)
  }

  const findAll: MentionSerializer['findAll'] = (value) => {
    const matches: MentionSerializerMatch[] = []
    const seenMatches = new Set<string>()

    for (const { displayGroupIndex, idGroupIndex, regex } of matchers) {
      const globalRegex = createInternalRegExp(regex.source, 'g')
      let match: RegExpExecArray | null

      while ((match = globalRegex.exec(value)) !== null) {
        const matchedMarkup = match[0]
        const idMatch = match[idGroupIndex]

        if (typeof idMatch !== 'string') {
          continue
        }

        const matchKey = `${match.index}:${matchedMarkup}`
        if (seenMatches.has(matchKey)) {
          continue
        }
        seenMatches.add(matchKey)

        const displayMatch =
          displayGroupIndex === null
            ? null
            : (match[displayGroupIndex] as string | undefined | null)

        matches.push({
          markup: matchedMarkup,
          index: match.index,
          id: idMatch,
          display: displayMatch ?? null,
        })
      }
    }

    return matches.toSorted(
      (left, right) => left.index - right.index || right.markup.length - left.markup.length
    )
  }

  return {
    id: markup,
    insert,
    findAll,
  }
}

export default createMarkupSerializer
