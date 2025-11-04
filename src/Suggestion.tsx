import React from 'react'
import { cn } from './utils'
import type { MentionRenderSuggestion, SuggestionDataItem } from './types'

interface SuggestionProps<Extra extends Record<string, unknown> = Record<string, unknown>> {
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
}

const suggestionItemBase =
  'flex w-full cursor-pointer select-none items-center gap-2 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted data-[focused=true]:bg-primary/10 data-[focused=true]:text-primary'
const suggestionDisplayStyles = 'inline-flex items-center gap-2'
const suggestionHighlightStyles = 'font-semibold text-primary'

function Suggestion<Extra extends Record<string, unknown> = Record<string, unknown>>({
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
}: SuggestionProps<Extra>) {
  const rest = { onClick, onMouseEnter }
  const itemClassName = cn(suggestionItemBase, className, focused ? focusedClassName : undefined)
  const displayClassNameResolved = cn(suggestionDisplayStyles, displayClassName)
  const highlightClassNameResolved = cn(suggestionHighlightStyles, highlightClassName)

  const getDisplay = (): string => {
    const { id: suggestionId, display } = suggestion

    if (typeof display === 'string' && display.length > 0) {
      return display
    }

    return String(suggestionId)
  }

  const renderHighlightedDisplay = (display: string): React.ReactNode => {
    if (suggestion.highlights === undefined || suggestion.highlights.length === 0) {
      return <span className={displayClassNameResolved}>{display}</span>
    }

    return (
      <span className={displayClassNameResolved} key={`highlighted-display-${id}`}>
        {suggestion.highlights.map((highlight, index) => (
          <React.Fragment key={`highlight-${highlight.start}-${highlight.end}`}>
            {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              display.slice(index > 0 ? suggestion.highlights![index - 1].end : 0, highlight.start)
            }
            <b className={highlightClassNameResolved}>
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
      ? renderSuggestion(suggestion, query, highlightedDisplay, index, Boolean(focused))
      : highlightedDisplay
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
