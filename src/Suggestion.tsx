import React from 'react'
import { cva } from 'class-variance-authority'
import { getSubstringIndex } from './utils'
import { cn } from './utils/cn'
import type { MentionRenderSuggestion, SuggestionDataItem } from './types'

interface SuggestionProps {
  readonly id: string
  readonly focused?: boolean
  readonly ignoreAccents?: boolean
  readonly index: number
  readonly onClick: () => void
  readonly onMouseEnter: () => void
  readonly query: string
  readonly renderSuggestion?: MentionRenderSuggestion | null
  readonly suggestion: SuggestionDataItem | string
  readonly className?: string
  readonly focusedClassName?: string
  readonly displayClassName?: string
  readonly highlightClassName?: string
}

const suggestionItemStyles = cva('cursor-pointer', {
  variants: {
    focused: {
      true: '',
      false: '',
    },
  },
})

const suggestionDisplayStyles = 'inline-block'
const suggestionHighlightStyles = ''

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
  className,
  focusedClassName,
  displayClassName,
  highlightClassName,
}: SuggestionProps) {
  const rest = { onClick, onMouseEnter }
  const itemClassName = cn(
    suggestionItemStyles({ focused: Boolean(focused) }),
    className,
    focused ? focusedClassName : undefined
  )
  const displayClassNameResolved = cn(suggestionDisplayStyles, displayClassName)
  const highlightClassNameResolved = cn(suggestionHighlightStyles, highlightClassName)

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
      return <span className={displayClassNameResolved}>{display}</span>
    }

    return (
      <span className={displayClassNameResolved}>
        {display.slice(0, indexOfMatch)}
        <b className={highlightClassNameResolved}>
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
