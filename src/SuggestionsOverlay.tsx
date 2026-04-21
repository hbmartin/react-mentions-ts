import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  readonly mentionChildren?: React.ReactElement<MentionComponentProps<Extra>>[]
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
  readonly onLoadMore?: () => void
  readonly statusContent?: React.ReactNode
  readonly statusClassName?: string
  readonly statusType?: 'empty' | 'error' | null
}

const overlayStyles = cva(
  'z-[100] w-full min-w-[16rem] border border-border bg-popover backdrop-blur supports-[backdrop-filter]:bg-popover/95'
)
const listStyles =
  'm-0 max-h-64 list-none divide-y divide-border overflow-y-auto scroll-py-1 p-0 focus:outline-none'
const loadMoreThresholdPx = 48

const isNearLoadMoreThreshold = (list: HTMLUListElement): boolean => {
  const remainingScrollDistance = list.scrollHeight - list.scrollTop - list.clientHeight
  return remainingScrollDistance <= loadMoreThresholdPx
}

interface MousePosition {
  readonly clientX: number
  readonly clientY: number
}

const didMousePositionChange = (
  previousPosition: MousePosition | null,
  nextPosition: MousePosition
): boolean =>
  previousPosition === null ||
  previousPosition.clientX !== nextPosition.clientX ||
  previousPosition.clientY !== nextPosition.clientY

