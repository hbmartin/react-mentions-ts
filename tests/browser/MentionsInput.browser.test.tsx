import React, { useState } from 'react'
import { page, userEvent } from 'vitest/browser'
import { Mention, MentionsInput } from '../../src'
import type { MentionsInputChangeEvent } from '../../src'
import { renderBrowser } from './render'

const users = [
  { id: 'first', display: 'First entry' },
  { id: 'second', display: 'Second entry' },
]

interface ControlledMentionsFixtureProps {
  readonly initialValue?: string
}

interface LastChangeState {
  readonly triggerType: string
  readonly plainTextValue: string
  readonly idValue: string
  readonly mentionId: string
}

const emptyChangeState: LastChangeState = {
  triggerType: '',
  plainTextValue: '',
  idValue: '',
  mentionId: '',
}

function ControlledMentionsFixture({ initialValue = '' }: ControlledMentionsFixtureProps) {
  const [value, setValue] = useState(initialValue)
  const [lastChange, setLastChange] = useState<LastChangeState>(emptyChangeState)

  const handleMentionsChange = (change: MentionsInputChangeEvent): void => {
    setValue(change.value)
    setLastChange({
      triggerType: change.trigger.type,
      plainTextValue: change.plainTextValue,
      idValue: change.idValue,
      mentionId: change.mentionId === undefined ? '' : String(change.mentionId),
    })
  }

  return (
    <section>
      <MentionsInput aria-label="Composer" value={value} onMentionsChange={handleMentionsChange}>
        <Mention trigger="@" data={users} />
      </MentionsInput>
      <output data-testid="markup-value">{value}</output>
      <output data-testid="plain-value">{lastChange.plainTextValue}</output>
      <output data-testid="id-value">{lastChange.idValue}</output>
      <output data-testid="trigger-type">{lastChange.triggerType}</output>
      <output data-testid="mention-id">{lastChange.mentionId}</output>
    </section>
  )
}

const getComposer = async (): Promise<HTMLTextAreaElement> => {
  const element = await page.getByRole('combobox', { name: 'Composer' }).findElement()

  if (!(element instanceof HTMLTextAreaElement)) {
    throw new TypeError('Expected MentionsInput to render a textarea combobox')
  }

  return element
}

const expectSelection = async (start: number, end = start): Promise<void> => {
  await expect
    .poll(async () => {
      const composer = await getComposer()
      return [composer.selectionStart, composer.selectionEnd]
    })
    .toEqual([start, end])
}

const dispatchSelect = (input: HTMLTextAreaElement): void => {
  input.dispatchEvent(new Event('select', { bubbles: true }))
}

const setNativeValue = (input: HTMLTextAreaElement, value: string): void => {
  const ownDescriptor = Object.getOwnPropertyDescriptor(input, 'value')
  const prototype = Object.getPrototypeOf(input) as HTMLTextAreaElement
  const prototypeDescriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
  const valueSetter = prototypeDescriptor?.set ?? ownDescriptor?.set

  if (valueSetter === undefined) {
    input.value = value
    return
  }

  valueSetter.call(input, value)
}

const dispatchComposingInput = (input: HTMLTextAreaElement, data: string): void => {
  input.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      data,
      inputType: 'insertCompositionText',
      isComposing: true,
    })
  )
}

describe('MentionsInput browser caret and IME behavior', () => {
  it('selects a keyboard suggestion with native caret placement', async () => {
    await renderBrowser(<ControlledMentionsFixture />)

    const composerLocator = page.getByRole('combobox', { name: 'Composer' })
    await userEvent.type(composerLocator, '@fi')

    await expect.element(page.getByRole('option', { name: 'First entry' })).toBeVisible()

    await userEvent.keyboard('{Enter}')

    await expect
      .element(page.getByTestId('markup-value'))
      .toHaveTextContent('@[First entry](first)')
    await expect.element(page.getByTestId('plain-value')).toHaveTextContent('First entry')
    await expect.element(page.getByTestId('id-value')).toHaveTextContent('first')
    await expect.element(page.getByTestId('trigger-type')).toHaveTextContent('mention-add')
    await expect.element(page.getByTestId('mention-id')).toHaveTextContent('first')
    await expect.element(composerLocator).toHaveValue('First entry')
    await expectSelection('First entry'.length)
  })

  it('restores the caret when real typing edits inside mention text', async () => {
    await renderBrowser(<ControlledMentionsFixture initialValue="Hello @[First entry](first)!" />)

    const composer = await getComposer()
    const insertionPoint = 'Hello Fi'.length
    composer.focus()
    composer.setSelectionRange(insertionPoint, insertionPoint)
    dispatchSelect(composer)

    await expectSelection(insertionPoint)

    await userEvent.keyboard('x')

    await expect.element(page.getByTestId('trigger-type')).toHaveTextContent('mention-remove')
    await expect.element(page.getByTestId('plain-value')).toHaveTextContent('Hello x!')
    await expectSelection('Hello '.length + 'x'.length)
  })

  it('preserves mention markup while composing a dead-key character near a mention', async () => {
    await renderBrowser(<ControlledMentionsFixture initialValue="Hi @[First entry](first) cafe" />)

    const composer = await getComposer()
    const basePlainText = 'Hi First entry cafe'
    const composedPlainText = `${basePlainText}\u0301`
    composer.focus()
    composer.setSelectionRange(basePlainText.length, basePlainText.length)
    dispatchSelect(composer)

    await expectSelection(basePlainText.length)

    composer.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }))
    setNativeValue(composer, composedPlainText)
    composer.setSelectionRange(composedPlainText.length, composedPlainText.length)
    dispatchComposingInput(composer, '\u0301')
    composer.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true, data: '\u0301' })
    )

    await expect.element(page.getByTestId('trigger-type')).toHaveTextContent('input')
    await expect
      .element(page.getByTestId('markup-value'))
      .toHaveTextContent('Hi @[First entry](first) cafe\u0301')
    await expect.element(page.getByTestId('plain-value')).toHaveTextContent(composedPlainText)
    await expect
      .element(page.getByRole('combobox', { name: 'Composer' }))
      .toHaveValue(composedPlainText)
    await expectSelection(composedPlainText.length)
  })
})
