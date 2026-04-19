import React, { useLayoutEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import LoadingIndicatorBase from './LoadingIndicatorBase'
import { DEFAULT_MENTION_PROPS } from './MentionDefaultProps'
import SuggestionBase from './SuggestionBase'
import flattenSuggestions from './utils/flattenSuggestions'
import getSuggestionHtmlId from './utils/getSuggestionHtmlId'
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
import type { SuggestionsOverlayStyleConfig } from './styles/types'

export interface SuggestionsOverlayProps<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> {
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
  readonly statusContent?: React.ReactNode
  readonly statusClassName?: string
  readonly statusType?: 'empty' | 'error' | null
  readonly styles: SuggestionsOverlayStyleConfig
}

function SuggestionsOverlayBase<Extra extends Record<string, unknown> = Record<string, unknown>>({
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
  statusContent,
  statusClassName,
  statusType,
  styles,
}: SuggestionsOverlayProps<Extra>) {
  const [ulElement, setUlElement] = useState<HTMLUListElement | null>(null)
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

  const overlayClassName = styles.mergeClassNames(styles.overlayClassName, className)
  const listClassNameResolved = styles.mergeClassNames(styles.listClassName, listClassName)

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
  }, [childRenderSuggestions, focusIndex, flattenedSuggestions, handleMouseEnter, selectSuggestion])

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
            <SuggestionBase<Extra>
              className={itemClassName}
              focusedClassName={focusedItemClassName}
              displayClassName={displayClassName}
              highlightClassName={highlightClassName}
              styles={styles.suggestion}
              key={key}
              id={
                id === undefined ? `suggestion-${index.toString()}` : getSuggestionHtmlId(id, index)
              }
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
      <LoadingIndicatorBase
        className={loadingClassName}
        spinnerClassName={spinnerClassName}
        spinnerElementClassName={spinnerElementClassName}
        onMouseDown={onMouseDown}
        styles={styles.loadingIndicator}
      />
    )
  }

  const renderStatus = (): React.ReactNode => {
    if (statusContent === null || statusContent === undefined) {
      return null
    }

    const isPlainTextStatus = typeof statusContent === 'string' || typeof statusContent === 'number'
    const statusClassNameResolved = styles.mergeClassNames(
      isPlainTextStatus ? styles.statusClassName({ type: statusType ?? 'empty' }) : undefined,
      statusClassName
    )

    return (
      <div
        className={statusClassNameResolved}
        style={
          isPlainTextStatus ? styles.statusStyle?.({ type: statusType ?? 'empty' }) : undefined
        }
        data-slot="suggestions-status"
        data-status-type={statusType ?? undefined}
        role={statusType === 'error' ? 'alert' : 'status'}
      >
        {statusContent}
      </div>
    )
  }

  const mergedStyle = useMemo<CSSProperties>(() => {
    const overlayStyle: CSSProperties = {
      position: position ?? 'absolute',
      ...(left === undefined ? {} : { left }),
      ...(right === undefined ? {} : { right }),
      ...(top === undefined ? {} : { top }),
      ...(width === undefined ? {} : { width }),
    }

    return {
      ...styles.overlayStyle,
      ...overlayStyle,
      ...styleProp,
    }
  }, [left, position, right, styleProp, styles.overlayStyle, top, width])

  if (!isOpened) {
    return null
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
export default SuggestionsOverlayBase
