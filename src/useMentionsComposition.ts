import { useRef } from 'react'
import type React from 'react'
import type { CompositionEvent as ReactCompositionEvent } from 'react'
import type { InputElement, MentionsInputState } from './types'
import { useEventCallback } from './utils/useEventCallback'

interface SelectionRange {
  start: number
  end: number
}

export interface NativeInputEvent {
  data?: string | null
  inputType?: string
  isComposing?: boolean
}

interface MentionsCompositionChange {
  isCompositionInput: boolean
  selectionStartBefore: number
  selectionEndBefore: number
  selectionEndAfter: number
  trackedSelectionEnd: number | null
  insertedText: string
}

interface ResolveMentionsCompositionChangeArgs {
  nativeEvent: NativeInputEvent
  wasComposing: boolean
  compositionSelection: SelectionRange | null
  stateSelectionStart: number | null
  stateSelectionEnd: number | null
  targetSelectionStart: number | null
  targetSelectionEnd: number | null
  newPlainTextValue: string
}

interface UseMentionsCompositionArgs<Extra extends Record<string, unknown>> {
  stateRef: React.RefObject<MentionsInputState<Extra>>
  inputElementRef: React.RefObject<InputElement | null>
}

export const resolveMentionsCompositionChange = ({
  nativeEvent,
  wasComposing,
  compositionSelection,
  stateSelectionStart,
  stateSelectionEnd,
  targetSelectionStart,
  targetSelectionEnd,
  newPlainTextValue,
}: ResolveMentionsCompositionChangeArgs): MentionsCompositionChange => {
  const isCompositionInput =
    wasComposing ||
    nativeEvent.isComposing === true ||
    nativeEvent.inputType === 'insertCompositionText'
  const trackedSelectionEnd =
    (isCompositionInput ? compositionSelection?.end : undefined) ?? stateSelectionEnd

  let selectionStartBefore =
    (isCompositionInput ? compositionSelection?.start : undefined) ?? stateSelectionStart
  if (selectionStartBefore === null) {
    selectionStartBefore = targetSelectionStart ?? 0
  }

  let selectionEndBefore =
    (isCompositionInput ? compositionSelection?.end : undefined) ?? stateSelectionEnd
  if (selectionEndBefore === null) {
    selectionEndBefore = targetSelectionEnd ?? selectionStartBefore
  }

  const selectionEndAfter = targetSelectionEnd ?? selectionEndBefore
  const insertedText =
    typeof nativeEvent.data === 'string'
      ? nativeEvent.data
      : newPlainTextValue.slice(selectionStartBefore, selectionEndAfter)

  return {
    isCompositionInput,
    selectionStartBefore,
    selectionEndBefore,
    selectionEndAfter,
    trackedSelectionEnd,
    insertedText,
  }
}

export const getNextCompositionSelection = (
  change: MentionsCompositionChange,
  nextSelectionStart: number,
  nextSelectionEnd: number
): SelectionRange => ({
  start:
    change.insertedText.length > 0
      ? Math.max(0, nextSelectionStart - change.insertedText.length)
      : change.selectionStartBefore,
  end: nextSelectionEnd,
})

export const useMentionsComposition = <Extra extends Record<string, unknown>>({
  stateRef,
  inputElementRef,
}: UseMentionsCompositionArgs<Extra>) => {
  const isComposingRef = useRef(false)
  const compositionSelectionRef = useRef<SelectionRange | null>(null)

  const resolveChange = useEventCallback(
    (
      nativeEvent: NativeInputEvent,
      target: InputElement,
      newPlainTextValue: string
    ): MentionsCompositionChange => {
      const wasComposing = isComposingRef.current
      if (typeof nativeEvent.isComposing === 'boolean') {
        isComposingRef.current = nativeEvent.isComposing
      }

      return resolveMentionsCompositionChange({
        nativeEvent,
        wasComposing,
        compositionSelection: compositionSelectionRef.current,
        stateSelectionStart: stateRef.current.selectionStart,
        stateSelectionEnd: stateRef.current.selectionEnd,
        targetSelectionStart: target.selectionStart,
        targetSelectionEnd: target.selectionEnd,
        newPlainTextValue,
      })
    }
  )

  const updateSelection = useEventCallback(
    (
      change: MentionsCompositionChange,
      nextSelectionStart: number,
      nextSelectionEnd: number
    ): void => {
      compositionSelectionRef.current = getNextCompositionSelection(
        change,
        nextSelectionStart,
        nextSelectionEnd
      )
    }
  )

  const handleCompositionStart = useEventCallback(
    (event?: ReactCompositionEvent<InputElement>): void => {
      const input = event?.currentTarget ?? inputElementRef.current
      const selectionStart = input?.selectionStart ?? stateRef.current.selectionStart ?? 0
      const selectionEnd = input?.selectionEnd ?? stateRef.current.selectionEnd ?? selectionStart

      compositionSelectionRef.current = {
        start: selectionStart,
        end: selectionEnd,
      }
      isComposingRef.current = true
    }
  )

  const handleCompositionEnd = useEventCallback((): void => {
    isComposingRef.current = false
    compositionSelectionRef.current = null
  })

  return {
    isComposingRef,
    compositionSelectionRef,
    resolveChange,
    updateSelection,
    handleCompositionStart,
    handleCompositionEnd,
  }
}
