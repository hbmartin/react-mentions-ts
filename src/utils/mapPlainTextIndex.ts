import type { MentionChildConfig } from '../types'
import iterateMentionsMarkup from './iterateMentionsMarkup'

export type InMarkupCorrection = 'START' | 'END' | 'NULL'

export interface PlainTextIndexMappingRequest {
  indexInPlainText: number | null | undefined
  inMarkupCorrection?: InMarkupCorrection
}

interface PendingPlainTextIndexMapping {
  indexInPlainText: number
  inMarkupCorrection: InMarkupCorrection
  resultIndex: number
}

export const mapPlainTextIndices = <
  Extra extends Record<string, unknown> = Record<string, unknown>,
>(
  value: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>,
  requests: ReadonlyArray<PlainTextIndexMappingRequest>
): Array<number | null | undefined> => {
  const results: Array<number | null | undefined> = requests.map(({ indexInPlainText }) =>
    typeof indexInPlainText === 'number' ? undefined : indexInPlainText
  )
  const pendingMappings = requests
    .map(({ indexInPlainText, inMarkupCorrection }, resultIndex) =>
      typeof indexInPlainText === 'number'
        ? {
            indexInPlainText,
            inMarkupCorrection: inMarkupCorrection ?? 'START',
            resultIndex,
          }
        : null
    )
    .filter((mapping): mapping is PendingPlainTextIndexMapping => mapping !== null)
    .toSorted((left, right) => left.indexInPlainText - right.indexInPlainText)

  if (pendingMappings.length === 0) {
    return results
  }

  let pendingIndex = 0

  const textIteratee = (substr: string, index: number, substrPlainTextIndex: number): void => {
    while (
      pendingIndex < pendingMappings.length &&
      pendingMappings[pendingIndex].indexInPlainText <= substrPlainTextIndex + substr.length
    ) {
      const mapping = pendingMappings[pendingIndex]
      results[mapping.resultIndex] = index + mapping.indexInPlainText - substrPlainTextIndex
      pendingIndex += 1
    }
  }

  const markupIteratee = (
    markup: string,
    index: number,
    mentionPlainTextIndex: number,
    _id: string,
    display: string
  ): void => {
    while (
      pendingIndex < pendingMappings.length &&
      pendingMappings[pendingIndex].indexInPlainText < mentionPlainTextIndex + display.length
    ) {
      const mapping = pendingMappings[pendingIndex]
      results[mapping.resultIndex] =
        mapping.inMarkupCorrection === 'NULL'
          ? null
          : index + (mapping.inMarkupCorrection === 'END' ? markup.length : 0)
      pendingIndex += 1
    }
  }

  iterateMentionsMarkup(value, config, markupIteratee, textIteratee)

  while (pendingIndex < pendingMappings.length) {
    const mapping = pendingMappings[pendingIndex]
    results[mapping.resultIndex] = value.length
    pendingIndex += 1
  }

  return results
}

// For the passed character index in the plain text string, returns the corresponding index
// in the marked up value string.
// If the passed character index lies inside a mention, the value of `inMarkupCorrection` defines the
// correction to apply:
//   - 'START' to return the index of the mention markup's first char (default)
//   - 'END' to return the index after its last char
//   - 'NULL' to return null
const mapPlainTextIndex = <Extra extends Record<string, unknown> = Record<string, unknown>>(
  value: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>,
  indexInPlainText: number | null | undefined,
  inMarkupCorrection: InMarkupCorrection = 'START'
): number | null | undefined => {
  return mapPlainTextIndices(value, config, [{ indexInPlainText, inMarkupCorrection }])[0]
}

export default mapPlainTextIndex
