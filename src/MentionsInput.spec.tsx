import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
      expect(payload.value.endsWith(' ')).toBe(true)
      expect(payload.plainTextValue.endsWith(' ')).toBe(true)
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
      expect(combobox).not.toHaveAttribute('aria-controls')

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
      expect(payload.mentions).toHaveLength(1)
      expect(payload.mentions[0]).toMatchObject({ id: 'alice' })
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
})
