import type {
  MentionChildConfig,
  MentionOccurrence,
  MentionSelection,
  MentionSelectionState,
} from './types'

export interface MentionSelectionComputation<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> {
  selections: MentionSelection<Extra>[]
  selectionMap: Record<string, MentionSelectionState>
}

export const getMentionSelectionKey = (childIndex: number, plainTextIndex: number): string =>
  `${childIndex}:${plainTextIndex}`

export const areMentionOccurrencesEqual = <Extra extends Record<string, unknown>>(
  prevMentions: ReadonlyArray<MentionOccurrence<Extra>>,
  nextMentions: ReadonlyArray<MentionOccurrence<Extra>>
): boolean => {
  if (prevMentions.length !== nextMentions.length) {
    return false
  }

  return prevMentions.every((mention, index) => {
    const other = nextMentions[index]

    return (
      mention.id === other.id &&
      mention.childIndex === other.childIndex &&
      mention.index === other.index &&
      mention.plainTextIndex === other.plainTextIndex &&
      mention.display === other.display
    )
  })
}

export const computeMentionSelectionDetails = <Extra extends Record<string, unknown>>(
  mentions: ReadonlyArray<MentionOccurrence<Extra>>,
  config: ReadonlyArray<MentionChildConfig<Extra>>,
  selectionStart: number | null,
  selectionEnd: number | null
): MentionSelectionComputation<Extra> => {
  if (selectionStart === null || selectionEnd === null || mentions.length === 0) {
    return { selections: [], selectionMap: {} }
  }

  const start = Math.min(selectionStart, selectionEnd)
  const end = Math.max(selectionStart, selectionEnd)
  const isCollapsed = start === end
  const selections: MentionSelection<Extra>[] = []
  const selectionMap: Record<string, MentionSelectionState> = {}

  for (const mention of mentions) {
    const mentionStart = mention.plainTextIndex
    const mentionEnd = mentionStart + mention.display.length
    let selectionState: MentionSelectionState | null = null

    if (isCollapsed) {
      if (start > mentionStart && start < mentionEnd) {
        selectionState = 'inside'
      } else if (start === mentionStart || start === mentionEnd) {
        selectionState = 'boundary'
      }
    } else if (start < mentionEnd && end > mentionStart) {
      selectionState = start <= mentionStart && end >= mentionEnd ? 'full' : 'partial'
    }

    if (selectionState === null) {
      continue
    }

    const serializerId = config[mention.childIndex]?.serializer.id ?? ''
    selections.push({
      ...mention,
      selection: selectionState,
      plainTextStart: mentionStart,
      plainTextEnd: mentionEnd,
      serializerId,
    })
    selectionMap[getMentionSelectionKey(mention.childIndex, mention.plainTextIndex)] =
      selectionState
  }

  return { selections, selectionMap }
}

export const getMentionSelectionMap = <Extra extends Record<string, unknown>>(
  mentions: ReadonlyArray<MentionOccurrence<Extra>>,
  config: ReadonlyArray<MentionChildConfig<Extra>>,
  selectionStart: number | null,
  selectionEnd: number | null
): Record<string, MentionSelectionState> =>
  computeMentionSelectionDetails(mentions, config, selectionStart, selectionEnd).selectionMap
