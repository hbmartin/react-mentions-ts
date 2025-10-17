import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { makeTriggerRegex } from './utils/makeTriggerRegex'
import { Mention, MentionsInput } from './index'

const data = [
  { id: 'first', value: 'First entry' },
  { id: 'second', value: 'Second entry' },
  { id: 'third', value: 'Third' },
]

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

    const textarea = screen.getByRole('textbox')
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

    const textarea = screen.getByRole('textbox')
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

  it('should be possible to select a suggestion with enter.', async () => {
    const onChange = jest.fn()

    render(
      <MentionsInput value="@" onChange={onChange}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('textbox')
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

    // Verify onChange was called with the selected mention
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled()
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]
      const [, newValue] = lastCall
      expect(newValue).toContain(data[0].id)
    })
  })

  it('should be possible to close the suggestions with esc.', async () => {
    render(
      <MentionsInput value="@">
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('textbox')
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

    render(
      <MentionsInput value="@">
        <Mention trigger="@" data={data} />
        <Mention trigger="@" data={extraData} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('textbox')
    fireEvent.focus(textarea)

    // Set selection to position 1 (after @)
    textarea.setSelectionRange(1, 1)
    fireEvent.select(textarea)

    // Wait for suggestions to appear and check count
    await waitFor(() => {
      const suggestions = screen.getAllByRole('option', { hidden: true })
      expect(suggestions).toHaveLength(data.length + extraData.length)
    })
  })

  it('should scroll the highlighter in sync with the textarea', () => {
    const { container } = render(
      <MentionsInput
        style={{
          input: {
            overflow: 'auto',
            height: 40,
          },
        }}
        className="mi"
        value={'multiple lines causing \n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n the textarea to scroll'}
      >
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('textbox')
    const highlighter = container.querySelector('.mi__highlighter')

    // Set scroll position and trigger scroll event
    textarea.scrollTop = 23
    fireEvent.scroll(textarea, { target: { scrollTop: 23 } })

    expect(highlighter.scrollTop).toBe(23)
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

    const textarea = screen.getByRole('textbox')
    fireEvent.focus(textarea)

    // Set selection to position 1 (after @)
    textarea.setSelectionRange(1, 1)
    fireEvent.select(textarea)

    // Check that suggestions are rendered in the portal
    await waitFor(() => {
      const suggestionsNode = portalContainer.querySelector('.testClass__suggestions')
      expect(suggestionsNode).toBeTruthy()
    })

    // Cleanup
    portalContainer.remove()
  })

  it('should accept a custom regex attribute', () => {
    const data = [
      { id: 'aaaa', display: '@A' },
      { id: 'bbbb', display: '@B' },
    ]

    render(
      <MentionsInput value=":aaaa and :bbbb and :invalidId">
        <Mention
          trigger="@"
          data={data}
          markup=":__id__"
          regex={/:(\S+)/}
          displayTransform={(id) => {
            const mention = data.find((item) => item.id === id)
            return mention ? mention.display : `:${id}`
          }}
        />
      </MentionsInput>
    )

    const textarea = screen.getByRole('textbox')
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

    const textarea = screen.getByRole('textbox')
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

    const textarea = screen.getByRole('textbox')
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

        const textarea = screen.getByRole('textbox')

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

        const textarea = screen.getByRole('textbox')

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

        const textarea = screen.getByRole('textbox')

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
      const onChange = jest.fn()

      render(
        <MentionsInput value={value} onChange={onChange}>
          <Mention trigger="@[__display__](__id__)" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('textbox')

      const selectionStart = plainTextValue.indexOf('First') + 2
      const selectionEnd = plainTextValue.indexOf('First') + 'First'.length + 5

      textarea.setSelectionRange(selectionStart, selectionEnd)
      fireEvent.select(textarea, {
        target: { selectionStart, selectionEnd },
      })

      const event = new Event('cut', { bubbles: true })
      event.clipboardData = { setData: jest.fn() }

      expect(onChange).not.toHaveBeenCalled()

      fireEvent(textarea, event)

      expect(onChange).toHaveBeenCalledTimes(1)

      const [[, newValue, newPlainTextValue]] = onChange.mock.calls

      expect(newValue).toMatchSnapshot()
      expect(newPlainTextValue).toMatchSnapshot()
    })

    it('should remove a trailing mention from the value when the text is cut.', () => {
      const onChange = jest.fn()

      render(
        <MentionsInput value={value} onChange={onChange}>
          <Mention trigger="@[__display__](__id__)" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('textbox')

      const selectionStart = plainTextValue.indexOf('First') + 'First'.length
      const selectionEnd = plainTextValue.indexOf('Second') + 2

      textarea.setSelectionRange(selectionStart, selectionEnd)
      fireEvent.select(textarea, {
        target: { selectionStart, selectionEnd },
      })

      const event = new Event('cut', { bubbles: true })
      event.clipboardData = { setData: jest.fn() }

      expect(onChange).not.toHaveBeenCalled()

      fireEvent(textarea, event)

      expect(onChange).toHaveBeenCalledTimes(1)

      const [[, newValue, newPlainTextValue]] = onChange.mock.calls

      expect(newValue).toMatchSnapshot()
      expect(newPlainTextValue).toMatchSnapshot()
    })

    it('should read mentions markup from a paste event.', () => {
      const onChange = jest.fn()

      render(
        <MentionsInput value={value} onChange={onChange}>
          <Mention trigger="@[__display__](__id__)" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('textbox')

      const pastedText = 'Not forget about @[Third](third)!'

      const event = new Event('paste', { bubbles: true })
      event.clipboardData = {
        getData: jest.fn((type) => (type === 'text/react-mentions' ? pastedText : '')),
      }

      expect(onChange).not.toHaveBeenCalled()

      fireEvent(textarea, event)

      expect(onChange).toHaveBeenCalledTimes(1)

      const [[, newValue, newPlainTextValue]] = onChange.mock.calls

      expect(newValue).toMatchSnapshot()
      expect(newPlainTextValue).toMatchSnapshot()
    })

    it('should default to the standard pasted text.', () => {
      const onChange = jest.fn()

      render(
        <MentionsInput value={value} onChange={onChange}>
          <Mention trigger="@[__display__](__id__)" data={data} />
        </MentionsInput>
      )

      const textarea = screen.getByRole('textbox')

      const pastedText = 'Not forget about @[Third](third)!'

      const event = new Event('paste', { bubbles: true })
      event.clipboardData = {
        getData: jest.fn((type) => (type === 'text/plain' ? pastedText : '')),
      }

      expect(onChange).not.toHaveBeenCalled()

      fireEvent(textarea, event)

      expect(onChange).toHaveBeenCalledTimes(1)

      const [[, newValue, newPlainTextValue]] = onChange.mock.calls

      expect(newValue).toMatchSnapshot()
      expect(newPlainTextValue).toMatchSnapshot()
    })

    it('should remove carriage returns from pasted values', () => {
      const pastedText = "Hi First, \r\n\r\nlet's add Second to the conversation."

      const event = new Event('paste', { bubbles: true })

      event.clipboardData = {
        getData: jest.fn((type) => (type === 'text/plain' ? pastedText : '')),
      }

      const onChange = jest.fn()

      render(
        <MentionsInput value="" onChange={onChange}>
          <Mention trigger="@[__display__](__id__)" data={data} />
        </MentionsInput>
      )

      expect(onChange).not.toHaveBeenCalled()

      const textarea = screen.getByRole('textbox')

      fireEvent(textarea, event)

      const [[, newValue, newPlainTextValue]] = onChange.mock.calls

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

      const textarea = screen.getByRole('textbox')

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
            onChange={(_event, newValue) => setValue(newValue)}
            suggestionsDisplay="inline"
            {...props}
          >
            <Mention trigger="@" data={inlineData} />
          </MentionsInput>
        )
      }

      render(<Wrapper />)
      const textbox = screen.getByRole('textbox')
      fireEvent.focus(textbox)
      textbox.setSelectionRange(initialValue.length, initialValue.length)
      fireEvent.select(textbox)
      return textbox
    }

    it('shows a hint with remaining characters and no overlay', async () => {
      const textbox = renderInlineMentionsInput()

      await waitFor(() => {
        expect(screen.getByText('ce')).toBeInTheDocument()
      })

      expect(textbox).toHaveAttribute('aria-autocomplete', 'inline')
      expect(textbox).toHaveAttribute('aria-expanded', 'false')
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

    it('can accept the inline suggestion with Tab', async () => {
      const onChange = jest.fn()
      const textbox = renderInlineMentionsInput({ onChange })

      await waitFor(() => {
        expect(screen.getByText('ce')).toBeInTheDocument()
      })

      fireEvent.keyDown(textbox, { key: 'Tab', keyCode: 9 })

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled()
      })

      const [, newValue, newPlainTextValue, mentions] =
        onChange.mock.calls[onChange.mock.calls.length - 1]

      expect(newValue).toBe('@[Alice](alice)')
      expect(newPlainTextValue).toBe('Alice')
      expect(mentions).toHaveLength(1)
      expect(mentions[0]).toMatchObject({ id: 'alice' })
    })

    it('renders the full suggestion text when configured', async () => {
      renderInlineMentionsInput({ inlineSuggestionDisplay: 'full' })

      await waitFor(() => {
        expect(screen.getByText('ce')).toBeVisible()
      })

      const hiddenPrefix = screen.getByText('Ali', {
        selector: 'span',
        exact: true,
        hidden: true,
      })
      expect(hiddenPrefix).not.toBeVisible()
    })

    it('keeps inline hints visible after typing preceding text', async () => {
      const user = userEvent.setup()
      const textbox = renderInlineMentionsInput({ inlineSuggestionDisplay: 'full' }, '')

      await user.type(textbox, 'Hello @ali')

      await waitFor(() => {
        expect(screen.getByText('ce')).toBeVisible()
      })
    })
  })
})
