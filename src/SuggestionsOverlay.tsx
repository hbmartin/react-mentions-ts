import React, { Children, useEffect, useState } from 'react'
import { inline } from 'substyle'
import { defaultStyle } from './utils'
import { getSuggestionHtmlId } from './utils'
import Suggestion from './Suggestion'
import LoadingIndicator from './LoadingIndicator'
import { DEFAULT_MENTION_PROPS } from './Mention'
import type {
  ClassNamesProp,
  MentionComponentProps,
  QueryInfo,
  StyleOverride,
  Substyle,
  SuggestionDataItem,
  SuggestionsMap,
} from './types'

interface SuggestionsOverlayProps {
  id: string
  suggestions?: SuggestionsMap
  a11ySuggestionsListLabel?: string
  focusIndex: number
  position?: 'absolute' | 'fixed'
  left?: number
  right?: number
  top?: number
  scrollFocusedIntoView?: boolean
  isLoading?: boolean
  isOpened: boolean
  onSelect?: (suggestion: SuggestionDataItem | string, queryInfo: QueryInfo) => void
  ignoreAccents?: boolean
  containerRef?: (node: HTMLDivElement | null) => void
  children: React.ReactNode
  style: Substyle
  customSuggestionsContainer?: (node: React.ReactElement) => React.ReactElement
  onMouseDown?: (event: React.MouseEvent<HTMLDivElement>) => void
  onMouseEnter?: (index: number) => void
  className?: string
  classNames?: ClassNamesProp
  styleOverride?: StyleOverride
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
  scrollFocusedIntoView,
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

  useEffect(() => {
    if (!ulElement || !scrollFocusedIntoView) {
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
    } else if (childBottom > ulElement.offsetHeight) {
      ulElement.scrollTop = childBottom - ulElement.offsetHeight
    }
  }, [focusIndex, scrollFocusedIntoView, ulElement])

  const selectSuggestion = (
    suggestionItem: SuggestionDataItem | string,
    queryInfo: QueryInfo
  ) => {
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
    const child = Children.toArray(children)[childIndex] as React.ReactElement<MentionComponentProps>
    const {
      renderSuggestion: renderSuggestionFromChild =
        DEFAULT_MENTION_PROPS.renderSuggestion,
    } = child.props

    return (
      <Suggestion
        style={style('item')}
        key={`${childIndex}-${getSuggestionId(suggestionItem)}`}
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
        {Object.values(suggestions).reduce<React.ReactNode[]>(
          (accResults, { results, queryInfo }) => [
            ...accResults,
            ...results.map((result, index) =>
              renderSuggestion(result, queryInfo, accResults.length + index)
            ),
          ],
          []
        )}
      </ul>
    )

    if (customSuggestionsContainer) {
      return customSuggestionsContainer(suggestionsToRender)
    }

    return suggestionsToRender
  }

  const renderLoadingIndicator = () => {
    if (!isLoading) {
      return null
    }

    return <LoadingIndicator style={style('loadingIndicator')} />
  }

  if (!isOpened) {
    return null
  }

	const inlineStyle = {
		position: position ?? 'absolute',
		...(left !== undefined ? { left } : {}),
		...(right !== undefined ? { right } : {}),
		...(top !== undefined ? { top } : {}),
	}
	const positioning = inline(style, inlineStyle)

	return (
		<div
			{...positioning}
			onMouseDown={onMouseDown}
			ref={containerRef}
		>
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

export default styled(SuggestionsOverlay)
