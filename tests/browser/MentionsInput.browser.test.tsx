import React, { useState } from 'react'
import { page, userEvent } from 'vitest/browser'
import { Mention, MentionsInput } from '../../src'
import type { MentionsInputChangeEvent } from '../../src'
import { renderBrowser } from './render'

const users = [
  { id: 'first', display: 'First entry' },
  { id: 'second', display: 'Second entry' },
]

const browserLayoutStyles = `
.relative { position: relative; }
.block { display: block; }
.w-full { width: 100%; }
.box-border { box-sizing: border-box; }
`

const inlineTypographyStyles = `
${browserLayoutStyles}
.inline-control {
  border: 1px solid transparent;
  display: inline-block;
  line-height: 16px;
  position: relative;
}
.inline-highlighter,
.inline-input {
  border: 1px solid transparent;
  box-sizing: border-box;
  font-family: Arial, sans-serif;
  font-size: 20px;
  letter-spacing: 0.5px;
  line-height: 34px;
  padding: 8px 12px;
  width: 320px;
}
.inline-input {
  background: white;
  color: black;
  display: block;
  position: relative;
}
.inline-suggestion {
  color: rgb(100 116 139);
  line-height: 16px;
  pointer-events: none;
  position: absolute;
  white-space: pre;
}
`

interface ControlledMentionsFixtureProps {
  readonly initialValue?: string
}

interface CompositionInputChange {
  readonly data: string
  readonly nextPlainTextValue: string
  readonly selectionEndAfter: number
  readonly selectionStartBefore: number
}

