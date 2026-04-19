import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import type { Mock, MockInstance } from 'vitest'
import * as utils from './utils'
import * as readConfigFromChildrenModule from './utils/readConfigFromChildren'
import { makeTriggerRegex } from './utils/makeTriggerRegex'
import { Mention, MentionsInput } from './index'
import type { MentionsInputChangeEvent, MentionSerializer } from './types'

const data = [
  { id: 'first', value: 'First entry' },
  { id: 'second', value: 'Second entry' },
  { id: 'third', value: 'Third' },
]

const createColonSerializer = (): MentionSerializer => ({
  insert: ({ id }) => `:${id}`,
  findAll: (value) => {
    const regex = /:(\S+)/g
    const matches = []
    let match: RegExpExecArray | null
    while ((match = regex.exec(value)) !== null) {
      matches.push({
        markup: match[0],
        index: match.index,
        id: match[1],
        display: null,
      })
    }
    return matches
  },
})

const getLastMentionsChange = (mock: Mock): MentionsInputChangeEvent => {
  const calls = mock.mock.calls
  if (calls.length === 0) {
    throw new Error('Expected onMentionsChange to have been called')
  }
  return calls[calls.length - 1][0] as MentionsInputChangeEvent
}

const parseBorderWidth = (value: string): number => {
  const parsed = Number.parseFloat(value || '0')
  return Number.isNaN(parsed) ? 0 : parsed
}

