import React from 'react'
import { render } from '@testing-library/react'
import {
  MentionsInputInlineLiveRegion,
  MentionsInputInlineSuggestion,
} from './MentionsInputInlineSuggestion'
import type { InlineSuggestionDetails } from './MentionsInputSelectors'

const inlineSuggestion: InlineSuggestionDetails = {
  hiddenPrefix: '',
  visibleText: 'ice',
  queryInfo: {
    childIndex: 0,
    query: 'al',
    querySequenceStart: 0,
    querySequenceEnd: 3,
  },
  suggestion: { id: 'alice', display: 'Alice' },
  announcement: 'Alice',
}

describe('MentionsInputInlineSuggestion', () => {
  it('does not render until both suggestion data and a measured position are available', () => {
    const { container, rerender } = render(
      <MentionsInputInlineSuggestion
        inlineSuggestion={null}
        inlineSuggestionPosition={{ left: 1, top: 2 }}
      />
    )

    expect(container.firstChild).toBeNull()

    rerender(
      <MentionsInputInlineSuggestion
        inlineSuggestion={inlineSuggestion}
        inlineSuggestionPosition={null}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders visible inline text without a hidden prefix when the prefix is empty', () => {
    const { container } = render(
      <MentionsInputInlineSuggestion
        inlineSuggestion={inlineSuggestion}
        inlineSuggestionPosition={{ left: 12, top: 24 }}
        classNames={{
          inlineSuggestion: 'custom-inline',
          inlineSuggestionText: 'custom-text',
          inlineSuggestionPrefix: 'custom-prefix',
          inlineSuggestionSuffix: 'custom-suffix',
        }}
      />
    )

    const wrapper = container.querySelector('[data-slot="inline-suggestion"]') as HTMLDivElement
    expect(wrapper).not.toBeNull()
    expect(wrapper).toHaveClass('custom-inline')
    expect(wrapper.style.left).toBe('12px')
    expect(wrapper.style.top).toBe('24px')
    expect(container.querySelector('.custom-prefix')).toBeNull()
    expect(container.querySelector('.custom-suffix')).toHaveTextContent('ice')
  })

  it('renders hidden prefix text and live region announcements', () => {
    const { container } = render(
      <>
        <MentionsInputInlineSuggestion
          inlineSuggestion={{ ...inlineSuggestion, hiddenPrefix: 'Al' }}
          inlineSuggestionPosition={{ left: 0, top: 0 }}
        />
        <MentionsInputInlineLiveRegion id="inline-status" announcement="Alice suggested" />
      </>
    )

    expect(container.querySelector('.sr-only')).toHaveTextContent('Al')
    const liveRegion = container.querySelector('[data-slot="inline-suggestion-live-region"]')
    expect(liveRegion).toHaveAttribute('id', 'inline-status')
    expect(liveRegion).toHaveTextContent('Alice suggested')
  })
})
