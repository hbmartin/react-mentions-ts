import React, { useState } from 'react'
import { page, userEvent } from 'vitest/browser'
import { Mention, MentionsInput } from '../../src'
import type { MentionsInputChangeEvent } from '../../src'
import { renderBrowser } from './render'

const users = [
  { id: 'first', display: 'First entry' },
  { id: 'second', display: 'Second entry' },
]

function UndoFixture({ initialValue = '' }: { readonly initialValue?: string }) {
  const [value, setValue] = useState(initialValue)
  const [plainTextValue, setPlainTextValue] = useState('')

  const handleMentionsChange = (change: MentionsInputChangeEvent): void => {
    setValue(change.value)
    setPlainTextValue(change.plainTextValue)
  }

  return (
    <section>
      <MentionsInput aria-label="Composer" value={value} onMentionsChange={handleMentionsChange}>
        <Mention trigger="@" data={users} />
      </MentionsInput>
      <output data-testid="markup-value">{value}</output>
      <output data-testid="plain-value">{plainTextValue}</output>
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

const getMarkupOutput = async (): Promise<string> => {
  const element = await page.getByTestId('markup-value').findElement()
  return element.textContent ?? ''
}

// The invariant under test: whatever the browser's native undo stack does,
// the visible text and the markup value must never desynchronize, and a
// mention must never survive in a partially-deleted form.
const expectMarkupConsistency = async (): Promise<void> => {
  const composer = await getComposer()
  const markup = await getMarkupOutput()

  const mentionMarkup = '@[First entry](first)'
  const plainFromMarkup = markup.replace(mentionMarkup, 'First entry')
  expect(composer.value).toBe(plainFromMarkup)

  if (composer.value.includes('First entry')) {
    // display text present → the mention must still be intact in the markup
    // (or the user re-typed it as plain text, in which case markup === plain)
    expect(markup === plainFromMarkup || markup.includes(mentionMarkup)).toBe(true)
  } else {
    expect(markup).not.toContain('(first)')
  }
}

describe('MentionsInput native undo/redo integrity', () => {
  it('keeps markup and plain text in sync when undo is pressed after typing', async () => {
    await renderBrowser(<UndoFixture />)

    const composerLocator = page.getByRole('combobox', { name: 'Composer' })
    await userEvent.type(composerLocator, 'hello world')

    await expect.element(page.getByTestId('markup-value')).toHaveTextContent('hello world')

    await userEvent.keyboard('{Control>}z{/Control}')
    await expectMarkupConsistency()

    await userEvent.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    await expectMarkupConsistency()
  })

  it('never leaves a partially-deleted mention after undo of a mention insertion', async () => {
    await renderBrowser(<UndoFixture />)

    const composerLocator = page.getByRole('combobox', { name: 'Composer' })
    await userEvent.type(composerLocator, '@fi')
    await expect.element(page.getByRole('option', { name: 'First entry' })).toBeVisible()
    await userEvent.keyboard('{Enter}')

    await expect
      .element(page.getByTestId('markup-value'))
      .toHaveTextContent('@[First entry](first)')

    await userEvent.keyboard('{Control>}z{/Control}')
    await expectMarkupConsistency()

    await userEvent.keyboard('{Control>}z{/Control}')
    await expectMarkupConsistency()
  })

  it('keeps further edits working after an undo attempt', async () => {
    await renderBrowser(<UndoFixture />)

    const composerLocator = page.getByRole('combobox', { name: 'Composer' })
    await userEvent.type(composerLocator, '@fi')
    await expect.element(page.getByRole('option', { name: 'First entry' })).toBeVisible()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard('{Control>}z{/Control}')

    // Whatever undo did, the composer must accept new input afterwards and
    // report a consistent markup/plain-text pair.
    await userEvent.keyboard(' done')
    await expectMarkupConsistency()

    const composer = await getComposer()
    expect(composer.value.endsWith(' done')).toBe(true)
  })
})
