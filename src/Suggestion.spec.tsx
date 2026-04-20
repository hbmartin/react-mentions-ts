import React from 'react'
import { render } from '@testing-library/react'
import Suggestion from './Suggestion'

const queryInfo = {
  childIndex: 0,
  query: 'test',
  querySequenceStart: 0,
  querySequenceEnd: 4,
}

describe('Suggestion', () => {
  it('should be possible to pass a focussed style.', () => {
    const { container, rerender } = render(
      <Suggestion
        id="suggestion-1"
        index={0}
        query="test"
        queryInfo={queryInfo}
        suggestion={{ id: '1', display: 'Test Suggestion' }}
        onSelect={vi.fn()}
        onMouseEnter={vi.fn()}
        focused={false}
        className="unfocused-class"
      />
    )

    const suggestionItem = container.querySelector('li')
    expect(suggestionItem).toHaveClass('unfocused-class')

    // Rerender with focused=true
    rerender(
      <Suggestion
        id="suggestion-1"
        index={0}
        query="test"
        queryInfo={queryInfo}
        suggestion={{ id: '1', display: 'Test Suggestion' }}
        onSelect={vi.fn()}
        onMouseEnter={vi.fn()}
        focused
        className="focused-class"
      />
    )

    expect(suggestionItem).toHaveClass('focused-class')
  })

  it('should render the current display of the suggestion.', () => {
    const { container } = render(
      <Suggestion
        id="suggestion-1"
        index={0}
        query="test"
        queryInfo={queryInfo}
        suggestion={{ id: '1', display: 'Test Suggestion' }}
        onSelect={vi.fn()}
        onMouseEnter={vi.fn()}
      />
    )

    expect(container.textContent).toContain('Test Suggestion')

    // Test with suggestion that has no display, should fall back to id
    const { container: container3 } = render(
      <Suggestion
        id="suggestion-3"
        index={2}
        query="bar"
        queryInfo={queryInfo}
        suggestion={{ id: 'fallback-id' }}
        onSelect={vi.fn()}
        onMouseEnter={vi.fn()}
      />
    )

    expect(container3.textContent).toContain('fallback-id')
  })

  it('falls back to the suggestion id for empty display strings and applies focused classes', () => {
    const { container } = render(
      <Suggestion
        id="suggestion-focused"
        index={0}
        query="focus"
        queryInfo={queryInfo}
        suggestion={{ id: 'fallback-id', display: '' }}
        onSelect={vi.fn()}
        onMouseEnter={vi.fn()}
        focused
        focusedClassName="ring-2"
      />
    )

    const suggestionItem = container.querySelector('li')
    expect(suggestionItem).toHaveClass('ring-2')
    expect(suggestionItem).toHaveAttribute('aria-selected', 'true')
    expect(container.textContent).toContain('fallback-id')
  })

  it('should highlight the part of the display that is matched by the current query.', () => {
    const { container } = render(
      <Suggestion
        id="suggestion-1"
        index={0}
        query="Test"
        queryInfo={queryInfo}
        suggestion={{ id: '1', display: 'Test Suggestion', highlights: [{ start: 0, end: 4 }] }}
        onSelect={vi.fn()}
        onMouseEnter={vi.fn()}
      />
    )

    const highlightedElement = container.querySelector('b')
    expect(highlightedElement).toBeTruthy()
    expect(highlightedElement?.textContent).toBe('Test')

    // Test with query not at the beginning
    const { container: container2 } = render(
      <Suggestion
        id="suggestion-2"
        index={1}
        query="Sugg"
        queryInfo={queryInfo}
        suggestion={{ id: '2', display: 'Test Suggestion', highlights: [{ start: 5, end: 9 }] }}
        onSelect={vi.fn()}
        onMouseEnter={vi.fn()}
      />
    )

    const highlightedElement2 = container2.querySelector('b')
    expect(highlightedElement2).toBeTruthy()
    expect(highlightedElement2?.textContent).toBe('Sugg')

    // Test with no match
    const { container: container3 } = render(
      <Suggestion
        id="suggestion-3"
        index={2}
        query="xyz"
        queryInfo={queryInfo}
        suggestion={{ id: '3', display: 'Test Suggestion' }}
        onSelect={vi.fn()}
        onMouseEnter={vi.fn()}
      />
    )

    const highlightedElement3 = container3.querySelector('b')
    expect(highlightedElement3).toBeNull()
  })

  it('renders text between multiple highlighted display ranges', () => {
    const { container } = render(
      <Suggestion
        id="suggestion-multi-highlight"
        index={0}
        query="a"
        queryInfo={queryInfo}
        suggestion={{
          id: '1',
          display: 'Ada Lovelace',
          highlights: [
            { start: 0, end: 3 },
            { start: 4, end: 8 },
          ],
        }}
        onSelect={vi.fn()}
        onMouseEnter={vi.fn()}
      />
    )

    const highlightedElements = container.querySelectorAll('b')
    expect(highlightedElements).toHaveLength(2)
    expect(highlightedElements[0]).toHaveTextContent('Ada')
    expect(highlightedElements[1]).toHaveTextContent('Love')
    expect(container.textContent).toBe('Ada Lovelace')
  })
})
