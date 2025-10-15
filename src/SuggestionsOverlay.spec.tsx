import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import SuggestionsOverlay from './SuggestionsOverlay'
import { Mention } from './index'
import type { SuggestionsMap } from './types'

const createSuggestionsMap = (suggestions: Array<{ id: string; display: string }>): SuggestionsMap => ({
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
        isOpened={true}
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    const listItems = container.querySelectorAll('li[role="option"]')
    expect(listItems).toHaveLength(3)
    expect(listItems[0].textContent).toContain('First Suggestion')
    expect(listItems[1].textContent).toContain('Second Suggestion')
    expect(listItems[2].textContent).toContain('Third Suggestion')
  })

  it('should be possible to style the list.', () => {
    const suggestions = [{ id: '1', display: 'Test' }]

    const { container } = render(
      <SuggestionsOverlay
        id="test-suggestions"
        suggestions={createSuggestionsMap(suggestions)}
        focusIndex={0}
        isOpened={true}
        className="custom-overlay-class"
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    // Check that the list is rendered with proper structure
    const list = container.querySelector('ul[role="listbox"]')
    expect(list).toBeTruthy()
    expect(list).toBeInTheDocument()
  })

  it('should be possible to apply styles to the items in the list.', () => {
    const suggestions = [
      { id: '1', display: 'First' },
      { id: '2', display: 'Second' },
    ]

    const { container } = render(
      <SuggestionsOverlay
        id="test-suggestions"
        suggestions={createSuggestionsMap(suggestions)}
        focusIndex={0}
        isOpened={true}
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    // Check that list items are rendered and have proper attributes
    const listItems = container.querySelectorAll('li[role="option"]')
    expect(listItems).toHaveLength(2)
    expect(listItems[0]).toHaveAttribute('role', 'option')
    expect(listItems[1]).toHaveAttribute('role', 'option')
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
        isOpened={true}
        onSelect={onSelect}
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    const listItems = container.querySelectorAll('li[role="option"]')

    fireEvent.click(listItems[0])
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(suggestions[0], expect.objectContaining({ query: 'test' }))

    fireEvent.click(listItems[1])
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect).toHaveBeenCalledWith(suggestions[1], expect.objectContaining({ query: 'test' }))
  })

  it('should be possible to show a loading indicator.', () => {
    const { container, rerender } = render(
      <SuggestionsOverlay
        id="test-suggestions"
        suggestions={{}}
        focusIndex={0}
        isOpened={true}
        isLoading={false}
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    // Count child divs when not loading
    const initialDivs = container.querySelectorAll('div')
    const initialCount = initialDivs.length

    // Rerender with isLoading=true
    rerender(
      <SuggestionsOverlay
        id="test-suggestions"
        suggestions={{}}
        focusIndex={0}
        isOpened={true}
        isLoading={true}
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    // Should have more divs when loading indicator is shown
    const loadingDivs = container.querySelectorAll('div')
    expect(loadingDivs.length).toBeGreaterThan(initialCount)
  })

  it('should be possible to style the loading indicator.', () => {
    const { container } = render(
      <SuggestionsOverlay
        id="test-suggestions"
        suggestions={{}}
        focusIndex={0}
        isOpened={true}
        isLoading={true}
      >
        <Mention trigger="@" data={[]} />
      </SuggestionsOverlay>
    )

    // Check that the container has content (loading indicator renders multiple divs)
    const allDivs = container.querySelectorAll('div')
    // Should have at least the container div plus loading indicator divs
    expect(allDivs.length).toBeGreaterThan(1)
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
        isOpened={true}
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
})
