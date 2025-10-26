import type { MentionSelection } from '../types'

export const areMentionSelectionsEqual = <Extra extends Record<string, unknown>>(
  prevSelections: ReadonlyArray<MentionSelection<Extra>>,
  nextSelections: ReadonlyArray<MentionSelection<Extra>>
): boolean => {
  if (prevSelections.length !== nextSelections.length) {
    return false
  }

  return prevSelections.every((selection, index) => {
    const other = nextSelections[index]

    return (
      selection.id === other.id &&
      selection.childIndex === other.childIndex &&
      selection.plainTextStart === other.plainTextStart &&
      selection.plainTextEnd === other.plainTextEnd &&
      selection.selection === other.selection &&
      selection.serializerId === other.serializerId
    )
  })
}
