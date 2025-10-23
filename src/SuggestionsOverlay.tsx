import React, { Children, useLayoutEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { cva } from 'class-variance-authority'
import LoadingIndicator from './LoadingIndicator'
import { DEFAULT_MENTION_PROPS } from './MentionDefaultProps'
import Suggestion from './Suggestion'
import { getSuggestionHtmlId } from './utils'
import { cn } from './utils/cn'
import type {
  MentionComponentProps,
  MentionRenderSuggestion,
  QueryInfo,
  SuggestionDataItem,
  SuggestionsMap,
} from './types'

interface SuggestionsOverlayProps {
  readonly id: string
  readonly suggestions?: SuggestionsMap
  readonly a11ySuggestionsListLabel?: string
  readonly focusIndex: number
  readonly position?: 'absolute' | 'fixed'
  readonly left?: number
  readonly right?: number
  readonly top?: number
  readonly width?: number
  readonly scrollFocusedIntoView?: boolean
  readonly isLoading?: boolean
  readonly isOpened: boolean
  readonly onSelect?: (suggestion: SuggestionDataItem | string, queryInfo: QueryInfo) => void
  readonly ignoreAccents?: boolean
  readonly containerRef?: (node: HTMLDivElement | null) => void
  readonly children: React.ReactNode
  readonly className?: string
  readonly listClassName?: string
  readonly itemClassName?: string
  readonly focusedItemClassName?: string
  readonly displayClassName?: string
  readonly highlightClassName?: string
  readonly loadingClassName?: string
  readonly spinnerClassName?: string
  readonly spinnerElementClassName?: string
  readonly style?: CSSProperties
  readonly customSuggestionsContainer?: (node: React.ReactElement) => React.ReactElement
  readonly onMouseDown?: (event: React.MouseEvent<HTMLDivElement>) => void
  readonly onMouseEnter?: (index: number) => void
}

const overlayStyles = cva('z-[100] mt-[14px] min-w-[100px] bg-white')
const listStyles = 'm-0 list-none p-0'

function SuggestionsOverlay({
  id,
  suggestions = {},
  a11ySuggestionsListLabel,
  focusIndex,
  position,
  left,
  right,
  top,
  width,
  scrollFocusedIntoView = true,
  isLoading,
  isOpened,
  onSelect,
  ignoreAccents,
  containerRef,
  children,
  className,
  listClassName,
  itemClassName,
  focusedItemClassName,
  displayClassName,
  highlightClassName,
  loadingClassName,
  spinnerClassName,
  spinnerElementClassName,
  style: styleProp,
  customSuggestionsContainer,
  onMouseDown,
  onMouseEnter,
}: SuggestionsOverlayProps) {
  const [ulElement, setUlElement] = useState<HTMLUListElement | null>(null)
  const childRenderSuggestions: (MentionRenderSuggestion | null)[] = useMemo(
    () =>
      Children.toArray(children).map((child) =>
        React.isValidElement<MentionComponentProps>(child) &&
        typeof child.props.renderSuggestion === 'function'
          ? child.props.renderSuggestion
          : null
      ),
    [children]
  )

  useLayoutEffect(() => {
    if (!ulElement || ulElement.offsetHeight >= ulElement.scrollHeight || !scrollFocusedIntoView) {
      return
    }

    const focusedChild = ulElement.children.item(focusIndex)
    if (!focusedChild) {
      return
    }

    const { top: topContainer } = ulElement.getBoundingClientRect()
    const childRect = focusedChild.getBoundingClientRect()
    const scrollTop = ulElement.scrollTop
    const childTop = childRect.top - topContainer + scrollTop
    const childBottom = childRect.bottom - topContainer + scrollTop

    if (childTop < scrollTop) {
      ulElement.scrollTop = childTop
    } else if (childBottom > scrollTop + ulElement.offsetHeight) {
      ulElement.scrollTop = childBottom - ulElement.offsetHeight
    }
  }, [focusIndex, scrollFocusedIntoView, ulElement])

  const overlayClassName = cn(overlayStyles(), className)
  const listClassNameResolved = cn(listStyles, listClassName)

  const selectSuggestion = (suggestionItem: SuggestionDataItem | string, queryInfo: QueryInfo) => {
    onSelect?.(suggestionItem, queryInfo)
  }

  const handleMouseEnter = (index: number) => {
    onMouseEnter?.(index)
  }

  const getSuggestionId = (suggestionItem: SuggestionDataItem | string) => {
    if (typeof suggestionItem === 'string') {
      return suggestionItem
    }
    return suggestionItem.id
  }

  const renderSuggestion = (
    suggestionItem: SuggestionDataItem | string,
    queryInfo: QueryInfo,
    index: number
  ) => {
    const isFocused = index === focusIndex
    const { childIndex, query } = queryInfo

    const renderSuggestionFromChild =
      childRenderSuggestions[childIndex] ?? DEFAULT_MENTION_PROPS.renderSuggestion

    return (
      <Suggestion
        className={itemClassName}
        focusedClassName={focusedItemClassName}
        displayClassName={displayClassName}
        highlightClassName={highlightClassName}
        key={`${childIndex.toString()}-${getSuggestionId(suggestionItem).toString()}`}
        id={getSuggestionHtmlId(id, index)}
        query={query}
        index={index}
        ignoreAccents={ignoreAccents}
        renderSuggestion={renderSuggestionFromChild}
        suggestion={suggestionItem}
        focused={isFocused}
        onClick={() => selectSuggestion(suggestionItem, queryInfo)}
        onMouseEnter={() => handleMouseEnter(index)}
      />
    )
  }

  const renderSuggestions = (): React.ReactElement => {
    const suggestionsToRender = (
      <ul
        ref={setUlElement}
        id={id}
        role="listbox"
        aria-label={a11ySuggestionsListLabel}
        className={listClassNameResolved}
        data-slot="suggestions-list"
      >
        {/* TODO: Using Object.values on a number-keyed object can reorder by numeric key, not insertion.
        If UX relies on insertion order, consider tracking order explicitly (e.g., use Map or an array
        of keys) or sort deterministically. */}
        {Object.values(suggestions).reduce<React.ReactNode[]>((acc, { results, queryInfo }) => {
          const start = acc.length
          for (const [i, result] of results.entries()) {
            acc.push(renderSuggestion(result, queryInfo, start + i))
          }
          return acc
        }, [])}
      </ul>
    )

    if (customSuggestionsContainer) {
      return customSuggestionsContainer(suggestionsToRender)
    }

    return suggestionsToRender
  }

  const renderLoadingIndicator = () => {
    if (isLoading !== true) {
      return null
    }

    return (
      <LoadingIndicator
        className={loadingClassName}
        spinnerClassName={spinnerClassName}
        spinnerElementClassName={spinnerElementClassName}
      />
    )
  }

  if (!isOpened) {
    return null
  }

  const overlayStyle: CSSProperties = {
    position: position ?? 'absolute',
    ...(left === undefined ? {} : { left }),
    ...(right === undefined ? {} : { right }),
    ...(top === undefined ? {} : { top }),
    ...(width === undefined ? {} : { width }),
  }
  const mergedStyle = styleProp ? { ...overlayStyle, ...styleProp } : overlayStyle

  return (
    <div
      className={overlayClassName}
      data-open={isOpened ? 'true' : 'false'}
      data-slot="suggestions"
      role="presentation"
      aria-live="polite"
      aria-relevant="additions text"
      aria-busy={isLoading ? 'true' : 'false'}
      onMouseDown={onMouseDown}
      ref={containerRef}
      style={mergedStyle}
    >
      {renderSuggestions()}
      {renderLoadingIndicator()}
    </div>
  )
}
export default SuggestionsOverlay
