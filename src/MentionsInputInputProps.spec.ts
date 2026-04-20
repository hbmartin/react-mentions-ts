import type { InlineSuggestionDetails } from './MentionsInputSelectors'
import type { buildMentionsInputInputProps } from './MentionsInputInputProps'

type BuildInputPropsArgs = Parameters<typeof buildMentionsInputInputProps>[0]

const inlineSuggestion: InlineSuggestionDetails = {
  hiddenPrefix: 'Al',
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

const createBuildArgs = (overrides: Partial<BuildInputPropsArgs> = {}): BuildInputPropsArgs => ({
  props: {},
  inputClassName: 'mentions-input',
  plainTextValue: 'Hello',
  singleLine: false,
  isInlineAutocomplete: false,
  inlineSuggestion: null,
  isSuggestionsOpened: false,
  focusIndex: 0,
  onScroll: vi.fn(),
  onChange: vi.fn(),
  onSelect: vi.fn(),
  onKeyDown: vi.fn(),
  onBlur: vi.fn(),
  onCompositionStart: vi.fn(),
  onCompositionEnd: vi.fn(),
  ...overrides,
})

describe('MentionsInputInputProps', () => {
  it('keeps default event handlers as no-op callbacks', async () => {
    const { defaultMentionsInputProps } = await import('./MentionsInputInputProps')

    expect(defaultMentionsInputProps.onKeyDown?.(undefined as never)).toBeNull()
    expect(defaultMentionsInputProps.onSelect?.(undefined as never)).toBeNull()
  })

  it('omits aria-describedby for inline suggestions when there is no description source', async () => {
    const { buildMentionsInputInputProps } = await import('./MentionsInputInputProps')

    const inputProps = buildMentionsInputInputProps(
      createBuildArgs({
        isInlineAutocomplete: true,
        inlineSuggestion,
        inlineAutocompleteLiveRegionId: undefined,
      })
    )

    expect(inputProps['aria-autocomplete']).toBe('inline')
    expect(inputProps['aria-expanded']).toBe('false')
    expect(inputProps['aria-describedby']).toBeUndefined()
  })

  it('preserves caller descriptions when inline suggestions add live region output', async () => {
    const { buildMentionsInputInputProps } = await import('./MentionsInputInputProps')

    const inputProps = buildMentionsInputInputProps(
      createBuildArgs({
        props: { 'aria-describedby': 'existing-description' },
        isInlineAutocomplete: true,
        inlineSuggestion,
        inlineAutocompleteLiveRegionId: 'inline-live',
      })
    )

    expect(inputProps['aria-describedby']).toBe('existing-description inline-live')
  })

  it('omits empty inline style objects', async () => {
    vi.resetModules()
    vi.doMock('./MentionsInputLayout', () => ({
      getInputInlineStyle: () => ({}),
    }))

    try {
      const { buildMentionsInputInputProps } = await import('./MentionsInputInputProps')

      const inputProps = buildMentionsInputInputProps(createBuildArgs())

      expect(inputProps.style).toBeUndefined()
    } finally {
      vi.doUnmock('./MentionsInputLayout')
      vi.resetModules()
    }
  })
})