describe('MentionsInput', () => {
  it('should render a textarea by default.', () => {
    render(
      <MentionsInput value="">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    // MentionsInput renders both textarea and input, but only one is visible
    const textarea = screen.getByDisplayValue('')
    expect(textarea).toBeInTheDocument()
    expect(textarea.tagName).toBe('TEXTAREA')
  })

  it('should disable spell checking on the textarea by default.', () => {
    render(
      <MentionsInput value="">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByDisplayValue('')
    expect(textarea).toHaveAttribute('spellcheck', 'false')
  })

  it('aligns whitespace and break handling between the textarea and highlighter layers.', () => {
    const { container } = render(
      <MentionsInput value="">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    const highlighter = container.querySelector('[data-slot="highlighter"]')
    expect(highlighter).not.toBeNull()
    expect(textarea.className).toEqual(expect.stringContaining('whitespace-pre-wrap'))
    expect(textarea.className).toEqual(expect.stringContaining('break-words'))
    expect(highlighter!.className).toEqual(expect.stringContaining('whitespace-pre-wrap'))
    expect(highlighter!.className).toEqual(expect.stringContaining('break-words'))
  })

  it('should allow enabling spell checking via the spellCheck prop.', () => {
    render(
      <MentionsInput value="" spellCheck>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByDisplayValue('')
    expect(textarea).toHaveAttribute('spellcheck', 'true')
  })

  it('should render a regular input when singleLine is set to true.', () => {
    render(
      <MentionsInput value="" singleLine>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    // When singleLine is true, the visible input should be an input element
    const input = screen.getByDisplayValue('')
    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe('INPUT')
  })

  describe('single-line versus multi-line modes', () => {
    it('switches DOM structure and data attributes when toggling modes.', () => {
      const { container, rerender } = render(
        <MentionsInput value="">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const initialRoot = container.firstElementChild as HTMLElement
      expect(initialRoot).toHaveAttribute('data-multi-line', 'true')
      expect(initialRoot).not.toHaveAttribute('data-single-line')

      let inputElement = container.querySelector('[data-slot="input"]') as HTMLElement
      expect(inputElement.tagName).toBe('TEXTAREA')
      expect(inputElement).toHaveAttribute('data-multi-line', 'true')
      expect(inputElement).not.toHaveAttribute('data-single-line')

      rerender(
        <MentionsInput value="" singleLine>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const updatedRoot = container.firstElementChild as HTMLElement
      expect(updatedRoot).toHaveAttribute('data-single-line', 'true')
      expect(updatedRoot).not.toHaveAttribute('data-multi-line')

      inputElement = container.querySelector('[data-slot="input"]') as HTMLElement
      expect(inputElement.tagName).toBe('INPUT')
      expect(inputElement).toHaveAttribute('data-single-line', 'true')
      expect(inputElement).not.toHaveAttribute('data-multi-line')
    })

    it('keeps the highlighter whitespace handling in sync with the singleLine prop.', () => {
      const { container, rerender } = render(
        <MentionsInput value="Hello">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const control = container.querySelector('[data-slot="control"]') as HTMLElement
      const initialHighlighter = control.firstElementChild as HTMLElement
      expect(initialHighlighter).toHaveClass('whitespace-pre-wrap')
      expect(initialHighlighter).toHaveClass('break-words')
      expect(initialHighlighter).not.toHaveClass('break-normal')

      rerender(
        <MentionsInput value="Hello" singleLine>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const updatedControl = container.querySelector('[data-slot="control"]') as HTMLElement
      const updatedHighlighter = updatedControl.firstElementChild as HTMLElement
      expect(updatedHighlighter).toHaveClass('whitespace-pre')
      expect(updatedHighlighter).toHaveClass('break-normal')
      expect(updatedHighlighter).not.toHaveClass('whitespace-pre-wrap')
    })
  })

  describe('validation', () => {
    let consoleError: MockInstance

    beforeEach(() => {
      consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleError.mockRestore()
    })

    it('should throw when children include non-mention elements.', () => {
      expect(() =>
        render(
          <MentionsInput value="">
            <div>Invalid child</div>
          </MentionsInput>
        )
      ).toThrow('MentionsInput only accepts Mention components as children. Found: div')
    })

    it('should throw when children include non-element content.', () => {
      expect(() => render(<MentionsInput value="">text child</MentionsInput>)).toThrow(
        'MentionsInput only accepts Mention components as children. Found: unknown component'
      )
    })

    it('should allow multiple Mention children to share the same trigger.', async () => {
      render(
        <MentionsInput value="@a">
          <Mention trigger="@" data={[{ id: 'alice', display: 'Alice' }]} />
          <Mention trigger="@" data={[{ id: 'acme', display: 'Acme Team' }]} />
        </MentionsInput>
      )

      const combobox = screen.getByRole('combobox')
      fireEvent.focus(combobox)
      combobox.setSelectionRange(2, 2)
      fireEvent.select(combobox)

      await waitFor(() => {
        const options = screen.getAllByRole('option', { hidden: true })
        expect(options).toHaveLength(2)
      })
    })

    it('should support custom Mention components that wrap the base Mention.', () => {
      const MyMention = (props: React.ComponentProps<typeof Mention>) => (
        <Mention className="coolStyle" {...props} />
      )

      const mentionId = data[0].id
      const mentionDisplay = data[0].value
      const valueWithMention = `@[${mentionDisplay}](${mentionId})`

      const { container } = render(
        <MentionsInput value={valueWithMention}>
          <MyMention trigger="@" data={data} />
        </MentionsInput>
      )

      expect(consoleError).not.toHaveBeenCalled()

      const renderedMention = container.querySelector('[data-slot="highlighter"] .coolStyle')
      expect(renderedMention).not.toBeNull()
      expect(renderedMention?.textContent).toContain(mentionDisplay)
    })
  })

  it('should show a list of suggestions once the trigger key has been entered.', async () => {
    render(
      <MentionsInput value="@">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)

    // Set selection after the trigger character
    textarea.setSelectionRange(1, 1)
    fireEvent.select(textarea)

    // Wait for suggestions to appear
    await waitFor(() => {
      const suggestions = screen.getAllByRole('option', { hidden: true })
      expect(suggestions.length).toBeGreaterThan(0)
    })
  })

  it('should be possible to navigate through the suggestions with the up and down arrows.', async () => {
    render(
      <MentionsInput value="@">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(1, 1)
    fireEvent.select(textarea)

    // Wait for suggestions to appear
    await waitFor(() => {
      const suggestions = screen.getAllByRole('option', { hidden: true })
      expect(suggestions.length).toBeGreaterThan(0)
    })

    // Get initial focused suggestion
    let suggestions = screen.getAllByRole('option', { hidden: true })
    expect(suggestions[0]).toHaveAttribute('aria-selected', 'true')

    // Press down arrow
    fireEvent.keyDown(textarea, { key: 'ArrowDown', keyCode: 40 })

    suggestions = screen.getAllByRole('option', { hidden: true })
    expect(suggestions[0]).toHaveAttribute('aria-selected', 'false')
    expect(suggestions[1]).toHaveAttribute('aria-selected', 'true')

    // Press up arrow
    fireEvent.keyDown(textarea, { key: 'ArrowUp', keyCode: 38 })

    suggestions = screen.getAllByRole('option', { hidden: true })
    expect(suggestions[0]).toHaveAttribute('aria-selected', 'true')
    expect(suggestions[1]).toHaveAttribute('aria-selected', 'false')
  })

  it('should update the focused suggestion when hovering over items.', async () => {
    render(
      <MentionsInput value="@">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const combobox = screen.getByRole('combobox')
    fireEvent.focus(combobox)
    combobox.setSelectionRange(1, 1)
    fireEvent.select(combobox)

    await waitFor(() => {
      const suggestions = screen.getAllByRole('option', { hidden: true })
      expect(suggestions.length).toBeGreaterThan(1)
    })

    const initialSuggestions = screen.getAllByRole('option', { hidden: true })
    expect(initialSuggestions[0]).toHaveAttribute('aria-selected', 'true')

    fireEvent.mouseEnter(initialSuggestions[1])

    await waitFor(() => {
      const updatedSuggestions = screen.getAllByRole('option', { hidden: true })
      expect(updatedSuggestions[1]).toHaveAttribute('aria-selected', 'true')
      expect(updatedSuggestions[0]).toHaveAttribute('aria-selected', 'false')
    })

    const activeDescendant = combobox.getAttribute('aria-activedescendant')
    const refreshedSuggestions = screen.getAllByRole('option', { hidden: true })
    expect(activeDescendant).toBe(refreshedSuggestions[1].id)
  })

  it('should be possible to select a suggestion with enter.', async () => {
    const onMentionsChange = vi.fn()

    render(
      <MentionsInput value="@" onMentionsChange={onMentionsChange}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(1, 1)
    fireEvent.select(textarea)

    // Wait for suggestions to appear
    await waitFor(() => {
      const suggestions = screen.getAllByRole('option', { hidden: true })
      expect(suggestions.length).toBeGreaterThan(0)
    })

    // Press enter to select the first suggestion
    fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 13 })

    // Verify onMentionsChange was called with the selected mention
    await waitFor(() => {
      expect(onMentionsChange).toHaveBeenCalled()
      const payload = getLastMentionsChange(onMentionsChange)
      expect(payload.value).toContain(data[0].id)
      expect(payload.mentionId).toBe(data[0].id)
      expect(payload.trigger.type).toBe('mention-add')
    })
  })

  it('should append a trailing space when the mention config requests it.', async () => {
    const onMentionsChange = vi.fn()

    render(
      <MentionsInput value="@" onMentionsChange={onMentionsChange}>
        <Mention trigger="@" data={data} appendSpaceOnAdd />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(1, 1)
    fireEvent.select(textarea)

    await waitFor(() => {
      const suggestions = screen.getAllByRole('option', { hidden: true })
      expect(suggestions.length).toBeGreaterThan(0)
    })

    fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 13 })

    await waitFor(() => {
      expect(onMentionsChange).toHaveBeenCalled()
      const payload = getLastMentionsChange(onMentionsChange)
      expect(payload.trigger.type).toBe('mention-add')
      expect(payload.mentionId).toBe(data[0].id)
      expect(payload.value.endsWith(' ')).toBe(true)
      expect(payload.plainTextValue.endsWith(' ')).toBe(true)
      expect(payload.idValue.endsWith(' ')).toBe(true)
      expect(payload.idValue.trim()).toBe(data[0].id)
    })
  })

  it('should be possible to close the suggestions with esc.', async () => {
    render(
      <MentionsInput value="@">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(1, 1)
    fireEvent.select(textarea)

    // Wait for suggestions to appear
    await waitFor(() => {
      const suggestions = screen.getAllByRole('option', { hidden: true })
      expect(suggestions.length).toBeGreaterThan(0)
    })

    // Press escape
    fireEvent.keyDown(textarea, { key: 'Escape', keyCode: 27 })

    // Verify suggestions are closed
    await waitFor(() => {
      const suggestions = screen.queryAllByRole('option', { hidden: true })
      expect(suggestions.length).toBe(0)
    })
  })

  it('should be able to handle sync responses from multiple mentions sources', async () => {
    const extraData = [
      { id: 'a', value: 'A' },
      { id: 'b', value: 'B' },
    ]

    const { rerender } = render(
      <MentionsInput value="@">
        <Mention trigger="@" data={data} />
        <Mention trigger=":" data={extraData} />
      </MentionsInput>
    )

    const focusAndSelect = () => {
      const activeTextarea = screen.getByRole('combobox')
      fireEvent.focus(activeTextarea)
      activeTextarea.setSelectionRange(1, 1)
      fireEvent.select(activeTextarea)
      return activeTextarea
    }

    focusAndSelect()

    // Wait for @ suggestions to appear and check count
    await waitFor(() => {
      const suggestions = screen.getAllByRole('option', { hidden: true })
      expect(suggestions).toHaveLength(data.length)
      const texts = suggestions.map((item) => item.textContent?.trim() ?? '')
      for (const [index, { id }] of data.entries()) {
        expect(texts[index]).toContain(id)
      }
      for (const { id } of extraData) {
        expect(texts.some((text) => text.includes(id))).toBe(false)
      }
    })

    rerender(
      <MentionsInput value=":">
        <Mention trigger="@" data={data} />
        <Mention trigger=":" data={extraData} />
      </MentionsInput>
    )

    focusAndSelect()

    // Wait for : suggestions to appear and check count
    await waitFor(() => {
      const suggestions = screen.getAllByRole('option', { hidden: true })
      expect(suggestions).toHaveLength(extraData.length)
      const texts = suggestions.map((item) => item.textContent?.trim() ?? '')
      for (const [index, { id }] of extraData.entries()) {
        expect(texts[index]).toContain(id)
      }
      for (const { id } of data) {
        expect(texts.some((text) => text.includes(id))).toBe(false)
      }
    })
  })

  it('should load suggestions from async data providers.', async () => {
    const asyncData = vi.fn(async (query: string) => {
      await Promise.resolve()
      return [
        { id: 'async-one', display: 'Async One' },
        { id: 'async-two', display: 'Async Two' },
      ]
    })

    render(
      <MentionsInput value="@a">
        <Mention trigger="@" data={asyncData} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(2, 2)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(asyncData).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    })

    await waitFor(() => {
      const suggestions = screen.getAllByRole('option', { hidden: true })
      expect(suggestions).toHaveLength(2)
    })
  })

  it('ignores stale async suggestions when a newer query resolves first.', async () => {
    interface DeferredResult {
      resolve: (value: Array<{ id: string; display: string }>) => void
    }

    const requests = new Map<string, DeferredResult>()
    const asyncData = vi.fn(
      (query: string) =>
        new Promise<Array<{ id: string; display: string }>>((resolve) => {
          requests.set(query, { resolve })
        })
    )

    const { rerender } = render(
      <MentionsInput value="@a">
        <Mention trigger="@" data={asyncData} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(2, 2)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(asyncData).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    })

    rerender(
      <MentionsInput value="@ab">
        <Mention trigger="@" data={asyncData} />
      </MentionsInput>
    )

    textarea.setSelectionRange(3, 3)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(asyncData).toHaveBeenCalledWith(
        'ab',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    })

    requests.get('ab')?.resolve([{ id: 'fresh', display: 'Fresh Result' }])

    await waitFor(() => {
      expect(screen.getByText('Fresh Result')).toBeInTheDocument()
    })

    requests.get('a')?.resolve([{ id: 'stale', display: 'Stale Result' }])

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.queryByText('Stale Result')).not.toBeInTheDocument()
    expect(screen.getByText('Fresh Result')).toBeInTheDocument()
  })

  it('keeps the previous overlay suggestions visible while the next async query loads.', async () => {
    interface DeferredResult {
      resolve: (value: Array<{ id: string; display: string }>) => void
    }

    const requests = new Map<string, DeferredResult>()
    const asyncData = vi.fn(
      (query: string) =>
        new Promise<Array<{ id: string; display: string }>>((resolve) => {
          requests.set(query, { resolve })
        })
    )

    const { rerender } = render(
      <MentionsInput value="@a">
        <Mention trigger="@" data={asyncData} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(2, 2)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(asyncData).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    })

    requests.get('a')?.resolve([{ id: 'alpha', display: 'Alpha' }])

    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeInTheDocument()
    })

    const initialOverlay = document.querySelector('[data-slot="suggestions"]')
    expect(initialOverlay).not.toBeNull()
    expect(initialOverlay).toHaveAttribute('aria-busy', 'false')

    rerender(
      <MentionsInput value="@ab">
        <Mention trigger="@" data={asyncData} />
      </MentionsInput>
    )

    textarea.setSelectionRange(3, 3)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(asyncData).toHaveBeenCalledWith(
        'ab',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    })

    const loadingOverlay = document.querySelector('[data-slot="suggestions"]')
    expect(loadingOverlay).not.toBeNull()
    expect(loadingOverlay).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getAllByRole('option', { hidden: true })).toHaveLength(1)

    requests.get('ab')?.resolve([{ id: 'albert', display: 'Albert' }])

    await waitFor(() => {
      expect(screen.getByText('Albert')).toBeInTheDocument()
    })

    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    expect(document.querySelector('[data-slot="suggestions"]')).not.toBeNull()
  })

  it('replaces the latest query range when selecting a preserved async suggestion.', async () => {
    interface DeferredResult {
      resolve: (value: Array<{ id: string; display: string }>) => void
    }

    const requests = new Map<string, DeferredResult>()
    const asyncData = vi.fn(
      (query: string) =>
        new Promise<Array<{ id: string; display: string }>>((resolve) => {
          requests.set(query, { resolve })
        })
    )
    const onMentionsChange = vi.fn()

    const { rerender } = render(
      <MentionsInput value="@a" onMentionsChange={onMentionsChange}>
        <Mention trigger="@" data={asyncData} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(2, 2)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(asyncData).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    })

    requests.get('a')?.resolve([{ id: 'alpha', display: 'Alpha' }])

    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeInTheDocument()
    })

    rerender(
      <MentionsInput value="@ab" onMentionsChange={onMentionsChange}>
        <Mention trigger="@" data={asyncData} />
      </MentionsInput>
    )

    textarea.setSelectionRange(3, 3)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(asyncData).toHaveBeenCalledWith(
        'ab',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    })

    expect(screen.getByText('Alpha')).toBeInTheDocument()

    fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 13 })

    await waitFor(() => {
      expect(onMentionsChange).toHaveBeenCalled()
    })

    const payload = getLastMentionsChange(onMentionsChange)
    expect(payload.value).toBe('@[Alpha](alpha)')
    expect(payload.plainTextValue).toBe('Alpha')
    expect(payload.idValue).toBe('alpha')
    expect(payload.mentionId).toBe('alpha')
    expect(payload.trigger.type).toBe('mention-add')
  })

  it('renders an error state when an async provider rejects.', async () => {
    const asyncData = vi.fn(async () => {
      throw new Error('boom')
    })

    render(
      <MentionsInput value="@a">
        <Mention trigger="@" data={asyncData} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(2, 2)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(screen.getByText('Unable to load suggestions')).toBeInTheDocument()
    })
  })

  it('allows renderEmpty to suppress the built-in empty state.', async () => {
    interface DeferredResult {
      resolve: (value: Array<{ id: string; display: string }>) => void
    }

    const requests = new Map<string, DeferredResult>()
    const asyncData = vi.fn(
      (query: string) =>
        new Promise<Array<{ id: string; display: string }>>((resolve) => {
          requests.set(query, { resolve })
        })
    )

    const { container } = render(
      <MentionsInput value="@a">
        <Mention trigger="@" data={asyncData} renderEmpty={() => null} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(2, 2)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(asyncData).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    })

    requests.get('a')?.resolve([])

    await waitFor(() => {
      expect(container.querySelector('[data-slot="suggestions"]')).toBeNull()
    })

    expect(screen.queryByText('No suggestions found')).not.toBeInTheDocument()
  })

  it('falls back to the built-in empty state when renderEmpty returns undefined.', async () => {
    interface DeferredResult {
      resolve: (value: Array<{ id: string; display: string }>) => void
    }

    const requests = new Map<string, DeferredResult>()
    const asyncData = vi.fn(
      (query: string) =>
        new Promise<Array<{ id: string; display: string }>>((resolve) => {
          requests.set(query, { resolve })
        })
    )

    render(
      <MentionsInput value="@a">
        <Mention trigger="@" data={asyncData} renderEmpty={() => undefined} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(2, 2)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(asyncData).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    })

    requests.get('a')?.resolve([])

    await waitFor(() => {
      expect(screen.getByText('No suggestions found')).toBeInTheDocument()
    })

    const status = document.querySelector('[data-slot="suggestions-status"]')
    expect(status).not.toBeNull()
    expect(status).toHaveAttribute('role', 'status')
    expect(status).toHaveAttribute('data-status-type', 'empty')
  })

  it('allows renderError to suppress the built-in error state.', async () => {
    interface DeferredResult {
      reject: (reason?: unknown) => void
    }

    const requests = new Map<string, DeferredResult>()
    const asyncData = vi.fn(
      (query: string) =>
        new Promise<Array<{ id: string; display: string }>>((_resolve, reject) => {
          requests.set(query, { reject })
        })
    )

    const { container } = render(
      <MentionsInput value="@a">
        <Mention trigger="@" data={asyncData} renderError={() => false} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(2, 2)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(asyncData).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    })

    requests.get('a')?.reject(new Error('boom'))

    await waitFor(() => {
      expect(container.querySelector('[data-slot="suggestions"]')).toBeNull()
    })

    expect(screen.queryByText('Unable to load suggestions')).not.toBeInTheDocument()
  })

  it('falls back to the built-in error state when renderError returns undefined.', async () => {
    interface DeferredResult {
      reject: (reason?: unknown) => void
    }

    const requests = new Map<string, DeferredResult>()
    const asyncData = vi.fn(
      (query: string) =>
        new Promise<Array<{ id: string; display: string }>>((_resolve, reject) => {
          requests.set(query, { reject })
        })
    )

    render(
      <MentionsInput value="@a">
        <Mention trigger="@" data={asyncData} renderError={() => undefined} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(2, 2)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(asyncData).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    })

    requests.get('a')?.reject(new Error('boom'))

    await waitFor(() => {
      expect(screen.getByText('Unable to load suggestions')).toBeInTheDocument()
    })
  })

  it('keeps the active request abortable after an older request rejects.', async () => {
    interface DeferredResult {
      resolve: (value: Array<{ id: string; display: string }>) => void
      reject: (reason?: unknown) => void
      signal: AbortSignal
    }

    const requests = new Map<string, DeferredResult>()
    const asyncData = vi.fn(
      (query: string, { signal }: { signal: AbortSignal }) =>
        new Promise<Array<{ id: string; display: string }>>((resolve, reject) => {
          requests.set(query, { resolve, reject, signal })
        })
    )

    const { rerender } = render(
      <MentionsInput value="@a">
        <Mention trigger="@" data={asyncData} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(2, 2)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(asyncData).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    })

    rerender(
      <MentionsInput value="@ab">
        <Mention trigger="@" data={asyncData} />
      </MentionsInput>
    )

    textarea.setSelectionRange(3, 3)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(asyncData).toHaveBeenCalledWith(
        'ab',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    })

    const firstRequest = requests.get('a')
    const secondRequest = requests.get('ab')
    expect(firstRequest?.signal.aborted).toBe(true)
    expect(secondRequest?.signal.aborted).toBe(false)

    firstRequest?.reject(new Error('stale request aborted'))

    await act(async () => {
      await Promise.resolve()
    })

    rerender(
      <MentionsInput value="@abc">
        <Mention trigger="@" data={asyncData} />
      </MentionsInput>
    )

    textarea.setSelectionRange(4, 4)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(asyncData).toHaveBeenCalledWith(
        'abc',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    })

    expect(secondRequest?.signal.aborted).toBe(true)

    requests.get('abc')?.resolve([])

    await act(async () => {
      await Promise.resolve()
    })
  })

  it('supports debounced async providers and maxSuggestions.', async () => {
    vi.useFakeTimers()

    try {
      const asyncData = vi.fn(async () => [
        { id: 'one', display: 'One' },
        { id: 'two', display: 'Two' },
        { id: 'three', display: 'Three' },
      ])

      render(
        <MentionsInput value="@a">
          <Mention trigger="@" data={asyncData} debounceMs={200} maxSuggestions={2} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')
      fireEvent.focus(textarea)
      textarea.setSelectionRange(2, 2)
      fireEvent.select(textarea)

      expect(asyncData).not.toHaveBeenCalled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(200)
      })

      expect(asyncData).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ signal: expect.any(Object) })
      )

      vi.useRealTimers()

      await waitFor(() => {
        expect(screen.getAllByRole('option', { hidden: true })).toHaveLength(2)
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('should scroll the highlighter in sync with the textarea', () => {
    const { container } = render(
      <MentionsInput
        value={'multiple lines causing \n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n the textarea to scroll'}
      >
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    const highlighter = container.querySelector('[data-slot="highlighter"]')
    expect(highlighter).not.toBeNull()

    // Set scroll position and trigger scroll event
    textarea.scrollTop = 23
    fireEvent.scroll(textarea, { target: { scrollTop: 23 } })

    expect(highlighter!.scrollTop).toBe(23)
  })

  it('mirrors horizontal scroll offsets in single-line mode', () => {
    const { container } = render(
      <MentionsInput singleLine value={'@'.repeat(200)}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const input = screen.getByRole('combobox')
    const highlighter = container.querySelector('[data-slot="highlighter"]') as HTMLElement
    expect(highlighter).not.toBeNull()

    input.scrollLeft = 45
    fireEvent.scroll(input, { target: { scrollLeft: 45 } })

    expect(highlighter.scrollLeft).toBe(45)
  })

  it('should place suggestions in suggestionsPortalHost', async () => {
    // Create a portal container
    const portalContainer = document.createElement('div')
    portalContainer.id = 'portalDiv'
    document.body.append(portalContainer)

    render(
      <MentionsInput className="testClass" value="@" suggestionsPortalHost={portalContainer}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)

    // Set selection to position 1 (after @)
    textarea.setSelectionRange(1, 1)
    fireEvent.select(textarea)

    // Check that suggestions are rendered in the portal
    await waitFor(() => {
      const suggestionsNode = portalContainer.querySelector('[data-slot="suggestions"]')
      expect(suggestionsNode).toBeTruthy()
    })

    // Cleanup
    portalContainer.remove()
  })

  it('should render suggestions inline when suggestionsPortalHost is null.', async () => {
    const { container } = render(
      <MentionsInput value="@" suggestionsPortalHost={null}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(1, 1)
    fireEvent.select(textarea)

    await waitFor(() => {
      const suggestionsNode = container.querySelector('[data-slot="suggestions"]')
      expect(suggestionsNode).toBeTruthy()
      expect(container.contains(suggestionsNode)).toBe(true)
    })
  })

  it('wires aria-controls to the active suggestions listbox when open.', async () => {
    render(
      <MentionsInput id="people" value="@">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(1, 1)
    fireEvent.select(textarea)

    await waitFor(() => {
      const listbox = screen.getByRole('listbox', { hidden: true })
      expect(textarea).toHaveAttribute('aria-controls', listbox.id)
    })
  })

  it('falls back to counter-based generated ids when crypto.randomUUID is unavailable', async () => {
    const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')

    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true,
    })

    try {
      render(
        <MentionsInput value="@f" suggestionsDisplay="inline">
          <Mention
            trigger="@"
            data={[
              { id: 'first', display: 'First' },
              { id: 'second', display: 'Second' },
            ]}
          />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')
      fireEvent.focus(textarea)
      textarea.setSelectionRange(2, 2)
      fireEvent.select(textarea)

      await waitFor(() => {
        const status = screen.getByRole('status')
        expect(status.id).toMatch(/^mentions-\d+-inline-live$/)
        expect(textarea).toHaveAttribute('aria-describedby', status.id)
      })
    } finally {
      if (cryptoDescriptor) {
        Object.defineProperty(globalThis, 'crypto', cryptoDescriptor)
      } else {
        delete (globalThis as { crypto?: unknown }).crypto
      }
    }
  })

  it('merges an existing aria-describedby with the inline live region id', async () => {
    render(
      <MentionsInput value="@f" suggestionsDisplay="inline" aria-describedby="existing-hint">
        <Mention
          trigger="@"
          data={[
            { id: 'first', display: 'First' },
            { id: 'second', display: 'Second' },
          ]}
        />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(2, 2)
    fireEvent.select(textarea)

    await waitFor(() => {
      const status = screen.getByRole('status')
      expect(textarea).toHaveAttribute('aria-describedby', `existing-hint ${status.id}`)
    })
  })

  it('should accept a Document instance as the suggestionsPortalHost.', async () => {
    render(
      <MentionsInput value="@" suggestionsPortalHost={document}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(1, 1)
    fireEvent.select(textarea)

    await waitFor(() => {
      const suggestionsNode = document.body.querySelector('[data-slot="suggestions"]')
      expect(suggestionsNode).toBeTruthy()
      expect(suggestionsNode?.parentElement).toBe(document.body)
    })
  })

  it('should accept a custom markup string', () => {
    const data = [
      { id: 'aaaa', display: '@A' },
      { id: 'bbbb', display: '@B' },
    ]

    render(
      <MentionsInput value="[aaaa] and [bbbb] and [invalidId]">
        <Mention
          trigger="@"
          data={data}
          markup="[__id__]"
          displayTransform={(id) => {
            const mention = data.find((item) => item.id === id)
            return mention ? mention.display : `[${id}]`
          }}
        />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)

    expect(textarea.value).toEqual('@A and @B and [invalidId]')
  })

  it('should accept a MentionSerializer as markup', () => {
    const data = [
      { id: 'aaaa', display: '@A' },
      { id: 'bbbb', display: '@B' },
    ]

    render(
      <MentionsInput value=":aaaa and :bbbb and :invalidId">
        <Mention
          trigger="@"
          data={data}
          markup={createColonSerializer()}
          displayTransform={(id) => {
            const mention = data.find((item) => item.id === id)
            return mention ? mention.display : `:${id}`
          }}
        />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)

    expect(textarea.value).toEqual('@A and @B and :invalidId')
  })

  it('updates the rendered plain text when displayTransform changes', () => {
    const mentionData = [{ id: 'user', display: 'User' }]
    const atDisplayTransform = (id: string | number, display?: string | null) =>
      `@${display ?? String(id)}`
    const hashDisplayTransform = (id: string | number) => `#${String(id)}`
    const value = '@[User](user)'

    const { rerender } = render(
      <MentionsInput value={value}>
        <Mention trigger="@" data={mentionData} displayTransform={atDisplayTransform} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    expect(textarea).toHaveValue('@User')

    rerender(
      <MentionsInput value={value}>
        <Mention trigger="@" data={mentionData} displayTransform={hashDisplayTransform} />
      </MentionsInput>
    )

    expect(textarea).toHaveValue('#user')
  })

  it('should forward the `inputRef` prop to become the `ref` of the input', () => {
    const inputRef = React.createRef()

    render(
      <MentionsInput value="test" inputRef={inputRef}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    expect(inputRef.current).toBeTruthy()
    expect(inputRef.current).toEqual(textarea)
  })

  it('should forward the `inputRef` prop to become the `ref` of the input (callback ref)', () => {
    const inputRef = vi.fn()

    render(
      <MentionsInput value="test" inputRef={inputRef}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    expect(inputRef).toHaveBeenCalledWith(textarea)
  })

  it('should ignore a null inputRef object without throwing', () => {
    render(
      <MentionsInput value="test" inputRef={null}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('should render a custom input when supplied.', () => {
    const CustomInput = React.forwardRef((props, ref) => {
      return <input data-testid="testInput" ref={ref} {...props} />
    })

    const { container } = render(
      <MentionsInput value="test" inputComponent={CustomInput}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    // Should find the custom input by test id
    expect(screen.getByTestId('testInput')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test')).toBeInTheDocument()

    // Should not find a textarea element
    expect(container.querySelector('textarea')).not.toBeInTheDocument()
    expect(container.querySelector('input')).toBeInTheDocument()
  })

  describe('makeTriggerRegex', () => {
    it('should return regular expressions', () => {
      const trigger = /abc/
      expect(makeTriggerRegex(trigger)).toEqual(trigger)
    })

    it('should escape and capture a string trigger', () => {
      const result = makeTriggerRegex('trigger').toString()
      expect(result).toEqual(String.raw`/(?:^|\s)(trigger([^\strigger]*))$/`)
    })

    it('should allow spaces in search', () => {
      const result = makeTriggerRegex('trigger', {
        allowSpaceInQuery: true,
      }).toString()
      expect(result).toEqual(String.raw`/(?:^|\s)(trigger([^trigger]*))$/`)
    })

    it('should capture characters with diacritics when ignoreAccents is true', () => {
      const regex = makeTriggerRegex('@', { ignoreAccents: true })
      const composed = '@José'
      const decomposed = '@Jose' + '\u0301'
      expect(composed.match(regex)?.[2]).toBe('José')
      expect(decomposed.match(regex)?.[2]).toBe('Jose' + '\u0301')
    })
  })

  it('supports custom regular expression triggers passed to Mention', async () => {
    render(
      <MentionsInput value="#">
        <Mention trigger={/(#(\S*))/g} data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(1, 1)
    fireEvent.select(textarea)

    await waitFor(() => {
      const suggestions = screen.getAllByRole('option', { hidden: true })
      expect(suggestions.length).toBeGreaterThan(0)
    })
  })

  it('ignores custom regular expression matches without a replacement range capture', async () => {
    const mentionData = vi.fn(() => [{ id: 'first', display: 'First' }])
    const triggerWithoutReplacementRangeCapture = /(#)?([a-z]{0,32})$/i

    render(
      <MentionsInput value="hello">
        <Mention trigger={triggerWithoutReplacementRangeCapture} data={mentionData} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(5, 5)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(textarea.selectionStart).toBe(5)
    })

    expect(mentionData).not.toHaveBeenCalled()
    expect(screen.queryByRole('option', { hidden: true })).toBeNull()
  })

  describe('autoResize', () => {
    it('resizes the textarea to the scroll height after a controlled value update', () => {
      const onMentionsChange = vi.fn()
      const { rerender } = render(
        <MentionsInput autoResize value="short" onMentionsChange={onMentionsChange}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const combobox = screen.getByRole('combobox')
      const scrollHeight = 64
      Object.defineProperty(combobox, 'scrollHeight', {
        configurable: true,
        get: () => scrollHeight,
      })

      expect(combobox.style.height).not.toBe('64px')

      rerender(
        <MentionsInput
          autoResize
          value="a slightly longer value"
          onMentionsChange={onMentionsChange}
        >
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const computed = globalThis.getComputedStyle(combobox)
      const borderTop = parseBorderWidth(computed.borderTopWidth)
      const borderBottom = parseBorderWidth(computed.borderBottomWidth)
      expect(Number.parseFloat(combobox.style.height)).toBe(scrollHeight + borderTop + borderBottom)
      expect(combobox.style.overflowY).toBe('hidden')
    })

    it('updates the textarea height when autoResize toggles from false to true', () => {
      const onMentionsChange = vi.fn()
      const { rerender } = render(
        <MentionsInput autoResize={false} value="initial" onMentionsChange={onMentionsChange}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const combobox = screen.getByRole('combobox')
      const scrollHeight = 88
      Object.defineProperty(combobox, 'scrollHeight', {
        configurable: true,
        get: () => scrollHeight,
      })

      expect(combobox.style.height).toBe('')

      rerender(
        <MentionsInput autoResize value="initial" onMentionsChange={onMentionsChange}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const computed = globalThis.getComputedStyle(combobox)
      const borderTop = parseBorderWidth(computed.borderTopWidth)
      const borderBottom = parseBorderWidth(computed.borderBottomWidth)
      expect(Number.parseFloat(combobox.style.height)).toBe(scrollHeight + borderTop + borderBottom)
      expect(combobox.style.overflowY).toBe('hidden')
    })

    it('applies the latest scroll height after user input changes while autoResize is enabled', async () => {
      const ControlledInput = () => {
        const [value, setValue] = React.useState('short text')
        return (
          <MentionsInput
            autoResize
            value={value}
            onMentionsChange={({ value: nextValue }) => setValue(nextValue)}
          >
            <Mention trigger="@" data={data} />
          </MentionsInput>
        )
      }

      render(<ControlledInput />)

      const combobox = screen.getByRole('combobox')
      const scrollHeight = 150
      Object.defineProperty(combobox, 'scrollHeight', {
        configurable: true,
        get: () => scrollHeight,
      })

      const updatedValue = `${combobox.value} that is now longer`
      combobox.focus()
      combobox.setSelectionRange(combobox.value.length, combobox.value.length)

      await act(async () => {
        fireEvent.change(combobox, {
          target: {
            value: updatedValue,
            selectionStart: updatedValue.length,
            selectionEnd: updatedValue.length,
          },
        })
      })

      await waitFor(() => {
        const computed = globalThis.getComputedStyle(combobox)
        const borderTop = parseBorderWidth(computed.borderTopWidth)
        const borderBottom = parseBorderWidth(computed.borderBottomWidth)
        expect(Number.parseFloat(combobox.style.height)).toBe(
          scrollHeight + borderTop + borderBottom
        )
        expect(combobox.style.overflowY).toBe('hidden')
      })
    })

    it('skips resizing when rendering a single-line input', () => {
      render(
        <MentionsInput autoResize singleLine value="single line">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const input = screen.getByRole('combobox')
      expect(input.tagName).toBe('INPUT')
      expect(input.style.height).toBe('')
      expect(input.style.overflowY).toBe('')
    })

    it('adds border widths to the measured height', () => {
      const onMentionsChange = vi.fn()
      const getComputedStyleSpy = vi.spyOn(globalThis, 'getComputedStyle').mockReturnValue({
        borderTopWidth: '4px',
        borderBottomWidth: '6px',
      } as unknown as CSSStyleDeclaration)

      const { rerender } = render(
        <MentionsInput autoResize value="initial" onMentionsChange={onMentionsChange}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')
      const scrollHeight = 90
      Object.defineProperty(textarea, 'scrollHeight', {
        configurable: true,
        get: () => scrollHeight,
      })

      rerender(
        <MentionsInput
          autoResize
          value="initial content extended"
          onMentionsChange={onMentionsChange}
        >
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      expect(textarea.style.height).toBe('100px')
      expect(textarea.style.overflowY).toBe('hidden')

      getComputedStyleSpy.mockRestore()
    })

    it('clears inline sizing when autoResize is disabled', () => {
      const onMentionsChange = vi.fn()
      const { rerender } = render(
        <MentionsInput autoResize value="draft" onMentionsChange={onMentionsChange}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')
      const scrollHeight = 72
      Object.defineProperty(textarea, 'scrollHeight', {
        configurable: true,
        get: () => scrollHeight,
      })

      rerender(
        <MentionsInput autoResize value="draft updated" onMentionsChange={onMentionsChange}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const computed = globalThis.getComputedStyle(textarea)
      const borderTop = parseBorderWidth(computed.borderTopWidth)
      const borderBottom = parseBorderWidth(computed.borderBottomWidth)
      expect(Number.parseFloat(textarea.style.height)).toBe(scrollHeight + borderTop + borderBottom)
      expect(textarea.style.overflowY).toBe('hidden')

      rerender(
        <MentionsInput autoResize={false} value="draft updated" onMentionsChange={onMentionsChange}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      expect(textarea.style.height).toBe('')
      expect(textarea.style.overflowY).toBe('')
    })

    it('applies mobile Safari offsets in multiline mode', () => {
      const originalUA = globalThis.navigator.userAgent
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        configurable: true,
        value: 'iPhone',
      })

      try {
        const { container } = render(
          <MentionsInput autoResize value="draft" onMentionsChange={() => undefined}>
            <Mention trigger="@" data={data} />
          </MentionsInput>
        )

        const textarea = container.querySelector('[data-slot="input"]') as HTMLTextAreaElement
        expect(textarea.style.marginTop).toBe('1px')
        expect(textarea.style.marginLeft).toBe('-3px')
      } finally {
        Object.defineProperty(globalThis.navigator, 'userAgent', {
          configurable: true,
          value: originalUA,
        })
      }
    })

    it('skips resizing when no textarea element is available', () => {
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} autoResize value="draft" onMentionsChange={() => undefined}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any
      instance.inputElement = null
      const before = instance._autoResizeFrame

      act(() => {
        instance.resetTextareaHeight()
      })

      expect(instance._autoResizeFrame).toBe(before)
      unmount()
    })

    it('derives the height even when getComputedStyle is unavailable', () => {
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} autoResize value="draft" onMentionsChange={() => undefined}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any
      const textarea = document.createElement('textarea')
      Object.defineProperty(textarea, 'scrollHeight', { value: 42, configurable: true })
      instance.inputElement = textarea

      const originalGetComputedStyle = globalThis.getComputedStyle
      ;(globalThis as any).getComputedStyle = undefined

      act(() => {
        instance.resetTextareaHeight()
      })

      expect(textarea.style.height).toBe('42px')
      ;(globalThis as any).getComputedStyle = originalGetComputedStyle
      unmount()
    })

    it('retains inline sizing when window is undefined during resize', () => {
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} autoResize value="draft" onMentionsChange={() => undefined}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any
      const textarea = document.createElement('textarea')
      Object.defineProperty(textarea, 'scrollHeight', { value: 24, configurable: true })
      instance.inputElement = textarea

      const originalWindow = globalThis.window
      ;(globalThis as any).window = undefined

      act(() => {
        instance.resetTextareaHeight()
      })

      expect(textarea.style.height).not.toBe('')
      ;(globalThis as any).window = originalWindow
      unmount()
    })

    it('applies the scheduled follow-up resize on the next animation frame', () => {
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} autoResize value="draft" onMentionsChange={() => undefined}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any
      const textarea = screen.getByRole<HTMLTextAreaElement>('combobox')
      let scrollHeight = 24
      Object.defineProperty(textarea, 'scrollHeight', {
        configurable: true,
        get: () => scrollHeight,
      })

      const callbacks: FrameRequestCallback[] = []
      const originalRAF = globalThis.requestAnimationFrame
      const originalCAF = globalThis.cancelAnimationFrame
      Object.defineProperty(globalThis, 'requestAnimationFrame', {
        configurable: true,
        writable: true,
        value: (callback: FrameRequestCallback) => {
          callbacks.push(callback)
          return callbacks.length
        },
      })
      Object.defineProperty(globalThis, 'cancelAnimationFrame', {
        configurable: true,
        writable: true,
        value: vi.fn(),
      })

      try {
        act(() => {
          instance.resetTextareaHeight()
        })

        scrollHeight = 60

        act(() => {
          for (const callback of callbacks.splice(0)) {
            callback(0)
          }
        })

        expect(instance._autoResizeFrame).toBeNull()
        expect(textarea.style.height).not.toBe('')
      } finally {
        Object.defineProperty(globalThis, 'requestAnimationFrame', {
          configurable: true,
          writable: true,
          value: originalRAF,
        })
        Object.defineProperty(globalThis, 'cancelAnimationFrame', {
          configurable: true,
          writable: true,
          value: originalCAF,
        })
        unmount()
      }
    })
  })

  describe('custom cut/copy/paste', () => {
    const plainTextValue = "Hi First, \n\nlet's add Second to the conversation."
    const value = "Hi @[First](first), \n\nlet's add @[Second](second) to the conversation."

    it.each(['cut', 'copy'])(
      'should include the whole mention for a "%s" event when the selection starts in one.',
      (eventType) => {
        render(
          <MentionsInput value={value}>
            <Mention trigger="@[__display__](__id__)" data={data} />
          </MentionsInput>
        )

        const textarea = screen.getByRole('combobox')

        const selectionStart = plainTextValue.indexOf('First') + 2
        const selectionEnd = plainTextValue.length

        textarea.setSelectionRange(selectionStart, selectionEnd)
        fireEvent.select(textarea, {
          target: { selectionStart, selectionEnd },
        })

        const setData = vi.fn()

        const event = new Event(eventType, { bubbles: true })
        event.clipboardData = { setData }

        fireEvent(textarea, event)

        expect(setData).toHaveBeenCalledTimes(2)

        expect(setData).toHaveBeenNthCalledWith(
          1,
          'text/plain',
          plainTextValue.slice(selectionStart, selectionEnd)
        )
        expect(setData).toHaveBeenNthCalledWith(
          2,
          'text/react-mentions',
          "@[First](first), \n\nlet's add @[Second](second) to the conversation."
        )
      }
    )

    it.each(['cut', 'copy'])(
      'should include the whole mention for a "%s" event when the selection ends in one.',
      (eventType) => {
        render(
          <MentionsInput value={value}>
            <Mention trigger="@[__display__](__id__)" data={data} />
          </MentionsInput>
        )

        const textarea = screen.getByRole('combobox')

        const selectionStart = 0
        const selectionEnd = plainTextValue.indexOf('Second') + 2

        textarea.setSelectionRange(selectionStart, selectionEnd)
        fireEvent.select(textarea, {
          target: { selectionStart, selectionEnd },
        })

        const setData = vi.fn()

        const event = new Event(eventType, { bubbles: true })
        event.clipboardData = { setData }

        fireEvent(textarea, event)

        expect(setData).toHaveBeenCalledTimes(2)

        expect(setData).toHaveBeenNthCalledWith(
          1,
          'text/plain',
          plainTextValue.slice(selectionStart, selectionEnd)
        )
        expect(setData).toHaveBeenNthCalledWith(
          2,
          'text/react-mentions',
          "Hi @[First](first), \n\nlet's add @[Second](second)"
        )
      }
    )

    it.each(['cut', 'copy'])(
      'should fallback to the browsers behavior if the "%s" event does not support clipboardData',
      (eventType) => {
        // IE 11 has no clipboardData attached to the event and only supports mime type "text"
        // therefore, the new mechanism should ignore those events and let the browser handle them
        render(
          <MentionsInput value={value}>
            <Mention trigger="@[__display__](__id__)" data={data} />
          </MentionsInput>
        )

        const textarea = screen.getByRole('combobox')

        const selectionStart = plainTextValue.indexOf('First') + 2
        const selectionEnd = plainTextValue.length

        textarea.setSelectionRange(selectionStart, selectionEnd)
        fireEvent.select(textarea, {
          target: { selectionStart, selectionEnd },
        })

        const preventDefault = vi.fn()
        const event = new Event(eventType, { bubbles: true })
        event.preventDefault = preventDefault

        fireEvent(textarea, event)

        expect(preventDefault).not.toHaveBeenCalled()
      }
    )

    it('should remove a leading mention from the value when the text is cut.', () => {
      const onMentionsChange = vi.fn()
      const onRemove = vi.fn()

      render(
        <MentionsInput value={value} onMentionsChange={onMentionsChange}>
          <Mention trigger="@[__display__](__id__)" data={data} onRemove={onRemove} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')

      const selectionStart = plainTextValue.indexOf('First') + 2
      const selectionEnd = plainTextValue.indexOf('First') + 'First'.length + 5

      textarea.setSelectionRange(selectionStart, selectionEnd)
      fireEvent.select(textarea, {
        target: { selectionStart, selectionEnd },
      })

      const event = new Event('cut', { bubbles: true })
      event.clipboardData = { setData: vi.fn() }

      expect(onMentionsChange).not.toHaveBeenCalled()

      fireEvent(textarea, event)

      expect(onMentionsChange).toHaveBeenCalledTimes(1)

      const {
        value: newValue,
        plainTextValue: newPlainTextValue,
        trigger,
        previousValue,
        mentionId,
      } = getLastMentionsChange(onMentionsChange)
      expect(trigger.type).toBe('mention-remove')
      expect(previousValue).toBe(value)
      expect(mentionId).toBe('first')
      expect(onRemove).toHaveBeenCalledTimes(1)
      expect(onRemove).toHaveBeenCalledWith('first')
      expect(newValue).toMatchSnapshot()
      expect(newPlainTextValue).toMatchSnapshot()
    })

    it('should remove a trailing mention from the value when the text is cut.', () => {
      const onMentionsChange = vi.fn()
      const onRemove = vi.fn()

      render(
        <MentionsInput value={value} onMentionsChange={onMentionsChange}>
          <Mention trigger="@[__display__](__id__)" data={data} onRemove={onRemove} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')

      const selectionStart = plainTextValue.indexOf('First') + 'First'.length
      const selectionEnd = plainTextValue.indexOf('Second') + 2

      textarea.setSelectionRange(selectionStart, selectionEnd)
      fireEvent.select(textarea, {
        target: { selectionStart, selectionEnd },
      })

      const event = new Event('cut', { bubbles: true })
      event.clipboardData = { setData: vi.fn() }

      expect(onMentionsChange).not.toHaveBeenCalled()

      fireEvent(textarea, event)

      expect(onMentionsChange).toHaveBeenCalledTimes(1)

      const {
        value: newValue,
        plainTextValue: newPlainTextValue,
        trigger,
        previousValue,
        mentionId,
      } = getLastMentionsChange(onMentionsChange)
      expect(trigger.type).toBe('mention-remove')
      expect(previousValue).toBe(value)
      expect(mentionId).toBe('second')
      expect(onRemove).toHaveBeenCalledTimes(1)
      expect(onRemove).toHaveBeenCalledWith('second')
      expect(newValue).toMatchSnapshot()
      expect(newPlainTextValue).toMatchSnapshot()
    })

    it('should restore the caret to the start of the cut selection.', async () => {
      const onMentionsChange = vi.fn()

      render(
        <MentionsInput value={value} onMentionsChange={onMentionsChange}>
          <Mention trigger="@[__display__](__id__)" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')

      const selectionStart = plainTextValue.indexOf('First') + 2
      const selectionEnd = plainTextValue.indexOf('First') + 'First'.length + 5

      textarea.setSelectionRange(selectionStart, selectionEnd)
      expect(textarea.selectionStart).toBe(selectionStart)
      expect(textarea.selectionEnd).toBe(selectionEnd)

      fireEvent.select(textarea, {
        target: { selectionStart, selectionEnd },
      })

      const event = new Event('cut', { bubbles: true })
      event.clipboardData = { setData: vi.fn() }

      fireEvent(textarea, event)

      await waitFor(() => {
        expect(onMentionsChange).toHaveBeenCalledTimes(1)
      })

      await waitFor(() => {
        expect(textarea.selectionStart).toBe(selectionStart)
        expect(textarea.selectionEnd).toBe(selectionStart)
      })
    })

    it('should read mentions markup from a paste event.', () => {
      const onMentionsChange = vi.fn()

      render(
        <MentionsInput value={value} onMentionsChange={onMentionsChange}>
          <Mention trigger="@[__display__](__id__)" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')

      const pastedText = 'Not forget about @[Third](third)!'

      const event = new Event('paste', { bubbles: true })
      event.clipboardData = {
        getData: vi.fn((type) => (type === 'text/react-mentions' ? pastedText : '')),
      }

      expect(onMentionsChange).not.toHaveBeenCalled()

      fireEvent(textarea, event)

      expect(onMentionsChange).toHaveBeenCalledTimes(1)

      const {
        value: newValue,
        plainTextValue: newPlainTextValue,
        trigger,
        previousValue,
      } = getLastMentionsChange(onMentionsChange)

      expect(trigger.type).toBe('paste')
      expect(previousValue).toBe(value)
      expect(newValue).toMatchSnapshot()
      expect(newPlainTextValue).toMatchSnapshot()
    })

    it('should default to the standard pasted text.', () => {
      const onMentionsChange = vi.fn()

      render(
        <MentionsInput value={value} onMentionsChange={onMentionsChange}>
          <Mention trigger="@[__display__](__id__)" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')

      const pastedText = 'Not forget about @[Third](third)!'

      const event = new Event('paste', { bubbles: true })
      event.clipboardData = {
        getData: vi.fn((type) => (type === 'text/plain' ? pastedText : '')),
      }

      expect(onMentionsChange).not.toHaveBeenCalled()

      fireEvent(textarea, event)

      expect(onMentionsChange).toHaveBeenCalledTimes(1)

      const {
        value: newValue,
        plainTextValue: newPlainTextValue,
        trigger,
        previousValue,
      } = getLastMentionsChange(onMentionsChange)

      expect(trigger.type).toBe('paste')
      expect(previousValue).toBe(value)
      expect(newValue).toMatchSnapshot()
      expect(newPlainTextValue).toMatchSnapshot()
    })

    it('emits mention-remove when paste replaces an existing mention.', () => {
      const onMentionsChange = vi.fn()
      const onRemove = vi.fn()

      render(
        <MentionsInput value={value} onMentionsChange={onMentionsChange}>
          <Mention trigger="@[__display__](__id__)" data={data} onRemove={onRemove} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')
      const selectionStart = plainTextValue.indexOf('First')
      const selectionEnd = selectionStart + 'First'.length

      textarea.setSelectionRange(selectionStart, selectionEnd)
      fireEvent.select(textarea, {
        target: { selectionStart, selectionEnd },
      })

      const event = new Event('paste', { bubbles: true })
      event.clipboardData = {
        getData: vi.fn((type) => (type === 'text/plain' ? 'Replacement' : '')),
      }

      fireEvent(textarea, event)

      const payload = getLastMentionsChange(onMentionsChange)
      expect(payload.trigger.type).toBe('mention-remove')
      expect(payload.mentionId).toBe('first')
      expect(onRemove).toHaveBeenCalledWith('first')
    })

    it('emits mention-remove when replacement mentions would collide under colon-joined keys.', () => {
      const onMentionsChange = vi.fn()
      const onRemove = vi.fn()

      render(
        <MentionsInput value="@[c](a:b)" onMentionsChange={onMentionsChange}>
          <Mention trigger="@[__display__](__id__)" data={data} onRemove={onRemove} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')
      textarea.setSelectionRange(0, 1)
      fireEvent.select(textarea, {
        target: { selectionStart: 0, selectionEnd: 1 },
      })

      const event = new Event('paste', { bubbles: true })
      event.clipboardData = {
        getData: vi.fn((type) => {
          if (type === 'text/react-mentions') {
            return '@[b:c](a)'
          }

          if (type === 'text/plain') {
            return 'b:c'
          }

          return ''
        }),
      }

      fireEvent(textarea, event)

      const payload = getLastMentionsChange(onMentionsChange)
      expect(payload.trigger.type).toBe('mention-remove')
      expect(payload.mentionId).toBe('a:b')
      expect(payload.value).toBe('@[b:c](a)')
      expect(onRemove).toHaveBeenCalledWith('a:b')
    })

    it('should remove carriage returns from pasted values', () => {
      const pastedText = "Hi First, \r\n\r\nlet's add Second to the conversation."

      const event = new Event('paste', { bubbles: true })

      event.clipboardData = {
        getData: vi.fn((type) => (type === 'text/plain' ? pastedText : '')),
      }

      const onMentionsChange = vi.fn()

      render(
        <MentionsInput value="" onMentionsChange={onMentionsChange}>
          <Mention trigger="@[__display__](__id__)" data={data} />
        </MentionsInput>
      )

      expect(onMentionsChange).not.toHaveBeenCalled()

      const textarea = screen.getByRole('combobox')

      fireEvent(textarea, event)

      const {
        value: newValue,
        plainTextValue: newPlainTextValue,
        trigger,
        previousValue,
      } = getLastMentionsChange(onMentionsChange)

      expect(trigger.type).toBe('paste')
      expect(previousValue).toBe('')
      expect(newValue).toEqual("Hi First, \n\nlet's add Second to the conversation.")

      expect(newPlainTextValue).toEqual("Hi First, \n\nlet's add Second to the conversation.")
    })

    it('should fallback to the browsers behaviour if the "paste" event does not support clipboardData', () => {
      // IE 11 has no clipboardData attached to the event and only supports mime type "text"
      // therefore, the new mechanism should ignore those events and let the browser handle them
      render(
        <MentionsInput value={value}>
          <Mention trigger="@[__display__](__id__)" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')

      const selectionStart = plainTextValue.indexOf('First') + 2
      const selectionEnd = plainTextValue.length

      textarea.setSelectionRange(selectionStart, selectionEnd)
      fireEvent.select(textarea, {
        target: { selectionStart, selectionEnd },
      })

      const preventDefault = vi.fn()
      const event = new Event('paste', { bubbles: true })
      event.preventDefault = preventDefault

      fireEvent(textarea, event)

      expect(preventDefault).not.toHaveBeenCalled()
    })
  })

  describe('insertText', () => {
    it('inserts plain text at the current caret position', async () => {
      const ref = React.createRef<MentionsInput>()

      function ControlledMentionsInput() {
        const [value, setValue] = React.useState('Hello world')

        return (
          <MentionsInput
            ref={ref}
            value={value}
            onMentionsChange={({ value: nextValue }) => setValue(nextValue)}
          >
            <Mention trigger="@" data={data} />
          </MentionsInput>
        )
      }

      render(<ControlledMentionsInput />)

      const textarea = screen.getByRole<HTMLTextAreaElement>('combobox')
      textarea.setSelectionRange('Hello'.length, 'Hello'.length)

      act(() => {
        ref.current?.insertText(', typed')
      })

      await waitFor(() => {
        expect(textarea).toHaveValue('Hello, typed world')
        expect(textarea.selectionStart).toBe('Hello, typed'.length)
        expect(textarea.selectionEnd).toBe('Hello, typed'.length)
      })
    })

    it('replaces the current selection', async () => {
      const ref = React.createRef<MentionsInput>()

      function ControlledMentionsInput() {
        const [value, setValue] = React.useState('Hello world')

        return (
          <MentionsInput
            ref={ref}
            value={value}
            onMentionsChange={({ value: nextValue }) => setValue(nextValue)}
          >
            <Mention trigger="@" data={data} />
          </MentionsInput>
        )
      }

      render(<ControlledMentionsInput />)

      const textarea = screen.getByRole<HTMLTextAreaElement>('combobox')
      const selectionStart = 'Hello '.length
      const selectionEnd = 'Hello world'.length
      textarea.setSelectionRange(selectionStart, selectionEnd)

      act(() => {
        ref.current?.insertText('there')
      })

      await waitFor(() => {
        expect(textarea).toHaveValue('Hello there')
        expect(textarea.selectionStart).toBe('Hello there'.length)
        expect(textarea.selectionEnd).toBe('Hello there'.length)
      })
    })

    it('emits mention-remove when inserted text replaces a mention', () => {
      const ref = React.createRef<MentionsInput>()
      const onMentionsChange = vi.fn()
      const onRemove = vi.fn()

      render(
        <MentionsInput ref={ref} value="Hello @[First](first)" onMentionsChange={onMentionsChange}>
          <Mention trigger="@[__display__](__id__)" data={data} onRemove={onRemove} />
        </MentionsInput>
      )

      const textarea = screen.getByRole<HTMLTextAreaElement>('combobox')
      const selectionStart = 'Hello '.length
      const selectionEnd = 'Hello First'.length
      textarea.setSelectionRange(selectionStart, selectionEnd)

      act(() => {
        ref.current?.insertText('replacement')
      })

      const payload = getLastMentionsChange(onMentionsChange)
      expect(payload.trigger.type).toBe('mention-remove')
      expect(payload.mentionId).toBe('first')
      expect(payload.value).toBe('Hello replacement')
      expect(onRemove).toHaveBeenCalledWith('first')
    })

    it('emits insert-text changes, refreshes suggestions, and supports typed refs', async () => {
      const ref = React.createRef<MentionsInput>()
      const onMentionsChange = vi.fn()

      function ControlledMentionsInput() {
        const [value, setValue] = React.useState('Hello')

        return (
          <MentionsInput
            ref={ref}
            value={value}
            onMentionsChange={(change) => {
              onMentionsChange(change)
              setValue(change.value)
            }}
          >
            <Mention trigger="@" data={data} />
          </MentionsInput>
        )
      }

      render(<ControlledMentionsInput />)

      const textarea = screen.getByRole<HTMLTextAreaElement>('combobox')
      textarea.setSelectionRange('Hello'.length, 'Hello'.length)

      act(() => {
        ref.current?.insertText(' @')
      })

      const payload = getLastMentionsChange(onMentionsChange)
      expect(payload.trigger.type).toBe('insert-text')
      expect(payload.value).toBe('Hello @')
      expect(payload.plainTextValue).toBe('Hello @')

      await waitFor(() => {
        expect(textarea).toHaveValue('Hello @')
      })

      await waitFor(() => {
        expect(screen.getAllByRole('option', { hidden: true })).toHaveLength(data.length)
      })
    })
  })

  describe('mention selection change', () => {
    const mentionMarkup = '@[First](first)'
    const mentionDisplay = 'First'
    const defaultValue = `${mentionMarkup} remainder`

    const renderMentionsInput = (
      props: Partial<React.ComponentProps<typeof MentionsInput>> = {},
      value: string = defaultValue
    ) => {
      const utils = render(
        <MentionsInput value={value} {...props}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')
      fireEvent.focus(textarea)
      return { textarea, ...utils }
    }

    it('reports inside and boundary for caret placements within a mention', async () => {
      const onMentionSelectionChange = vi.fn()
      const { textarea } = renderMentionsInput({ onMentionSelectionChange })

      const expectedPlainTextValue = `${mentionDisplay} remainder`
      const expectedIdValue = `${data[0].id} remainder`

      onMentionSelectionChange.mockClear()
      textarea.setSelectionRange(2, 2)
      fireEvent.select(textarea)

      await waitFor(() => expect(onMentionSelectionChange).toHaveBeenCalledTimes(1))
      let selections = onMentionSelectionChange.mock.calls[0][0] as Array<Record<string, unknown>>
      const firstContext = onMentionSelectionChange.mock.calls[0][1] as Record<string, unknown>
      expect(selections).toHaveLength(1)
      expect(selections[0]).toMatchObject({
        id: 'first',
        selection: 'inside',
        plainTextStart: 0,
        plainTextEnd: mentionDisplay.length,
      })
      expect(firstContext).toMatchObject({
        mentionId: 'first',
        mentionIds: ['first'],
        value: defaultValue,
        plainTextValue: expectedPlainTextValue,
        idValue: expectedIdValue,
      })

      onMentionSelectionChange.mockClear()
      textarea.setSelectionRange(0, 0)
      fireEvent.select(textarea)

      await waitFor(() => expect(onMentionSelectionChange).toHaveBeenCalledTimes(1))
      selections = onMentionSelectionChange.mock.calls[0][0] as Array<Record<string, unknown>>
      const secondContext = onMentionSelectionChange.mock.calls[0][1] as Record<string, unknown>
      expect(selections).toHaveLength(1)
      expect(selections[0]).toMatchObject({
        selection: 'boundary',
      })
      expect(secondContext).toMatchObject({
        mentionId: 'first',
        mentionIds: ['first'],
        value: defaultValue,
        plainTextValue: expectedPlainTextValue,
        idValue: expectedIdValue,
      })

      onMentionSelectionChange.mockClear()
      const mentionEnd = mentionDisplay.length
      textarea.setSelectionRange(mentionEnd, mentionEnd)
      fireEvent.select(textarea)

      await waitFor(() => expect(onMentionSelectionChange).toHaveBeenCalledTimes(1))
      selections = onMentionSelectionChange.mock.calls[0][0] as Array<Record<string, unknown>>
      const thirdContext = onMentionSelectionChange.mock.calls[0][1] as Record<string, unknown>
      expect(selections).toHaveLength(1)
      expect(selections[0]).toMatchObject({
        selection: 'boundary',
        plainTextEnd: mentionEnd,
      })
      expect(thirdContext).toMatchObject({
        mentionId: 'first',
        mentionIds: ['first'],
        value: defaultValue,
        plainTextValue: expectedPlainTextValue,
        idValue: expectedIdValue,
      })
    })

    it('classifies range selections as partial and full', async () => {
      const onMentionSelectionChange = vi.fn()
      const { textarea } = renderMentionsInput({ onMentionSelectionChange })
      const expectedIdValue = `${data[0].id} remainder`

      onMentionSelectionChange.mockClear()
      textarea.setSelectionRange(1, mentionDisplay.length - 1)
      fireEvent.select(textarea)

      await waitFor(() => expect(onMentionSelectionChange).toHaveBeenCalledTimes(1))
      let selections = onMentionSelectionChange.mock.calls[0][0] as Array<Record<string, unknown>>
      const partialContext = onMentionSelectionChange.mock.calls[0][1] as Record<string, unknown>
      expect(selections).toHaveLength(1)
      expect(selections[0]).toMatchObject({
        selection: 'partial',
      })
      expect(partialContext).toMatchObject({
        mentionId: 'first',
        mentionIds: ['first'],
        idValue: expectedIdValue,
      })

      onMentionSelectionChange.mockClear()
      textarea.setSelectionRange(0, mentionDisplay.length)
      fireEvent.select(textarea)

      await waitFor(() => expect(onMentionSelectionChange).toHaveBeenCalledTimes(1))
      selections = onMentionSelectionChange.mock.calls[0][0] as Array<Record<string, unknown>>
      const fullContext = onMentionSelectionChange.mock.calls[0][1] as Record<string, unknown>
      expect(selections).toHaveLength(1)
      expect(selections[0]).toMatchObject({
        selection: 'full',
      })
      expect(fullContext).toMatchObject({
        mentionId: 'first',
        mentionIds: ['first'],
        idValue: expectedIdValue,
      })
    })

    it('updates highlighted mentions with selection attributes', async () => {
      const { textarea, container } = renderMentionsInput()
      const mentionEnd = mentionDisplay.length

      textarea.setSelectionRange(2, 2)
      fireEvent.select(textarea)

      await waitFor(() => {
        const highlighted = container.querySelector(
          '[data-slot="highlighter"] [data-mention-selection]'
        )
        expect(highlighted).not.toBeNull()
        expect(highlighted).toHaveAttribute('data-mention-selection', 'inside')
      })

      textarea.setSelectionRange(mentionEnd + 1, mentionEnd + 1)
      fireEvent.select(textarea)

      await waitFor(() => {
        const highlighted = container.querySelector(
          '[data-slot="highlighter"] [data-mention-selection]'
        )
        expect(highlighted).toBeNull()
      })

      textarea.setSelectionRange(mentionEnd, mentionEnd)
      fireEvent.select(textarea)

      await waitFor(() => {
        const highlighted = container.querySelector(
          '[data-slot="highlighter"] [data-mention-selection]'
        )
        expect(highlighted).not.toBeNull()
        expect(highlighted).toHaveAttribute('data-mention-selection', 'boundary')
      })
    })

    it('keeps the highlighter selection map in sync with the latest value', async () => {
      const initialValue = '@[First](first) @[Second](second)'
      const updatedValue =
        '@[First](first) akjsakshkadjkahsdkahsdkhajakhsdkhajhsdkahand @[Second](second)'

      const { container, rerender } = render(
        <MentionsInput value={initialValue}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')
      fireEvent.focus(textarea)

      const moveCaretInside = async (label: string) => {
        const displayIndex = textarea.value.indexOf(label)
        expect(displayIndex).toBeGreaterThanOrEqual(0)
        const caretIndex = displayIndex + Math.min(2, label.length - 1)
        textarea.setSelectionRange(caretIndex, caretIndex)
        fireEvent.select(textarea)
        await waitFor(() => {
          const highlighted = container.querySelector(
            '[data-slot="highlighter"] [data-mention-selection]'
          )
          expect(highlighted).not.toBeNull()
          expect(highlighted).toHaveTextContent(label)
        })
      }

      await moveCaretInside('Second')

      rerender(
        <MentionsInput value={updatedValue}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      await moveCaretInside('Second')
    })

    it('refreshes cached mentions when the value prop changes', async () => {
      const onMentionSelectionChange = vi.fn()
      const initialValue = '@[First](first) remainder'
      const updatedValue = '@[Second](second) remainder'

      const { rerender } = render(
        <MentionsInput value={initialValue} onMentionSelectionChange={onMentionSelectionChange}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')
      fireEvent.focus(textarea)

      const initialIndex = textarea.value.indexOf('First') + 1
      expect(initialIndex).toBeGreaterThan(0)
      textarea.setSelectionRange(initialIndex, initialIndex)
      fireEvent.select(textarea)

      await waitFor(() => expect(onMentionSelectionChange).toHaveBeenCalled())
      const firstSelection = onMentionSelectionChange.mock.calls.at(-1)?.[0]
      expect(firstSelection?.[0]?.display).toBe('First')

      onMentionSelectionChange.mockClear()
      rerender(
        <MentionsInput value={updatedValue} onMentionSelectionChange={onMentionSelectionChange}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const updatedIndex = textarea.value.indexOf('Second') + 1
      expect(updatedIndex).toBeGreaterThan(0)
      textarea.setSelectionRange(updatedIndex, updatedIndex)
      fireEvent.select(textarea)

      await waitFor(() => expect(onMentionSelectionChange).toHaveBeenCalled())
      const secondSelection = onMentionSelectionChange.mock.calls[0][0]
      expect(secondSelection?.[0]?.display).toBe('Second')
    })

    it('reuses cached mentions for caret-only updates', async () => {
      const getMentionsAndPlainTextSpy = vi.spyOn(utils, 'getMentionsAndPlainText')
      try {
        const onMentionSelectionChange = vi.fn()
        const { textarea } = renderMentionsInput({
          onMentionSelectionChange,
        })

        await waitFor(() => expect(getMentionsAndPlainTextSpy).toHaveBeenCalled())
        getMentionsAndPlainTextSpy.mockClear()
        onMentionSelectionChange.mockClear()

        textarea.setSelectionRange(2, 2)
        fireEvent.select(textarea)

        await waitFor(() => expect(onMentionSelectionChange).toHaveBeenCalledTimes(1))
        expect(getMentionsAndPlainTextSpy).not.toHaveBeenCalled()
      } finally {
        getMentionsAndPlainTextSpy.mockRestore()
      }
    })

    it('does not reparse stable mention children on selection-only updates', async () => {
      const collectMentionElementsSpy = vi.spyOn(
        readConfigFromChildrenModule,
        'collectMentionElements'
      )

      try {
        const stableChildren = [<Mention key="mention" trigger="@" data={data} />]

        render(<MentionsInput value="@a">{stableChildren}</MentionsInput>)

        const textarea = screen.getByRole('combobox')
        fireEvent.focus(textarea)

        await waitFor(() => {
          expect(collectMentionElementsSpy).toHaveBeenCalled()
        })

        collectMentionElementsSpy.mockClear()

        act(() => {
          textarea.setSelectionRange(1, 1)
          fireEvent.select(textarea)
        })

        expect(collectMentionElementsSpy).not.toHaveBeenCalled()
      } finally {
        collectMentionElementsSpy.mockRestore()
      }
    })

    it('recomputes mention selection state when the mention config changes without moving the caret', async () => {
      const onMentionSelectionChange = vi.fn()
      const initialValue = '@[First](first) and more text'
      const { rerender } = render(
        <MentionsInput value={initialValue} onMentionSelectionChange={onMentionSelectionChange}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')
      fireEvent.focus(textarea)
      textarea.setSelectionRange(2, 2)
      fireEvent.select(textarea)

      await waitFor(() => expect(onMentionSelectionChange).toHaveBeenCalled())
      expect(onMentionSelectionChange.mock.calls.at(-1)?.[0]).toHaveLength(1)

      onMentionSelectionChange.mockClear()

      rerender(
        <MentionsInput value={initialValue} onMentionSelectionChange={onMentionSelectionChange}>
          <Mention trigger="#" data={data} />
        </MentionsInput>
      )

      await waitFor(() => expect(onMentionSelectionChange).toHaveBeenCalledTimes(1))
      expect(onMentionSelectionChange.mock.calls[0][0]).toHaveLength(0)
    })

    it('clears cached mentions when the mention config changes', async () => {
      const getMentionsAndPlainTextSpy = vi.spyOn(utils, 'getMentionsAndPlainText')
      try {
        const onMentionSelectionChange = vi.fn()
        const initialValue = '@[First](first) and more text'
        const { rerender } = render(
          <MentionsInput value={initialValue} onMentionSelectionChange={onMentionSelectionChange}>
            <Mention trigger="@" data={data} />
          </MentionsInput>
        )

        const textarea = screen.getByRole('combobox')
        fireEvent.focus(textarea)
        textarea.setSelectionRange(2, 2)
        fireEvent.select(textarea)

        await waitFor(() => expect(onMentionSelectionChange).toHaveBeenCalled())

        getMentionsAndPlainTextSpy.mockClear()
        onMentionSelectionChange.mockClear()

        rerender(
          <MentionsInput value={initialValue} onMentionSelectionChange={onMentionSelectionChange}>
            <Mention trigger="#" data={data} />
          </MentionsInput>
        )

        textarea.setSelectionRange(2, 2)
        fireEvent.select(textarea)

        await waitFor(() => expect(onMentionSelectionChange).toHaveBeenCalledTimes(1))
        expect(onMentionSelectionChange.mock.calls[0][0]).toHaveLength(0)
        expect(getMentionsAndPlainTextSpy).toHaveBeenCalled()
      } finally {
        getMentionsAndPlainTextSpy.mockRestore()
      }
    })

    it('merges async suggestion results from multiple matching children', async () => {
      interface DeferredResult {
        resolve: (value: Array<{ id: string; display: string }>) => void
      }

      const requests = new Map<string, DeferredResult>()
      const firstAsyncData = vi.fn(
        () =>
          new Promise<Array<{ id: string; display: string }>>((resolve) => {
            requests.set('first', { resolve })
          })
      )
      const secondAsyncData = vi.fn(
        () =>
          new Promise<Array<{ id: string; display: string }>>((resolve) => {
            requests.set('second', { resolve })
          })
      )

      render(
        <MentionsInput value="@a">
          <Mention trigger={/(@([a-z]*))$/} data={firstAsyncData} />
          <Mention trigger={/(@([\da-z]*))$/} data={secondAsyncData} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')
      fireEvent.focus(textarea)
      textarea.setSelectionRange(2, 2)
      fireEvent.select(textarea)

      await waitFor(() => {
        expect(firstAsyncData).toHaveBeenCalledWith(
          'a',
          expect.objectContaining({ signal: expect.any(Object) })
        )
        expect(secondAsyncData).toHaveBeenCalledWith(
          'a',
          expect.objectContaining({ signal: expect.any(Object) })
        )
      })

      await act(async () => {
        requests.get('first')?.resolve([{ id: 'alpha', display: 'Alpha' }])
        requests.get('second')?.resolve([{ id: 'beta', display: 'Beta' }])
        await Promise.resolve()
        await Promise.resolve()
      })

      await waitFor(() => {
        expect(screen.getByText('Alpha')).toBeInTheDocument()
        expect(screen.getByText('Beta')).toBeInTheDocument()
      })
    })

    it('preserves successful async suggestions when a sibling query rejects', async () => {
      interface DeferredResult {
        resolve: (value: Array<{ id: string; display: string }>) => void
        reject: (reason?: unknown) => void
      }

      const requests = new Map<string, DeferredResult>()
      const firstAsyncData = vi.fn(
        () =>
          new Promise<Array<{ id: string; display: string }>>((resolve, reject) => {
            requests.set('first', { resolve, reject })
          })
      )
      const secondAsyncData = vi.fn(
        () =>
          new Promise<Array<{ id: string; display: string }>>((resolve, reject) => {
            requests.set('second', { resolve, reject })
          })
      )

      render(
        <MentionsInput value="@a">
          <Mention trigger={/(@([a-z]*))$/} data={firstAsyncData} />
          <Mention trigger={/(@([\da-z]*))$/} data={secondAsyncData} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')
      fireEvent.focus(textarea)
      textarea.setSelectionRange(2, 2)
      fireEvent.select(textarea)

      await waitFor(() => {
        expect(firstAsyncData).toHaveBeenCalledWith(
          'a',
          expect.objectContaining({ signal: expect.any(Object) })
        )
        expect(secondAsyncData).toHaveBeenCalledWith(
          'a',
          expect.objectContaining({ signal: expect.any(Object) })
        )
      })

      await act(async () => {
        requests.get('first')?.resolve([{ id: 'alpha', display: 'Alpha' }])
        requests.get('second')?.reject(new Error('load failed'))
        await Promise.resolve()
        await Promise.resolve()
      })

      await waitFor(() => {
        expect(screen.getByText('Alpha')).toBeInTheDocument()
      })
      expect(screen.queryByText('Unable to load suggestions')).not.toBeInTheDocument()
    })

    it('returns multiple selections when a range overlaps several mentions', async () => {
      const onMentionSelectionChange = vi.fn()
      const valueWithTwoMentions = '@[First](first) and @[Second](second) together'
      const { textarea } = renderMentionsInput({ onMentionSelectionChange }, valueWithTwoMentions)

      textarea.setSelectionRange(0, valueWithTwoMentions.indexOf('Second') + 2)
      fireEvent.select(textarea)

      await waitFor(() => expect(onMentionSelectionChange).toHaveBeenCalledTimes(1))
      const selections = onMentionSelectionChange.mock.calls[0][0] as Array<Record<string, unknown>>
      const context = onMentionSelectionChange.mock.calls[0][1] as Record<string, unknown>
      expect(selections).toHaveLength(2)
      expect(selections[0]).toMatchObject({ id: 'first' })
      expect(selections[1]).toMatchObject({ id: 'second' })
      expect(context).toMatchObject({
        mentionId: undefined,
        mentionIds: ['first', 'second'],
        idValue: 'first and second together',
      })
    })
  })

  describe('inline autocomplete', () => {
    const inlineData = [
      { id: 'alice', display: 'Alice' },
      { id: 'alistair', display: 'Alistair' },
    ]
    const inlineValue = '@ali'

    const renderInlineMentionsInput = (
      props: Partial<React.ComponentProps<typeof MentionsInput>> = {},
      valueOverride?: string
    ) => {
      const initialValue = valueOverride ?? inlineValue

      function Wrapper() {
        const [value, setValue] = React.useState(initialValue)

        return (
          <MentionsInput
            value={value}
            onMentionsChange={({ value: nextValue }) => setValue(nextValue)}
            suggestionsDisplay="inline"
            {...props}
          >
            <Mention trigger="@" data={inlineData} />
          </MentionsInput>
        )
      }

      render(<Wrapper />)
      const textbox = screen.getByRole('combobox')
      fireEvent.focus(textbox)
      textbox.setSelectionRange(initialValue.length, initialValue.length)
      fireEvent.select(textbox)
      return textbox
    }

    it('shows a hint with remaining characters and no overlay', async () => {
      const combobox = renderInlineMentionsInput()

      await waitFor(() => {
        expect(screen.getByText('ce')).toBeInTheDocument()
      })

      expect(combobox).toHaveAttribute('role', 'combobox')
      expect(combobox).toHaveAttribute('aria-autocomplete', 'inline')
      expect(combobox).toHaveAttribute('aria-expanded', 'false')

      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
      expect(liveRegion).toHaveTextContent('Alice')

      const describedBy = combobox.getAttribute('aria-describedby')
      expect(describedBy).toBeTruthy()
      expect(describedBy).toContain(liveRegion.id)

      expect(screen.queryByRole('listbox')).toBeNull()
    })

    it('cycles to the next suggestion when pressing escape', async () => {
      const textbox = renderInlineMentionsInput()

      await waitFor(() => {
        expect(screen.getByText('ce')).toBeInTheDocument()
      })

      fireEvent.keyDown(textbox, { key: 'Escape', keyCode: 27 })

      await waitFor(() => {
        expect(screen.getByText('stair')).toBeInTheDocument()
      })
    })

    it('announces when no inline suggestions are available', async () => {
      const combobox = renderInlineMentionsInput({}, '@zz')

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('No inline suggestions available')
      })

      expect(combobox).not.toHaveAttribute('aria-describedby')
    })

    it('keeps inline completion visible while the next async query loads.', async () => {
      interface DeferredResult {
        resolve: (value: Array<{ id: string; display: string }>) => void
      }

      const requests = new Map<string, DeferredResult>()
      const asyncData = vi.fn(
        (query: string) =>
          new Promise<Array<{ id: string; display: string }>>((resolve) => {
            requests.set(query, { resolve })
          })
      )

      const { rerender } = render(
        <MentionsInput value="@a" suggestionsDisplay="inline">
          <Mention trigger="@" data={asyncData} />
        </MentionsInput>
      )

      const combobox = screen.getByRole('combobox')
      fireEvent.focus(combobox)
      combobox.setSelectionRange(2, 2)
      fireEvent.select(combobox)

      await waitFor(() => {
        expect(asyncData).toHaveBeenCalledWith(
          'a',
          expect.objectContaining({ signal: expect.any(Object) })
        )
      })

      requests.get('a')?.resolve([{ id: 'alpha', display: 'Alpha' }])

      await waitFor(() => {
        expect(screen.getByText('lpha')).toBeInTheDocument()
      })

      rerender(
        <MentionsInput value="@al" suggestionsDisplay="inline">
          <Mention trigger="@" data={asyncData} />
        </MentionsInput>
      )

      combobox.setSelectionRange(3, 3)
      fireEvent.select(combobox)

      await waitFor(() => {
        expect(asyncData).toHaveBeenCalledWith(
          'al',
          expect.objectContaining({ signal: expect.any(Object) })
        )
      })

      expect(screen.getByText('pha')).toBeInTheDocument()
      expect(screen.queryByText('lpha')).not.toBeInTheDocument()

      requests.get('al')?.resolve([{ id: 'alfred', display: 'Alfred' }])

      await waitFor(() => {
        expect(screen.getByText('fred')).toBeInTheDocument()
      })

      expect(screen.queryByText('pha')).not.toBeInTheDocument()
    })

    it('can accept the inline suggestion with Tab', async () => {
      const onMentionsChange = vi.fn()
      const textbox = renderInlineMentionsInput({ onMentionsChange })

      await waitFor(() => {
        expect(screen.getByText('ce')).toBeInTheDocument()
      })

      fireEvent.keyDown(textbox, { key: 'Tab', keyCode: 9 })

      await waitFor(() => {
        expect(onMentionsChange).toHaveBeenCalled()
      })

      const payload = getLastMentionsChange(onMentionsChange)
      expect(payload.value).toBe('@[Alice](alice)')
      expect(payload.plainTextValue).toBe('Alice')
      expect(payload.idValue).toBe('alice')
      expect(payload.mentions).toHaveLength(1)
      expect(payload.mentions[0]).toMatchObject({ id: 'alice' })
      expect(payload.mentionId).toBe('alice')
      expect(payload.trigger.type).toBe('mention-add')
    })

    it('renders stable SSR markup for inline autocomplete without generated ids.', () => {
      const firstRender = renderToString(
        <MentionsInput value="@ali" suggestionsDisplay="inline">
          <Mention trigger="@" data={inlineData} />
        </MentionsInput>
      )
      const secondRender = renderToString(
        <MentionsInput value="@ali" suggestionsDisplay="inline">
          <Mention trigger="@" data={inlineData} />
        </MentionsInput>
      )

      expect(firstRender).toBe(secondRender)
    })
  })

  describe('concurrent rendering', () => {
    const concurrentData = [
      { id: 'alpha', display: 'Alpha' },
      { id: 'beta', display: 'Beta' },
    ]

    function OverlayTransitionWrapper() {
      const [value, setValue] = React.useState('@')
      const [, startTransition] = React.useTransition()

      return (
        <MentionsInput
          value={value}
          onMentionsChange={({ value: nextValue }) => {
            startTransition(() => {
              setValue(nextValue)
            })
          }}
        >
          <Mention trigger="@" data={concurrentData} />
        </MentionsInput>
      )
    }

    it('keeps suggestions available while value updates inside startTransition', async () => {
      render(<OverlayTransitionWrapper />)

      const combobox = screen.getByRole('combobox')
      fireEvent.focus(combobox)
      combobox.setSelectionRange(1, 1)
      fireEvent.select(combobox)

      await waitFor(() => {
        const options = screen.getAllByRole('option', { hidden: true })
        expect(options).toHaveLength(concurrentData.length)
      })

      fireEvent.keyDown(combobox, { key: 'Enter', keyCode: 13 })

      await waitFor(() => {
        expect(combobox).toHaveValue('Alpha')
      })
      expect(screen.queryByRole('listbox')).toBeNull()
    })

    const inlineConcurrentData = [
      { id: 'alice', display: 'Alice' },
      { id: 'alistair', display: 'Alistair' },
    ]

    function InlineTransitionWrapper() {
      const [value, setValue] = React.useState('@ali')
      const [, startTransition] = React.useTransition()

      return (
        <MentionsInput
          value={value}
          suggestionsDisplay="inline"
          onMentionsChange={({ value: nextValue }) => {
            startTransition(() => {
              setValue(nextValue)
            })
          }}
        >
          <Mention trigger="@" data={inlineConcurrentData} />
        </MentionsInput>
      )
    }

    it('updates inline completion through transitions', async () => {
      render(<InlineTransitionWrapper />)

      const combobox = screen.getByRole('combobox')
      fireEvent.focus(combobox)
      combobox.setSelectionRange(4, 4)
      fireEvent.select(combobox)

      await waitFor(() => {
        expect(screen.getByText('ce')).toBeInTheDocument()
      })

      fireEvent.keyDown(combobox, { key: 'Tab', keyCode: 9 })

      await waitFor(() => {
        expect(combobox).toHaveValue('Alice')
      })

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('No inline suggestions available')
      })
    })
  })

  it('forwards native change events to the consumer.', () => {
    const onChange = vi.fn()

    render(
      <MentionsInput value="" onChange={onChange}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.change(textarea, { target: { value: 'hello world' } })

    expect(onChange).toHaveBeenCalled()
    const [event] = onChange.mock.calls[0]
    expect(event.target).toBe(textarea)
  })

  it('invokes both onMentionBlur and onBlur when focus leaves naturally.', () => {
    const onMentionBlur = vi.fn()
    const onBlur = vi.fn()

    render(
      <MentionsInput value="" onMentionBlur={onMentionBlur} onBlur={onBlur}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    fireEvent.blur(textarea)

    expect(onMentionBlur).toHaveBeenCalled()
    const [event, clickedSuggestion] = onMentionBlur.mock.calls[0]
    expect(clickedSuggestion).toBe(false)
    expect(onBlur).toHaveBeenCalledWith(event)
  })

  it('flags suggestion clicks via onMentionBlur.', async () => {
    const onMentionBlur = vi.fn()

    render(
      <MentionsInput value="@" onMentionBlur={onMentionBlur}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    fireEvent.focus(textarea)
    textarea.setSelectionRange(1, 1)
    fireEvent.select(textarea)

    await waitFor(() => {
      const suggestions = screen.getAllByRole('option', { hidden: true })
      expect(suggestions.length).toBeGreaterThan(0)
    })

    const listbox = screen.getByRole('listbox', { hidden: true })
    fireEvent.mouseDown(listbox)
    fireEvent.blur(textarea)

    await waitFor(() => {
      expect(onMentionBlur).toHaveBeenCalled()
    })

    const [, clickedSuggestion] = onMentionBlur.mock.calls[0]
    expect(clickedSuggestion).toBe(true)
  })

  describe('internal behaviors', () => {
    it('exposes null-returning defaults for keydown and select handlers.', () => {
      expect(MentionsInput.defaultProps?.onKeyDown?.()).toBeNull()
      expect(MentionsInput.defaultProps?.onSelect?.()).toBeNull()
    })

    it('updates scroll flags when handling document scroll.', () => {
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} value="">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any
      instance.suggestionsElement = document.createElement('div')
      act(() => {
        instance.setState({ selectionStart: 0, selectionEnd: 0 })
      })
      const updateSpy = vi
        .spyOn(instance, 'updateSuggestionsPosition')
        .mockImplementation(() => undefined)
      const raf = vi
        .spyOn(globalThis, 'requestAnimationFrame')
        .mockImplementation((cb: FrameRequestCallback) => {
          cb(0)
          return 1
        })

      act(() => {
        instance.handleDocumentScroll()
      })

      expect(updateSpy).toHaveBeenCalled()

      raf.mockRestore()
      updateSpy.mockRestore()
      unmount()
    })

    it('skips document scroll sync for inline autocomplete when there is no active selection.', () => {
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} value="@a" suggestionsDisplay="inline">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any
      const requestViewSyncSpy = vi
        .spyOn(instance, 'requestViewSync')
        .mockImplementation(() => undefined)

      act(() => {
        instance.handleDocumentScroll()
      })

      expect(requestViewSyncSpy).not.toHaveBeenCalled()

      requestViewSyncSpy.mockRestore()
      unmount()
    })

    it('falls back to immediate document scroll sync when requestAnimationFrame is unavailable.', () => {
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} value="">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any
      instance.suggestionsElement = document.createElement('div')
      act(() => {
        instance.setState({ selectionStart: 0, selectionEnd: 0 })
      })
      const updateSpy = vi
        .spyOn(instance, 'updateSuggestionsPosition')
        .mockImplementation(() => undefined)
      const originalRAF = globalThis.requestAnimationFrame

      delete (globalThis as typeof globalThis & { requestAnimationFrame?: unknown })
        .requestAnimationFrame

      try {
        act(() => {
          instance.handleDocumentScroll()
        })

        expect(updateSpy).toHaveBeenCalled()
      } finally {
        if (originalRAF === undefined) {
          delete (globalThis as typeof globalThis & { requestAnimationFrame?: unknown })
            .requestAnimationFrame
        } else {
          ;(
            globalThis as typeof globalThis & {
              requestAnimationFrame?: typeof globalThis.requestAnimationFrame
            }
          ).requestAnimationFrame = originalRAF
        }

        updateSpy.mockRestore()
        unmount()
      }
    })

    it('tracks composition state transitions.', () => {
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} value="">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any

      act(() => {
        instance.handleCompositionStart()
      })
      expect(instance._isComposing).toBe(true)

      act(() => {
        instance.handleCompositionEnd()
      })
      expect(instance._isComposing).toBe(false)

      unmount()
    })

    it('preserves composing diacritics when controlled reconciliation re-runs mismatch recovery', async () => {
      const ref = React.createRef<MentionsInput>()
      const onMentionsChange = vi.fn()

      function ControlledInput() {
        const [value, setValue] = React.useState('Cafe')

        return (
          <MentionsInput
            ref={ref}
            value={value}
            onMentionsChange={(change) => {
              setValue(change.value)
              onMentionsChange(change)
            }}
          >
            <Mention trigger="@" data={data} />
          </MentionsInput>
        )
      }

      const { unmount } = render(<ControlledInput />)

      try {
        await waitFor(() => {
          expect(ref.current).not.toBeNull()
        })

        const instance = ref.current as unknown as any
        const combobox = screen.getByRole('combobox')
        if (!(combobox instanceof HTMLTextAreaElement)) {
          throw new TypeError('Expected MentionsInput combobox to render a textarea')
        }

        act(() => {
          instance.setState({ selectionStart: 4, selectionEnd: 4 })
        })

        const actualGetPlainText = utils.getPlainText
        const getPlainTextSpy = vi
          .spyOn(utils, 'getPlainText')
          .mockImplementationOnce((inputValue, inputConfig) =>
            actualGetPlainText(inputValue, inputConfig)
          )
          .mockImplementationOnce(() => 'intermediate mismatch')
          .mockImplementation((inputValue, inputConfig) =>
            actualGetPlainText(inputValue, inputConfig)
          )

        try {
          combobox.value = 'Cafe\u0301'
          combobox.setSelectionRange('Cafe\u0301'.length, 'Cafe\u0301'.length)

          act(() => {
            instance.handleChange({
              target: combobox,
              currentTarget: combobox,
              nativeEvent: {
                isComposing: true,
                data: '\u0301',
              },
            } as React.ChangeEvent<HTMLTextAreaElement>)
          })

          await waitFor(() => {
            expect(onMentionsChange).toHaveBeenCalled()
            expect(combobox).toHaveValue('Cafe\u0301')
          })

          const payload = getLastMentionsChange(onMentionsChange)
          expect(payload.value).toBe('Cafe\u0301')
          expect(payload.plainTextValue).toBe('Cafe\u0301')
          expect(payload.trigger.type).toBe('input')
        } finally {
          getPlainTextSpy.mockRestore()
        }
      } finally {
        unmount()
      }
    })

    it('processes queued highlighter recompute requests sequentially.', async () => {
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} value="">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      await waitFor(() => {
        expect(ref.current).not.toBeNull()
      })

      const instance = ref.current as unknown as any

      const initialVersion = instance.state.highlighterRecomputeVersion

      act(() => {
        instance.scheduleHighlighterRecompute()
        instance.scheduleHighlighterRecompute()
      })

      await waitFor(() =>
        expect(instance.state.highlighterRecomputeVersion).toBe(initialVersion + 2)
      )

      unmount()
    })

    it('positions suggestions using computed styles.', async () => {
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} value="">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      await waitFor(() => {
        expect(ref.current).not.toBeNull()
      })

      const instance = ref.current as unknown as any
      const highlighter = document.createElement('div')
      const suggestions = document.createElement('div')
      const container = document.createElement('div')
      highlighter.style.fontSize = '18px'
      suggestions.style.marginLeft = '0px'
      suggestions.style.marginTop = '7px'
      Object.defineProperty(highlighter, 'getBoundingClientRect', {
        value: () => ({
          left: 4,
          top: 6,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
        }),
      })
      Object.defineProperty(suggestions, 'offsetHeight', { value: 20, configurable: true })
      document.body.append(highlighter)
      document.body.append(suggestions)
      document.body.append(container)

      instance.highlighterElement = highlighter
      instance.suggestionsElement = suggestions
      instance.containerElement = container
      highlighter.scrollLeft = 5
      highlighter.scrollTop = 3
      Object.defineProperty(highlighter, 'offsetWidth', { value: 200, configurable: true })
      Object.defineProperty(container, 'offsetWidth', { value: 320, configurable: true })

      const setStateMock = vi.spyOn(instance, 'setState').mockImplementation((update, cb) => {
        const nextState =
          typeof update === 'function' ? update(instance.state, instance.props) : update
        Object.assign(instance.state, nextState)
        cb?.()
      })

      instance.state.caretPosition = { left: 10, top: 12 }
      instance.state.suggestionsPosition = {}

      act(() => {
        instance.updateSuggestionsPosition()
      })

      expect(instance.state.suggestionsPosition.position).toBe('fixed')
      expect(instance.state.suggestionsPosition.left).toBe(9)
      expect(instance.state.suggestionsPosition.top).toBe(8)

      act(() => {
        instance.state.suggestionsPosition = {}
      })
      Object.assign(instance.props, { anchorMode: 'left' })

      act(() => {
        instance.updateSuggestionsPosition()
      })

      expect(instance.state.suggestionsPosition.position).toBe('fixed')
      expect(instance.state.suggestionsPosition.left).toBe(4)

      highlighter.remove()
      suggestions.remove()
      container.remove()
      setStateMock.mockRestore()
      unmount()
    })

    it('anchors suggestions to the control edge when using anchorMode="left" outside portals.', async () => {
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} value="" anchorMode="left">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      await waitFor(() => {
        expect(ref.current).not.toBeNull()
      })

      const instance = ref.current as unknown as any
      Object.defineProperty(instance, 'resolvePortalHost', {
        value: () => null,
        configurable: true,
        writable: true,
      })

      const highlighter = document.createElement('div')
      const suggestions = document.createElement('div')
      const container = document.createElement('div')
      highlighter.style.fontSize = '16px'
      Object.defineProperty(highlighter, 'getBoundingClientRect', {
        value: () => ({
          left: 2,
          top: 8,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
        }),
      })
      Object.defineProperty(highlighter, 'offsetWidth', { value: 180, configurable: true })
      Object.defineProperty(container, 'offsetWidth', { value: 220, configurable: true })
      Object.defineProperty(suggestions, 'offsetHeight', { value: 40, configurable: true })
      document.body.append(highlighter)
      document.body.append(suggestions)
      document.body.append(container)

      highlighter.scrollLeft = 14
      highlighter.scrollTop = 5

      instance.highlighterElement = highlighter
      instance.suggestionsElement = suggestions
      instance.containerElement = container
      instance.state.caretPosition = { left: 32, top: 18 }
      instance.state.suggestionsPosition = {}

      const setStateMock = vi.spyOn(instance, 'setState').mockImplementation((update, cb) => {
        const nextState =
          typeof update === 'function' ? update(instance.state, instance.props) : update
        Object.assign(instance.state, nextState)
        cb?.()
      })

      act(() => {
        instance.updateSuggestionsPosition()
      })

      expect(instance.state.suggestionsPosition.position).toBeUndefined()
      expect(instance.state.suggestionsPosition.left).toBe(0)
      expect(instance.state.suggestionsPosition.right).toBeUndefined()

      highlighter.remove()
      suggestions.remove()
      container.remove()
      setStateMock.mockRestore()
      unmount()
    })

    it('flushes a queued scroll sync when the animation frame resolves', () => {
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} value="">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any
      const updateSpy = vi
        .spyOn(instance, 'updateHighlighterScroll')
        .mockImplementation(() => false)
      const flushSpy = vi.spyOn(instance, 'flushPendingViewSync')
      const raf = vi
        .spyOn(globalThis, 'requestAnimationFrame')
        .mockImplementation((cb: FrameRequestCallback) => {
          cb(0)
          return 1
        })

      act(() => {
        instance.requestHighlighterScrollSync()
      })

      expect(updateSpy).toHaveBeenCalledTimes(1)
      expect(flushSpy).toHaveBeenCalledTimes(1)

      flushSpy.mockRestore()
      updateSpy.mockRestore()
      raf.mockRestore()
      unmount()
    })

    it('coalesces repeated queued view sync requests into one frame', () => {
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} value="">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any
      const raf = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 9)
      act(() => {
        instance.setState({ selectionStart: 0, selectionEnd: 0 })
      })
      raf.mockClear()

      act(() => {
        instance.requestHighlighterScrollSync()
        instance.requestViewSync({ measureSuggestions: true })
      })

      expect(instance._scrollSyncFrame).toBe(9)
      expect(raf).toHaveBeenCalledTimes(1)
      expect(instance._pendingViewSync).toMatchObject({
        syncScroll: true,
        measureSuggestions: true,
        measureInline: false,
      })

      raf.mockRestore()
      unmount()
    })

    it('ignores highlighter sync when input elements are missing', () => {
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} value="">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any
      instance.inputElement = null
      instance.highlighterElement = null

      let didSync = true
      act(() => {
        didSync = instance.updateHighlighterScroll()
      })

      expect(didSync).toBe(false)
      unmount()
    })

    it('mirrors typographic styles from the input onto the highlighter overlay', () => {
      const styleMap: Record<string, string> = {
        'line-height': '28px',
        'letter-spacing': '0.12em',
      }

      const getComputedStyleSpy = vi.spyOn(globalThis, 'getComputedStyle').mockReturnValue({
        getPropertyValue: (prop: string) => styleMap[prop] ?? '',
      } as unknown as CSSStyleDeclaration)

      const { container, unmount } = render(
        <MentionsInput value="styled line height">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const input = screen.getByRole('combobox')
      const highlighter = container.querySelector('[data-slot="highlighter"]') as HTMLDivElement

      expect(getComputedStyleSpy).toHaveBeenCalledWith(input)
      expect(highlighter.style.lineHeight).toBe('28px')
      expect(highlighter.style.letterSpacing).toBe('0.12em')

      getComputedStyleSpy.mockRestore()
      unmount()
    })

    it('ensures generated ids and recompute-only view sync requests when needed', async () => {
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} value="">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any
      act(() => {
        instance.setState({ generatedId: null })
      })

      const recomputeSpy = vi
        .spyOn(instance, 'scheduleHighlighterRecompute')
        .mockImplementation(() => undefined)

      act(() => {
        instance.ensureGeneratedIdIfNeeded()
        instance.requestViewSync({ recomputeHighlighter: true }, { flushNow: true })
      })

      await waitFor(() => {
        expect(instance.state.generatedId).toBeTruthy()
      })
      expect(recomputeSpy).toHaveBeenCalled()

      recomputeSpy.mockRestore()
      unmount()
    })

    it('clears stale inline suggestion positions when inline autocomplete is disabled', () => {
      const ref = React.createRef<MentionsInput>()
      const { rerender, unmount } = render(
        <MentionsInput ref={ref} value="@a" suggestionsDisplay="inline">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any
      act(() => {
        instance.setState({ inlineSuggestionPosition: { left: 1, top: 2 } })
      })

      rerender(
        <MentionsInput ref={ref} value="@a">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      let didUpdate = false
      act(() => {
        didUpdate = instance.updateInlineSuggestionPosition()
      })

      expect(didUpdate).toBe(true)
      expect(instance.state.inlineSuggestionPosition).toBeNull()
      unmount()
    })

    it('returns false from inline application guards when prerequisites are missing', () => {
      const ref = React.createRef<MentionsInput>()
      const { rerender, unmount } = render(
        <MentionsInput ref={ref} value="@a" suggestionsDisplay="inline">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any

      expect(instance.canApplyInlineSuggestion()).toBe(false)
      expect(instance.getPreferredQueryState()).toBeNull()

      act(() => {
        instance.setState({
          selectionStart: 1,
          selectionEnd: 2,
          suggestions: {
            0: {
              queryInfo: {
                childIndex: 0,
                query: 'a',
                querySequenceStart: 0,
                querySequenceEnd: 2,
              },
              results: [{ id: 'alice', display: 'Alice' }],
            },
          },
        })
      })
      expect(instance.canApplyInlineSuggestion()).toBe(false)

      rerender(
        <MentionsInput ref={ref} value="@a">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      expect(instance.canApplyInlineSuggestion()).toBe(false)
      unmount()
    })

    it('ignores clipboard handlers when targets or clipboard data are unavailable', () => {
      const onMentionsChange = vi.fn()
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} value="@[First](first)" onMentionsChange={onMentionsChange}>
          <Mention trigger="@[__display__](__id__)" data={data} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any
      const textarea = screen.getByRole('combobox')
      const foreignTarget = document.createElement('div')
      const preventDefault = vi.fn()
      const setData = vi.fn()

      act(() => {
        instance.handlePaste({
          target: foreignTarget,
          clipboardData: { getData: vi.fn() },
          preventDefault,
        })
        instance.handleCopy({
          target: foreignTarget,
          clipboardData: { setData },
          preventDefault,
        })
        instance.handleCut({
          target: foreignTarget,
          clipboardData: { setData },
          preventDefault,
        })
        instance.handlePaste({
          target: textarea,
          preventDefault,
        })
        instance.saveSelectionToClipboard({
          clipboardData: undefined,
        })
        instance.inputElement = null
        instance.saveSelectionToClipboard({
          clipboardData: { setData },
        })
      })

      expect(preventDefault).not.toHaveBeenCalled()
      expect(setData).not.toHaveBeenCalled()
      expect(onMentionsChange).not.toHaveBeenCalled()
      unmount()
    })

    it('skips selection syncing when the input is missing, inactive, or composing', () => {
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} value="@a">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any
      const textarea = screen.getByRole<HTMLTextAreaElement>('combobox')
      const updateMentionsQueriesSpy = vi
        .spyOn(instance, 'updateMentionsQueries')
        .mockImplementation(() => undefined)

      instance.inputElement = null
      act(() => {
        instance.syncSelectionFromInput()
      })

      instance.inputElement = textarea
      const otherInput = document.createElement('input')
      document.body.append(otherInput)
      otherInput.focus()

      act(() => {
        instance.syncSelectionFromInput('selectionchange')
      })

      textarea.focus()
      textarea.setSelectionRange(1, 1)
      instance._isComposing = true
      act(() => {
        instance.syncSelectionFromInput('selectionchange')
      })

      expect(updateMentionsQueriesSpy).not.toHaveBeenCalled()

      updateMentionsQueriesSpy.mockRestore()
      otherInput.remove()
      unmount()
    })

    it('falls back through keydown no-op paths when suggestions are unavailable', () => {
      const inlineKeyDown = vi.fn()
      const overlayKeyDown = vi.fn()
      const inlineRef = React.createRef<MentionsInput>()
      const overlayRef = React.createRef<MentionsInput>()
      const { unmount } = render(
        <>
          <MentionsInput
            ref={inlineRef}
            value="@a"
            suggestionsDisplay="inline"
            onKeyDown={inlineKeyDown}
          >
            <Mention trigger="@" data={data} />
          </MentionsInput>
          <MentionsInput ref={overlayRef} value="@a" onKeyDown={overlayKeyDown}>
            <Mention trigger="@" data={data} />
          </MentionsInput>
        </>
      )

      const inlineInstance = inlineRef.current as unknown as any
      const overlayInstance = overlayRef.current as unknown as any
      const inlineEvent = {
        key: 'Tab',
        shiftKey: false,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      }
      const overlayEvent = {
        key: 'Enter',
        shiftKey: false,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      }

      act(() => {
        inlineInstance.handleKeyDown(inlineEvent)
        overlayInstance.handleKeyDown(overlayEvent)
        overlayInstance.shiftFocus(1)
        overlayInstance.selectFocused()
      })

      expect(inlineKeyDown).toHaveBeenCalled()
      expect(overlayKeyDown).toHaveBeenCalled()
      expect(inlineEvent.preventDefault).not.toHaveBeenCalled()
      expect(overlayEvent.preventDefault).not.toHaveBeenCalled()
      unmount()
    })

    it('uses legacy text ranges when setSelectionRange is unavailable', () => {
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} value="">
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any
      const range = {
        collapse: vi.fn(),
        moveEnd: vi.fn(),
        moveStart: vi.fn(),
        select: vi.fn(),
      }
      const requestHighlighterScrollSyncSpy = vi
        .spyOn(instance, 'requestHighlighterScrollSync')
        .mockImplementation(() => undefined)

      act(() => {
        instance.setSelection(null, null)
        instance.inputElement = null
        instance.setSelection(1, 2)
        instance.inputElement = {
          createTextRange: () => range,
        }
        instance.setSelection(1, 3)
      })

      expect(range.collapse).toHaveBeenCalledWith(true)
      expect(range.moveEnd).toHaveBeenCalledWith('character', 3)
      expect(range.moveStart).toHaveBeenCalledWith('character', 1)
      expect(range.select).toHaveBeenCalled()
      expect(requestHighlighterScrollSyncSpy).toHaveBeenCalled()

      requestHighlighterScrollSyncSpy.mockRestore()
      unmount()
    })

    it('clears pending timers, aborts previous queries, and ignores stale async results', async () => {
      vi.useFakeTimers()

      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} value="@a">
          <Mention
            trigger="@"
            data={async () => [{ id: 'alpha', display: 'Alpha' }]}
            debounceMs={5}
          />
        </MentionsInput>
      )

      try {
        const instance = ref.current as unknown as any
        const previousController = new AbortController()
        const pendingTimer = setTimeout(() => undefined, 100)
        const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
        const replaceSuggestionsSpy = vi
          .spyOn(instance, 'replaceSuggestions')
          .mockImplementation(() => undefined)

        instance._queryAbortControllers.set(0, previousController)
        instance._queryDebounceTimers.set(0, pendingTimer)

        act(() => {
          instance.scheduleSuggestionQuery(
            1,
            0,
            {
              childIndex: 0,
              query: 'a',
              querySequenceStart: 0,
              querySequenceEnd: 2,
            },
            <Mention
              trigger="@"
              data={async () => [{ id: 'alpha', display: 'Alpha' }]}
              debounceMs={5}
            />,
            false
          )
        })

        expect(previousController.signal.aborted).toBe(true)
        expect(clearTimeoutSpy).toHaveBeenCalled()

        await act(async () => {
          await vi.advanceTimersByTimeAsync(5)
        })

        // eslint-disable-next-line require-atomic-updates -- this test intentionally makes the pending async result stale.
        instance._queryId = 2

        await act(async () => {
          await instance.updateSuggestions(
            1,
            0,
            {
              childIndex: 0,
              query: 'a',
              querySequenceStart: 0,
              querySequenceEnd: 2,
            },
            Promise.resolve([{ id: 'alpha', display: 'Alpha' }]),
            new AbortController()
          )
        })

        expect(replaceSuggestionsSpy).not.toHaveBeenCalled()

        clearTimeoutSpy.mockRestore()
        replaceSuggestionsSpy.mockRestore()
      } finally {
        vi.useRealTimers()
        unmount()
      }
    })

    it('clears suggestions with no active queries and covers addMention guard branches', () => {
      const onMentionsChange = vi.fn()
      const onAdd = vi.fn()
      const ref = React.createRef<MentionsInput>()
      const { unmount } = render(
        <MentionsInput ref={ref} value="@a" onMentionsChange={onMentionsChange}>
          <Mention trigger="@" data={data} onAdd={onAdd} />
        </MentionsInput>
      )

      const instance = ref.current as unknown as any
      const replaceSuggestionsSpy = vi
        .spyOn(instance, 'replaceSuggestions')
        .mockImplementation((computeNextState: any) => {
          Object.assign(instance.state, computeNextState(instance.state))
        })

      act(() => {
        instance.updateMentionsQueries('hello world', 11)
      })

      expect(instance.state.suggestions).toEqual({})
      expect(instance.state.queryStates).toEqual({})

      act(() => {
        instance.addMention(
          { id: 'first', display: 'First entry' },
          { childIndex: 99, querySequenceStart: 0, querySequenceEnd: 2 }
        )
      })

      expect(onMentionsChange).not.toHaveBeenCalled()

      act(() => {
        instance.addMention(
          { id: 'first', display: 'First entry' },
          { childIndex: 0, querySequenceStart: 0, querySequenceEnd: 2 }
        )
      })

      expect(onAdd).toHaveBeenCalledWith({
        id: 'first',
        display: 'First entry',
        startPos: 0,
        endPos: 2,
        serializerId: '@[__display__](__id__)',
      })

      replaceSuggestionsSpy.mockRestore()
      unmount()
    })
  })
})
