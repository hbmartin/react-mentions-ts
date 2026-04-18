import type { CSSProperties } from 'react'
import type {
  CaretCoordinates,
  InlineSuggestionPosition,
  InputElement,
  MentionsInputAnchorMode,
  SuggestionsPosition,
} from './types'

export interface PendingViewSync {
  restoreSelection: boolean
  syncScroll: boolean
  measureSuggestions: boolean
  measureInline: boolean
  recomputeHighlighter: boolean
}

export interface ViewSyncPatch {
  restoredSelection: boolean
  syncedScroll: boolean
  measuredSuggestions: boolean
  measuredInline: boolean
  recomputedHighlighter: boolean
}

export interface MentionsDomRefs {
  container: HTMLDivElement | null
  highlighter: HTMLDivElement | null
  input: InputElement | null
  suggestions: HTMLDivElement | null
}

interface SuggestionsPositionArgs {
  caretPosition: CaretCoordinates | null
  suggestionsPlacement: 'auto' | 'above' | 'below'
  anchorMode: MentionsInputAnchorMode
  resolvedPortalHost: Element | null
  suggestions: HTMLDivElement | null
  highlighter: HTMLDivElement | null
  container: HTMLDivElement | null
}

interface InlineSuggestionPositionArgs {
  highlighter: HTMLDivElement | null
}

interface HighlighterViewPatch {
  scrollLeft: number
  scrollTop: number
  height: string | null
  typography: Array<{ property: string; value: string }>
}

interface TextareaResizePatch {
  height: string
  overflowY: string
}

const TYPOGRAPHIC_STYLE_PROPS = [
  'font-family',
  'font-size',
  'font-style',
  'font-variant',
  'font-weight',
  'font-stretch',
  'font-feature-settings',
  'font-variation-settings',
  'letter-spacing',
  'line-height',
  'text-transform',
  'text-indent',
  'text-align',
  'word-spacing',
] as const

const EMPTY_TEXTAREA_RESIZE_PATCH: TextareaResizePatch = {
  height: '',
  overflowY: '',
}

export const createPendingViewSync = (): PendingViewSync => ({
  restoreSelection: false,
  syncScroll: false,
  measureSuggestions: false,
  measureInline: false,
  recomputeHighlighter: false,
})

export const hasPendingViewSync = (pendingViewSync: PendingViewSync): boolean =>
  pendingViewSync.restoreSelection ||
  pendingViewSync.syncScroll ||
  pendingViewSync.measureSuggestions ||
  pendingViewSync.measureInline ||
  pendingViewSync.recomputeHighlighter

export const mergePendingViewSync = (
  current: PendingViewSync,
  next: Partial<PendingViewSync>
): PendingViewSync => ({
  restoreSelection: current.restoreSelection || next.restoreSelection === true,
  syncScroll: current.syncScroll || next.syncScroll === true,
  measureSuggestions: current.measureSuggestions || next.measureSuggestions === true,
  measureInline: current.measureInline || next.measureInline === true,
  recomputeHighlighter: current.recomputeHighlighter || next.recomputeHighlighter === true,
})

export const createViewSyncPatch = (): ViewSyncPatch => ({
  restoredSelection: false,
  syncedScroll: false,
  measuredSuggestions: false,
  measuredInline: false,
  recomputedHighlighter: false,
})

export const isMobileSafari = (): boolean =>
  typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

export const getInputInlineStyle = (singleLine?: boolean): CSSProperties => {
  const style: CSSProperties = {
    background: 'transparent',
  }

  if (!singleLine && isMobileSafari()) {
    // iOS Safari shifts multiline textarea content relative to the mirrored overlay.
    style.marginTop = 1
    style.marginLeft = -3
  }

  return style
}

/**
 * Returns the computed length property value for the provided element.
 * Note: According to spec and testing, can count on length values coming back in pixels.
 */
