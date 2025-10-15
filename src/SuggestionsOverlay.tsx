import React, { Children, useLayoutEffect, useMemo, useState } from 'react'
import { inline } from 'substyle'
import LoadingIndicator from './LoadingIndicator'
import { DEFAULT_MENTION_PROPS } from './MentionDefaultProps'
import Suggestion from './Suggestion'
import { defaultStyle, getSuggestionHtmlId } from './utils'
import type {
  ClassNamesProp,
  MentionComponentProps,
  MentionRenderSuggestion,
  QueryInfo,
  StyleOverride,
  Substyle,
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
  readonly scrollFocusedIntoView?: boolean
  readonly isLoading?: boolean
  readonly isOpened: boolean
  readonly onSelect?: (suggestion: SuggestionDataItem | string, queryInfo: QueryInfo) => void
  readonly ignoreAccents?: boolean
  readonly containerRef?: (node: HTMLDivElement | null) => void
  readonly children: React.ReactNode
  readonly style: Substyle
  readonly customSuggestionsContainer?: (node: React.ReactElement) => React.ReactElement
  readonly onMouseDown?: (event: React.MouseEvent<HTMLDivElement>) => void
  readonly onMouseEnter?: (index: number) => void
  readonly className?: string
  readonly classNames?: ClassNamesProp
  readonly styleOverride?: StyleOverride
}

function SuggestionsOverlay({
  id,
  suggestions = {},
  a11ySuggestionsListLabel,
  focusIndex,
  position,
  left,
  right,
  top,
  scrollFocusedIntoView = true,
  isLoading,
  isOpened,
  onSelect,
  ignoreAccents,
  containerRef,
  children,
  style,
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
        style={style('item')}
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
        {...style('list')}
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

    return <LoadingIndicator style={style('loadingIndicator')} />
  }

  if (!isOpened) {
    return null
  }

  const inlineStyle = {
    position: position ?? 'absolute',
    ...(left === undefined ? {} : { left }),
    ...(right === undefined ? {} : { right }),
    ...(top === undefined ? {} : { top }),
  }
  const positioning = inline(style, inlineStyle)

  return (
    <div {...positioning} onMouseDown={onMouseDown} ref={containerRef}>
      {renderSuggestions()}
      {renderLoadingIndicator()}
    </div>
  )
}

const styled = defaultStyle({
  zIndex: 1,
  backgroundColor: 'white',
  marginTop: 14,
  minWidth: 100,

  list: {
    margin: 0,
    padding: 0,
    listStyleType: 'none',
  },
})

const StyledSuggestionsOverlay: React.ComponentType<SuggestionsOverlayProps> =
  styled(SuggestionsOverlay)
export default StyledSuggestionsOverlay
