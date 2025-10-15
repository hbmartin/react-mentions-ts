import React from 'react'
import { defaultStyle, getSubstringIndex } from './utils'
import type { ClassNamesProp, MentionRenderSuggestion, Substyle, SuggestionDataItem } from './types'

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
  style: Substyle
  className?: string
  classNames?: ClassNamesProp
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

  const getDisplay = (): string => {
    if (typeof suggestion === 'string') {
      return suggestion
    }

    const { id: suggestionId, display } = suggestion

    if (typeof display === 'string' && display.length > 0) {
      return display
    }

    return String(suggestionId)
  }

  const renderHighlightedDisplay = (display: string): React.ReactNode => {
    const indexOfMatch = getSubstringIndex(display, query, ignoreAccents)

    if (indexOfMatch === -1) {
      return <span {...style('display')}>{display}</span>
    }

    return (
      <span {...style('display')}>
        {display.slice(0, Math.max(0, indexOfMatch))}
        <b {...style('highlight')}>
          {display.substring(indexOfMatch, indexOfMatch + query.length)}
        </b>
        {display.slice(Math.max(0, indexOfMatch + query.length))}
      </span>
    )
  }

  const renderContent = (): React.ReactNode => {
    const display = getDisplay()
    const highlightedDisplay = renderHighlightedDisplay(display)

    if (renderSuggestion) {
      return renderSuggestion(suggestion, query, highlightedDisplay, index, Boolean(focused))
    }

    return highlightedDisplay
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
  (props: Pick<SuggestionProps, 'focused'>) => ({
    '&focused': Boolean(props.focused),
  })
)

export default styled(Suggestion)
