import type { CSSProperties } from 'react'

import joinClassNames from './joinClassNames'
import type { MentionsInputStyleConfig } from './types'

const visuallyHiddenStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  border: 0,
  margin: -1,
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
}

const coreStyles: MentionsInputStyleConfig = {
  mergeClassNames: joinClassNames,
  rootClassName: '',
  rootStyle: {
    position: 'relative',
    overflowY: 'visible',
  },
  controlClassName: '',
  controlStyle: {
    position: 'relative',
  },
  inputClassName: () => '',
  inputStyle: ({ singleLine }) => ({
    position: 'relative',
    display: 'block',
    width: '100%',
    margin: 0,
    boxSizing: 'border-box',
    color: 'inherit',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    letterSpacing: 'inherit',
    ...(singleLine === true
      ? {}
      : {
          height: '100%',
          overflow: 'hidden',
          resize: 'none',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
        }),
  }),
  inlineSuggestionClassName: '',
  inlineSuggestionStyle: {
    position: 'absolute',
    display: 'inline-block',
    pointerEvents: 'none',
    color: 'inherit',
    opacity: 0.8,
    whiteSpace: 'pre',
    zIndex: 2,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    letterSpacing: 'inherit',
  },
  inlineSuggestionTextClassName: '',
  inlineSuggestionTextStyle: {
    position: 'relative',
    display: 'inline-block',
    alignItems: 'baseline',
  },
  inlineSuggestionPrefixClassName: '',
  inlineSuggestionPrefixStyle: visuallyHiddenStyle,
  inlineSuggestionSuffixClassName: '',
  inlineSuggestionSuffixStyle: {
    whiteSpace: 'pre',
  },
  mention: {
    mergeClassNames: joinClassNames,
    className: '',
    requiredClassName: '',
    style: {
      display: 'inline',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      letterSpacing: 'inherit',
      fontWeight: 'inherit',
      color: 'transparent',
      padding: 0,
    },
  },
  highlighter: {
    mergeClassNames: joinClassNames,
    rootClassName: () => '',
    rootStyle: ({ singleLine }) => ({
      boxSizing: 'border-box',
      width: '100%',
      overflow: 'hidden',
      textAlign: 'start',
      color: 'transparent',
      pointerEvents: 'none',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      lineHeight: 'inherit',
      whiteSpace: singleLine ? 'pre' : 'pre-wrap',
      overflowWrap: singleLine ? 'normal' : 'break-word',
    }),
    substringClassName: '',
    caretClassName: '',
  },
  suggestionsOverlay: {
    mergeClassNames: joinClassNames,
    overlayClassName: '',
    overlayStyle: {
      zIndex: 100,
      width: '100%',
      minWidth: '16rem',
      border: '1px solid currentColor',
      background: 'Canvas',
      color: 'CanvasText',
    },
    listClassName: '',
    statusClassName: () => '',
    statusStyle: ({ type }) => ({
      padding: '0.625rem 1rem',
      textAlign: 'left',
      fontSize: '0.875rem',
      lineHeight: 1.625,
      color: type === 'error' ? 'crimson' : undefined,
    }),
    suggestion: {
      mergeClassNames: joinClassNames,
      itemClassName: '',
      itemStyle: {
        cursor: 'pointer',
        userSelect: 'none',
        padding: '0.5rem 0.75rem',
      },
      focusedItemStyle: {
        background: 'Highlight',
        color: 'HighlightText',
      },
      displayClassName: '',
      displayStyle: {
        display: 'inline-block',
      },
      highlightClassName: '',
      highlightStyle: {
        fontWeight: 600,
      },
    },
    loadingIndicator: {
      mergeClassNames: joinClassNames,
      containerClassName: '',
      screenReaderClassName: '',
      screenReaderStyle: visuallyHiddenStyle,
      spinnerClassName: '',
      spinnerButtonClassName: '',
      spinnerDotClassName: '',
      spinnerStyle: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      },
      spinnerButtonStyle: {
        appearance: 'none',
        border: 0,
        background: 'transparent',
        padding: 0,
      },
      spinnerDotStyle: {
        display: 'inline-block',
        width: '0.375rem',
        height: '0.375rem',
        borderRadius: '9999px',
        background: 'currentColor',
      },
    },
  },
}

export default coreStyles
