import {
  applyErroredPageResult,
  applyErroredQueryResult,
  applyLoadingPageResult,
  applySuccessfulPageResult,
  applySuccessfulQueryResult,
  createClearedSuggestionsState,
  createLoadingQueryState,
  isAbortError,
} from './MentionsInputQueryState'

const queryInfo = {
  childIndex: 0,
  query: 'wal',
  querySequenceStart: 0,
  querySequenceEnd: 4,
}

describe('MentionsInputQueryState', () => {
  it('creates loading state with empty results by default', () => {
    expect(createLoadingQueryState(queryInfo)).toEqual({
      queryInfo,
      results: [],
      status: 'loading',
    })
  })

  it('resets the suggestions lifecycle to an empty state', () => {
    expect(createClearedSuggestionsState()).toEqual({
      suggestions: {},
      queryStates: {},
      focusIndex: 0,
    })
  })

  it('applies successful results and clamps focus when the list shrinks', () => {
    const nextState = applySuccessfulQueryResult(
      {
        0: {
          queryInfo,
          results: [
            { id: 'first', display: 'First' },
            { id: 'second', display: 'Second' },
          ],
        },
      },
      {},
      0,
      queryInfo,
      {
        items: [{ id: 'first', display: 'First' }],
        nextCursor: null,
        hasMore: false,
        paginated: false,
      },
      4,
      false
    )

    expect(nextState.focusIndex).toBe(0)
    expect(nextState.suggestions[0]?.results).toHaveLength(1)
    expect(nextState.queryStates[0]?.status).toBe('success')
  })

  it('removes failed suggestions while keeping the latest error state', () => {
    const nextState = applyErroredQueryResult(
      {
        0: {
          queryInfo,
          results: [{ id: 'first', display: 'First' }],
        },
      },
      {},
      0,
      queryInfo,
      new Error('boom'),
      1
    )

    expect(nextState.suggestions[0]).toBeUndefined()
    expect(nextState.focusIndex).toBe(0)
    expect(nextState.queryStates[0]?.status).toBe('error')
  })

  it('clamps focus when an errored query removes the focused preserved results', () => {
    const nextState = applyErroredQueryResult(
      {
        0: {
          queryInfo,
          results: [
            { id: 'first', display: 'First' },
            { id: 'second', display: 'Second' },
          ],
        },
        1: {
          queryInfo: { ...queryInfo, childIndex: 1 },
          results: [{ id: 'third', display: 'Third' }],
        },
      },
      {},
      1,
      { ...queryInfo, childIndex: 1 },
      new Error('boom'),
      2
    )

    expect(nextState.suggestions[1]).toBeUndefined()
    expect(nextState.focusIndex).toBe(1)
    expect(nextState.queryStates[1]?.status).toBe('error')
  })

  it('recognizes abort errors from DOMException instances and plain objects', () => {
    expect(isAbortError(new DOMException('cancelled', 'AbortError'))).toBe(true)
    expect(isAbortError({ name: 'AbortError' })).toBe(true)
    expect(isAbortError(new Error('boom'))).toBe(false)
  })

  it('tracks initial paginated query metadata', () => {
    const nextState = applySuccessfulQueryResult(
      {},
      {},
      0,
      queryInfo,
      {
        items: [{ id: 'first', display: 'First' }],
        nextCursor: 'cursor-2',
        hasMore: true,
        paginated: true,
      },
      0,
      false
    )

    expect(nextState.queryStates[0]?.pagination).toEqual({
      nextCursor: 'cursor-2',
      hasMore: true,
      isLoading: false,
    })
  })

  it('marks a next page as loading without clearing successful suggestions', () => {
    const nextState = applyLoadingPageResult(
      {
        0: {
          queryInfo,
          results: [{ id: 'first', display: 'First' }],
        },
      },
      {
        0: {
          queryInfo,
          results: [{ id: 'first', display: 'First' }],
          status: 'success',
          pagination: {
            nextCursor: 'cursor-2',
            hasMore: true,
            isLoading: false,
          },
        },
      },
      0,
      0
    )

    expect(nextState.suggestions[0]?.results).toHaveLength(1)
    expect(nextState.queryStates[0]?.pagination?.isLoading).toBe(true)
  })

  it('appends page results and records the next cursor', () => {
    const nextState = applySuccessfulPageResult(
      {
        0: {
          queryInfo,
          results: [{ id: 'first', display: 'First' }],
        },
      },
      {
        0: {
          queryInfo,
          results: [{ id: 'first', display: 'First' }],
          status: 'success',
          pagination: {
            nextCursor: 'cursor-2',
            hasMore: true,
            isLoading: true,
          },
        },
      },
      0,
      queryInfo,
      {
        items: [{ id: 'second', display: 'Second' }],
        nextCursor: null,
        hasMore: false,
        paginated: true,
      },
      0
    )

    expect(nextState.suggestions[0]?.results).toEqual([
      { id: 'first', display: 'First' },
      { id: 'second', display: 'Second' },
    ])
    expect(nextState.queryStates[0]?.pagination).toEqual({
      nextCursor: null,
      hasMore: false,
      isLoading: false,
    })
  })

  it('keeps successful suggestions when a next page fails', () => {
    const error = new Error('boom')
    const nextState = applyErroredPageResult(
      {
        0: {
          queryInfo,
          results: [{ id: 'first', display: 'First' }],
        },
      },
      {
        0: {
          queryInfo,
          results: [{ id: 'first', display: 'First' }],
          status: 'success',
          pagination: {
            nextCursor: 'cursor-2',
            hasMore: true,
            isLoading: true,
          },
        },
      },
      0,
      error,
      0
    )

    expect(nextState.suggestions[0]?.results).toHaveLength(1)
    expect(nextState.queryStates[0]?.status).toBe('success')
    expect(nextState.queryStates[0]?.pagination).toMatchObject({
      nextCursor: 'cursor-2',
      hasMore: true,
      isLoading: false,
      error,
    })
  })
})
