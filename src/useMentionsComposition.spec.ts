import {
  getNextCompositionSelection,
  resolveMentionsCompositionChange,
  useMentionsComposition,
} from './useMentionsComposition'
import { act, render } from '@testing-library/react'
import React from 'react'
import type { InputElement, MentionsInputState } from './types'

const createCompositionState = (): MentionsInputState => ({
  focusIndex: 0,
  selectionStart: null,
  selectionEnd: null,
  suggestions: {},
  queryStates: {},
  caretPosition: null,
  suggestionsPosition: {},
  inlineSuggestionPosition: null,
  pendingSelectionUpdate: false,
  highlighterRecomputeVersion: 0,
  generatedId: null,
})

type CompositionHarnessHandle = ReturnType<typeof useMentionsComposition> & {
  inputElementRef: React.RefObject<InputElement | null>
  stateRef: React.RefObject<MentionsInputState>
}

const CompositionHarness = React.forwardRef<CompositionHarnessHandle>((_props, ref) => {
  const stateRef = React.useRef<MentionsInputState>(createCompositionState())
  const inputElementRef = React.useRef<InputElement | null>(null)
  const composition = useMentionsComposition({
    stateRef,
    inputElementRef,
  })

  React.useImperativeHandle(ref, () => ({
    ...composition,
    inputElementRef,
    stateRef,
  }))

  return null
})

describe('useMentionsComposition helpers', () => {
  it('resolves composition input from the tracked composition selection', () => {
    const change = resolveMentionsCompositionChange({
      nativeEvent: {
        data: '新',
        inputType: 'insertCompositionText',
        isComposing: true,
      },
      wasComposing: false,
      compositionSelection: { start: 3, end: 8 },
      stateSelectionStart: 5,
      stateSelectionEnd: 5,
      targetSelectionStart: 4,
      targetSelectionEnd: 4,
      newPlainTextValue: 'abc新def',
    })

    expect(change).toEqual({
      isCompositionInput: true,
      selectionStartBefore: 3,
      selectionEndBefore: 8,
      selectionEndAfter: 4,
      trackedSelectionEnd: 8,
      insertedText: '新',
    })
    expect(getNextCompositionSelection(change, 4, 4)).toEqual({ start: 3, end: 4 })
  })

  it('falls back to DOM selection for ordinary input', () => {
    const change = resolveMentionsCompositionChange({
      nativeEvent: {},
      wasComposing: false,
      compositionSelection: null,
      stateSelectionStart: null,
      stateSelectionEnd: null,
      targetSelectionStart: 2,
      targetSelectionEnd: 3,
      newPlainTextValue: 'abc',
    })

    expect(change).toEqual({
      isCompositionInput: false,
      selectionStartBefore: 2,
      selectionEndBefore: 3,
      selectionEndAfter: 3,
      trackedSelectionEnd: null,
      insertedText: 'c',
    })
  })

  it('falls back through null selections and empty inserted text', () => {
    const change = resolveMentionsCompositionChange({
      nativeEvent: {},
      wasComposing: true,
      compositionSelection: null,
      stateSelectionStart: null,
      stateSelectionEnd: null,
      targetSelectionStart: null,
      targetSelectionEnd: null,
      newPlainTextValue: 'abc',
    })

    expect(change).toEqual({
      isCompositionInput: true,
      selectionStartBefore: 0,
      selectionEndBefore: 0,
      selectionEndAfter: 0,
      trackedSelectionEnd: null,
      insertedText: '',
    })
    expect(getNextCompositionSelection(change, 8, 9)).toEqual({ start: 0, end: 9 })
  })

  it('starts composition from state fallbacks when no input event is available', () => {
    const ref = React.createRef<CompositionHarnessHandle>()
    const { unmount } = render(React.createElement(CompositionHarness, { ref }))

    act(() => {
      ref.current?.handleCompositionStart()
    })

    expect(ref.current?.isComposingRef.current).toBe(true)
    expect(ref.current?.compositionSelectionRef.current).toEqual({ start: 0, end: 0 })

    act(() => {
      ref.current?.handleCompositionEnd()
    })

    expect(ref.current?.isComposingRef.current).toBe(false)
    expect(ref.current?.compositionSelectionRef.current).toBeNull()
    unmount()
  })
})
