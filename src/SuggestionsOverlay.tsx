// @ts-nocheck
import React, { Children, useState, useEffect } from 'react'
import { inline } from 'substyle'
import { defaultStyle } from './utils'

import { getSuggestionHtmlId } from './utils'
import Suggestion from './Suggestion'
import LoadingIndicator from './LoadingIndicator'
import { DEFAULT_MENTION_PROPS } from './Mention'
import type { QueryInfo, SuggestionsMap } from './types'

interface SuggestionsOverlayProps {
  id: string
  suggestions?: SuggestionsMap
  a11ySuggestionsListLabel?: string
  focusIndex: number
  position?: string
  left?: number
  right?: number
  top?: number
  scrollFocusedIntoView?: boolean
  isLoading?: boolean
  isOpened: boolean
  onSelect?: (suggestion: any, queryInfo: QueryInfo) => void
  ignoreAccents?: boolean
  containerRef?: (node: HTMLDivElement | null) => void
  children: React.ReactNode
  style: any
  customSuggestionsContainer?: (node: React.ReactElement) => React.ReactElement
  onMouseDown?: (event: React.MouseEvent<HTMLDivElement>) => void
  onMouseEnter?: (index: number) => void
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
  onSelect = () => null,
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
    if (
      !ulElement ||
      ulElement.offsetHeight >= ulElement.scrollHeight ||
      !scrollFocusedIntoView
    ) {
      return
    }
    const scrollTop = ulElement.scrollTop

    let { top, bottom } = ulElement.children[focusIndex].getBoundingClientRect()
    const { top: topContainer } = ulElement.getBoundingClientRect()
    top = top - topContainer + scrollTop
    bottom = bottom - topContainer + scrollTop

    if (top < scrollTop) {
      ulElement.scrollTop = top
    } else if (bottom > ulElement.offsetHeight) {
      ulElement.scrollTop = bottom - ulElement.offsetHeight
    }
  }, [focusIndex, scrollFocusedIntoView, ulElement])

  const renderSuggestions = () => {
    const suggestionsToRender = (
      <ul
        ref={setUlElement}
        id={id}
        role="listbox"
        aria-label={a11ySuggestionsListLabel}
        {...style('list')}
      >
        {Object.values(suggestions).reduce(
          (accResults, { results, queryInfo }) => [
            ...accResults,
            ...results.map((result, index) =>
              renderSuggestion(result, queryInfo, accResults.length + index)
            ),
          ],
          [] as React.ReactNode[]
        )}
      </ul>
    )

    if (customSuggestionsContainer)
      return customSuggestionsContainer(suggestionsToRender)
    return suggestionsToRender
  }

  const renderSuggestion = (result, queryInfo: QueryInfo, index: number) => {
    const isFocused = index === focusIndex
    const { childIndex, query } = queryInfo
    const { renderSuggestion = DEFAULT_MENTION_PROPS.renderSuggestion } = Children.toArray(children)[childIndex].props

    return (
      <Suggestion
        style={style('item')}
        key={`${childIndex}-${getID(result)}`}
        id={getSuggestionHtmlId(id, index)}
        query={query}
        index={index}
        ignoreAccents={ignoreAccents}
        renderSuggestion={renderSuggestion}
        suggestion={result}
        focused={isFocused}
        onClick={() => select(result, queryInfo)}
        onMouseEnter={() => handleMouseEnter(index)}
      />
    )
  }

  const renderLoadingIndicator = () => {
    if (!isLoading) {
      return
    }

    return <LoadingIndicator style={style('loadingIndicator')} />
  }

  const handleMouseEnter = (index: number) => {
    if (onMouseEnter) {
      onMouseEnter(index)
    }
  }

  const select = (suggestion, queryInfo: QueryInfo) => {
    onSelect(suggestion, queryInfo)
  }

  const getID = (suggestion: any) => {
    if (typeof suggestion === 'string') {
      return suggestion
    }
    return suggestion.id
  }

  if (!isOpened) {
    return null
  }

  return (
    <div
      {...inline({ position: position || 'absolute', left, right, top }, style)}
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
