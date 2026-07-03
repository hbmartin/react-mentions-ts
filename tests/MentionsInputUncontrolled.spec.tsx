import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Mention, MentionsInput } from '../src/index'
import type { MentionsInputChangeEvent } from '../src/types'

const data = [
  { id: 'walter', display: 'Walter White' },
  { id: 'jesse', display: 'Jesse Pinkman' },
]

describe('MentionsInput uncontrolled mode', () => {
  it('renders the plain text of defaultValue', () => {
    render(
      <MentionsInput defaultValue="Hi @[Walter White](walter)!">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    expect(screen.getByRole<HTMLTextAreaElement>('combobox').value).toBe('Hi Walter White!')
  })

  it('renders an empty input when neither value nor defaultValue is provided', () => {
    render(
      <MentionsInput>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    expect(screen.getByRole<HTMLTextAreaElement>('combobox').value).toBe('')
  })

  it('keeps typed text without a value prop and reports changes', () => {
    const handleMentionsChange = vi.fn()
    render(
      <MentionsInput onMentionsChange={handleMentionsChange}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole<HTMLTextAreaElement>('combobox')
    fireEvent.focus(textarea)
    fireEvent.change(textarea, {
      target: { value: 'hello', selectionStart: 5, selectionEnd: 5 },
    })

    expect(textarea.value).toBe('hello')
    expect(handleMentionsChange).toHaveBeenCalledTimes(1)
    const change = handleMentionsChange.mock.calls[0][0] as MentionsInputChangeEvent
    expect(change.value).toBe('hello')
    expect(change.plainTextValue).toBe('hello')
  })

  it('inserts mention markup into the internal value when a suggestion is selected', async () => {
    const handleMentionsChange = vi.fn()
    render(
      <MentionsInput defaultValue="@" name="message" onMentionsChange={handleMentionsChange}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole<HTMLTextAreaElement>('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(1, 1)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(screen.getAllByRole('option', { hidden: true }).length).toBeGreaterThan(0)
    })

    fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 13 })

    expect(textarea.value).toBe('Walter White')
    const change = handleMentionsChange.mock.calls.at(-1)?.[0] as MentionsInputChangeEvent
    expect(change.value).toBe('@[Walter White](walter)')
    expect(document.querySelector<HTMLInputElement>('input[name="message"]')?.value).toBe(
      '@[Walter White](walter)'
    )
  })

  it('ignores defaultValue when value is provided', () => {
    render(
      <MentionsInput value="controlled" defaultValue="uncontrolled">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    expect(screen.getByRole<HTMLTextAreaElement>('combobox').value).toBe('controlled')
  })
})

describe('MentionsInput form integration', () => {
  it('submits the markup value under the given name', () => {
    render(
      <form data-testid="form">
        <MentionsInput defaultValue="Hi @[Walter White](walter)!" name="message">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      </form>
    )

    const formData = new FormData(screen.getByTestId<HTMLFormElement>('form'))
    expect(formData.get('message')).toBe('Hi @[Walter White](walter)!')
  })

  it('does not put the name on the visible input', () => {
    render(
      <MentionsInput defaultValue="hi" name="message">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    expect(screen.getByRole<HTMLTextAreaElement>('combobox')).not.toHaveAttribute('name')
  })

  it('renders no hidden input without a name', () => {
    const { container } = render(
      <MentionsInput defaultValue="hi">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    expect(container.querySelector('input[type="hidden"]')).toBeNull()
  })

  it('reflects the controlled value in the hidden input', () => {
    render(
      <MentionsInput value="Hey @[Jesse Pinkman](jesse)" name="message">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    expect(document.querySelector<HTMLInputElement>('input[name="message"]')?.value).toBe(
      'Hey @[Jesse Pinkman](jesse)'
    )
  })

  it('updates the hidden input as the user types', () => {
    render(
      <form data-testid="form">
        <MentionsInput name="message">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      </form>
    )

    const textarea = screen.getByRole<HTMLTextAreaElement>('combobox')
    fireEvent.focus(textarea)
    fireEvent.change(textarea, {
      target: { value: 'draft', selectionStart: 5, selectionEnd: 5 },
    })

    const formData = new FormData(screen.getByTestId<HTMLFormElement>('form'))
    expect(formData.get('message')).toBe('draft')
  })

  it('does not submit the hidden input when disabled', () => {
    render(
      <form data-testid="form">
        <MentionsInput defaultValue="disabled draft" disabled name="message">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      </form>
    )

    const hiddenInput = document.querySelector<HTMLInputElement>('input[name="message"]')
    expect(hiddenInput).toBeDisabled()

    const formData = new FormData(screen.getByTestId<HTMLFormElement>('form'))
    expect(formData.has('message')).toBe(false)
  })

  it('restores defaultValue when the form is reset', () => {
    render(
      <form data-testid="form">
        <MentionsInput defaultValue="Hi @[Walter White](walter)!" name="message">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      </form>
    )

    const textarea = screen.getByRole<HTMLTextAreaElement>('combobox')
    fireEvent.focus(textarea)
    fireEvent.change(textarea, {
      target: { value: 'changed entirely', selectionStart: 16, selectionEnd: 16 },
    })
    expect(textarea.value).toBe('changed entirely')

    fireEvent.reset(screen.getByTestId('form'))

    expect(textarea.value).toBe('Hi Walter White!')
    const formData = new FormData(screen.getByTestId<HTMLFormElement>('form'))
    expect(formData.get('message')).toBe('Hi @[Walter White](walter)!')
  })
})
