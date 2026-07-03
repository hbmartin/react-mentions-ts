import React, { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { Mention, MentionsInput } from '../src/index'
import type { MentionsInputChangeEvent, MentionsInputChangeHandler } from '../src/types'

const data = [
  { id: 'walter', display: 'Walter White' },
  { id: 'jesse', display: 'Jesse Pinkman' },
]

interface HarnessProps {
  initialValue?: string
  onMentionsChange?: MentionsInputChangeHandler
}

const ControlledHarness = ({ initialValue = '', onMentionsChange }: HarnessProps) => {
  const [value, setValue] = useState(initialValue)
  return (
    <MentionsInput
      value={value}
      onMentionsChange={(change) => {
        setValue(change.value)
        onMentionsChange?.(change)
      }}
    >
      <Mention trigger="@" data={data} />
    </MentionsInput>
  )
}

const getTextarea = (): HTMLTextAreaElement => screen.getByRole<HTMLTextAreaElement>('combobox')

interface CompositionStep {
  /** Full plain-text value of the input after this step */
  value: string
  /** The event's `data` payload (IMEs report the current composition string) */
  data: string
  caret: number
  inputType?: string
  isComposing?: boolean
}

// Bypass React's value tracker so the subsequent input event isn't deduped,
// mirroring how a real IME mutates the DOM before the event fires.
const setNativeValue = (textarea: HTMLTextAreaElement, value: string): void => {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  setter?.call(textarea, value)
}

const fireCompositionInput = (
  textarea: HTMLTextAreaElement,
  { value, data, caret, inputType = 'insertCompositionText', isComposing = true }: CompositionStep
): void => {
  setNativeValue(textarea, value)
  textarea.setSelectionRange(caret, caret)
  const event = new InputEvent('input', { bubbles: true, data, inputType })
  if (event.isComposing !== isComposing) {
    Object.defineProperty(event, 'isComposing', { value: isComposing })
  }
  fireEvent(textarea, event)
}

const lastChange = (mock: ReturnType<typeof vi.fn>): MentionsInputChangeEvent =>
  mock.mock.calls.at(-1)?.[0] as MentionsInputChangeEvent

describe('IME composition sessions', () => {
  it('handles a Japanese composition that grows and is committed as kanji', () => {
    const onMentionsChange = vi.fn()
    render(<ControlledHarness onMentionsChange={onMentionsChange} />)
    const textarea = getTextarea()

    fireEvent.focus(textarea)
    textarea.setSelectionRange(0, 0)
    fireEvent.compositionStart(textarea)

    // IME shows the growing kana composition, replacing it on each update
    fireCompositionInput(textarea, { value: 'か', data: 'か', caret: 1 })
    fireCompositionInput(textarea, { value: 'かん', data: 'かん', caret: 2 })
    fireCompositionInput(textarea, { value: 'かんじ', data: 'かんじ', caret: 3 })
    // commit replaces the composition with the selected kanji
    fireCompositionInput(textarea, { value: '漢字', data: '漢字', caret: 2 })
    fireEvent.compositionEnd(textarea, { data: '漢字' })

    expect(textarea.value).toBe('漢字')
    expect(lastChange(onMentionsChange).value).toBe('漢字')
    expect(lastChange(onMentionsChange).plainTextValue).toBe('漢字')
  })

  it('handles Korean jamo composition where each update replaces the previous syllable', () => {
    const onMentionsChange = vi.fn()
    render(<ControlledHarness onMentionsChange={onMentionsChange} />)
    const textarea = getTextarea()

    fireEvent.focus(textarea)
    textarea.setSelectionRange(0, 0)
    fireEvent.compositionStart(textarea)

    fireCompositionInput(textarea, { value: 'ㅎ', data: 'ㅎ', caret: 1 })
    fireCompositionInput(textarea, { value: '하', data: '하', caret: 1 })
    fireCompositionInput(textarea, { value: '한', data: '한', caret: 1 })
    fireEvent.compositionEnd(textarea, { data: '한' })

    expect(textarea.value).toBe('한')
    expect(lastChange(onMentionsChange).value).toBe('한')
  })

  it('preserves an existing mention while composing text after it', () => {
    const onMentionsChange = vi.fn()
    render(
      <ControlledHarness
        initialValue="@[Walter White](walter) "
        onMentionsChange={onMentionsChange}
      />
    )
    const textarea = getTextarea()
    const plainPrefix = 'Walter White '

    fireEvent.focus(textarea)
    textarea.setSelectionRange(plainPrefix.length, plainPrefix.length)
    fireEvent.select(textarea)
    fireEvent.compositionStart(textarea)

    fireCompositionInput(textarea, {
      value: `${plainPrefix}か`,
      data: 'か',
      caret: plainPrefix.length + 1,
    })
    fireCompositionInput(textarea, {
      value: `${plainPrefix}漢`,
      data: '漢',
      caret: plainPrefix.length + 1,
    })
    fireEvent.compositionEnd(textarea, { data: '漢' })

    const change = lastChange(onMentionsChange)
    expect(change.value).toBe('@[Walter White](walter) 漢')
    expect(change.mentions).toHaveLength(1)
    expect(change.mentions[0].id).toBe('walter')
  })

  it('does not corrupt a mention when composition happens directly before it', () => {
    const onMentionsChange = vi.fn()
    render(
      <ControlledHarness
        initialValue="@[Walter White](walter)"
        onMentionsChange={onMentionsChange}
      />
    )
    const textarea = getTextarea()

    fireEvent.focus(textarea)
    textarea.setSelectionRange(0, 0)
    fireEvent.select(textarea)
    fireEvent.compositionStart(textarea)

    fireCompositionInput(textarea, { value: 'かWalter White', data: 'か', caret: 1 })
    fireEvent.compositionEnd(textarea, { data: 'か' })

    const change = lastChange(onMentionsChange)
    expect(change.value).toBe('か@[Walter White](walter)')
    expect(change.mentions).toHaveLength(1)
  })
})

describe('mobile-style input events', () => {
  it('handles GBoard-style typing (keyCode 229 + insertCompositionText)', () => {
    const onMentionsChange = vi.fn()
    render(<ControlledHarness onMentionsChange={onMentionsChange} />)
    const textarea = getTextarea()

    fireEvent.focus(textarea)
    textarea.setSelectionRange(0, 0)

    // GBoard sends an opaque keydown (keyCode 229) before each composition update
    fireEvent.keyDown(textarea, { key: 'Unidentified', keyCode: 229 })
    fireEvent.compositionStart(textarea)
    fireCompositionInput(textarea, { value: 'h', data: 'h', caret: 1 })

    fireEvent.keyDown(textarea, { key: 'Unidentified', keyCode: 229 })
    fireCompositionInput(textarea, { value: 'hi', data: 'hi', caret: 2 })

    fireEvent.compositionEnd(textarea, { data: 'hi' })

    expect(textarea.value).toBe('hi')
    expect(lastChange(onMentionsChange).value).toBe('hi')
  })

  it('handles autocorrect replacement (insertReplacementText)', () => {
    const onMentionsChange = vi.fn()
    render(<ControlledHarness initialValue="fix teh" onMentionsChange={onMentionsChange} />)
    const textarea = getTextarea()

    fireEvent.focus(textarea)
    textarea.setSelectionRange(4, 7)
    fireEvent.select(textarea)

    fireCompositionInput(textarea, {
      value: 'fix the',
      data: 'the',
      caret: 7,
      inputType: 'insertReplacementText',
      isComposing: false,
    })

    expect(textarea.value).toBe('fix the')
    expect(lastChange(onMentionsChange).value).toBe('fix the')
  })

  it('keeps mention markup intact through an autocorrect replacement after a mention', () => {
    const onMentionsChange = vi.fn()
    render(
      <ControlledHarness
        initialValue="@[Walter White](walter) teh"
        onMentionsChange={onMentionsChange}
      />
    )
    const textarea = getTextarea()
    const plainValue = 'Walter White teh'

    fireEvent.focus(textarea)
    textarea.setSelectionRange(plainValue.length - 3, plainValue.length)
    fireEvent.select(textarea)

    fireCompositionInput(textarea, {
      value: 'Walter White the',
      data: 'the',
      caret: plainValue.length,
      inputType: 'insertReplacementText',
      isComposing: false,
    })

    const change = lastChange(onMentionsChange)
    expect(change.value).toBe('@[Walter White](walter) the')
    expect(change.mentions).toHaveLength(1)
  })
})
