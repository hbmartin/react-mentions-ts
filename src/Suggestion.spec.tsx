import React from 'react'
import { render } from '@testing-library/react'
import Suggestion from './Suggestion'

describe('Suggestion', () => {
  it('should be possible to pass a focussed style.', () => {
    const { container, rerender } = render(
      <Suggestion
        id="suggestion-1"
        index={0}
        query="test"
        suggestion={{ id: '1', display: 'Test Suggestion' }}
        onClick={jest.fn()}
        onMouseEnter={jest.fn()}
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
        suggestion={{ id: '1', display: 'Test Suggestion' }}
        onClick={jest.fn()}
        onMouseEnter={jest.fn()}
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
        suggestion={{ id: '1', display: 'Test Suggestion' }}
        onClick={jest.fn()}
        onMouseEnter={jest.fn()}
      />
    )

    expect(container.textContent).toContain('Test Suggestion')

    // Test with string suggestion
    const { container: container2 } = render(
      <Suggestion
        id="suggestion-2"
        index={1}
        query="foo"
        suggestion="String Suggestion"
        onClick={jest.fn()}
        onMouseEnter={jest.fn()}
      />
    )

    expect(container2.textContent).toContain('String Suggestion')

    // Test with suggestion that has no display, should fall back to id
    const { container: container3 } = render(
      <Suggestion
        id="suggestion-3"
        index={2}
        query="bar"
        suggestion={{ id: 'fallback-id' }}
        onClick={jest.fn()}
        onMouseEnter={jest.fn()}
      />
    )

    expect(container3.textContent).toContain('fallback-id')
  })

  it('should highlight the part of the display that is matched by the current query.', () => {
    const { container } = render(
      <Suggestion
        id="suggestion-1"
        index={0}
        query="Test"
        suggestion={{ id: '1', display: 'Test Suggestion', highlights: [{ start: 0, end: 4 }] }}
        onClick={jest.fn()}
        onMouseEnter={jest.fn()}
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
        suggestion={{ id: '2', display: 'Test Suggestion', highlights: [{ start: 5, end: 9 }] }}
        onClick={jest.fn()}
        onMouseEnter={jest.fn()}
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
        suggestion={{ id: '3', display: 'Test Suggestion' }}
        onClick={jest.fn()}
        onMouseEnter={jest.fn()}
      />
    )

    const highlightedElement3 = container3.querySelector('b')
    expect(highlightedElement3).toBeNull()
  })
})
