import type { CSSProperties } from 'react'

/**
 * Structural inline styles applied unconditionally, with or without the
 * default Tailwind classes. Only properties that the mention machinery
 * relies on belong here: overlay mirroring, caret measurement, font-metric
 * parity between the input and the highlighter, and visually-hidden
 * accessibility text. Purely visual defaults live in defaultClassNames.ts
 * (Tailwind) and styles/default.css (plain CSS) instead, so they stay
 * overridable from user stylesheets.
 */

export const visuallyHiddenStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  border: 0,
  margin: -1,
  clipPath: 'inset(50%)',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
}

export const rootStructuralStyle: CSSProperties = {
  position: 'relative',
}

export const controlStructuralStyle: CSSProperties = {
  position: 'relative',
}

/*
 * Box-model properties (width, height, margin, box-sizing, overflow, resize)
 * deliberately stay OUT of the inline structural styles: on master they were
 * utility classes, so consumer classes could override them — inlining them
 * would silently win those fights. They live in the default Tailwind classes
 * and in styles/default.css instead; both are class-level and overridable.
 */
const inputStructuralBase: CSSProperties = {
  position: 'relative',
  display: 'block',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  letterSpacing: 'inherit',
}

const inputStructuralMultiline: CSSProperties = {
  ...inputStructuralBase,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
}

export const getInputStructuralStyle = (singleLine: boolean): CSSProperties =>
  singleLine ? inputStructuralBase : inputStructuralMultiline

const highlighterStructuralBase: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 0,
  textAlign: 'start',
  color: 'transparent',
  pointerEvents: 'none',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  lineHeight: 'inherit',
}

const highlighterStructuralSingleLine: CSSProperties = {
  ...highlighterStructuralBase,
  whiteSpace: 'pre',
  overflowWrap: 'normal',
}

const highlighterStructuralMultiline: CSSProperties = {
  ...highlighterStructuralBase,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
}

export const getHighlighterStructuralStyle = (singleLine: boolean): CSSProperties =>
  singleLine ? highlighterStructuralSingleLine : highlighterStructuralMultiline

export const highlighterSubstringStructuralStyle: CSSProperties = {
  display: 'inline',
  color: 'transparent',
  whiteSpace: 'inherit',
}

export const highlighterCaretStructuralStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-block',
  height: 0,
  width: 0,
  verticalAlign: 'baseline',
}

export const mentionStructuralStyle: CSSProperties = {
  display: 'inline',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  letterSpacing: 'inherit',
  fontWeight: 'inherit',
  color: 'transparent',
  padding: 0,
}

export const inlineSuggestionStructuralStyle: CSSProperties = {
  position: 'absolute',
  display: 'inline-block',
  pointerEvents: 'none',
  whiteSpace: 'pre',
  zIndex: 2,
  fontFamily: 'inherit',
  fontSize: 'inherit',
  letterSpacing: 'inherit',
}

export const inlineSuggestionTextStructuralStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-block',
}

export const inlineSuggestionSuffixStructuralStyle: CSSProperties = {
  whiteSpace: 'pre',
}
