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
      plainTextValue: '@test',
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
          plainTextValue: '@a',
        },
        results: secondChildSuggestions,
      },
      0: {
        queryInfo: {
          childIndex: 0,
          query: 'a',
          querySequenceStart: 0,
          querySequenceEnd: 2,
          plainTextValue: '@a',
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

    const getBoundingClientRectMock = jest
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

  it('should notify when the user clicks on a suggestion.', () => {
    const suggestions = [
      { id: '1', display: 'First' },
      { id: '2', display: 'Second' },
    ]

    const onSelect = jest.fn()

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

  it('should be possible to show a loading indicator.', () => {
    const { container, rerender } = render(
      <SuggestionsOverlay
        id="test-suggestions"
        suggestions={{}}
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
        suggestions={{}}
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

    const onMouseEnter = jest.fn()

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

    fireEvent.mouseEnter(listItems[0])
    expect(onMouseEnter).toHaveBeenCalledWith(0)

    fireEvent.mouseEnter(listItems[1])
    expect(onMouseEnter).toHaveBeenCalledWith(1)

    fireEvent.mouseEnter(listItems[2])
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

  it('forwards the container ref and customises the suggestions list wrapper', () => {
    const ref = jest.fn()
    const wrap = jest.fn((node: React.ReactElement) => <div data-testid="wrapped">{node}</div>)

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

  it('passes mouse down events through to the supplied handler', () => {
    const handleMouseDown = jest.fn()
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
})
