import React from 'react'
import { getSubstringIndex } from './utils'
import { cn } from './utils/cn'
import type { MentionRenderSuggestion, SuggestionDataItem } from './types'

interface SuggestionProps<Extra extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string
  readonly focused?: boolean
  readonly ignoreAccents?: boolean
  readonly index: number
  readonly onClick: () => void
  readonly onMouseEnter: () => void
  readonly query: string
  readonly renderSuggestion?: MentionRenderSuggestion<Extra> | null
  readonly suggestion: SuggestionDataItem<Extra>
  readonly className?: string
  readonly focusedClassName?: string
}

const suggestionItemBase = 'cursor-pointer'
const suggestionDisplayStyles = 'inline-block'
const suggestionHighlightStyles = ''

function Suggestion<Extra extends Record<string, unknown> = Record<string, unknown>>({
  id,
  focused,
  ignoreAccents,
  index,
  onClick,
  onMouseEnter,
  query,
  renderSuggestion,
  suggestion,
  className,
  focusedClassName,
}: SuggestionProps<Extra>) {
  const rest = { onClick, onMouseEnter }
  const itemClassName = cn(suggestionItemBase, className, focused ? focusedClassName : undefined)

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
      return <span className={suggestionDisplayStyles}>{display}</span>
    }

    return (
      <span className={suggestionDisplayStyles}>
        {display.slice(0, indexOfMatch)}
        <b className={suggestionHighlightStyles}>
          {display.slice(indexOfMatch, indexOfMatch + query.length)}
        </b>
        {display.slice(indexOfMatch + query.length)}
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
    <li
      id={id}
      role="option"
      aria-selected={focused}
      className={itemClassName}
      data-slot="suggestion-item"
      data-focused={focused ? 'true' : undefined}
      {...rest}
    >
      {renderContent()}
    </li>
  )
}

export default Suggestion
