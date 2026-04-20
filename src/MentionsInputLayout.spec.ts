import {
  applyHighlighterViewPatch,
  applyTextareaResizePatch,
  areInlineSuggestionPositionsEqual,
  areSuggestionsPositionsEqual,
  calculateInlineSuggestionPosition,
  calculateSuggestionsPosition,
  createPendingViewSync,
  getComputedStyleLengthProp,
  getHighlighterViewPatch,
  getInputInlineStyle,
  getTextareaResizePatch,
  getViewSyncDecision,
  mergePendingViewSync,
} from './MentionsInputLayout'
import type { PreparedMentionChildConfig } from './types'

describe('MentionsInputLayout', () => {
  const defaultCaretPosition = { left: 0, top: 0 }
  const defaultQueryInfo = {
    childIndex: 0,
    query: 'a',
    querySequenceStart: 0,
    querySequenceEnd: 2,
  }
  const defaultMentionQuery = {
    regex: /(@([\w]*))$/,
    ignoreAccents: false,
  }
  const createMentionConfig = (
    query: PreparedMentionChildConfig['query'] = defaultMentionQuery
  ): PreparedMentionChildConfig => ({
    trigger: '@',
    data: [],
    displayTransform: (_id, display) => display ?? '',
    serializer: {
      id: '@[__display__](__id__)',
      insert: ({ id, display }) => `@[${display}](${String(id)})`,
      findAll: () => [],
    },
    query,
  })
  const createViewSyncCommit = (
    overrides: Partial<Parameters<typeof getViewSyncDecision>[1]> = {}
  ): Parameters<typeof getViewSyncDecision>[1] => ({
    value: 'Hello',
    config: [],
    autoResize: false,
    singleLine: false,
    anchorMode: 'caret',
    suggestionsPlacement: 'below',
    suggestionsPortalHost: undefined,
    isInlineAutocomplete: false,
    selectionStart: 0,
    selectionEnd: 0,
    suggestions: {},
    queryStates: {},
    generatedId: 'mentions-test',
    caretPosition: defaultCaretPosition,
    pendingSelectionUpdate: false,
    ...overrides,
  })

  it('derives an initial view-sync decision that flushes layout immediately', () => {
    expect(getViewSyncDecision(null, createViewSyncCommit())).toEqual({
      flags: {
        syncScroll: true,
        measureSuggestions: true,
        measureInline: true,
      },
      flushNow: true,
    })
  })

  it('derives focused view-sync flags for value, selection, and pending selection changes', () => {
    const previousCommit = createViewSyncCommit()

    expect(
      getViewSyncDecision(previousCommit, createViewSyncCommit({ value: 'Hello world' }))
    ).toEqual({
      flags: {
        syncScroll: true,
        measureSuggestions: true,
        measureInline: true,
      },
      flushNow: false,
    })
    expect(
      getViewSyncDecision(previousCommit, createViewSyncCommit({ selectionStart: 3 }))
    ).toEqual({
      flags: {
        measureSuggestions: true,
        measureInline: true,
      },
      flushNow: false,
    })
    expect(
      getViewSyncDecision(previousCommit, createViewSyncCommit({ pendingSelectionUpdate: true }))
    ).toEqual({
      flags: {
        restoreSelection: true,
      },
      flushNow: false,
    })
  })

  it('treats query config changes as value-affecting view sync changes', () => {
    const previousCommit = createViewSyncCommit({
      config: [createMentionConfig()],
    })
    const currentCommit = createViewSyncCommit({
      config: [
        createMentionConfig({
          regex: /(@([\p{L}\d_]*))$/u,
          ignoreAccents: true,
        }),
      ],
    })

    expect(getViewSyncDecision(previousCommit, currentCommit)).toEqual({
      flags: {
        syncScroll: true,
        measureSuggestions: true,
        measureInline: true,
      },
      flushNow: false,
    })
  })

  it.each([
    {
      field: 'suggestions',
      overrides: { suggestions: { 0: { queryInfo: defaultQueryInfo, results: [] } } },
    },
    {
      field: 'queryStates',
      overrides: {
        queryStates: {
          0: {
            queryInfo: defaultQueryInfo,
            results: [],
            status: 'loading',
          },
        },
      },
    },
    { field: 'anchorMode', overrides: { anchorMode: 'left' } },
    { field: 'suggestionsPlacement', overrides: { suggestionsPlacement: 'above' } },
    { field: 'suggestionsPortalHost', overrides: { suggestionsPortalHost: document.body } },
    { field: 'isInlineAutocomplete', overrides: { isInlineAutocomplete: true } },
  ] as const)('remeasures suggestions and inline layout when $field changes', ({ overrides }) => {
    expect(getViewSyncDecision(createViewSyncCommit(), createViewSyncCommit(overrides))).toEqual({
      flags: {
        measureSuggestions: true,
        measureInline: true,
      },
      flushNow: false,
    })
  })

  it('syncs scroll and remeasures layout when single-line mode changes', () => {
    expect(
      getViewSyncDecision(createViewSyncCommit(), createViewSyncCommit({ singleLine: true }))
    ).toEqual({
      flags: {
        syncScroll: true,
        measureSuggestions: true,
        measureInline: true,
      },
      flushNow: false,
    })
  })

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
    const originalInnerHeight = globalThis.innerHeight
    const originalClientHeight = document.documentElement.clientHeight

    highlighter.style.fontSize = '16px'

    Object.defineProperty(globalThis, 'innerHeight', { value: 180, configurable: true })
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
      Object.defineProperty(globalThis, 'innerHeight', {
        value: originalInnerHeight,
        configurable: true,
      })
      Object.defineProperty(document.documentElement, 'clientHeight', {
        value: originalClientHeight,
        configurable: true,
      })
    }
  })

  it('places portal suggestions above the caret when the viewport is constrained', () => {
    const highlighter = document.createElement('div')
    const suggestions = document.createElement('div')
    const container = document.createElement('div')
    const originalInnerHeight = globalThis.innerHeight
    const originalInnerWidth = globalThis.innerWidth
    const originalClientHeight = document.documentElement.clientHeight
    const originalClientWidth = document.documentElement.clientWidth

    highlighter.style.fontSize = '16px'
    suggestions.style.marginLeft = '0px'
    suggestions.style.marginTop = '0px'

    Object.defineProperty(globalThis, 'innerHeight', { value: 0, configurable: true })
    Object.defineProperty(globalThis, 'innerWidth', { value: 0, configurable: true })
    Object.defineProperty(document.documentElement, 'clientHeight', {
      value: 120,
      configurable: true,
    })
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 140,
      configurable: true,
    })
    Object.defineProperty(highlighter, 'getBoundingClientRect', {
      value: () => ({
        left: 4,
        top: 80,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
      }),
    })
    Object.defineProperty(highlighter, 'offsetWidth', { value: 200, configurable: true })
    Object.defineProperty(suggestions, 'offsetHeight', { value: 40, configurable: true })
    Object.defineProperty(container, 'offsetWidth', { value: 220, configurable: true })

    try {
      const position = calculateSuggestionsPosition({
        caretPosition: { left: 24, top: 32 },
        suggestionsPlacement: 'auto',
        anchorMode: 'caret',
        resolvedPortalHost: document.body,
        suggestions,
        highlighter,
        container,
      })

      expect(position).toEqual({
        left: 0,
        position: 'fixed',
        top: 56,
        width: 140,
      })
    } finally {
      Object.defineProperty(globalThis, 'innerHeight', {
        value: originalInnerHeight,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'innerWidth', {
        value: originalInnerWidth,
        configurable: true,
      })
      Object.defineProperty(document.documentElement, 'clientHeight', {
        value: originalClientHeight,
        configurable: true,
      })
      Object.defineProperty(document.documentElement, 'clientWidth', {
        value: originalClientWidth,
        configurable: true,
      })
    }
  })

  it('uses the portal host document viewport when the portal host belongs to another document', () => {
    const highlighter = document.createElement('div')
    const suggestions = document.createElement('div')
    const container = document.createElement('div')
    const portalDocument = document.implementation.createHTMLDocument('portal')
    const originalInnerHeight = globalThis.innerHeight
    const originalInnerWidth = globalThis.innerWidth
    const originalClientHeight = document.documentElement.clientHeight
    const originalClientWidth = document.documentElement.clientWidth

    highlighter.style.fontSize = '16px'
    suggestions.style.marginLeft = '0px'
    suggestions.style.marginTop = '0px'

    Object.defineProperty(globalThis, 'innerHeight', { value: 600, configurable: true })
    Object.defineProperty(globalThis, 'innerWidth', { value: 600, configurable: true })
    Object.defineProperty(document.documentElement, 'clientHeight', {
      value: 600,
      configurable: true,
    })
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 600,
      configurable: true,
    })
    Object.defineProperty(portalDocument.documentElement, 'clientHeight', {
      value: 120,
      configurable: true,
    })
    Object.defineProperty(portalDocument.documentElement, 'clientWidth', {
      value: 140,
      configurable: true,
    })
    Object.defineProperty(highlighter, 'getBoundingClientRect', {
      value: () => ({
        left: 130,
        top: 80,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
      }),
    })
    Object.defineProperty(highlighter, 'offsetWidth', { value: 200, configurable: true })
    Object.defineProperty(suggestions, 'offsetHeight', { value: 40, configurable: true })
    Object.defineProperty(container, 'offsetWidth', { value: 220, configurable: true })

    try {
      const position = calculateSuggestionsPosition({
        caretPosition: { left: 24, top: 32 },
        suggestionsPlacement: 'auto',
        anchorMode: 'caret',
        resolvedPortalHost: portalDocument.body,
        suggestions,
        highlighter,
        container,
      })

      expect(position).toEqual({
        left: 0,
        position: 'fixed',
        top: 56,
        width: 140,
      })
    } finally {
      Object.defineProperty(globalThis, 'innerHeight', {
        value: originalInnerHeight,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'innerWidth', {
        value: originalInnerWidth,
        configurable: true,
      })
      Object.defineProperty(document.documentElement, 'clientHeight', {
        value: originalClientHeight,
        configurable: true,
      })
      Object.defineProperty(document.documentElement, 'clientWidth', {
        value: originalClientWidth,
        configurable: true,
      })
    }
  })

  it('supports explicit above placement in a portal and prefers window dimensions when larger', () => {
    const highlighter = document.createElement('div')
    const suggestions = document.createElement('div')
    const container = document.createElement('div')
    const originalInnerHeight = globalThis.innerHeight
    const originalInnerWidth = globalThis.innerWidth
    const originalClientHeight = document.documentElement.clientHeight
    const originalClientWidth = document.documentElement.clientWidth

    highlighter.style.fontSize = '16px'
    suggestions.style.marginLeft = '0px'
    suggestions.style.marginTop = '0px'

    Object.defineProperty(globalThis, 'innerHeight', { value: 220, configurable: true })
    Object.defineProperty(globalThis, 'innerWidth', { value: 260, configurable: true })
    Object.defineProperty(document.documentElement, 'clientHeight', {
      value: 120,
      configurable: true,
    })
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 140,
      configurable: true,
    })
    Object.defineProperty(highlighter, 'getBoundingClientRect', {
      value: () => ({
        left: 30,
        top: 80,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
      }),
    })
    Object.defineProperty(highlighter, 'offsetWidth', { value: 200, configurable: true })
    Object.defineProperty(suggestions, 'offsetHeight', { value: 40, configurable: true })
    Object.defineProperty(container, 'offsetWidth', { value: 220, configurable: true })

    try {
      const position = calculateSuggestionsPosition({
        caretPosition: { left: 24, top: 30 },
        suggestionsPlacement: 'above',
        anchorMode: 'left',
        resolvedPortalHost: document.body,
        suggestions,
        highlighter,
        container,
      })

      expect(position).toEqual({
        left: 30,
        position: 'fixed',
        top: 54,
        width: 200,
      })
    } finally {
      Object.defineProperty(globalThis, 'innerHeight', {
        value: originalInnerHeight,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'innerWidth', {
        value: originalInnerWidth,
        configurable: true,
      })
      Object.defineProperty(document.documentElement, 'clientHeight', {
        value: originalClientHeight,
        configurable: true,
      })
      Object.defineProperty(document.documentElement, 'clientWidth', {
        value: originalClientWidth,
        configurable: true,
      })
    }
  })

  it('clamps portal suggestions with document dimensions when they exceed window dimensions', () => {
    const highlighter = document.createElement('div')
    const suggestions = document.createElement('div')
    const container = document.createElement('div')
    const originalInnerHeight = globalThis.innerHeight
    const originalInnerWidth = globalThis.innerWidth
    const originalClientHeight = document.documentElement.clientHeight
    const originalClientWidth = document.documentElement.clientWidth

    highlighter.style.fontSize = '16px'
    suggestions.style.marginLeft = '0px'
    suggestions.style.marginTop = '0px'

    Object.defineProperty(globalThis, 'innerHeight', { value: 120, configurable: true })
    Object.defineProperty(globalThis, 'innerWidth', { value: 140, configurable: true })
    Object.defineProperty(document.documentElement, 'clientHeight', {
      value: 220,
      configurable: true,
    })
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 260,
      configurable: true,
    })
    Object.defineProperty(highlighter, 'getBoundingClientRect', {
      value: () => ({
        left: 240,
        top: 80,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
      }),
    })
    Object.defineProperty(highlighter, 'offsetWidth', { value: 200, configurable: true })
    Object.defineProperty(suggestions, 'offsetHeight', { value: 40, configurable: true })
    Object.defineProperty(container, 'offsetWidth', { value: 220, configurable: true })

    try {
      expect(
        calculateSuggestionsPosition({
          caretPosition: { left: 24, top: 30 },
          suggestionsPlacement: 'below',
          anchorMode: 'caret',
          resolvedPortalHost: document.body,
          suggestions,
          highlighter,
          container,
        })
      ).toEqual({
        left: 60,
        position: 'fixed',
        top: 110,
        width: 200,
      })
    } finally {
      Object.defineProperty(globalThis, 'innerHeight', {
        value: originalInnerHeight,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'innerWidth', {
        value: originalInnerWidth,
        configurable: true,
      })
      Object.defineProperty(document.documentElement, 'clientHeight', {
        value: originalClientHeight,
        configurable: true,
      })
      Object.defineProperty(document.documentElement, 'clientWidth', {
        value: originalClientWidth,
        configurable: true,
      })
    }
  })

  it('calculates inline suggestion offsets from the caret marker', () => {
    const control = document.createElement('div')
    const highlighter = document.createElement('div')
    const caret = document.createElement('span')

    caret.dataset.mentionsCaret = 'true'
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

    expect(calculateInlineSuggestionPosition({ highlighter })).toMatchObject({
      left: 22,
      top: 18,
    })
    expect(areInlineSuggestionPositionsEqual({ left: 22, top: 18 }, { left: 22, top: 18 })).toBe(
      true
    )
  })

  it('aligns inline suggestion top with the current text line', () => {
    const control = document.createElement('div')
    const highlighter = document.createElement('div')
    const previousText = document.createElement('span')
    const caret = document.createElement('span')

    caret.dataset.mentionsCaret = 'true'
    highlighter.append(previousText, caret)
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
    Object.defineProperty(previousText, 'getBoundingClientRect', {
      value: () => ({
        left: 20,
        top: 28,
        right: 42,
        bottom: 44,
        width: 22,
        height: 16,
      }),
    })
    Object.defineProperty(caret, 'getBoundingClientRect', {
      value: () => ({
        left: 42,
        top: 44,
        right: 42,
        bottom: 44,
        width: 0,
        height: 0,
      }),
    })

    expect(calculateInlineSuggestionPosition({ highlighter })).toMatchObject({
      left: 22,
      top: 18,
    })
  })

  it('uses the last inline client rect when preceding text wraps', () => {
    const control = document.createElement('div')
    const highlighter = document.createElement('div')
    const previousText = document.createElement('span')
    const caret = document.createElement('span')
    const firstLineRect = {
      left: 20,
      top: 20,
      right: 70,
      bottom: 36,
      width: 50,
      height: 16,
    }
    const lastLineRect = {
      left: 20,
      top: 48,
      right: 74,
      bottom: 64,
      width: 54,
      height: 16,
    }

    caret.dataset.mentionsCaret = 'true'
    highlighter.append(previousText, caret)
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
    Object.defineProperty(previousText, 'getBoundingClientRect', {
      value: () => ({
        left: 20,
        top: 20,
        right: 74,
        bottom: 64,
        width: 54,
        height: 44,
      }),
    })
    Object.defineProperty(previousText, 'getClientRects', {
      value: () => ({
        length: 2,
        item: (index: number) => (index === 0 ? firstLineRect : lastLineRect),
      }),
    })
    Object.defineProperty(caret, 'getBoundingClientRect', {
      value: () => ({
        left: 74,
        top: 64,
        right: 74,
        bottom: 64,
        width: 0,
        height: 0,
      }),
    })

    expect(calculateInlineSuggestionPosition({ highlighter })).toMatchObject({
      left: 54,
      top: 38,
    })
  })

  it('carries input typography metrics from the synced highlighter to inline suggestions', () => {
    const control = document.createElement('div')
    const highlighter = document.createElement('div')
    const previousText = document.createElement('span')
    const caret = document.createElement('span')

    highlighter.style.fontFamily = 'Inter, sans-serif'
    highlighter.style.fontSize = '16px'
    highlighter.style.letterSpacing = '0.02em'
    highlighter.style.lineHeight = '26px'
    highlighter.style.textTransform = 'uppercase'
    highlighter.style.wordSpacing = '1px'

    caret.dataset.mentionsCaret = 'true'
    highlighter.append(previousText, caret)
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
    Object.defineProperty(previousText, 'getBoundingClientRect', {
      value: () => ({
        left: 20,
        top: 28,
        right: 42,
        bottom: 44,
        width: 22,
        height: 16,
      }),
    })
    Object.defineProperty(caret, 'getBoundingClientRect', {
      value: () => ({
        left: 42,
        top: 44,
        right: 42,
        bottom: 44,
        width: 0,
        height: 0,
      }),
    })

    expect(calculateInlineSuggestionPosition({ highlighter })).toEqual({
      left: 22,
      top: 13,
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px',
      letterSpacing: '0.02em',
      lineHeight: '26px',
      textTransform: 'uppercase',
      wordSpacing: '1px',
    })
    expect(
      areInlineSuggestionPositionsEqual(
        { left: 22, top: 18, lineHeight: '24px' },
        { left: 22, top: 18, lineHeight: '26px' }
      )
    ).toBe(false)
  })

  it('positions inline suggestions from the control padding edge', () => {
    const control = document.createElement('div')
    const highlighter = document.createElement('div')
    const previousText = document.createElement('span')
    const caret = document.createElement('span')

    control.style.borderLeftWidth = '2px'
    control.style.borderTopWidth = '3px'
    caret.dataset.mentionsCaret = 'true'
    highlighter.append(previousText, caret)
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
    Object.defineProperty(previousText, 'getBoundingClientRect', {
      value: () => ({
        left: 24,
        top: 30,
        right: 42,
        bottom: 44,
        width: 18,
        height: 14,
      }),
    })
    Object.defineProperty(caret, 'getBoundingClientRect', {
      value: () => ({
        left: 42,
        top: 44,
        right: 42,
        bottom: 44,
        width: 0,
        height: 0,
      }),
    })

    expect(calculateInlineSuggestionPosition({ highlighter })).toEqual({
      left: 20,
      top: 17,
    })
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
      areSuggestionsPositionsEqual({ left: 1, top: 2, width: 3 }, { left: 1, top: 2, width: 3 })
    ).toBe(true)
  })

  it('reads highlighter typography from a single computed style snapshot', () => {
    const input = document.createElement('textarea')
    const highlighter = document.createElement('div')
    const getComputedStyleSpy = vi.spyOn(globalThis, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (property: string) =>
        property === 'line-height' ? '24px' : property === 'letter-spacing' ? '0.08em' : '',
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

  it('includes input height in highlighter view patches when the input is measured', () => {
    const input = document.createElement('textarea')
    const highlighter = document.createElement('div')

    Object.defineProperty(input, 'clientHeight', { configurable: true, value: 48 })

    expect(getHighlighterViewPatch(input, highlighter)).toMatchObject({
      height: '48px',
    })
  })

  it('returns null or zero from guard paths', () => {
    expect(
      calculateSuggestionsPosition({
        caretPosition: null,
        suggestionsPlacement: 'below',
        anchorMode: 'caret',
        resolvedPortalHost: null,
        suggestions: null,
        highlighter: null,
        container: null,
      })
    ).toBeNull()
    expect(calculateInlineSuggestionPosition({ highlighter: null })).toBeNull()
    expect(getHighlighterViewPatch(null, document.createElement('div'))).toBeNull()
    expect(getHighlighterViewPatch(document.createElement('textarea'), null)).toBeNull()
  })

  it('anchors non-portal suggestions to the right edge when the popup would overflow', () => {
    const highlighter = document.createElement('div')
    const suggestions = document.createElement('div')
    const container = document.createElement('div')

    highlighter.style.fontSize = '16px'
    Object.defineProperty(highlighter, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
      }),
    })
    Object.defineProperty(highlighter, 'offsetWidth', { value: 200, configurable: true })
    Object.defineProperty(container, 'offsetWidth', { value: 120, configurable: true })
    Object.defineProperty(suggestions, 'offsetHeight', { value: 20, configurable: true })

    const position = calculateSuggestionsPosition({
      caretPosition: { left: 90, top: 12 },
      suggestionsPlacement: 'below',
      anchorMode: 'caret',
      resolvedPortalHost: null,
      suggestions,
      highlighter,
      container,
    })

    expect(position).toEqual({
      right: 0,
      top: 12,
      width: 120,
    })
  })

  it('returns zero when computed style APIs are unavailable', () => {
    const detachedDocument = document.implementation.createHTMLDocument('detached')
    const detachedElement = detachedDocument.createElement('div')

    Object.defineProperty(detachedDocument, 'defaultView', {
      configurable: true,
      value: {},
    })

    expect(getComputedStyleLengthProp(detachedElement, 'font-size')).toBe(0)
  })

  it('falls back to the global computed-style API when a detached document has no view', () => {
    const detachedDocument = document.implementation.createHTMLDocument('detached')
    const detachedElement = detachedDocument.createElement('div')
    const originalGetComputedStyle = globalThis.getComputedStyle

    Object.defineProperty(detachedDocument, 'defaultView', {
      configurable: true,
      value: null,
    })
    Object.defineProperty(globalThis, 'getComputedStyle', {
      configurable: true,
      writable: true,
      value: () =>
        ({
          getPropertyValue: () => '18px',
        }) as CSSStyleDeclaration,
    })

    try {
      expect(getComputedStyleLengthProp(detachedElement, 'font-size')).toBe(18)
    } finally {
      Object.defineProperty(globalThis, 'getComputedStyle', {
        configurable: true,
        writable: true,
        value: originalGetComputedStyle,
      })
    }
  })

  it('returns zero for non-finite computed style lengths', () => {
    const element = document.createElement('div')
    const originalGetComputedStyle = globalThis.getComputedStyle
    Object.defineProperty(globalThis, 'getComputedStyle', {
      configurable: true,
      writable: true,
      value: () =>
        ({
          getPropertyValue: () => 'not-a-number',
        }) as CSSStyleDeclaration,
    })

    try {
      expect(getComputedStyleLengthProp(element, 'font-size')).toBe(0)
    } finally {
      Object.defineProperty(globalThis, 'getComputedStyle', {
        configurable: true,
        writable: true,
        value: originalGetComputedStyle,
      })
    }
  })

  it('applies multiline mobile safari offsets but not single-line offsets', () => {
    const originalUserAgent = globalThis.navigator.userAgent
    Object.defineProperty(globalThis.navigator, 'userAgent', {
      configurable: true,
      value: 'iPhone',
    })

    try {
      expect(getInputInlineStyle(false)).toMatchObject({
        marginLeft: -3,
        marginTop: 1,
      })
      expect(getInputInlineStyle(true)).toEqual({
        background: 'transparent',
      })
    } finally {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        configurable: true,
        value: originalUserAgent,
      })
    }
  })

  it('creates textarea resize patches and ignores non-textareas', () => {
    const textarea = document.createElement('textarea')
    Object.defineProperty(textarea, 'scrollHeight', { value: 32, configurable: true })

    const patch = getTextareaResizePatch(textarea, {
      autoResize: true,
      singleLine: false,
    })

    expect(patch).toEqual({
      height: '32px',
      overflowY: 'hidden',
    })
    expect(
      getTextareaResizePatch(document.createElement('input'), {
        autoResize: true,
        singleLine: false,
      })
    ).toBeNull()
    expect(
      getTextareaResizePatch(document.createElement('input'), {
        autoResize: false,
        singleLine: false,
      })
    ).toBeNull()
    expect(
      getTextareaResizePatch(textarea, {
        autoResize: false,
        singleLine: false,
      })
    ).toEqual({
      height: '',
      overflowY: '',
    })
  })

  it('returns the empty textarea resize patch for single-line inputs and ignores blank border widths', () => {
    const textarea = document.createElement('textarea')
    const originalGetComputedStyle = globalThis.getComputedStyle

    Object.defineProperty(textarea, 'scrollHeight', { value: 30, configurable: true })
    Object.defineProperty(globalThis, 'getComputedStyle', {
      configurable: true,
      writable: true,
      value: () =>
        ({
          borderTopWidth: '',
          borderBottomWidth: undefined,
        }) as unknown as CSSStyleDeclaration,
    })

    try {
      expect(
        getTextareaResizePatch(textarea, {
          autoResize: true,
          singleLine: true,
        })
      ).toEqual({
        height: '',
        overflowY: '',
      })

      expect(
        getTextareaResizePatch(textarea, {
          autoResize: true,
          singleLine: false,
        })
      ).toEqual({
        height: '30px',
        overflowY: 'hidden',
      })
    } finally {
      Object.defineProperty(globalThis, 'getComputedStyle', {
        configurable: true,
        writable: true,
        value: originalGetComputedStyle,
      })
    }
  })

  it('adds numeric border widths and treats invalid border widths as zero during auto-resize', () => {
    const textarea = document.createElement('textarea')
    const originalGetComputedStyle = globalThis.getComputedStyle

    Object.defineProperty(textarea, 'scrollHeight', { value: 30, configurable: true })

    try {
      Object.defineProperty(globalThis, 'getComputedStyle', {
        configurable: true,
        writable: true,
        value: () =>
          ({
            borderTopWidth: '1px',
            borderBottomWidth: '2px',
          }) as unknown as CSSStyleDeclaration,
      })

      expect(
        getTextareaResizePatch(textarea, {
          autoResize: true,
          singleLine: false,
        })
      ).toEqual({
        height: '33px',
        overflowY: 'hidden',
      })

      Object.defineProperty(globalThis, 'getComputedStyle', {
        configurable: true,
        writable: true,
        value: () =>
          ({
            borderTopWidth: null,
            borderBottomWidth: 'not-a-number',
          }) as unknown as CSSStyleDeclaration,
      })

      expect(
        getTextareaResizePatch(textarea, {
          autoResize: true,
          singleLine: false,
        })
      ).toEqual({
        height: '30px',
        overflowY: 'hidden',
      })
    } finally {
      Object.defineProperty(globalThis, 'getComputedStyle', {
        configurable: true,
        writable: true,
        value: originalGetComputedStyle,
      })
    }
  })

  it('returns a null inline position when the caret marker or control is missing', () => {
    const highlighter = document.createElement('div')
    expect(calculateInlineSuggestionPosition({ highlighter })).toBeNull()

    const control = document.createElement('div')
    const detachedHighlighter = document.createElement('div')
    const caret = document.createElement('span')
    caret.dataset.mentionsCaret = 'true'
    detachedHighlighter.append(caret)
    control.append(detachedHighlighter)
    detachedHighlighter.remove()

    expect(calculateInlineSuggestionPosition({ highlighter: detachedHighlighter })).toBeNull()
  })

  it('applies highlighter and textarea patches only when values change', () => {
    const highlighter = document.createElement('div')
    const textArea = document.createElement('textarea')

    expect(
      applyHighlighterViewPatch(highlighter, {
        height: null,
        scrollLeft: 0,
        scrollTop: 0,
        typography: [],
      })
    ).toBe(false)

    expect(
      applyHighlighterViewPatch(highlighter, {
        height: '24px',
        scrollLeft: 2,
        scrollTop: 3,
        typography: [{ property: 'line-height', value: '24px' }],
      })
    ).toBe(true)
    expect(highlighter.style.height).toBe('24px')

    expect(applyTextareaResizePatch(textArea, null)).toBe(false)
    expect(
      applyTextareaResizePatch(document.createElement('input'), {
        height: '12px',
        overflowY: 'hidden',
      } as never)
    ).toBe(false)
    expect(
      applyTextareaResizePatch(textArea, {
        height: '12px',
        overflowY: 'hidden',
      })
    ).toBe(true)
    expect(
      applyTextareaResizePatch(textArea, {
        height: '12px',
        overflowY: 'hidden',
      })
    ).toBe(false)

    const input = document.createElement('textarea')
    expect(getHighlighterViewPatch(input, highlighter)).toMatchObject({
      height: null,
    })
  })
})
