import type { MentionChildConfig } from '../types'
import getPlainText from './getPlainText'
import mapPlainTextIndex from './mapPlainTextIndex'
import spliceString from './spliceString'

interface SelectionChange {
  selectionStartBefore?: number | 'undefined'
  selectionEndBefore?: number | 'undefined'
  selectionEndAfter: number
}

interface ResolvedSelectionChange {
  selectionStartBefore: number
  selectionEndBefore: number
  selectionEndAfter: number
}

interface SpliceRange {
  insert: string
  spliceStart: number
  spliceEnd: number
}

const normalizeSelectionPoint = (value: number | 'undefined' | undefined): number | undefined => {
  if (value === 'undefined') {
    return undefined
  }
  return value
}

const ensureNumber = (value: number | null | undefined, fallback: number): number => {
  if (typeof value === 'number') {
    return value
  }
  return fallback
}

const resolveSelection = (
  selection: SelectionChange,
  oldPlainTextLength: number,
  plainTextLength: number
): ResolvedSelectionChange => {
  const selectionEndAfter = selection.selectionEndAfter
  const lengthDelta = oldPlainTextLength - plainTextLength
  const selectionStartBefore =
    normalizeSelectionPoint(selection.selectionStartBefore) ?? selectionEndAfter + lengthDelta
  const selectionEndBefore =
    normalizeSelectionPoint(selection.selectionEndBefore) ?? selectionStartBefore

  return { selectionStartBefore, selectionEndBefore, selectionEndAfter }
}

const isCollapsedSelection = ({
  selectionStartBefore,
  selectionEndBefore,
  selectionEndAfter,
}: ResolvedSelectionChange): boolean =>
  selectionStartBefore === selectionEndBefore && selectionEndBefore === selectionEndAfter

const hasNoEffectiveChange = (
  oldPlainTextValue: string,
  plainTextValue: string,
  selection: ResolvedSelectionChange
): boolean => oldPlainTextValue === plainTextValue && isCollapsedSelection(selection)

const shouldAdjustForCombinedCharacters = (
  oldPlainTextValue: string,
  plainTextValue: string,
  selection: ResolvedSelectionChange
): boolean =>
  isCollapsedSelection(selection) &&
  oldPlainTextValue.length === plainTextValue.length &&
  oldPlainTextValue !== plainTextValue

const adjustSelectionForCombinedCharacters = ({
  selectionStartBefore,
  selectionEndBefore,
  selectionEndAfter,
}: ResolvedSelectionChange): ResolvedSelectionChange => ({
  selectionStartBefore: Math.max(0, selectionStartBefore - 1),
  selectionEndBefore: Math.max(0, selectionEndBefore - 1),
  selectionEndAfter,
})

const getSpliceRange = (
  plainTextValue: string,
  selection: ResolvedSelectionChange,
  lengthDelta: number
): SpliceRange => {
  const { selectionStartBefore, selectionEndBefore, selectionEndAfter } = selection
  const spliceStart = Math.min(selectionStartBefore, selectionEndAfter)
  const spliceEnd =
    selectionStartBefore === selectionEndAfter
      ? Math.max(selectionEndBefore, selectionStartBefore + lengthDelta)
      : selectionEndBefore

  return {
    insert: plainTextValue.slice(selectionStartBefore, selectionEndAfter),
    spliceStart,
    spliceEnd,
  }
}

const getMismatchRecoveryRange = (
  oldPlainTextValue: string,
  plainTextValue: string
): SpliceRange => {
  let spliceStart = 0
  while (
    spliceStart < plainTextValue.length &&
    spliceStart < oldPlainTextValue.length &&
    plainTextValue[spliceStart] === oldPlainTextValue[spliceStart]
  ) {
    spliceStart++
  }

  let spliceEndOfNew = plainTextValue.length
  let spliceEndOfOld = oldPlainTextValue.length
  while (
    spliceEndOfNew > spliceStart &&
    spliceEndOfOld > spliceStart &&
    plainTextValue[spliceEndOfNew - 1] === oldPlainTextValue[spliceEndOfOld - 1]
  ) {
    spliceEndOfNew--
    spliceEndOfOld--
  }

  return {
    insert: plainTextValue.slice(spliceStart, spliceEndOfNew),
    spliceStart,
    spliceEnd: spliceEndOfOld,
  }
}

const applySpliceRange = <Extra extends Record<string, unknown> = Record<string, unknown>>(
  value: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>,
  spliceRange: SpliceRange
): { newValue: string; willRemoveMention: boolean } => {
  const { insert, spliceStart, spliceEnd } = spliceRange
  const mappedSpliceStart = ensureNumber(
    mapPlainTextIndex<Extra>(value, config, spliceStart, 'START'),
    value.length
  )
  const mappedSpliceEnd = ensureNumber(
    mapPlainTextIndex<Extra>(value, config, spliceEnd, 'END'),
    value.length
  )
  const controlSpliceStart = mapPlainTextIndex<Extra>(value, config, spliceStart, 'NULL')
  const controlSpliceEnd = mapPlainTextIndex<Extra>(value, config, spliceEnd, 'NULL')

  return {
    newValue: spliceString(value, mappedSpliceStart, mappedSpliceEnd, insert),
    willRemoveMention: controlSpliceStart === null || controlSpliceEnd === null,
  }
}

// Applies a change from the plain text textarea to the underlying marked up value
// guided by the textarea text selection ranges before and after the change
const applyChangeToValue = <Extra extends Record<string, unknown> = Record<string, unknown>>(
  value: string,
  plainTextValue: string,
  selection: SelectionChange,
  config: ReadonlyArray<MentionChildConfig<Extra>>
): string => {
  const oldPlainTextValue = getPlainText<Extra>(value, config)
  const lengthDelta = oldPlainTextValue.length - plainTextValue.length
  let resolvedSelection = resolveSelection(
    selection,
    oldPlainTextValue.length,
    plainTextValue.length
  )

  if (hasNoEffectiveChange(oldPlainTextValue, plainTextValue, resolvedSelection)) {
    return value
  }

  // Fixes an issue with replacing combined characters for complex input. Eg like accented letters on OSX
  if (shouldAdjustForCombinedCharacters(oldPlainTextValue, plainTextValue, resolvedSelection)) {
    resolvedSelection = adjustSelectionForCombinedCharacters(resolvedSelection)
  }

  const initialSpliceRange = getSpliceRange(plainTextValue, resolvedSelection, lengthDelta)
  const { newValue, willRemoveMention } = applySpliceRange(value, config, initialSpliceRange)

  if (willRemoveMention) {
    return newValue
  }

  // test for auto-completion changes
  const controlPlainTextValue = getPlainText<Extra>(newValue, config)
  if (controlPlainTextValue === plainTextValue) {
    return newValue
  }

  // some auto-correction is going on
  const mismatchRecoveryRange = getMismatchRecoveryRange(oldPlainTextValue, plainTextValue)

  return applySpliceRange(value, config, mismatchRecoveryRange).newValue
}

export default applyChangeToValue