interface CompositionBoundaryCase extends CompositionInputChange {
  readonly expectedMarkupValue: string
  readonly expectedMentionId?: string
  readonly expectedPlainTextValue: string
  readonly expectedSelectionStart: number
  readonly expectedTriggerType: string
  readonly initialValue: string
  readonly name: string
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

function InlineAutocompleteFixture() {
  const [value, setValue] = useState('')

  return (
    <section>
      <style>{inlineTypographyStyles}</style>
      <MentionsInput
        aria-label="Inline composer"
        value={value}
        onMentionsChange={({ value: nextValue }) => setValue(nextValue)}
        suggestionsDisplay="inline"
        classNames={{
          control: 'inline-control',
          highlighter: 'inline-highlighter',
          input: 'inline-input',
          inlineSuggestion: 'inline-suggestion',
        }}
      >
        <Mention trigger="@" data={users} />
      </MentionsInput>
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

const dispatchCompositionInputChange = async (
  input: HTMLTextAreaElement,
  { data, nextPlainTextValue, selectionEndAfter, selectionStartBefore }: CompositionInputChange
): Promise<void> => {
  input.focus()
  input.setSelectionRange(selectionStartBefore, selectionStartBefore)
  dispatchSelect(input)

  await expectSelection(selectionStartBefore)

  input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }))
  setNativeValue(input, nextPlainTextValue)
  input.setSelectionRange(selectionEndAfter, selectionEndAfter)
  dispatchComposingInput(input, data)
  input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data }))
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

  it('positions portal suggestions near the composer after Strict Mode effect replay', async () => {
    await renderBrowser(
      <React.StrictMode>
        <main>
          <style>{browserLayoutStyles}</style>
          <div style={{ height: 1200 }} aria-hidden="true" />
          <ControlledMentionsFixture />
          <div style={{ height: 2400 }} aria-hidden="true" />
        </main>
      </React.StrictMode>
    )

    const composerLocator = page.getByRole('combobox', { name: 'Composer' })
    await userEvent.type(composerLocator, '@fi')

    const option = page.getByRole('option', { name: 'First entry' })
    await expect.element(option).toBeVisible()

    await expect
      .poll(async () => {
        const composer = await getComposer()
        const optionElement = await option.findElement()
        const composerRect = composer.getBoundingClientRect()
        const optionRect = optionElement.getBoundingClientRect()

        const distanceFromComposer = optionRect.top - composerRect.bottom

        return distanceFromComposer > -100 && distanceFromComposer < 200
      })
      .toBe(true)
  })

  it('keeps inline autocomplete typography aligned with the measured input text', async () => {
    await renderBrowser(<InlineAutocompleteFixture />)

    const composerLocator = page.getByRole('combobox', { name: 'Inline composer' })
    await userEvent.type(composerLocator, '@fi')

    await expect
      .poll(async () => {
        const inlineElement = document.querySelector<HTMLElement>('[data-slot="inline-suggestion"]')
        const highlighter = document.querySelector<HTMLElement>('[data-slot="highlighter"]')
        const highlighterText = highlighter?.querySelector<HTMLElement>('span')

        if (
          inlineElement === null ||
          highlighter === null ||
          highlighterText === null ||
          highlighterText === undefined
        ) {
          return null
        }

        const inlineRect = inlineElement.getBoundingClientRect()
        const textRect = highlighterText.getBoundingClientRect()
        const highlighterLineHeight = getComputedStyle(highlighter).lineHeight
        const leadingOffset = Math.max(
          0,
          (Number.parseFloat(highlighterLineHeight) - textRect.height) / 2
        )

        return {
          inlineLineHeight: getComputedStyle(inlineElement).lineHeight,
          highlighterLineHeight,
          leadingAdjustedTop: Math.abs(inlineRect.top - textRect.top + leadingOffset) < 0.5,
        }
      })
      .toEqual({
        inlineLineHeight: '34px',
        highlighterLineHeight: '34px',
        leadingAdjustedTop: true,
      })
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

  it.each([
    {
      name: 'before a mention start',
      initialValue: 'Hi @[First entry](first)!',
      data: '\u65B0',
      nextPlainTextValue: 'Hi \u65B0First entry!',
      selectionStartBefore: 'Hi '.length,
      selectionEndAfter: 'Hi \u65B0'.length,
      expectedMarkupValue: 'Hi \u65B0@[First entry](first)!',
      expectedPlainTextValue: 'Hi \u65B0First entry!',
      expectedSelectionStart: 'Hi \u65B0'.length,
      expectedTriggerType: 'input',
    },
    {
      name: 'after a mention end',
      initialValue: 'Hi @[First entry](first)!',
      data: '\u65B0',
      nextPlainTextValue: 'Hi First entry\u65B0!',
      selectionStartBefore: 'Hi First entry'.length,
      selectionEndAfter: 'Hi First entry\u65B0'.length,
      expectedMarkupValue: 'Hi @[First entry](first)\u65B0!',
      expectedPlainTextValue: 'Hi First entry\u65B0!',
      expectedSelectionStart: 'Hi First entry\u65B0'.length,
      expectedTriggerType: 'input',
    },
    {
      name: 'inside mention display text',
      initialValue: 'Hi @[First entry](first)!',
      data: '\u65B0',
      nextPlainTextValue: 'Hi Fi\u65B0rst entry!',
      selectionStartBefore: 'Hi Fi'.length,
      selectionEndAfter: 'Hi Fi\u65B0'.length,
      expectedMarkupValue: 'Hi \u65B0!',
      expectedMentionId: 'first',
      expectedPlainTextValue: 'Hi \u65B0!',
      expectedSelectionStart: 'Hi \u65B0'.length,
      expectedTriggerType: 'mention-remove',
    },
    {
      name: 'near an existing mention with decomposed text',
      initialValue: 'Hi @[First entry](first) cafe',
      data: '\u0301',
      nextPlainTextValue: 'Hi First entry cafe\u0301',
      selectionStartBefore: 'Hi First entry cafe'.length,
      selectionEndAfter: 'Hi First entry cafe\u0301'.length,
      expectedMarkupValue: 'Hi @[First entry](first) cafe\u0301',
      expectedPlainTextValue: 'Hi First entry cafe\u0301',
      expectedSelectionStart: 'Hi First entry cafe\u0301'.length,
      expectedTriggerType: 'input',
    },
  ] satisfies CompositionBoundaryCase[])(
    'applies composition input at mention boundaries: $name',
    async ({
      data,
      expectedMarkupValue,
      expectedMentionId = '',
      expectedPlainTextValue,
      expectedSelectionStart,
      expectedTriggerType,
      initialValue,
      nextPlainTextValue,
      selectionEndAfter,
      selectionStartBefore,
    }) => {
      await renderBrowser(<ControlledMentionsFixture initialValue={initialValue} />)

      const composer = await getComposer()
      await dispatchCompositionInputChange(composer, {
        data,
        nextPlainTextValue,
        selectionEndAfter,
        selectionStartBefore,
      })

      await expect.element(page.getByTestId('trigger-type')).toHaveTextContent(expectedTriggerType)
      await expect.element(page.getByTestId('markup-value')).toHaveTextContent(expectedMarkupValue)
      await expect
        .element(page.getByTestId('plain-value'))
        .toHaveTextContent(expectedPlainTextValue)
      await expect.element(page.getByTestId('mention-id')).toHaveTextContent(expectedMentionId)
      await expect
        .element(page.getByRole('combobox', { name: 'Composer' }))
        .toHaveValue(expectedPlainTextValue)
      await expectSelection(expectedSelectionStart)
    }
  )
})
