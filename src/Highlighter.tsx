import React, { Children, useEffect, useState } from 'react'
import { defaultStyle } from './utils'
import {
  iterateMentionsMarkup,
  mapPlainTextIndex,
  readConfigFromChildren,
  isNumber,
} from './utils'
import type {
  CaretCoordinates,
  MentionChildConfig,
  MentionComponentProps,
  Substyle,
} from './types'

const generateComponentKey = (usedKeys: Record<string, number>, id: string) => {
  if (!Object.prototype.hasOwnProperty.call(usedKeys, id)) {
    usedKeys[id] = 0
  } else {
    usedKeys[id] += 1
  }
  return `${id}_${usedKeys[id]}`
}

interface HighlighterProps {
  selectionStart: number | null
  selectionEnd: number | null
  value?: string
  onCaretPositionChange: (position: CaretCoordinates) => void
  containerRef?: (node: HTMLDivElement | null) => void
  children: React.ReactNode
  singleLine?: boolean
  style: Substyle
}

function Highlighter({
  selectionStart,
  selectionEnd,
  value = '',
  onCaretPositionChange,
  containerRef,
  children,
  singleLine,
  style,
}: HighlighterProps) {
  const [position, setPosition] = useState<CaretCoordinates | null>(null)
  const [caretElement, setCaretElement] = useState<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (!caretElement) {
      return
    }

    const { offsetLeft, offsetTop } = caretElement

    if (position && position.left === offsetLeft && position.top === offsetTop) {
      return
    }

    const newPosition: CaretCoordinates = { left: offsetLeft, top: offsetTop }
    setPosition(newPosition)
    onCaretPositionChange(newPosition)
  })

  const config: MentionChildConfig[] = readConfigFromChildren(children)
  let caretPositionInMarkup: number | null | undefined

  if (selectionEnd === selectionStart) {
    caretPositionInMarkup = mapPlainTextIndex(
      value,
      config,
      selectionStart,
      'START'
    ) as number | undefined
  }

  const resultComponents: React.ReactNode[] = []
  const componentKeys: Record<string, number> = {}
  let components: React.ReactNode[] = resultComponents
  let substringComponentKey = 0

  const renderSubstring = (substringValue: string, key: number) => (
    // set substring span to hidden, so that Emojis are not shown double in Mobile Safari
    <span {...style('substring')} key={key}>
      {substringValue}
    </span>
  )

  const getMentionComponentForMatch = (
    id: string,
    display: string,
    mentionChildIndex: number,
    key: string
  ) => {
    const props = { id, display, key }
    const child = Children.toArray(children)[
      mentionChildIndex
    ] as React.ReactElement<MentionComponentProps>
    return React.cloneElement(child, props)
  }

  const renderHighlighterCaret = (caretChildren: React.ReactNode[]) => (
    <span {...style('caret')} ref={setCaretElement} key="caret">
      {caretChildren}
    </span>
  )

  const textIteratee = (
    substr: string,
    index: number,
    _substrPlainTextIndex: number
  ) => {
    if (
      isNumber(caretPositionInMarkup) &&
      caretPositionInMarkup >= index &&
      caretPositionInMarkup <= index + substr.length
    ) {
      const splitIndex = caretPositionInMarkup - index
      components.push(renderSubstring(substr.substring(0, splitIndex), substringComponentKey))
      components = [
        renderSubstring(substr.substring(splitIndex), substringComponentKey),
      ]
    } else {
      components.push(renderSubstring(substr, substringComponentKey))
    }

    substringComponentKey += 1
  }

  const mentionIteratee = (
    markup: string,
    index: number,
    _plainTextIndex: number,
    id: string,
    display: string,
    mentionChildIndex: number
  ) => {
    const key = generateComponentKey(componentKeys, id)
    components.push(getMentionComponentForMatch(id, display, mentionChildIndex, key))
  }

  iterateMentionsMarkup(value, config, mentionIteratee, textIteratee)

  // append a span containing a space, to ensure the last text line has the correct height
  components.push(' ')

  if (components !== resultComponents) {
    resultComponents.push(renderHighlighterCaret(components))
  }

  return (
    <div {...style} ref={containerRef}>
      {resultComponents}
    </div>
  )
}

const styled = defaultStyle(
  {
    position: 'relative',
    boxSizing: 'border-box',
    width: '100%',
    color: 'transparent',
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    border: '1px solid transparent',
    textAlign: 'start',

    '&singleLine': {
      whiteSpace: 'pre',
      wordWrap: 'normal',
    },

    substring: {
      visibility: 'hidden',
    },
  },
  (props: Pick<HighlighterProps, 'singleLine'>) => ({
    '&singleLine': Boolean(props.singleLine),
  })
)

export default styled(Highlighter)
