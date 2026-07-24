import React, { useLayoutEffect, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import { defaultClassNames } from './defaultClassNames'
import {
  getHighlighterStructuralStyle,
  highlighterCaretStructuralStyle,
  highlighterSubstringStructuralStyle,
} from './structuralStyles'
import { iterateMentionsMarkup, isNumber } from './utils'
import joinClassNames from './utils/joinClassNames'
import readConfigFromChildren, { collectMentionElements } from './utils/readConfigFromChildren'
import { useEventCallback } from './utils/useEventCallback'
import type {
  CaretCoordinates,
  ClassNameJoiner,
  MentionChildConfig,
  MentionComponentProps,
  MentionSelectionState,
} from './types'

const generateComponentKey = (usedKeys: Record<string, number>, id: string) => {
  if (Object.hasOwn(usedKeys, id)) {
    usedKeys[id] += 1
  } else {
    usedKeys[id] = 0
  }
  return `${id}_${usedKeys[id].toString()}`
}

interface HighlighterProps<Extra extends Record<string, unknown> = Record<string, unknown>> {
  readonly selectionStart: number | null
  readonly selectionEnd: number | null
  readonly value?: string
  readonly onCaretPositionChange: (position: CaretCoordinates) => void
  readonly containerRef?: (node: HTMLDivElement | null) => void
  readonly children: React.ReactNode
  readonly mentionChildren?: React.ReactElement<MentionComponentProps<Extra>>[]
  readonly config?: MentionChildConfig<Extra>[]
  readonly singleLine: boolean
  readonly className?: string
  readonly substringClassName?: string
  readonly caretClassName?: string
  readonly recomputeVersion?: number
  readonly mentionSelectionMap?: Record<string, MentionSelectionState>
  readonly unstyled?: boolean
  readonly mergeClassNames?: ClassNameJoiner
}

interface TextHighlighterSegment {
  readonly type: 'text'
  readonly key: string
  readonly index: number
  readonly plainTextIndex: number
  readonly value: string
}

interface MentionHighlighterSegment {
  readonly type: 'mention'
  readonly key: string
  readonly id: string
  readonly index: number
  readonly display: string
  readonly mentionChildIndex: number
  readonly plainTextIndex: number
}

type HighlighterSegment = TextHighlighterSegment | MentionHighlighterSegment

const singleLineContentWrapperStyle: CSSProperties = {
  display: 'inline-block',
  whiteSpace: 'inherit',
  width: 'max-content',
  minWidth: '100%',
}

interface HighlighterSubstringProps {
  readonly className: string
  readonly value: string
}

// Hidden substring spans preserve textarea geometry without duplicating visible text on iOS.
const HighlighterSubstring = React.memo(function HighlighterSubstring({
  className,
  value,
}: HighlighterSubstringProps) {
  return (
    <span className={className} style={highlighterSubstringStructuralStyle}>
      {value}
    </span>
  )
})

interface HighlighterCaretProps {
  readonly className: string
  readonly measureKey: string
  readonly onCaretPositionChange: (position: CaretCoordinates) => void
  readonly recomputeVersion?: number
  readonly singleLine: boolean
}

const measureCaretOffset = (caretElement: HTMLSpanElement): CaretCoordinates => {
  const previousElement = caretElement.previousElementSibling as HTMLSpanElement | null

  return {
    left: caretElement.offsetLeft,
    top:
      previousElement === null
        ? caretElement.offsetTop
        : previousElement.offsetTop + previousElement.offsetHeight,
  }
}

const HighlighterCaret = React.memo(function HighlighterCaret({
  className,
  measureKey,
  onCaretPositionChange,
  recomputeVersion,
  singleLine,
}: HighlighterCaretProps) {
  const caretRef = useRef<HTMLSpanElement | null>(null)
  const positionRef = useRef<CaretCoordinates | null>(null)

  const updatePosition = useEventCallback((offsetLeft: number, offsetTop: number) => {
    const position = positionRef.current
    if (position?.left === offsetLeft && position.top === offsetTop) {
      return
    }

    const newPosition: CaretCoordinates = { left: offsetLeft, top: offsetTop }
    positionRef.current = newPosition
    onCaretPositionChange(newPosition)
  })

  useLayoutEffect(() => {
    const caretElement = caretRef.current
    if (caretElement === null) {
      return undefined
    }

    const measure = () => {
      const { left, top } = measureCaretOffset(caretElement)
      updatePosition(left, top)
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
  }, [measureKey, recomputeVersion, singleLine, updatePosition])

  return (
    <span
      className={className}
      style={highlighterCaretStructuralStyle}
      data-mentions-caret
      ref={caretRef}
      key="caret"
      aria-hidden="true"
    />
  )
})

interface HighlighterTextSegmentProps {
  readonly caretClassName: string
  readonly caretOffset: number | null
  readonly className: string
  readonly onCaretPositionChange: (position: CaretCoordinates) => void
  readonly recomputeVersion?: number
  readonly segment: TextHighlighterSegment
  readonly singleLine: boolean
}

const HighlighterTextSegment = React.memo(function HighlighterTextSegment({
  caretClassName,
  caretOffset,
  className,
  onCaretPositionChange,
  recomputeVersion,
  segment,
  singleLine,
}: HighlighterTextSegmentProps) {
  if (caretOffset === null) {
    return <HighlighterSubstring className={className} value={segment.value} />
  }

  return (
    <>
      <HighlighterSubstring className={className} value={segment.value.slice(0, caretOffset)} />
      <HighlighterCaret
        className={caretClassName}
        measureKey={`${segment.index.toString()}:${caretOffset.toString()}:${segment.value}`}
        onCaretPositionChange={onCaretPositionChange}
        recomputeVersion={recomputeVersion}
        singleLine={singleLine}
      />
      <HighlighterSubstring className={className} value={segment.value.slice(caretOffset)} />
    </>
  )
})

type HighlighterMentionCloneProps = MentionComponentProps & {
  readonly display?: string
  readonly id?: string
  readonly unstyled?: boolean
  readonly mergeClassNames?: ClassNameJoiner
}

interface HighlighterMentionSegmentProps {
  readonly child: React.ReactElement<HighlighterMentionCloneProps>
  readonly display: string
  readonly id: string
  readonly selectionState?: MentionSelectionState
  readonly unstyled: boolean
  readonly mergeClassNames: ClassNameJoiner
}

const HighlighterMentionSegment = React.memo(function HighlighterMentionSegment({
  child,
  display,
  id,
  selectionState,
  unstyled,
  mergeClassNames,
}: HighlighterMentionSegmentProps) {
  return React.cloneElement(child, {
    id,
    display,
    selectionState,
    // The input's styling mode cascades to mention chips unless the child opts out itself.
    unstyled: child.props.unstyled ?? unstyled,
    mergeClassNames: child.props.mergeClassNames ?? mergeClassNames,
  })
})

const buildHighlighterSegments = <Extra extends Record<string, unknown>>(
  value: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>
): HighlighterSegment[] => {
  const segments: HighlighterSegment[] = []
  const componentKeys: Record<string, number> = {}

  const textIteratee = (substr: string, index: number, plainTextIndex: number) => {
    segments.push({
      type: 'text',
      key: `text:${index.toString()}:${substr.length.toString()}`,
      index,
      plainTextIndex,
      value: substr,
    })
  }

  const mentionIteratee = (
    _markup: string,
    index: number,
    plainTextIndex: number,
    id: string,
    display: string,
    mentionChildIndex: number
  ) => {
    segments.push({
      type: 'mention',
      key: `mention:${generateComponentKey(componentKeys, id)}`,
      id,
      index,
      display,
      mentionChildIndex,
      plainTextIndex,
    })
  }

  iterateMentionsMarkup(value, config, mentionIteratee, textIteratee)

  return segments
}

const getCaretPositionInMarkup = (
  segments: ReadonlyArray<HighlighterSegment>,
  valueLength: number,
  selectionStart: number | null,
  selectionEnd: number | null
): number | null => {
  if (selectionStart !== selectionEnd || !isNumber(selectionStart)) {
    return null
  }

  for (const segment of segments) {
    if (segment.type === 'text') {
      if (segment.plainTextIndex + segment.value.length >= selectionStart) {
        return segment.index + selectionStart - segment.plainTextIndex
      }
      continue
    }

    if (segment.plainTextIndex + segment.display.length > selectionStart) {
      return segment.index
    }
  }

  return valueLength
}

function Highlighter<Extra extends Record<string, unknown> = Record<string, unknown>>({
  selectionStart,
  selectionEnd,
  value = '',
  onCaretPositionChange,
  containerRef,
  children,
  mentionChildren: mentionChildrenProp,
  config: configProp,
  singleLine,
  className,
  substringClassName,
  caretClassName,
  recomputeVersion,
  mentionSelectionMap,
  unstyled = false,
  mergeClassNames = joinClassNames,
}: HighlighterProps<Extra>) {
  const mentionChildren = useMemo(
    () => mentionChildrenProp ?? collectMentionElements<Extra>(children),
    [children, mentionChildrenProp]
  )
  const config: MentionChildConfig<Extra>[] = useMemo(
    () => configProp ?? readConfigFromChildren<Extra>(mentionChildren),
    [configProp, mentionChildren]
  )
  const segments = useMemo(() => buildHighlighterSegments(value, config), [config, value])

  const rootClassName = mergeClassNames(
    unstyled ? undefined : defaultClassNames.highlighter(singleLine),
    className
  )
  const substringClass = mergeClassNames(
    unstyled ? undefined : defaultClassNames.highlighterSubstring,
    substringClassName
  )
  const caretClass = mergeClassNames(
    unstyled ? undefined : defaultClassNames.highlighterCaret,
    caretClassName
  )
  const selectionMap = mentionSelectionMap ?? {}
  const caretPositionInMarkup = getCaretPositionInMarkup(
    segments,
    value.length,
    selectionStart,
    selectionEnd
  )

  const resultComponents: React.ReactNode[] = segments.map((segment) => {
    if (segment.type === 'mention') {
      const selectionKey = `${segment.mentionChildIndex.toString()}:${segment.plainTextIndex.toString()}`
      const child = mentionChildren[
        segment.mentionChildIndex
      ] as React.ReactElement<HighlighterMentionCloneProps>

      return (
        <HighlighterMentionSegment
          child={child}
          display={segment.display}
          id={segment.id}
          key={segment.key}
          selectionState={selectionMap[selectionKey]}
          unstyled={unstyled}
          mergeClassNames={mergeClassNames}
        />
      )
    }

    const caretOffset =
      isNumber(caretPositionInMarkup) &&
      caretPositionInMarkup >= segment.index &&
      caretPositionInMarkup <= segment.index + segment.value.length
        ? caretPositionInMarkup - segment.index
        : null

    return (
      <HighlighterTextSegment
        caretClassName={caretClass}
        caretOffset={caretOffset}
        className={substringClass}
        key={segment.key}
        onCaretPositionChange={onCaretPositionChange}
        recomputeVersion={recomputeVersion}
        segment={segment}
        singleLine={singleLine}
      />
    )
  })

  if (
    isNumber(caretPositionInMarkup) &&
    caretPositionInMarkup === value.length &&
    segments.at(-1)?.type === 'mention'
  ) {
    resultComponents.push(
      <HighlighterCaret
        className={caretClass}
        key="caret:trailing-mention"
        measureKey={value}
        onCaretPositionChange={onCaretPositionChange}
        recomputeVersion={recomputeVersion}
        singleLine={singleLine}
      />
    )
  }

  // append a space to ensure the last text line has the correct height
  resultComponents.push(' ')

  const content = singleLine ? (
    <div style={singleLineContentWrapperStyle}>{resultComponents}</div>
  ) : (
    resultComponents
  )

  return (
    <div
      className={rootClassName}
      data-slot="highlighter"
      data-single-line={singleLine ? 'true' : undefined}
      data-multi-line={singleLine ? undefined : 'true'}
      style={getHighlighterStructuralStyle(singleLine)}
      ref={containerRef}
    >
      {content}
    </div>
  )
}

export default Highlighter