export const getComputedStyleLengthProp = (forElement: Element, propertyName: string): number => {
  const view = forElement.ownerDocument.defaultView ?? globalThis
  const length = Number.parseFloat(
    view.getComputedStyle(forElement, null).getPropertyValue(propertyName)
  )
  return Number.isFinite(length) ? length : 0
}

export const calculateSuggestionsPosition = ({
  caretPosition,
  suggestionsPlacement,
  anchorMode,
  resolvedPortalHost,
  suggestions,
  highlighter,
  container,
}: SuggestionsPositionArgs): SuggestionsPosition | null => {
  if (!caretPosition || !suggestions || !highlighter || !container) {
    return null
  }

  const anchorToLeft = anchorMode === 'left'
  const caretOffsetParentRect = highlighter.getBoundingClientRect()
  const caretHeight = getComputedStyleLengthProp(highlighter, 'font-size')
  const viewportRelative = {
    left: caretOffsetParentRect.left + (anchorToLeft ? 0 : caretPosition.left),
    top: caretOffsetParentRect.top + caretPosition.top,
  }
  const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
  const desiredWidth = highlighter.offsetWidth

  const position: SuggestionsPosition = {}

  if (resolvedPortalHost) {
    const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
    const width = Math.min(desiredWidth, viewportWidth)
    position.width = width
    position.position = 'fixed'

    let { left, top } = viewportRelative
    left -= getComputedStyleLengthProp(suggestions, 'margin-left')
    top -= getComputedStyleLengthProp(suggestions, 'margin-top')

    if (!anchorToLeft) {
      left -= highlighter.scrollLeft
    }

    top -= highlighter.scrollTop

    const maxLeft = Math.max(0, viewportWidth - width)
    position.left = Math.min(maxLeft, Math.max(0, left))

    const shouldShowAboveCaret =
      suggestionsPlacement === 'above' ||
      (suggestionsPlacement === 'auto' &&
        top + suggestions.offsetHeight > viewportHeight &&
        suggestions.offsetHeight < top - caretHeight)

    position.top = shouldShowAboveCaret
      ? Math.max(0, top - suggestions.offsetHeight - caretHeight)
      : top

    return position
  }

  const containerWidth = container.offsetWidth
  const width = Math.min(desiredWidth, containerWidth)
  position.width = width

  const left = anchorToLeft ? 0 : caretPosition.left - highlighter.scrollLeft
  const top = caretPosition.top - highlighter.scrollTop

  if (anchorToLeft) {
    position.left = 0
  } else if (left + width > containerWidth) {
    position.right = 0
  } else {
    position.left = left
  }

  const shouldShowAboveCaret =
    suggestionsPlacement === 'above' ||
    (suggestionsPlacement === 'auto' &&
      viewportRelative.top - highlighter.scrollTop + suggestions.offsetHeight > viewportHeight &&
      suggestions.offsetHeight < viewportRelative.top - highlighter.scrollTop - caretHeight)

  position.top = shouldShowAboveCaret ? top - suggestions.offsetHeight - caretHeight : top

  return position
}

export const calculateInlineSuggestionPosition = ({
  highlighter,
}: InlineSuggestionPositionArgs): InlineSuggestionPosition | null => {
  if (!highlighter) {
    return null
  }

  const caretElement = highlighter.querySelector<HTMLSpanElement>('[data-mentions-caret]')
  const controlElement = highlighter.parentElement
  const controlRect = controlElement?.getBoundingClientRect()
  const caretRect = caretElement?.getBoundingClientRect()

  if (!caretRect || !controlRect) {
    return null
  }

  return {
    left: caretRect.left - controlRect.left,
    top: caretRect.top - controlRect.top,
  }
}

export const areSuggestionsPositionsEqual = (
  left: SuggestionsPosition,
  right: SuggestionsPosition
): boolean =>
  left.left === right.left &&
  left.right === right.right &&
  left.top === right.top &&
  left.width === right.width &&
  left.position === right.position

