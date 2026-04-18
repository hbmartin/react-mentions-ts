import type { MentionSerializer, MentionSerializerMatch } from '../types'
import findPositionOfCapturingGroup from '../utils/findPositionOfCapturingGroup'
import makeMentionsMarkup from '../utils/makeMentionsMarkup'
import markupToRegex from '../utils/markupToRegex'
import PLACEHOLDERS from '../utils/placeholders'

const createMarkupSerializer = (markup: string): MentionSerializer => {
  const baseRegex = markupToRegex(markup)
  const hasDisplayPlaceholder = markup.includes(PLACEHOLDERS.display)
  const idGroupIndex = 1 + findPositionOfCapturingGroup(markup, 'id')
  const displayGroupIndex = hasDisplayPlaceholder
    ? 1 + findPositionOfCapturingGroup(markup, 'display')
    : null

  const insert: MentionSerializer['insert'] = ({ id, display }) => {
    return makeMentionsMarkup(markup, id, display)
  }

  const findAll: MentionSerializer['findAll'] = (value) => {
    const globalRegex = new RegExp(baseRegex.source, 'g')
    const matches: MentionSerializerMatch[] = []
    let match: RegExpExecArray | null

    while ((match = globalRegex.exec(value)) !== null) {
      const matchedMarkup = match[0]
      const idMatch = match[idGroupIndex]

      if (typeof idMatch !== 'string') {
        continue
      }

      const displayMatch =
        displayGroupIndex === null ? null : (match[displayGroupIndex] as string | undefined | null)

      matches.push({
        markup: matchedMarkup,
        index: match.index,
        id: idMatch,
        display: displayMatch ?? null,
      })
    }

    return matches
  }

  return {
    id: markup,
    insert,
    findAll,
  }
}

export default createMarkupSerializer
