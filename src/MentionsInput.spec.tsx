/* eslint-disable sonarjs/no-nested-functions */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import * as utils from './utils'
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

const getLastMentionsChange = (mock: jest.Mock): MentionsInputChangeEvent => {
  const calls = mock.mock.calls
  if (calls.length === 0) {
    throw new Error('Expected onMentionsChange to have been called')
  }
  return calls[calls.length - 1][0] as MentionsInputChangeEvent
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
    let consoleError: jest.SpyInstance

    beforeEach(() => {
      consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
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

    it('should throw when multiple Mention children share the same trigger.', () => {
      expect(() =>
        render(
          <MentionsInput value="">
            <Mention trigger="@" data={data} />
            <Mention trigger="@" data={data} />
          </MentionsInput>
        )
      ).toThrow('MentionsInput does not support Mention children with duplicate triggers: @.')
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
    const onMentionsChange = jest.fn()

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
    const onMentionsChange = jest.fn()

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
    const asyncData = jest.fn(async (query: string) => {
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
      expect(asyncData).toHaveBeenCalledWith('a')
    })

    await waitFor(() => {
      const suggestions = screen.getAllByRole('option', { hidden: true })
      expect(suggestions).toHaveLength(2)
    })
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
    const inputRef = jest.fn()

    render(
      <MentionsInput value="test" inputRef={inputRef}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    expect(inputRef).toHaveBeenCalledWith(textarea)
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

  describe('autoResize', () => {
    it('resizes the textarea to the scroll height after a controlled value update', () => {
      const onMentionsChange = jest.fn()
      const { rerender } = render(
        <MentionsInput autoResize value="short" onMentionsChange={onMentionsChange}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const combobox = screen.getByRole('combobox')
      let scrollHeight = 0
      Object.defineProperty(combobox, 'scrollHeight', {
        configurable: true,
        get: () => scrollHeight,
      })

      expect(combobox.style.height).not.toBe('64px')

      scrollHeight = 64

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
      const borderTop = Number.parseFloat(computed.borderTopWidth || '0')
      const borderBottom = Number.parseFloat(computed.borderBottomWidth || '0')
      expect(Number.parseFloat(combobox.style.height)).toBe(scrollHeight + borderTop + borderBottom)
      expect(combobox.style.overflowY).toBe('hidden')
    })

    it('updates the textarea height when autoResize toggles from false to true', () => {
      const onMentionsChange = jest.fn()
      const { rerender } = render(
        <MentionsInput autoResize={false} value="initial" onMentionsChange={onMentionsChange}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const combobox = screen.getByRole('combobox')
      let scrollHeight = 0
      Object.defineProperty(combobox, 'scrollHeight', {
        configurable: true,
        get: () => scrollHeight,
      })

      expect(combobox.style.height).toBe('')

      scrollHeight = 88

      rerender(
        <MentionsInput autoResize value="initial" onMentionsChange={onMentionsChange}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const computed = globalThis.getComputedStyle(combobox)
      const borderTop = Number.parseFloat(computed.borderTopWidth || '0')
      const borderBottom = Number.parseFloat(computed.borderBottomWidth || '0')
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
      let scrollHeight = 0
      Object.defineProperty(combobox, 'scrollHeight', {
        configurable: true,
        get: () => scrollHeight,
      })

      const updatedValue = `${combobox.value} that is now longer`
      combobox.focus()
      combobox.setSelectionRange(combobox.value.length, combobox.value.length)

      scrollHeight = 150

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
        const borderTop = Number.parseFloat(computed.borderTopWidth || '0')
        const borderBottom = Number.parseFloat(computed.borderBottomWidth || '0')
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
      const onMentionsChange = jest.fn()
      const getComputedStyleSpy = jest.spyOn(globalThis, 'getComputedStyle').mockReturnValue({
        borderTopWidth: '4px',
        borderBottomWidth: '6px',
      } as unknown as CSSStyleDeclaration)

      const { rerender } = render(
        <MentionsInput autoResize value="initial" onMentionsChange={onMentionsChange}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')
      let scrollHeight = 0
      Object.defineProperty(textarea, 'scrollHeight', {
        configurable: true,
        get: () => scrollHeight,
      })

      scrollHeight = 90

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
      const onMentionsChange = jest.fn()
      const { rerender } = render(
        <MentionsInput autoResize value="draft" onMentionsChange={onMentionsChange}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')
      let scrollHeight = 0
      Object.defineProperty(textarea, 'scrollHeight', {
        configurable: true,
        get: () => scrollHeight,
      })

      scrollHeight = 72

      rerender(
        <MentionsInput autoResize value="draft updated" onMentionsChange={onMentionsChange}>
          <Mention trigger="@" data={data} />
        </MentionsInput>
      )

      const computed = globalThis.getComputedStyle(textarea)
      const borderTop = Number.parseFloat(computed.borderTopWidth || '0')
      const borderBottom = Number.parseFloat(computed.borderBottomWidth || '0')
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

        const setData = jest.fn()

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

        const setData = jest.fn()

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

        const preventDefault = jest.fn()
        const event = new Event(eventType, { bubbles: true })
        event.preventDefault = preventDefault

        fireEvent(textarea, event)

        expect(preventDefault).not.toHaveBeenCalled()
      }
    )

    it('should remove a leading mention from the value when the text is cut.', () => {
      const onMentionsChange = jest.fn()

      render(
        <MentionsInput value={value} onMentionsChange={onMentionsChange}>
          <Mention trigger="@[__display__](__id__)" data={data} />
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
      event.clipboardData = { setData: jest.fn() }

      expect(onMentionsChange).not.toHaveBeenCalled()

      fireEvent(textarea, event)

      expect(onMentionsChange).toHaveBeenCalledTimes(1)

      const {
        value: newValue,
        plainTextValue: newPlainTextValue,
        trigger,
        previousValue,
      } = getLastMentionsChange(onMentionsChange)
      expect(trigger.type).toBe('cut')
      expect(previousValue).toBe(value)
      expect(newValue).toMatchSnapshot()
      expect(newPlainTextValue).toMatchSnapshot()
    })

    it('should remove a trailing mention from the value when the text is cut.', () => {
      const onMentionsChange = jest.fn()

      render(
        <MentionsInput value={value} onMentionsChange={onMentionsChange}>
          <Mention trigger="@[__display__](__id__)" data={data} />
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
      event.clipboardData = { setData: jest.fn() }

      expect(onMentionsChange).not.toHaveBeenCalled()

      fireEvent(textarea, event)

      expect(onMentionsChange).toHaveBeenCalledTimes(1)

      const {
        value: newValue,
        plainTextValue: newPlainTextValue,
        trigger,
        previousValue,
      } = getLastMentionsChange(onMentionsChange)
      expect(trigger.type).toBe('cut')
      expect(previousValue).toBe(value)
      expect(newValue).toMatchSnapshot()
      expect(newPlainTextValue).toMatchSnapshot()
    })

    it('should restore the caret to the start of the cut selection.', async () => {
      const onMentionsChange = jest.fn()

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
      event.clipboardData = { setData: jest.fn() }

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
      const onMentionsChange = jest.fn()

      render(
        <MentionsInput value={value} onMentionsChange={onMentionsChange}>
          <Mention trigger="@[__display__](__id__)" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')

      const pastedText = 'Not forget about @[Third](third)!'

      const event = new Event('paste', { bubbles: true })
      event.clipboardData = {
        getData: jest.fn((type) => (type === 'text/react-mentions' ? pastedText : '')),
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
      const onMentionsChange = jest.fn()

      render(
        <MentionsInput value={value} onMentionsChange={onMentionsChange}>
          <Mention trigger="@[__display__](__id__)" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('combobox')

      const pastedText = 'Not forget about @[Third](third)!'

      const event = new Event('paste', { bubbles: true })
      event.clipboardData = {
        getData: jest.fn((type) => (type === 'text/plain' ? pastedText : '')),
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

    it('should remove carriage returns from pasted values', () => {
      const pastedText = "Hi First, \r\n\r\nlet's add Second to the conversation."

      const event = new Event('paste', { bubbles: true })

      event.clipboardData = {
        getData: jest.fn((type) => (type === 'text/plain' ? pastedText : '')),
      }

      const onMentionsChange = jest.fn()

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

      const preventDefault = jest.fn()
      const event = new Event('paste', { bubbles: true })
      event.preventDefault = preventDefault

      fireEvent(textarea, event)

      expect(preventDefault).not.toHaveBeenCalled()
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
      const onMentionSelectionChange = jest.fn()
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
      const onMentionSelectionChange = jest.fn()
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
      const onMentionSelectionChange = jest.fn()
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
      const getMentionsAndPlainTextSpy = jest.spyOn(utils, 'getMentionsAndPlainText')
      try {
        const onMentionSelectionChange = jest.fn()
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

    it('clears cached mentions when the mention config changes', async () => {
      const getMentionsAndPlainTextSpy = jest.spyOn(utils, 'getMentionsAndPlainText')
      try {
        const onMentionSelectionChange = jest.fn()
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

    it('returns multiple selections when a range overlaps several mentions', async () => {
      const onMentionSelectionChange = jest.fn()
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

    it('can accept the inline suggestion with Tab', async () => {
      const onMentionsChange = jest.fn()
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
    const onChange = jest.fn()

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
    const onMentionBlur = jest.fn()
    const onBlur = jest.fn()

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
    const onMentionBlur = jest.fn()

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
      const updateSpy = jest
        .spyOn(instance, 'updateSuggestionsPosition')
        .mockImplementation(() => undefined)
      const raf = jest
        .spyOn(globalThis, 'requestAnimationFrame')
        .mockImplementation((cb: FrameRequestCallback) => {
          cb(0)
          return 1
        })

      act(() => {
        instance.handleDocumentScroll()
      })

      expect(updateSpy).toHaveBeenCalled()
      expect(instance._isScrolling).toBe(false)

      raf.mockRestore()
      updateSpy.mockRestore()
      unmount()
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

      act(() => {
        instance.scheduleHighlighterRecompute()
        instance.scheduleHighlighterRecompute()
      })

      await waitFor(() => expect(instance.state.highlighterRecomputeVersion).toBe(2))

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

      const setStateMock = jest.spyOn(instance, 'setState').mockImplementation((update, cb) => {
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
      expect(typeof instance.state.suggestionsPosition.top).toBe('number')

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

      const setStateMock = jest.spyOn(instance, 'setState').mockImplementation((update, cb) => {
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

    it('syncs measurement bridge observers and cleans up.', async () => {
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
      const container = document.createElement('div')
      const highlighter = document.createElement('div')
      const input = document.createElement('textarea')
      const suggestions = document.createElement('div')
      instance.containerElement = container
      instance.highlighterElement = highlighter
      instance.inputElement = input
      instance.suggestionsElement = suggestions

      const syncScroll = jest.fn()
      const updatePosition = jest.fn()
      instance.updateHighlighterScroll = syncScroll
      instance.updateSuggestionsPosition = updatePosition

      const originalResizeObserver = (globalThis as any).ResizeObserver
      const observers: Array<{ observe: jest.Mock; disconnect: jest.Mock }> = []
      class MockResizeObserver {
        private readonly callback: () => void
        observe: jest.Mock
        disconnect: jest.Mock
        constructor(cb: () => void) {
          this.callback = cb
          this.observe = jest.fn(() => {
            this.callback()
          })
          this.disconnect = jest.fn()
          observers.push(this)
        }
      }
      ;(globalThis as any).ResizeObserver = MockResizeObserver

      const originalAdd = window.addEventListener
      const originalRemove = window.removeEventListener
      const handlers: Partial<Record<string, EventListener>> = {}
      const addListener = jest
        .spyOn(globalThis, 'addEventListener')
        .mockImplementation(
          (
            type: string,
            listener: EventListenerOrEventListenerObject,
            options?: boolean | AddEventListenerOptions
          ) => {
            handlers[type] = listener as EventListener
            return originalAdd.call(globalThis, type, listener, options)
          }
        )
      const removeListener = jest
        .spyOn(globalThis, 'removeEventListener')
        .mockImplementation(
          (
            type: string,
            listener: EventListenerOrEventListenerObject,
            options?: boolean | EventListenerOptions
          ) => {
            return originalRemove.call(globalThis, type, listener, options)
          }
        )

      const bridgeElement = instance.renderMeasurementBridge() as React.ReactElement
      const { unmount: unmountBridge } = render(bridgeElement)

      expect(syncScroll).toHaveBeenCalled()
      expect(updatePosition).toHaveBeenCalled()

      const syncCalls = syncScroll.mock.calls.length
      const positionCalls = updatePosition.mock.calls.length

      act(() => {
        input.dispatchEvent(new Event('scroll'))
      })

      expect(syncScroll.mock.calls.length).toBe(syncCalls + 1)
      expect(updatePosition.mock.calls.length).toBe(positionCalls + 1)

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      expect(syncScroll.mock.calls.length).toBeGreaterThan(syncCalls + 1)
      expect(updatePosition.mock.calls.length).toBeGreaterThan(positionCalls + 1)

      act(() => {
        globalThis.dispatchEvent(new Event('orientationchange'))
      })

      expect(syncScroll.mock.calls.length).toBeGreaterThan(syncCalls + 2)
      expect(updatePosition.mock.calls.length).toBeGreaterThan(positionCalls + 2)

      unmountBridge()
      for (const observer of observers) {
        expect(observer.disconnect).toHaveBeenCalled()
      }
      expect(handlers.resize).toBeDefined()
      expect(handlers.orientationchange).toBeDefined()
      expect(addListener).toHaveBeenCalledWith('resize', handlers.resize)
      expect(addListener).toHaveBeenCalledWith('orientationchange', handlers.orientationchange)
      expect(removeListener).toHaveBeenCalledWith('resize', handlers.resize)
      expect(removeListener).toHaveBeenCalledWith('orientationchange', handlers.orientationchange)
      addListener.mockRestore()
      removeListener.mockRestore()
      ;(globalThis as any).ResizeObserver = originalResizeObserver
      unmount()
    })
  })
})