export const areInlineSuggestionPositionsEqual = (
  left: InlineSuggestionPosition | null,
  right: InlineSuggestionPosition | null
): boolean => left?.left === right?.left && left?.top === right?.top

export const getHighlighterViewPatch = (
  input: InputElement | null,
  highlighter: HTMLDivElement | null
): HighlighterViewPatch | null => {
  if (!input || !highlighter) {
    return null
  }

  const height = input.clientHeight ? `${input.clientHeight}px` : null
  let typography: Array<{ property: string; value: string }> = []
  if (typeof globalThis.getComputedStyle === 'function') {
    const computed = globalThis.getComputedStyle(input)
    typography = TYPOGRAPHIC_STYLE_PROPS.flatMap((property) => {
      const value =
        typeof computed.getPropertyValue === 'function'
          ? computed.getPropertyValue(property)
          : ((computed as unknown as Record<string, string | undefined>)[property] ?? '')

      return value ? [{ property, value }] : []
    })
  }

  return {
    scrollLeft: input.scrollLeft,
    scrollTop: input.scrollTop,
    height,
    typography,
  }
}

export const applyHighlighterViewPatch = (
  highlighter: HTMLDivElement | null,
  patch: HighlighterViewPatch | null
): boolean => {
  if (!highlighter || !patch) {
    return false
  }

  let didUpdate = false

  if (highlighter.scrollLeft !== patch.scrollLeft) {
    highlighter.scrollLeft = patch.scrollLeft
    didUpdate = true
  }

  if (highlighter.scrollTop !== patch.scrollTop) {
    highlighter.scrollTop = patch.scrollTop
    didUpdate = true
  }

  if (patch.height !== null && highlighter.style.height !== patch.height) {
    highlighter.style.height = patch.height
    didUpdate = true
  }

  for (const { property, value } of patch.typography) {
    if (highlighter.style.getPropertyValue(property) !== value) {
      highlighter.style.setProperty(property, value)
      didUpdate = true
    }
  }

  return didUpdate
}

export const getTextareaResizePatch = (
  input: InputElement | null,
  options: {
    singleLine?: boolean
    autoResize?: boolean
  }
): TextareaResizePatch | null => {
  const hasTextarea =
    typeof HTMLTextAreaElement !== 'undefined' && input instanceof HTMLTextAreaElement

  if (options.singleLine === true || options.autoResize !== true) {
    return hasTextarea ? EMPTY_TEXTAREA_RESIZE_PATCH : null
  }

  if (!hasTextarea) {
    return null
  }

  const element = input
  const previousHeight = element.style.height
  const previousOverflowY = element.style.overflowY
  element.style.height = 'auto'
  element.style.overflowY = 'hidden'
  let borderAdjustment = 0

  if (globalThis.window !== undefined && typeof globalThis.getComputedStyle === 'function') {
    const computed = globalThis.getComputedStyle(element)
    const parse = (value: string | null | undefined) => (value ? Number.parseFloat(value) || 0 : 0)
    borderAdjustment = parse(computed.borderTopWidth) + parse(computed.borderBottomWidth)
  }

  const nextHeight = element.scrollHeight + borderAdjustment
  element.style.height = previousHeight
  element.style.overflowY = previousOverflowY

  return {
    height: `${nextHeight}px`,
    overflowY: 'hidden',
  }
}

export const applyTextareaResizePatch = (
  input: InputElement | null,
  patch: TextareaResizePatch | null
): boolean => {
  if (
    !patch ||
    typeof HTMLTextAreaElement === 'undefined' ||
    !(input instanceof HTMLTextAreaElement)
  ) {
    return false
  }

  let didUpdate = false

  if (input.style.height !== patch.height) {
    input.style.height = patch.height
    didUpdate = true
  }

  if (input.style.overflowY !== patch.overflowY) {
    input.style.overflowY = patch.overflowY
    didUpdate = true
  }

  return didUpdate
}
