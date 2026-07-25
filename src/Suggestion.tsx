import React from 'react'
import { defaultClassNames } from './defaultClassNames'
import type {
  ClassNameJoiner,
  MentionRenderSuggestion,
  QueryInfo,
  SuggestionDataItem,
} from './types'
import joinClassNames from './utils/joinClassNames'
import { useEventCallback } from './utils/useEventCallback'

interface SuggestionProps<Extra extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string
  readonly focused?: boolean
  readonly index: number
  readonly onSelect: (suggestion: SuggestionDataItem<Extra>, queryInfo: QueryInfo) => void
  readonly onMouseEnter: (index: number, event: React.MouseEvent<HTMLLIElement>) => void
  readonly queryInfo: QueryInfo
  readonly query: string
  readonly renderSuggestion?: MentionRenderSuggestion<Extra> | null
  readonly suggestion: SuggestionDataItem<Extra>
  readonly className?: string
  readonly focusedClassName?: string
  readonly displayClassName?: string
  readonly highlightClassName?: string
  readonly unstyled?: boolean
  readonly mergeClassNames?: ClassNameJoiner
}

function SuggestionComponent<Extra extends Record<string, unknown> = Record<string, unknown>>({
  id,
  focused,
  index,
  onMouseEnter,
  onSelect,
  queryInfo,
  query,
  renderSuggestion,
  suggestion,
  className,
  focusedClassName,
  displayClassName,
  highlightClassName,
  unstyled = false,
  mergeClassNames = joinClassNames,
}: SuggestionProps<Extra>) {
  const isFocused = focused === true
  const itemClassName = mergeClassNames(
    unstyled ? undefined : defaultClassNames.suggestionItem,
    className,
    isFocused ? focusedClassName : undefined
  )
  const displayClassNameResolved = mergeClassNames(
    unstyled ? undefined : defaultClassNames.suggestionDisplay,
    displayClassName
  )
  const highlightClassNameResolved = mergeClassNames(
    unstyled ? undefined : defaultClassNames.suggestionHighlight,
    highlightClassName
  )

  const handleClick = useEventCallback((): void => {
    onSelect(suggestion, queryInfo)
  })

  const handleKeyDown = useEventCallback((event: React.KeyboardEvent<HTMLLIElement>): void => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    onSelect(suggestion, queryInfo)
  })

  const handleMouseEnter = useEventCallback((event: React.MouseEvent<HTMLLIElement>): void => {
    onMouseEnter(index, event)
  })

  const getDisplay = (): string => {
    const { id: suggestionId, display } = suggestion

    if (typeof display === 'string' && display.length > 0) {
      return display
    }

    return String(suggestionId)
  }

  const renderHighlightedDisplay = (display: string): React.ReactNode => {
    const highlights = suggestion.highlights

    return highlights === undefined || highlights.length === 0 ? (
      <span className={displayClassNameResolved}>{display}</span>
    ) : (
      <span className={displayClassNameResolved} key={`highlighted-display-${id}`}>
        {highlights.map((highlight, index) => (
          <React.Fragment key={`highlight-${highlight.start}-${highlight.end}`}>
            {display.slice(index > 0 ? highlights[index - 1].end : 0, highlight.start)}
            <b className={highlightClassNameResolved}>
              {display.slice(highlight.start, highlight.end)}
            </b>
          </React.Fragment>
        ))}
        {display.slice(highlights.at(-1)?.end ?? 0)}
      </span>
    )
  }

  const renderContent = (): React.ReactNode => {
    const display = getDisplay()
    const highlightedDisplay = renderHighlightedDisplay(display)

    return renderSuggestion
      ? renderSuggestion(suggestion, query, highlightedDisplay, index, isFocused)
      : highlightedDisplay
  }

  return (
    <li
      id={id}
      role="option"
      aria-selected={isFocused}
      className={itemClassName}
      data-slot="suggestion-item"
      data-focused={isFocused ? 'true' : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
    >
      {renderContent()}
    </li>
  )
}

const Suggestion = React.memo(SuggestionComponent) as typeof SuggestionComponent

export default Suggestion
