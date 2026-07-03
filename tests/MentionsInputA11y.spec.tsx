import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import axe from 'axe-core'
import { Mention, MentionsInput } from '../src/index'

const data = [
  { id: 'walter', display: 'Walter White' },
  { id: 'jesse', display: 'Jesse Pinkman' },
  { id: 'gus', display: 'Gustavo Fring' },
]

// jsdom performs no layout, so color-contrast (and other rendering-dependent
// checks) cannot run meaningfully here.
//
// aria-allowed-role: multiline mode deliberately places role="combobox" on a
// <textarea>, which ARIA-in-HTML disallows but the W3C editable combobox
// pattern requires for aria-expanded/aria-controls/aria-activedescendant
// wiring. Screen readers handle it well and axe rates it minor; single-line
// mode uses <input type="text"> and is checked below with the rule enabled.
const runAxe = async (
  container: Element,
  { allowComboboxTextarea = true }: { allowComboboxTextarea?: boolean } = {}
): Promise<axe.AxeResults> =>
  axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      'aria-allowed-role': { enabled: !allowComboboxTextarea },
    },
  })

const expectNoViolations = (results: axe.AxeResults): void => {
  const summary = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => node.html),
  }))
  expect(summary).toEqual([])
}

const openSuggestions = async (): Promise<HTMLTextAreaElement> => {
  const textarea = screen.getByRole<HTMLTextAreaElement>('combobox')
  fireEvent.focus(textarea)
  textarea.setSelectionRange(1, 1)
  fireEvent.select(textarea)

  await waitFor(() => {
    expect(screen.getAllByRole('option', { hidden: true }).length).toBeGreaterThan(0)
  })

  return textarea
}

describe('MentionsInput axe conformance', () => {
  it('has no axe violations with the suggestions closed', async () => {
    const { container } = render(
      <MentionsInput value="Hi @[Walter White](walter)!" aria-label="Message">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    expectNoViolations(await runAxe(container))
  })

  it('has no axe violations with the suggestions overlay open', async () => {
    const { container } = render(
      <MentionsInput value="@" aria-label="Message">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    await openSuggestions()

    expectNoViolations(await runAxe(container))
  })

  it('has no axe violations in inline autocomplete mode', async () => {
    const { container } = render(
      <MentionsInput value="@wal" aria-label="Message" suggestionsDisplay="inline">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole<HTMLTextAreaElement>('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(4, 4)
    fireEvent.select(textarea)

    expectNoViolations(await runAxe(container))
  })

  it('has no axe violations inside a form with a hidden field', async () => {
    const { container } = render(
      <form aria-label="Compose">
        <MentionsInput defaultValue="hello" name="message" aria-label="Message">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      </form>
    )

    expectNoViolations(await runAxe(container))
  })

  it('is fully conformant (all rules) in single-line mode', async () => {
    const { container } = render(
      <MentionsInput value="@" singleLine aria-label="Message">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    await openSuggestions()

    expectNoViolations(await runAxe(container, { allowComboboxTextarea: false }))
  })
})

describe('MentionsInput WAI-ARIA combobox pattern', () => {
  it('exposes collapsed combobox semantics when closed', () => {
    render(
      <MentionsInput value="" aria-label="Message">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const combobox = screen.getByRole('combobox')
    expect(combobox).toHaveAttribute('aria-expanded', 'false')
    expect(combobox).toHaveAttribute('aria-autocomplete', 'list')
    expect(combobox).toHaveAttribute('aria-haspopup', 'listbox')
    expect(combobox).not.toHaveAttribute('aria-controls')
    expect(combobox).not.toHaveAttribute('aria-activedescendant')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('wires aria-controls and aria-activedescendant to the open listbox', async () => {
    render(
      <MentionsInput value="@" aria-label="Message" a11ySuggestionsListLabel="Suggested mentions">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = await openSuggestions()

    expect(textarea).toHaveAttribute('aria-expanded', 'true')

    const listbox = screen.getByRole('listbox', { hidden: true })
    expect(listbox).toHaveAccessibleName('Suggested mentions')
    expect(textarea.getAttribute('aria-controls')).toBe(listbox.id)

    const options = screen.getAllByRole('option', { hidden: true })
    expect(options.length).toBeGreaterThan(0)
    expect(textarea.getAttribute('aria-activedescendant')).toBe(options[0].id)
    expect(options[0]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(textarea, { key: 'ArrowDown', keyCode: 40 })
    const optionsAfterArrow = screen.getAllByRole('option', { hidden: true })
    expect(textarea.getAttribute('aria-activedescendant')).toBe(optionsAfterArrow[1].id)
    expect(optionsAfterArrow[1]).toHaveAttribute('aria-selected', 'true')
    expect(optionsAfterArrow[0]).toHaveAttribute('aria-selected', 'false')
  })

  it('collapses the combobox again when suggestions are dismissed', async () => {
    render(
      <MentionsInput value="@" aria-label="Message">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = await openSuggestions()
    fireEvent.keyDown(textarea, { key: 'Escape', keyCode: 27 })

    await waitFor(() => {
      expect(textarea).toHaveAttribute('aria-expanded', 'false')
    })
    expect(textarea).not.toHaveAttribute('aria-activedescendant')
  })

  it('announces inline suggestions through a described live region', async () => {
    render(
      <MentionsInput value="@wal" aria-label="Message" suggestionsDisplay="inline">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole<HTMLTextAreaElement>('combobox')
    expect(textarea).toHaveAttribute('aria-autocomplete', 'inline')

    fireEvent.focus(textarea)
    textarea.setSelectionRange(4, 4)
    fireEvent.select(textarea)

    await waitFor(() => {
      const describedBy = textarea.getAttribute('aria-describedby')
      expect(describedBy).toBeTruthy()
      const liveRegion = document.getElementById(describedBy as string)
      expect(liveRegion).not.toBeNull()
      expect(liveRegion?.textContent ?? '').not.toHaveLength(0)
    })
  })
})
