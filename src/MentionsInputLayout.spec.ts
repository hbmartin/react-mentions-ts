import {
  areInlineSuggestionPositionsEqual,
  areSuggestionsPositionsEqual,
  calculateInlineSuggestionPosition,
  calculateSuggestionsPosition,
  createPendingViewSync,
  mergePendingViewSync,
} from './MentionsInputLayout'

describe('MentionsInputLayout', () => {
  it('calculates fixed suggestions positioning when rendered in a portal', () => {
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
    Object.defineProperty(highlighter, 'offsetWidth', { value: 200, configurable: true })
    Object.defineProperty(container, 'offsetWidth', { value: 320, configurable: true })

    highlighter.scrollLeft = 5
    highlighter.scrollTop = 3

    const position = calculateSuggestionsPosition({
      caretPosition: { left: 10, top: 12 },
      suggestionsPlacement: 'below',
      anchorMode: 'caret',
      resolvedPortalHost: document.body,
      suggestions,
      highlighter,
      container,
    })

    expect(position).toEqual({
      position: 'fixed',
      left: 9,
      top: 8,
      width: 200,
    })
  })

  it('anchors non-portal suggestions to the control edge in left anchor mode', () => {
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

    highlighter.scrollLeft = 14
    highlighter.scrollTop = 5

    const position = calculateSuggestionsPosition({
      caretPosition: { left: 32, top: 18 },
      suggestionsPlacement: 'below',
      anchorMode: 'left',
      resolvedPortalHost: null,
      suggestions,
      highlighter,
      container,
    })

    expect(position).toEqual({
      left: 0,
      top: 13,
      width: 180,
    })
  })

  it('calculates inline suggestion offsets from the caret marker', () => {
    const control = document.createElement('div')
    const highlighter = document.createElement('div')
    const caret = document.createElement('span')

    caret.setAttribute('data-mentions-caret', 'true')
    highlighter.append(caret)
    control.append(highlighter)

    Object.defineProperty(control, 'getBoundingClientRect', {
      value: () => ({
        left: 20,
        top: 10,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
      }),
    })
    Object.defineProperty(caret, 'getBoundingClientRect', {
      value: () => ({
        left: 42,
        top: 28,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
      }),
    })

    expect(calculateInlineSuggestionPosition({ highlighter })).toEqual({
      left: 22,
      top: 18,
    })
    expect(
      areInlineSuggestionPositionsEqual(
        { left: 22, top: 18 },
        { left: 22, top: 18 }
      )
    ).toBe(true)
  })

  it('merges pending view-sync flags without dropping prior work', () => {
    const pending = mergePendingViewSync(createPendingViewSync(), {
      syncScroll: true,
      measureSuggestions: true,
    })
    const merged = mergePendingViewSync(pending, {
      measureInline: true,
    })

    expect(merged).toMatchObject({
      syncScroll: true,
      measureSuggestions: true,
      measureInline: true,
      restoreSelection: false,
      recomputeHighlighter: false,
    })
    expect(
      areSuggestionsPositionsEqual(
        { left: 1, top: 2, width: 3 },
        { left: 1, top: 2, width: 3 }
      )
    ).toBe(true)
  })
})
