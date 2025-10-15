// @ts-nocheck
import React from 'react'
import { defaultStyle } from './utils'
import { getSubstringIndex } from './utils'
import type { MentionRenderSuggestion, SuggestionDataItem } from './types'

interface SuggestionProps {
  id: string
  focused?: boolean
  ignoreAccents?: boolean
  index: number
  onClick: () => void
  onMouseEnter: () => void
  query: string
  renderSuggestion?: MentionRenderSuggestion | null
  suggestion: SuggestionDataItem | string
  style: any
  className?: string
  classNames?: unknown
}

function Suggestion({
  id,
  focused,
  ignoreAccents,
  index,
  onClick,
  onMouseEnter,
  query,
  renderSuggestion,
  suggestion,
  style,
}: SuggestionProps) {
  const rest = { onClick, onMouseEnter }

  const renderContent = () => {
    let display = getDisplay()
    let highlightedDisplay = renderHighlightedDisplay(display, query)

    if (renderSuggestion) {
      return renderSuggestion(
        suggestion,
        query,
        highlightedDisplay,
        index,
        focused
      )
    }

    return highlightedDisplay
  }

  const getDisplay = () => {
    if (typeof suggestion === 'string') {
      return suggestion
    }

    let { id, display } = suggestion

    if (id === undefined || !display) {
      return id
    }

    return display
  }

  const renderHighlightedDisplay = (display) => {
    let i = getSubstringIndex(display, query, ignoreAccents)

    if (i === -1) {
      return <span {...style('display')}>{display}</span>
    }

    return (
      <span {...style('display')}>
        {display.substring(0, i)}
        <b {...style('highlight')}>{display.substring(i, i + query.length)}</b>
        {display.substring(i + query.length)}
      </span>
    )
  }

  return (
    <li id={id} role="option" aria-selected={focused} {...rest} {...style}>
      {renderContent()}
    </li>
  )
}

const styled = defaultStyle(
  {
    cursor: 'pointer',
  },
  (props) => ({ '&focused': props.focused })
)

export default styled(Suggestion)
