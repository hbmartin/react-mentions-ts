import React, { useLayoutEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { cva } from 'class-variance-authority'
import LoadingIndicator from './LoadingIndicator'
import { DEFAULT_MENTION_PROPS } from './MentionDefaultProps'
import Suggestion from './Suggestion'
import { cn, flattenSuggestions, getSuggestionHtmlId } from './utils'
import { useEventCallback } from './utils/useEventCallback'
import type {
  MentionComponentProps,
  MentionRenderSuggestion,
  QueryInfo,
  SuggestionDataItem,
  SuggestionsMap,
} from './types'
import type { FlattenedSuggestion } from './utils/flattenSuggestions'
import { collectMentionElements } from './utils/readConfigFromChildren'

interface SuggestionsOverlayProps<Extra extends Record<string, unknown> = Record<string, unknown>> {
  readonly id?: string
  readonly suggestions?: SuggestionsMap<Extra>
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
  readonly onSelect?: (suggestion: SuggestionDataItem<Extra>, queryInfo: QueryInfo) => void
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
  readonly onMouseDown?: React.MouseEventHandler
  readonly onMouseEnter?: (index: number) => void
  readonly statusContent?: React.ReactNode
  readonly statusClassName?: string
  readonly statusType?: 'empty' | 'error' | null
}

const overlayStyles = cva(
  'z-[100] w-full min-w-[16rem] border border-border bg-popover backdrop-blur supports-[backdrop-filter]:bg-popover/95'
)
const listStyles =
  'm-0 max-h-64 list-none divide-y divide-border overflow-y-auto scroll-py-1 p-0 focus:outline-none'

function SuggestionsOverlay<Extra extends Record<string, unknown> = Record<string, unknown>>({
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
  statusContent,
  statusClassName,
  statusType,
}: SuggestionsOverlayProps<Extra>) {
  const [ulElement, setUlElement] = useState<HTMLUListElement | null>(null)
  const mentionChildren = useMemo(() => collectMentionElements(children), [children])
  const childRenderSuggestions: (MentionRenderSuggestion<Extra> | null)[] = useMemo(
    () =>
      mentionChildren.map((child) =>
        React.isValidElement<MentionComponentProps<Extra>>(child) &&
        typeof child.props.renderSuggestion === 'function'
          ? child.props.renderSuggestion
          : null
      ),
    [mentionChildren]
  )

  // eslint-disable-next-line code-complete/low-function-cohesion
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

  const selectSuggestion = useEventCallback(
    (suggestionItem: SuggestionDataItem<Extra>, queryInfo: QueryInfo) => {
      onSelect?.(suggestionItem, queryInfo)
    }
  )

  const handleMouseEnter = useEventCallback((index: number) => {
    onMouseEnter?.(index)
  })

  const flattenedSuggestions = useMemo<FlattenedSuggestion<Extra>[]>(() => {
    return flattenSuggestions(mentionChildren, suggestions)
  }, [mentionChildren, suggestions])

  const suggestionEntries = useMemo(() => {
    return flattenedSuggestions.map(({ result: suggestionItem, queryInfo }, index) => {
      const isFocused = index === focusIndex
      const { childIndex, query } = queryInfo
      const renderSuggestionFromChild =
        childRenderSuggestions[childIndex] ?? DEFAULT_MENTION_PROPS.renderSuggestion

      return {
        key: `${childIndex.toString()}-${suggestionItem.id}`,
        suggestionItem,
        isFocused,
        renderSuggestionFromChild,
        onClick: () => selectSuggestion(suggestionItem, queryInfo),
        onMouseEnterHandler: () => handleMouseEnter(index),
        query,
        index,
      }
    })
  }, [childRenderSuggestions, focusIndex, flattenedSuggestions])

  const handleListMouseDown = useEventCallback<React.MouseEventHandler<HTMLUListElement>>(
    (event) => {
      onMouseDown?.(event)
    }
  )

  const renderSuggestions = (): React.ReactElement => {
    const suggestionsToRender = (
      <ul
        ref={setUlElement}
        id={id}
        role="listbox"
        aria-label={a11ySuggestionsListLabel}
        className={listClassNameResolved}
        data-slot="suggestions-list"
        onMouseDown={handleListMouseDown}
      >
        {suggestionEntries.map(
          ({
            key,
            suggestionItem,
            query,
            index,
            isFocused,
            renderSuggestionFromChild,
            onClick,
            onMouseEnterHandler,
          }) => (
            <Suggestion<Extra>
              className={itemClassName}
              focusedClassName={focusedItemClassName}
              displayClassName={displayClassName}
              highlightClassName={highlightClassName}
              key={key}
              id={id ? getSuggestionHtmlId(id, index) : `suggestion-${index.toString()}`}
              query={query}
              index={index}
              renderSuggestion={renderSuggestionFromChild}
              suggestion={suggestionItem}
              focused={isFocused}
              onClick={onClick}
              onMouseEnter={onMouseEnterHandler}
            />
          )
        )}
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
        onMouseDown={onMouseDown}
      />
    )
  }

  const renderStatus = (): React.ReactNode => {
    if (!statusContent) {
      return null
    }

    return (
      <div
        className={statusClassName}
        data-slot="suggestions-status"
        data-status-type={statusType ?? undefined}
        role={statusType === 'error' ? 'alert' : 'status'}
      >
        {statusContent}
      </div>
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
      aria-live="polite"
      aria-relevant="additions text"
      aria-busy={isLoading ? 'true' : 'false'}
      ref={containerRef}
      style={mergedStyle}
    >
      {flattenedSuggestions.length > 0 ? renderSuggestions() : renderStatus()}
      {renderLoadingIndicator()}
    </div>
  )
}
export default SuggestionsOverlay
