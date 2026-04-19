import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import SuggestionsOverlay from './SuggestionsOverlay'
import { Mention } from './index'
import type { SuggestionsMap } from './types'

const createSuggestionsMap = (
  suggestions: Array<{ id: string; display: string }>
): SuggestionsMap => ({
  0: {
    queryInfo: {
      childIndex: 0,
      query: 'test',
      querySequenceStart: 0,
      querySequenceEnd: 5,
    },
    results: suggestions,
  },
})

describe('SuggestionsOverlay', () => {
  it('should render a list of all passed suggestions.', () => {
    const suggestions = [
      { id: '1', display: 'First Suggestion' },
      { id: '2', display: 'Second Suggestion' },
      { id: '3', display: 'Third Suggestion' },
    ]

    const { container } = render(
      <SuggestionsOverlay
        id="test-suggestions"
        suggestions={createSuggestionsMap(suggestions)}
        focusIndex={0}
        isOpened
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    const listItems = container.querySelectorAll('li[role="option"]')
    expect(listItems).toHaveLength(3)
    expect(listItems[0].textContent).toContain('First Suggestion')
    expect(listItems[1].textContent).toContain('Second Suggestion')
    expect(listItems[2].textContent).toContain('Third Suggestion')

    const overlay = container.querySelector('[data-slot="suggestions"]')
    expect(overlay).not.toBeNull()
    expect(overlay).toHaveAttribute('aria-live', 'polite')
    expect(overlay).toHaveAttribute('aria-relevant', 'additions text')
    expect(overlay).toHaveAttribute('aria-busy', 'false')
  })

  it('keeps suggestion ordering aligned with mention child order', () => {
    const firstChildSuggestions = [
      { id: 'child-0-a', display: 'Alpha 0' },
      { id: 'child-0-b', display: 'Bravo 0' },
    ]
    const secondChildSuggestions = [{ id: 'child-1-a', display: 'Alpha 1' }]

    const suggestionsMap: SuggestionsMap = {
      1: {
        queryInfo: {
          childIndex: 1,
          query: 'a',
          querySequenceStart: 0,
          querySequenceEnd: 2,
        },
        results: secondChildSuggestions,
      },
      0: {
        queryInfo: {
          childIndex: 0,
          query: 'a',
          querySequenceStart: 0,
          querySequenceEnd: 2,
        },
        results: firstChildSuggestions,
      },
    }

    const { container } = render(
      <SuggestionsOverlay
        id="test-suggestions"
        suggestions={suggestionsMap}
        focusIndex={0}
        isOpened
      >
        <Mention trigger="@" data={[]} />
        <Mention trigger="#" data={[]} />
      </SuggestionsOverlay>
    )

    const listItems = [...container.querySelectorAll('li[role="option"]')].map((item) =>
      item.textContent?.trim()
    )
    expect(listItems).toHaveLength(3)
    expect(listItems[0]).toContain('Alpha 0')
    expect(listItems[1]).toContain('Bravo 0')
    expect(listItems[2]).toContain('Alpha 1')
  })

  it('scrolls the focused suggestion into view when requested', () => {
    const longSuggestions = Array.from({ length: 6 }, (_, index) => ({
      id: `item-${index}`,
      display: `Item ${index}`,
    }))

    const suggestionsMap = createSuggestionsMap(longSuggestions)

    const getBoundingClientRectMock = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function getBoundingRect(this: HTMLElement) {
        if (this.dataset.slot === 'suggestions-list') {
          return {
            top: 0,
            bottom: 100,
            left: 0,
            right: 0,
            width: 0,
            height: 100,
            x: 0,
            y: 0,
          }
        }

        if (this.dataset.focused === 'true') {
          return {
            top: 150,
            bottom: 170,
            left: 0,
            right: 0,
            width: 0,
            height: 20,
            x: 0,
            y: 150,
          }
        }

        return {
          top: 0,
          bottom: 20,
          left: 0,
          right: 0,
          width: 0,
          height: 20,
          x: 0,
          y: 0,
        }
      })

    try {
      const { container, rerender } = render(
        <SuggestionsOverlay
          id="test-suggestions"
          suggestions={suggestionsMap}
          focusIndex={0}
          isOpened
          scrollFocusedIntoView
        >
          <Mention trigger="@" data={[]} />
        </SuggestionsOverlay>
      )

      const list = container.querySelector('ul[role="listbox"]') as HTMLUListElement
      expect(list).not.toBeNull()

      Object.defineProperty(list, 'offsetHeight', { configurable: true, value: 100 })
      Object.defineProperty(list, 'scrollHeight', { configurable: true, value: 400 })
      list.scrollTop = 0

      rerender(
        <SuggestionsOverlay
          id="test-suggestions"
          suggestions={suggestionsMap}
          focusIndex={4}
          isOpened
          scrollFocusedIntoView
        >
          <Mention trigger="@" data={[]} />
        </SuggestionsOverlay>
      )

      expect(list.scrollTop).toBe(70)
    } finally {
      getBoundingClientRectMock.mockRestore()
    }
  })

  it('scrolls the focused suggestion upward when it is above the viewport', () => {
    const longSuggestions = Array.from({ length: 6 }, (_, index) => ({
      id: `item-${index}`,
      display: `Item ${index}`,
    }))

    const suggestionsMap = createSuggestionsMap(longSuggestions)
    const getBoundingClientRectMock = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function getBoundingRect(this: HTMLElement) {
        if (this.dataset.slot === 'suggestions-list') {
          return {
            top: 0,
            bottom: 100,
            left: 0,
            right: 0,
            width: 0,
            height: 100,
            x: 0,
            y: 0,
          }
        }

        if (this.dataset.focused === 'true') {
          return {
            top: -20,
            bottom: 0,
            left: 0,
            right: 0,
            width: 0,
            height: 20,
            x: 0,
            y: -20,
          }
        }

        return {
          top: 0,
          bottom: 20,
          left: 0,
          right: 0,
          width: 0,
          height: 20,
          x: 0,
          y: 0,
        }
      })

    try {
      const { container, rerender } = render(
        <SuggestionsOverlay
          id="test-suggestions"
          suggestions={suggestionsMap}
          focusIndex={0}
          isOpened
          scrollFocusedIntoView
        >
          <Mention trigger="@" data={[]} />
        </SuggestionsOverlay>
      )

      const list = container.querySelector('ul[role="listbox"]') as HTMLUListElement
      Object.defineProperty(list, 'offsetHeight', { configurable: true, value: 100 })
      Object.defineProperty(list, 'scrollHeight', { configurable: true, value: 400 })
      list.scrollTop = 30

      rerender(
        <SuggestionsOverlay
          id="test-suggestions"
          suggestions={suggestionsMap}
          focusIndex={4}
          isOpened
          scrollFocusedIntoView
        >
          <Mention trigger="@" data={[]} />
        </SuggestionsOverlay>
      )

      expect(list.scrollTop).toBe(10)
    } finally {
      getBoundingClientRectMock.mockRestore()
    }
  })

  it('skips scroll synchronization when the focused child is missing', () => {
    const { container, rerender } = render(
      <SuggestionsOverlay
        id="test-suggestions"
        suggestions={createSuggestionsMap([{ id: '1', display: 'First' }])}
        focusIndex={0}
        isOpened
        scrollFocusedIntoView
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    const list = container.querySelector('ul[role="listbox"]') as HTMLUListElement
    Object.defineProperty(list, 'offsetHeight', { configurable: true, value: 100 })
    Object.defineProperty(list, 'scrollHeight', { configurable: true, value: 400 })
    list.scrollTop = 30

    rerender(
      <SuggestionsOverlay
        id="test-suggestions"
        suggestions={createSuggestionsMap([{ id: '1', display: 'First' }])}
        focusIndex={4}
        isOpened
        scrollFocusedIntoView
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    expect(list.scrollTop).toBe(30)
  })

  it('leaves scroll position unchanged when the focused item is already visible', () => {
    const suggestionsMap = createSuggestionsMap(
      Array.from({ length: 3 }, (_, index) => ({
        id: `item-${index}`,
        display: `Item ${index}`,
      }))
    )
    const getBoundingClientRectMock = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function getBoundingRect(this: HTMLElement) {
        if (this.dataset.slot === 'suggestions-list') {
          return {
            top: 0,
            bottom: 100,
            left: 0,
            right: 0,
            width: 0,
            height: 100,
            x: 0,
            y: 0,
          }
        }

        return {
          top: 20,
          bottom: 40,
          left: 0,
          right: 0,
          width: 0,
          height: 20,
          x: 0,
          y: 20,
        }
      })

    try {
      const { container, rerender } = render(
        <SuggestionsOverlay
          id="visible-suggestions"
          suggestions={suggestionsMap}
          focusIndex={1}
          isOpened
          scrollFocusedIntoView
        >
          <Mention trigger="@" data={[]} />
        </SuggestionsOverlay>
      )

      const list = container.querySelector('ul[role="listbox"]') as HTMLUListElement
      Object.defineProperty(list, 'offsetHeight', { configurable: true, value: 100 })
      Object.defineProperty(list, 'scrollHeight', { configurable: true, value: 400 })
      list.scrollTop = 10

      rerender(
        <SuggestionsOverlay
          id="visible-suggestions"
          suggestions={suggestionsMap}
          focusIndex={1}
          isOpened
          scrollFocusedIntoView
        >
          <Mention trigger="@" data={[]} />
        </SuggestionsOverlay>
      )

      expect(list.scrollTop).toBe(10)
    } finally {
      getBoundingClientRectMock.mockRestore()
    }
  })

  it('keeps the scroll position when focus moves to a visible item after measurement is ready', () => {
    const suggestionsMap = createSuggestionsMap(
      Array.from({ length: 3 }, (_, index) => ({
        id: `visible-${index}`,
        display: `Visible ${index}`,
      }))
    )
    const getBoundingClientRectMock = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function getBoundingRect(this: HTMLElement) {
        if (this.dataset.slot === 'suggestions-list') {
          return {
            top: 0,
            bottom: 100,
            left: 0,
            right: 0,
            width: 0,
            height: 100,
            x: 0,
            y: 0,
          }
        }

        return {
          top: 20,
          bottom: 40,
          left: 0,
          right: 0,
          width: 0,
          height: 20,
          x: 0,
          y: 20,
        }
      })

    try {
      const { container, rerender } = render(
        <SuggestionsOverlay
          id="visible-suggestions-after-measure"
          suggestions={suggestionsMap}
          focusIndex={0}
          isOpened
          scrollFocusedIntoView
        >
          <Mention trigger="@" data={[]} />
        </SuggestionsOverlay>
      )

      const list = container.querySelector('ul[role="listbox"]') as HTMLUListElement
      Object.defineProperty(list, 'offsetHeight', { configurable: true, value: 100 })
      Object.defineProperty(list, 'scrollHeight', { configurable: true, value: 400 })
      list.scrollTop = 10

      rerender(
        <SuggestionsOverlay
          id="visible-suggestions-after-measure"
          suggestions={suggestionsMap}
          focusIndex={1}
          isOpened
          scrollFocusedIntoView
        >
          <Mention trigger="@" data={[]} />
        </SuggestionsOverlay>
      )

      expect(list.scrollTop).toBe(10)
    } finally {
      getBoundingClientRectMock.mockRestore()
    }
  })

  it('should be possible to style the list.', () => {
    const suggestions = [{ id: '1', display: 'Test' }]

    const { container } = render(
      <SuggestionsOverlay
        id="test-suggestions"
        suggestions={createSuggestionsMap(suggestions)}
        focusIndex={0}
        isOpened
        className="custom-overlay-class"
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    // Check that the list is rendered with proper structure
    const list = container.querySelector('ul[role="listbox"]')
    expect(list).toBeTruthy()
    const overlay = container.querySelector('.custom-overlay-class')
    expect(overlay).toBeTruthy()
  })

  it('should be possible to apply classes to the items in the list.', () => {
    const suggestions = [
      { id: '1', display: 'First' },
      { id: '2', display: 'Second' },
    ]

    const { container } = render(
      <SuggestionsOverlay
        id="test-suggestions"
        suggestions={createSuggestionsMap(suggestions)}
        focusIndex={0}
        isOpened
        itemClassName="custom-item"
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    // Check that list items are rendered and have proper attributes
    const listItems = container.querySelectorAll('li[role="option"]')
    expect(listItems).toHaveLength(2)
    expect(listItems[0]).toHaveClass('custom-item')
    expect(listItems[1]).toHaveClass('custom-item')
  })

  it('applies built-in styling to plain-text empty status content', () => {
    const { container } = render(
      <SuggestionsOverlay
        id="empty-status-overlay"
        suggestions={{}}
        focusIndex={0}
        isOpened
        statusContent="No suggestions found"
        statusType="empty"
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    const status = container.querySelector('[data-slot="suggestions-status"]')
    expect(status).not.toBeNull()
    expect(status).toHaveTextContent('No suggestions found')
    expect(status).toHaveAttribute('role', 'status')
    expect(status).toHaveAttribute('data-status-type', 'empty')
    expect(status).toHaveClass('px-4', 'py-2.5', 'text-left', 'text-sm', 'text-muted-foreground')
  })

  it('renders numeric zero status content', () => {
    const { container } = render(
      <SuggestionsOverlay
        id="zero-status-overlay"
        suggestions={{}}
        focusIndex={0}
        isOpened
        statusContent={0}
        statusType="empty"
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    const status = container.querySelector('[data-slot="suggestions-status"]')
    expect(status).not.toBeNull()
    expect(status).toHaveTextContent('0')
    expect(status).toHaveAttribute('role', 'status')
    expect(status).toHaveClass('px-4', 'py-2.5', 'text-sm', 'text-muted-foreground')
  })

  it('applies the error variant to plain-text status content', () => {
    const { container } = render(
      <SuggestionsOverlay
        id="error-status-overlay"
        suggestions={{}}
        focusIndex={0}
        isOpened
        statusContent="Unable to load suggestions"
        statusType="error"
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    const status = container.querySelector('[data-slot="suggestions-status"]')
    expect(status).not.toBeNull()
    expect(status).toHaveTextContent('Unable to load suggestions')
    expect(status).toHaveAttribute('role', 'alert')
    expect(status).toHaveAttribute('data-status-type', 'error')
    expect(status).toHaveClass('px-4', 'py-2.5', 'text-left', 'text-sm', 'text-destructive')
    expect(status).not.toHaveClass('text-muted-foreground')
  })

  it('merges custom status classes with the built-in plain-text status styling', () => {
    const { container } = render(
      <SuggestionsOverlay
        id="custom-status-overlay"
        suggestions={{}}
        focusIndex={0}
        isOpened
        statusContent="No suggestions found"
        statusType="empty"
        statusClassName="custom-status uppercase"
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    const status = container.querySelector('[data-slot="suggestions-status"]')
    expect(status).not.toBeNull()
    expect(status).toHaveClass('custom-status', 'uppercase', 'px-4', 'py-2.5', 'text-sm')
  })

  it('does not force built-in status styling onto custom status nodes', () => {
    const { container, getByTestId } = render(
      <SuggestionsOverlay
        id="custom-node-status-overlay"
        suggestions={{}}
        focusIndex={0}
        isOpened
        statusContent={<span data-testid="custom-status-node">Nothing here</span>}
        statusType="empty"
        statusClassName="custom-status"
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    const status = container.querySelector('[data-slot="suggestions-status"]')
    expect(status).not.toBeNull()
    expect(getByTestId('custom-status-node')).toBeInTheDocument()
    expect(status).toHaveClass('custom-status')
    expect(status).not.toHaveClass('px-4', 'py-2.5', 'text-sm', 'text-muted-foreground')
  })

  it('should notify when the user clicks on a suggestion.', () => {
    const suggestions = [
      { id: '1', display: 'First' },
      { id: '2', display: 'Second' },
    ]

    const onSelect = vi.fn()

    const { container } = render(
      <SuggestionsOverlay
        id="test-suggestions"
        suggestions={createSuggestionsMap(suggestions)}
        focusIndex={0}
        isOpened
        onSelect={onSelect}
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    const listItems = container.querySelectorAll('li[role="option"]')

    fireEvent.click(listItems[0])
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(
      suggestions[0],
      expect.objectContaining({ query: 'test' })
    )

    fireEvent.click(listItems[1])
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect).toHaveBeenCalledWith(
      suggestions[1],
      expect.objectContaining({ query: 'test' })
    )
  })

  it('assigns implicit suggestion ids when no overlay id is provided', () => {
    const { container } = render(
      <SuggestionsOverlay
        suggestions={createSuggestionsMap([
          { id: '1', display: 'First' },
          { id: '2', display: 'Second' },
        ])}
        focusIndex={0}
        isOpened
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    const listItems = container.querySelectorAll('li[role="option"]')
    expect(listItems[0]).toHaveAttribute('id', 'suggestion-0')
    expect(listItems[1]).toHaveAttribute('id', 'suggestion-1')
  })

  it('should be possible to show a loading indicator.', () => {
    const suggestions = [{ id: '1', display: 'First' }]

    const { container, rerender } = render(
      <SuggestionsOverlay
        id="test-suggestions"
        suggestions={createSuggestionsMap(suggestions)}
        focusIndex={0}
        isOpened
        isLoading={false}
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    // Count child divs when not loading
    const initialDivs = container.querySelectorAll('div')
    const initialCount = initialDivs.length
    const listBox = container.querySelector('ul[role="listbox"]')
    expect(listBox).not.toBeNull()
    expect(container.querySelector('[data-testid="loading-indicator"]')).toBeNull()

    // Rerender with isLoading=true
    rerender(
      <SuggestionsOverlay
        id="test-suggestions"
        suggestions={createSuggestionsMap(suggestions)}
        focusIndex={0}
        isOpened
        // eslint-disable-next-line react/jsx-boolean-value
        isLoading={true}
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    // Should have more divs when loading indicator is shown
    const loadingDivs = container.querySelectorAll('div')
    expect(loadingDivs.length).toBeGreaterThan(initialCount)
    const overlay = container.querySelector('[data-slot="suggestions"]')
    expect(overlay).not.toBeNull()
    expect(overlay).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('[data-testid="loading-indicator"]')).toBeInTheDocument()
  })

  it('should notify when the user enters a suggestion with his mouse.', () => {
    const suggestions = [
      { id: '1', display: 'First' },
      { id: '2', display: 'Second' },
      { id: '3', display: 'Third' },
    ]

    const onMouseEnter = vi.fn()

    const { container } = render(
      <SuggestionsOverlay
        id="test-suggestions"
        suggestions={createSuggestionsMap(suggestions)}
        focusIndex={0}
        isOpened
        onMouseEnter={onMouseEnter}
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    const listItems = container.querySelectorAll('li[role="option"]')

    fireEvent.mouseEnter(listItems[0], { clientX: 10, clientY: 10 })
    expect(onMouseEnter).toHaveBeenCalledWith(0)

    fireEvent.mouseEnter(listItems[1], { clientX: 10, clientY: 30 })
    expect(onMouseEnter).toHaveBeenCalledWith(1)

    fireEvent.mouseEnter(listItems[2], { clientX: 10, clientY: 50 })
    expect(onMouseEnter).toHaveBeenCalledWith(2)
  })

  it('does not render anything when closed', () => {
    const { container } = render(
      <SuggestionsOverlay id="test-suggestions" suggestions={{}} focusIndex={0} isOpened={false}>
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    expect(container.firstChild).toBeNull()
  })

  it('omits status content when it is nullish', () => {
    const { container } = render(
      <SuggestionsOverlay
        id="statusless-overlay"
        suggestions={{}}
        focusIndex={0}
        isOpened
        statusContent={null}
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    expect(container.querySelector('[data-slot="suggestions-status"]')).toBeNull()
  })

  it('defaults missing suggestions to an empty map', () => {
    const { container } = render(
      <SuggestionsOverlay focusIndex={0} isOpened statusContent="Nothing here">
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    expect(container.querySelector('[data-slot="suggestions-status"]')).toHaveTextContent(
      'Nothing here'
    )
  })

  it('defaults the empty status type when the caller omits it', () => {
    const { container } = render(
      <SuggestionsOverlay
        id="default-status-type"
        suggestions={{}}
        focusIndex={0}
        isOpened
        statusContent="No suggestions found"
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    const status = container.querySelector('[data-slot="suggestions-status"]')
    expect(status).not.toBeNull()
    expect(status).not.toHaveAttribute('data-status-type')
    expect(status).toHaveClass('text-muted-foreground')
  })

  it('merges positioning props and inline styles onto the overlay element', () => {
    const { container } = render(
      <SuggestionsOverlay
        id="styled-overlay"
        suggestions={createSuggestionsMap([{ id: '1', display: 'First' }])}
        focusIndex={0}
        isOpened
        position="fixed"
        left={42}
        top={88}
        width={320}
        style={{ backgroundColor: 'rgb(255, 0, 0)' }}
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    const overlay = container.querySelector('[data-slot="suggestions"]') as HTMLDivElement
    expect(overlay).not.toBeNull()
    expect(overlay.style.position).toBe('fixed')
    expect(overlay.style.left).toBe('42px')
    expect(overlay.style.top).toBe('88px')
    expect(overlay.style.width).toBe('320px')
    expect(overlay.style.backgroundColor).toBe('rgb(255, 0, 0)')
  })

  it('applies accessibility label and merges inline style overrides', () => {
    const { container } = render(
      <SuggestionsOverlay
        id="a11y-overlay"
        suggestions={createSuggestionsMap([{ id: '1', display: 'First' }])}
        focusIndex={0}
        isOpened
        a11ySuggestionsListLabel="People suggestions"
        position="fixed"
        right={24}
        width={200}
        style={{ width: '480px', backgroundColor: 'rgb(0, 0, 255)' }}
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    const list = container.querySelector('ul[role="listbox"]')
    expect(list).not.toBeNull()
    expect(list).toHaveAttribute('aria-label', 'People suggestions')

    const overlay = container.querySelector('[data-slot="suggestions"]') as HTMLDivElement
    expect(overlay).not.toBeNull()
    expect(overlay.style.position).toBe('fixed')
    expect(overlay.style.right).toBe('24px')
    // Inline style should override width from numeric prop.
    expect(overlay.style.width).toBe('480px')
    expect(overlay.style.backgroundColor).toBe('rgb(0, 0, 255)')
  })

  it('forwards the container ref and customises the suggestions list wrapper', () => {
    const ref = vi.fn()
    const wrap = vi.fn((node: React.ReactElement) => <div data-testid="wrapped">{node}</div>)

    const { getByTestId } = render(
      <SuggestionsOverlay
        id="wrapped-overlay"
        suggestions={createSuggestionsMap([{ id: '1', display: 'First' }])}
        focusIndex={0}
        isOpened
        containerRef={ref}
        customSuggestionsContainer={wrap}
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    expect(getByTestId('wrapped')).toBeInTheDocument()
    expect(wrap).toHaveBeenCalled()
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement))
  })

  it('requests more suggestions when the internal list scrolls near the bottom', () => {
    const handleLoadMore = vi.fn()
    const { container } = render(
      <SuggestionsOverlay
        id="load-more-overlay"
        suggestions={createSuggestionsMap([{ id: '1', display: 'First' }])}
        focusIndex={0}
        isOpened
        onLoadMore={handleLoadMore}
        customSuggestionsContainer={(node) => <div data-testid="outer-wrapper">{node}</div>}
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    const list = container.querySelector('ul[role="listbox"]') as HTMLUListElement
    Object.defineProperty(list, 'scrollHeight', { value: 200, configurable: true })
    Object.defineProperty(list, 'clientHeight', { value: 100, configurable: true })

    list.scrollTop = 40
    fireEvent.scroll(list)
    expect(handleLoadMore).not.toHaveBeenCalled()

    list.scrollTop = 60
    fireEvent.scroll(list)
    expect(handleLoadMore).toHaveBeenCalledTimes(1)
  })

  it('passes mouse down events through to the supplied handler', () => {
    const handleMouseDown = vi.fn()
    const { container } = render(
      <SuggestionsOverlay
        id="mouse-overlay"
        suggestions={createSuggestionsMap([{ id: '1', display: 'First' }])}
        focusIndex={0}
        isOpened
        onMouseDown={handleMouseDown}
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    const list = container.querySelector('ul[role="listbox"]') as HTMLUListElement
    fireEvent.mouseDown(list, { button: 0 })
    expect(handleMouseDown).toHaveBeenCalledTimes(1)
  })

  it('uses a mention child renderSuggestion when provided', () => {
    const customRender = vi.fn((suggestion, query, highlightedDisplay: React.ReactNode) => (
      <div data-testid={`custom-${suggestion.id}`}>
        Custom:
        <span data-testid="highlight">{query}</span>
        {highlightedDisplay}
      </div>
    ))

    const suggestionsMap: SuggestionsMap = {
      0: {
        queryInfo: {
          childIndex: 0,
          query: 'alpha',
          querySequenceStart: 0,
          querySequenceEnd: 5,
        },
        results: [{ id: 'child-0', display: 'Child Zero' }],
      },
      1: {
        queryInfo: {
          childIndex: 1,
          query: 'beta',
          querySequenceStart: 0,
          querySequenceEnd: 4,
        },
        results: [{ id: 'child-1', display: 'Child One' }],
      },
    }

    const { getByTestId, getByText } = render(
      <SuggestionsOverlay
        id="custom-render-overlay"
        suggestions={suggestionsMap}
        focusIndex={0}
        isOpened
      >
        <Mention trigger="@" data={[]} renderSuggestion={customRender} />
        <Mention trigger="#" data={[]} />
      </SuggestionsOverlay>
    )

    expect(customRender).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'child-0', display: 'Child Zero' }),
      'alpha',
      expect.anything(),
      0,
      true
    )
    expect(getByTestId('custom-child-0')).toBeInTheDocument()
    expect(getByTestId('custom-child-0')).toHaveTextContent('Custom:')
    expect(getByText('Child One')).toBeInTheDocument()
  })

  it('forwards mouse down events from the loading indicator', () => {
    const handleMouseDown = vi.fn()

    const { getByTestId } = render(
      <SuggestionsOverlay
        id="loading-overlay"
        suggestions={{}}
        focusIndex={0}
        isOpened
        isLoading
        onMouseDown={handleMouseDown}
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    fireEvent.mouseDown(getByTestId('loading-indicator'))
    expect(handleMouseDown).toHaveBeenCalledTimes(1)
  })
})
