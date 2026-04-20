import {
  getNextCompositionSelection,
  resolveMentionsCompositionChange,
} from './useMentionsComposition'

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
})
