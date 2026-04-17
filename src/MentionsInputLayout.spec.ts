import {
  areInlineSuggestionPositionsEqual,
  areSuggestionsPositionsEqual,
  calculateInlineSuggestionPosition,
  calculateSuggestionsPosition,
  createPendingViewSync,
  getHighlighterViewPatch,
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

  it('places non-portal suggestions above the caret when its offset creates enough viewport space', () => {
    const highlighter = document.createElement('div')
    const suggestions = document.createElement('div')
    const container = document.createElement('div')
    const originalInnerHeight = window.innerHeight
    const originalClientHeight = document.documentElement.clientHeight

    highlighter.style.fontSize = '16px'

    Object.defineProperty(window, 'innerHeight', { value: 180, configurable: true })
    Object.defineProperty(document.documentElement, 'clientHeight', {
      value: 180,
      configurable: true,
    })
    Object.defineProperty(highlighter, 'getBoundingClientRect', {
      value: () => ({
        left: 10,
        top: 40,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
      }),
    })
    Object.defineProperty(highlighter, 'offsetWidth', { value: 180, configurable: true })
    Object.defineProperty(container, 'offsetWidth', { value: 220, configurable: true })
    Object.defineProperty(suggestions, 'offsetHeight', { value: 80, configurable: true })

    try {
      const position = calculateSuggestionsPosition({
        caretPosition: { left: 32, top: 100 },
        suggestionsPlacement: 'auto',
        anchorMode: 'caret',
        resolvedPortalHost: null,
        suggestions,
        highlighter,
        container,
      })

      expect(position).toEqual({
        left: 32,
        top: 4,
        width: 180,
      })
    } finally {
      Object.defineProperty(window, 'innerHeight', {
        value: originalInnerHeight,
        configurable: true,
      })
      Object.defineProperty(document.documentElement, 'clientHeight', {
        value: originalClientHeight,
        configurable: true,
      })
    }
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

  it('reads highlighter typography from a single computed style snapshot', () => {
    const input = document.createElement('textarea')
    const highlighter = document.createElement('div')
    const getComputedStyleSpy = jest.spyOn(globalThis, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (property: string) =>
        property === 'line-height'
          ? '24px'
          : property === 'letter-spacing'
            ? '0.08em'
            : '',
    } as unknown as CSSStyleDeclaration)

    try {
      const patch = getHighlighterViewPatch(input, highlighter)

      expect(getComputedStyleSpy).toHaveBeenCalledTimes(1)
      expect(patch?.typography).toHaveLength(2)
      expect(patch?.typography).toEqual(
        expect.arrayContaining([
          { property: 'line-height', value: '24px' },
          { property: 'letter-spacing', value: '0.08em' },
        ])
      )
    } finally {
      getComputedStyleSpy.mockRestore()
    }
  })
})
