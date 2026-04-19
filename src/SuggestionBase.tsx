import React from 'react'
import type { MentionRenderSuggestion, SuggestionDataItem } from './types'
import type { SuggestionStyleConfig } from './styles/types'
import mergeStyles from './styles/mergeStyles'

export interface SuggestionProps<Extra extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string
  readonly focused?: boolean
  readonly index: number
  readonly onClick: () => void
  readonly onMouseEnter: () => void
  readonly query: string
  readonly renderSuggestion?: MentionRenderSuggestion<Extra> | null
  readonly suggestion: SuggestionDataItem<Extra>
  readonly className?: string
  readonly focusedClassName?: string
  readonly displayClassName?: string
  readonly highlightClassName?: string
  readonly styles: SuggestionStyleConfig
}

function SuggestionBase<Extra extends Record<string, unknown> = Record<string, unknown>>({
  id,
  focused,
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
  styles,
}: SuggestionProps<Extra>) {
  const rest = { onClick, onMouseEnter }
  const isFocused = focused === true
  const itemClassName = styles.mergeClassNames(
    styles.itemClassName,
    className,
    isFocused ? styles.focusedItemClassName : undefined,
    isFocused ? focusedClassName : undefined
  )
  const displayClassNameResolved = styles.mergeClassNames(styles.displayClassName, displayClassName)
  const highlightClassNameResolved = styles.mergeClassNames(
    styles.highlightClassName,
    highlightClassName
  )

  const getDisplay = (): string => {
    const { id: suggestionId, display } = suggestion

    if (typeof display === 'string' && display.length > 0) {
      return display
    }

    return String(suggestionId)
  }

  const renderHighlightedDisplay = (display: string): React.ReactNode => {
    return suggestion.highlights === undefined || suggestion.highlights.length === 0 ? (
      <span className={displayClassNameResolved} style={styles.displayStyle}>
        {display}
      </span>
    ) : (
      <span
        className={displayClassNameResolved}
        key={`highlighted-display-${id}`}
        style={styles.displayStyle}
      >
        {suggestion.highlights.map((highlight, index) => (
          <React.Fragment key={`highlight-${highlight.start}-${highlight.end}`}>
            {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              display.slice(index > 0 ? suggestion.highlights![index - 1].end : 0, highlight.start)
            }
            <b className={highlightClassNameResolved} style={styles.highlightStyle}>
              {display.slice(highlight.start, highlight.end)}
            </b>
          </React.Fragment>
        ))}
        {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          display.slice(suggestion.highlights.at(-1)!.end)
        }
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
      style={mergeStyles(styles.itemStyle, isFocused ? styles.focusedItemStyle : undefined)}
      data-slot="suggestion-item"
      data-focused={isFocused ? 'true' : undefined}
      {...rest}
    >
      {renderContent()}
    </li>
  )
}

export default SuggestionBase