const statusStyles = cva('px-4 py-2.5 text-left text-sm leading-relaxed', {
  variants: {
    type: {
      empty: 'text-muted-foreground',
      error: 'text-destructive',
    },
  },
  defaultVariants: {
    type: 'empty',
  },
})

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
  mentionChildren: mentionChildrenProp,
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
  onLoadMore,
  statusContent,
  statusClassName,
  statusType,
}: SuggestionsOverlayProps<Extra>) {
  const [ulElement, setUlElement] = useState<HTMLUListElement | null>(null)
  const lastMouseEnterPosition = useRef<MousePosition | null>(null)
  const lastMousePosition = useRef<MousePosition | null>(null)
  const suppressedMouseEnterPosition = useRef<MousePosition | null>(null)
  const pendingLoadMoreRef = useRef(false)
  const mentionChildren = useMemo(
    () => mentionChildrenProp ?? collectMentionElements(children),
    [children, mentionChildrenProp]
  )
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

  useEffect(() => {
    if (!isOpened) {
      lastMouseEnterPosition.current = null
      lastMousePosition.current = null
      suppressedMouseEnterPosition.current = null
      pendingLoadMoreRef.current = false
    }
  }, [isOpened])

  const suppressStationaryMouseEnter = useEventCallback((): void => {
    const currentMousePosition = lastMousePosition.current ?? lastMouseEnterPosition.current

    if (currentMousePosition !== null) {
      suppressedMouseEnterPosition.current = currentMousePosition
    }
  })

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
      suppressStationaryMouseEnter()
      ulElement.scrollTop = childTop
    } else if (childBottom > scrollTop + ulElement.offsetHeight) {
      suppressStationaryMouseEnter()
      ulElement.scrollTop = childBottom - ulElement.offsetHeight
    }
  }, [focusIndex, scrollFocusedIntoView, suppressStationaryMouseEnter, ulElement])

  const overlayClassName = cn(overlayStyles(), className)
  const listClassNameResolved = cn(listStyles, listClassName)

  const selectSuggestion = useEventCallback(
    (suggestionItem: SuggestionDataItem<Extra>, queryInfo: QueryInfo) => {
      onSelect?.(suggestionItem, queryInfo)
    }
  )

  const handleMouseEnter = useEventCallback(
    (index: number, event: React.MouseEvent<HTMLLIElement>) => {
      const nextMousePosition = { clientX: event.clientX, clientY: event.clientY }
      lastMousePosition.current = nextMousePosition

      if (
        suppressedMouseEnterPosition.current !== null &&
        !didMousePositionChange(suppressedMouseEnterPosition.current, nextMousePosition)
      ) {
        lastMouseEnterPosition.current = nextMousePosition
        return
      }

      if (!didMousePositionChange(lastMouseEnterPosition.current, nextMousePosition)) {
        return
      }

      suppressedMouseEnterPosition.current = null
      lastMouseEnterPosition.current = nextMousePosition
      onMouseEnter?.(index)
    }
  )

  const handleListMouseLeave = useEventCallback<React.MouseEventHandler<HTMLUListElement>>(() => {
    lastMouseEnterPosition.current = null
    lastMousePosition.current = null
    suppressedMouseEnterPosition.current = null
  })

  const handleListMouseMove = useEventCallback<React.MouseEventHandler<HTMLUListElement>>(
    (event) => {
      const nextMousePosition = { clientX: event.clientX, clientY: event.clientY }

      if (
        suppressedMouseEnterPosition.current !== null &&
        didMousePositionChange(suppressedMouseEnterPosition.current, nextMousePosition)
      ) {
        suppressedMouseEnterPosition.current = null
      }

      lastMousePosition.current = nextMousePosition
    }
  )

  const flattenedSuggestions = useMemo<FlattenedSuggestion<Extra>[]>(() => {
    return flattenSuggestions(mentionChildren, suggestions)
  }, [mentionChildren, suggestions])

  const handleListMouseDown = useEventCallback<React.MouseEventHandler<HTMLUListElement>>(
    (event) => {
      onMouseDown?.(event)
    }
  )

  const flushPendingLoadMore = useEventCallback(() => {
    if (isLoading === true || !pendingLoadMoreRef.current || ulElement === null) {
      return
    }

    pendingLoadMoreRef.current = false
    if (isNearLoadMoreThreshold(ulElement)) {
      onLoadMore?.()
    }
  })

  useLayoutEffect(() => {
    flushPendingLoadMore()
  }, [flushPendingLoadMore, isLoading, ulElement])

  const handleListScroll = useEventCallback<React.UIEventHandler<HTMLUListElement>>((event) => {
    const list = event.currentTarget

    if (isLoading === true) {
      if (isNearLoadMoreThreshold(list)) {
        pendingLoadMoreRef.current = true
      }
      return
    }

    if (isNearLoadMoreThreshold(list)) {
      onLoadMore?.()
    }
  })

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
        onMouseLeave={handleListMouseLeave}
        onMouseMove={handleListMouseMove}
        onScroll={handleListScroll}
      >
        {flattenedSuggestions.map(({ result: suggestionItem, queryInfo }, index) => {
          const { childIndex, query } = queryInfo
          const renderSuggestionFromChild =
            childRenderSuggestions[childIndex] ?? DEFAULT_MENTION_PROPS.renderSuggestion

          return (
            <Suggestion<Extra>
              className={itemClassName}
              focusedClassName={focusedItemClassName}
              displayClassName={displayClassName}
              highlightClassName={highlightClassName}
              key={`${childIndex.toString()}-${suggestionItem.id}`}
              id={
                id === undefined ? `suggestion-${index.toString()}` : getSuggestionHtmlId(id, index)
              }
              query={query}
              queryInfo={queryInfo}
              index={index}
              renderSuggestion={renderSuggestionFromChild}
              suggestion={suggestionItem}
              focused={index === focusIndex}
              onSelect={selectSuggestion}
              onMouseEnter={handleMouseEnter}
            />
          )
        })}
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
    if (statusContent === null || statusContent === undefined) {
      return null
    }

    const isPlainTextStatus = typeof statusContent === 'string' || typeof statusContent === 'number'
    const statusClassNameResolved = cn(
      isPlainTextStatus ? statusStyles({ type: statusType ?? 'empty' }) : undefined,
      statusClassName
    )

    return (
      <div
        className={statusClassNameResolved}
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

  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop -- overlay div is not memoized; useMemo is unnecessary for this primitive style object.
  const mergedStyle: CSSProperties = {
    position: position ?? 'absolute',
    ...(left === undefined ? {} : { left }),
    ...(right === undefined ? {} : { right }),
    ...(top === undefined ? {} : { top }),
    ...(width === undefined ? {} : { width }),
    ...(styleProp === undefined ? {} : styleProp),
  }

  return (
    <div
      className={overlayClassName}
      data-open="true"
      data-slot="suggestions"
      aria-live="polite"
      aria-relevant="additions text"
      aria-busy={isLoading === true ? 'true' : 'false'}
      ref={containerRef}
      style={mergedStyle}
    >
      {flattenedSuggestions.length > 0 ? renderSuggestions() : renderStatus()}
      {renderLoadingIndicator()}
    </div>
  )
}
export default SuggestionsOverlay
