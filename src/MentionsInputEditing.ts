import type { MentionChildConfig } from './types'
import applyChangeToValue from './utils/applyChangeToValue'
import findStartOfMentionInPlainText from './utils/findStartOfMentionInPlainText'
import getPlainText from './utils/getPlainText'
import mapPlainTextIndex from './utils/mapPlainTextIndex'
import spliceString from './utils/spliceString'
import type { MentionValueSnapshot } from './MentionsInputDerived'
import { deriveMentionValueSnapshot } from './MentionsInputDerived'

export interface MarkupSelectionRange {
  safeSelectionStart: number
  safeSelectionEnd: number
  markupStartIndex: number
  markupEndIndex: number
}

export interface PasteResult<Extra extends Record<string, unknown> = Record<string, unknown>> {
  value: string
  snapshot: MentionValueSnapshot<Extra>
  nextSelectionStart: number
}

export interface CutResult<Extra extends Record<string, unknown> = Record<string, unknown>> {
  value: string
  snapshot: MentionValueSnapshot<Extra>
  nextSelectionStart: number
}

export type InsertTextResult<Extra extends Record<string, unknown> = Record<string, unknown>> =
  PasteResult<Extra>

export interface InputChangeResult<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> extends PasteResult<Extra> {
  nextSelectionEnd: number
  shouldRestoreSelection: boolean
}

export const getMarkupSelectionRange = <Extra extends Record<string, unknown>>(
  value: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>,
  selectionStart: number | null,
  selectionEnd: number | null
): MarkupSelectionRange => {
  const safeSelectionStart = selectionStart ?? 0
  const safeSelectionEnd = selectionEnd ?? safeSelectionStart

  return {
    safeSelectionStart,
    safeSelectionEnd,
    markupStartIndex: mapPlainTextIndex(value, config, safeSelectionStart, 'START') as number,
    markupEndIndex: mapPlainTextIndex(value, config, safeSelectionEnd, 'END') as number,
  }
}

export const applyInsertTextToMentionsValue = <Extra extends Record<string, unknown>>(
  value: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>,
  selectionStart: number | null,
  selectionEnd: number | null,
  text: string
): InsertTextResult<Extra> => {
  const { safeSelectionStart, markupStartIndex, markupEndIndex } = getMarkupSelectionRange(
    value,
    config,
    selectionStart,
    selectionEnd
  )
  const normalizedText = text.replaceAll('\r', '')
  const nextValue = spliceString(value, markupStartIndex, markupEndIndex, normalizedText)
  const snapshot = deriveMentionValueSnapshot<Extra>(nextValue, config)
  const startOfMention =
    selectionStart === null
      ? undefined
      : findStartOfMentionInPlainText(value, config, selectionStart)

  return {
    value: nextValue,
    snapshot,
    nextSelectionStart:
      (startOfMention ?? safeSelectionStart) + getPlainText(normalizedText, config).length,
  }
}

export const applyPasteToMentionsValue = <Extra extends Record<string, unknown>>(
  value: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>,
  selectionStart: number | null,
  selectionEnd: number | null,
  pastedText: string
): PasteResult<Extra> => {
  return applyInsertTextToMentionsValue(value, config, selectionStart, selectionEnd, pastedText)
}

export const applyCutToMentionsValue = <Extra extends Record<string, unknown>>(
  value: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>,
  selectionStart: number | null,
  selectionEnd: number | null
): CutResult<Extra> => {
  const { safeSelectionStart, markupStartIndex, markupEndIndex } = getMarkupSelectionRange(
    value,
    config,
    selectionStart,
    selectionEnd
  )
  const nextValue = [value.slice(0, markupStartIndex), value.slice(markupEndIndex)].join('')

  return {
    value: nextValue,
    snapshot: deriveMentionValueSnapshot<Extra>(nextValue, config),
    nextSelectionStart: safeSelectionStart,
  }
}

export const applyInputChangeToMentionsValue = <Extra extends Record<string, unknown>>(
  value: string,
  plainTextValue: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>,
  selectionStartBefore: number,
  selectionEndBefore: number,
  selectionEndAfter: number,
  trackedSelectionEnd: number | null,
  insertedText: string | null | undefined
): InputChangeResult<Extra> => {
  const nextValue = applyChangeToValue(
    value,
    plainTextValue,
    {
      selectionStartBefore,
      selectionEndBefore,
      selectionEndAfter,
    },
    config
  )
  const snapshot = deriveMentionValueSnapshot<Extra>(nextValue, config)

  let nextSelectionStart = selectionEndAfter
  let nextSelectionEnd = selectionEndAfter
  let shouldRestoreSelection = false

  const startOfMention = findStartOfMentionInPlainText(value, config, nextSelectionStart)

  if (
    startOfMention !== undefined &&
    trackedSelectionEnd !== null &&
    trackedSelectionEnd > startOfMention
  ) {
    nextSelectionStart = startOfMention + (insertedText?.length ?? 0)
    nextSelectionEnd = nextSelectionStart
    shouldRestoreSelection = true
  }

  return {
    value: nextValue,
    snapshot,
    nextSelectionStart,
    nextSelectionEnd,
    shouldRestoreSelection,
  }
}
