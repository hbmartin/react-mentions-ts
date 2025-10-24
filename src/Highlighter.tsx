import React, { Children, useLayoutEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { cva } from 'class-variance-authority'
import { iterateMentionsMarkup, mapPlainTextIndex, readConfigFromChildren, isNumber } from './utils'
import { cn } from './utils/cn'
import { useEffectEvent } from './utils/useEffectEvent'
import type { CaretCoordinates, MentionChildConfig, MentionComponentProps } from './types'

const generateComponentKey = (usedKeys: Record<string, number>, id: string) => {
  if (Object.hasOwn(usedKeys, id)) {
    usedKeys[id] += 1
  } else {
    usedKeys[id] = 0
  }
  return `${id}_${usedKeys[id].toString()}`
}

interface HighlighterProps {
  readonly selectionStart: number | null
  readonly selectionEnd: number | null
  readonly value?: string
  readonly onCaretPositionChange: (position: CaretCoordinates) => void
  readonly containerRef?: (node: HTMLDivElement | null) => void
  readonly children: React.ReactNode
  readonly singleLine?: boolean
  readonly className?: string
  readonly substringClassName?: string
  readonly caretClassName?: string
  readonly recomputeVersion?: number
}

// Note: singleLine intentionally overrides whitespace/break behavior
const highlighterStyles = cva(
  'box-border w-full text-transparent overflow-hidden border border-transparent text-start pointer-events-none',
  {
    variants: {
      singleLine: {
        true: 'whitespace-pre break-normal',
        false: 'whitespace-pre-wrap break-words',
      },
    },
  }
)

const substringStyles = 'text-transparent'
const caretStyles = 'relative inline-block h-0 w-0 align-baseline'

function Highlighter({
  selectionStart,
  selectionEnd,
  value = '',
  onCaretPositionChange,
  containerRef,
  children,
  singleLine,
  className,
  substringClassName,
  caretClassName,
  recomputeVersion,
}: HighlighterProps) {
  const [position, setPosition] = useState<CaretCoordinates | null>(null)
  const [caretElement, setCaretElement] = useState<HTMLSpanElement | null>(null)

  const updatePosition = useEffectEvent((offsetLeft: number, offsetTop: number) => {
    if (position?.left === offsetLeft && position.top === offsetTop) {
      return
    }

    const newPosition: CaretCoordinates = { left: offsetLeft, top: offsetTop }
    setPosition(newPosition)
    onCaretPositionChange(newPosition)
  })

  // Ensure caret position updates whenever content/selection affects layout.
  useLayoutEffect(() => {
    if (caretElement === null) {
      return undefined
    }

    const measure = () => {
      const offsetLeft = caretElement.offsetLeft
      const offsetTop = caretElement.offsetTop

      updatePosition(offsetLeft, offsetTop)
    }

    const rafId =
      typeof globalThis.requestAnimationFrame === 'function'
        ? globalThis.requestAnimationFrame(measure)
        : undefined

    if (rafId === undefined) {
      measure()
    }

    return () => {
      if (rafId !== undefined && typeof globalThis.cancelAnimationFrame === 'function') {
        globalThis.cancelAnimationFrame(rafId)
      }
    }
    // value/selection/singleLine impact layout/position
  }, [
    caretElement,
    value,
    selectionStart,
    selectionEnd,
    singleLine,
    recomputeVersion,
    updatePosition,
  ])

  const config: MentionChildConfig[] = readConfigFromChildren(children)
  let caretPositionInMarkup: number | null | undefined

  const rootClassName = cn(highlighterStyles({ singleLine: Boolean(singleLine) }), className)
  const substringClass = cn(substringStyles, substringClassName)
  const caretClass = cn(caretStyles, caretClassName)

  if (selectionEnd === selectionStart) {
    caretPositionInMarkup = mapPlainTextIndex(value, config, selectionStart, 'START') as
      | number
      | undefined
  }

  const resultComponents: React.ReactNode[] = []
  const componentKeys: Record<string, number> = {}
  let components: React.ReactNode[] = resultComponents
  let substringComponentKey = 0

  const renderSubstring = (substringValue: string, key: number) => (
    // set substring span to hidden, so that Emojis are not shown double in Mobile Safari
    <span className={substringClass} key={key}>
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

  const renderCaretMarker = () => (
    <span
      className={caretClass}
      data-mentions-caret
      ref={setCaretElement}
      key="caret"
      aria-hidden="true"
    >
      {'\u200B'}
    </span>
  )

  const textIteratee = (substr: string, index: number, _substrPlainTextIndex: number) => {
    if (
      isNumber(caretPositionInMarkup) &&
      caretPositionInMarkup >= index &&
      caretPositionInMarkup <= index + substr.length
    ) {
      const splitIndex = caretPositionInMarkup - index
      // Before the reassignment, components still points at resultComponents, so the push stores
      // the substring that comes before the caret in the final output.
      components.push(renderSubstring(substr.slice(0, splitIndex), substringComponentKey))
      substringComponentKey += 1
      // Reassigning component just switches the working array to a fresh list
      // for the text after the caret; later we splice that array back in
      //  Without the initial push, the prefix would not land in resultComponents.
      components = [renderSubstring(substr.slice(splitIndex), substringComponentKey)]
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
    resultComponents.push(renderCaretMarker(), ...components)
  }
  return (
    <div
      className={rootClassName}
      data-slot="highlighter"
      data-single-line={singleLine ? 'true' : undefined}
      data-multi-line={singleLine ? undefined : 'true'}
      style={HIGHLIGHTER_OVERLAY_STYLE}
      ref={containerRef}
    >
      {resultComponents}
    </div>
  )
}

const HIGHLIGHTER_OVERLAY_STYLE: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
  zIndex: 0,
}

export default Highlighter
