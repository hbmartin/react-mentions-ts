import React from 'react'
import { Mention } from './index'
import {
  DEFAULT_EMPTY_SUGGESTIONS_MESSAGE,
  DEFAULT_ERROR_SUGGESTIONS_MESSAGE,
  INLINE_AUTOCOMPLETE_FALLBACK_ANNOUNCEMENT,
  getDataProvider,
  getFlattenedSuggestions,
  getFocusedSuggestionEntry,
  getFocusedSuggestionEntryForMentionChildren,
  getInlineSuggestionAnnouncement,
  getInlineSuggestionDetails,
  getInlineSuggestionDetailsForMentionChildren,
  getInlineSuggestionRemainder,
  getMentionChild,
  getMentionChildFromArray,
  getMentionChildren,
  getPreferredQueryState,
  getSuggestionData,
  getSuggestionQueryStateEntries,
  getSuggestionsStatusContent,
  getSuggestionsStatusContentForMentionChildren,
} from './MentionsInputSelectors'

const mentionChildren = [
  <Mention
    key="mention"
    trigger="@"
    data={[
      { id: 'alice', display: 'Alice' },
      { id: 'adam', display: 'Adam' },
    ]}
    appendSpaceOnAdd
  />,
  <Mention
    key="tag"
    trigger="#"
    data={[]}
    renderEmpty={() => 'Nothing here'}
    renderError={() => 'Broken'}
  />,
]

const suggestions = {
  0: {
    queryInfo: {
      childIndex: 0,
      query: 'Al',
      querySequenceStart: 0,
      querySequenceEnd: 3,
    },
    results: [{ id: 'alice', display: 'Alice' }],
  },
}

describe('MentionsInputSelectors', () => {
  it('collects mention children and exposes child lookup helpers', () => {
    const children = (
      <>
        {mentionChildren[0]}
        <>{mentionChildren[1]}</>
      </>
    )

    const collected = getMentionChildren(children)

    expect(collected).toHaveLength(2)
    expect(getMentionChild(children, 0)?.props.trigger).toBe(collected[0]?.props.trigger)
    expect(getMentionChildFromArray(collected, 1)?.props.trigger).toBe(collected[1]?.props.trigger)
  })

  it('sorts integer query-state keys and prefers the first valid entry', () => {
    const queryStates = {
      2: { status: 'success' as const, results: [], queryInfo: { ...suggestions[0].queryInfo } },
      0: {
        status: 'loading' as const,
        results: [],
        queryInfo: { ...suggestions[0].queryInfo, childIndex: 0 },
      },
      invalid: {
        status: 'error' as const,
        results: [],
        error: new Error('boom'),
        queryInfo: { ...suggestions[0].queryInfo, childIndex: 9 },
      },
    }

    expect(getSuggestionQueryStateEntries(queryStates as never)).toEqual([
      [0, queryStates[0]],
      [2, queryStates[2]],
    ])
    expect(getPreferredQueryState(queryStates as never)).toBe(queryStates[0])
  })

  it('normalizes suggestion data and falls back to the first focused suggestion', () => {
    expect(getSuggestionData('alice')).toEqual({
      id: 'alice',
      display: 'alice',
    })

    expect(getFocusedSuggestionEntry(<>{mentionChildren}</>, suggestions, 99)).toEqual({
      queryInfo: suggestions[0].queryInfo,
      result: suggestions[0].results[0],
    })
    expect(getFocusedSuggestionEntryForMentionChildren(mentionChildren, suggestions, 99)).toEqual({
      queryInfo: suggestions[0].queryInfo,
      result: suggestions[0].results[0],
    })
    expect(getFocusedSuggestionEntry(<>{mentionChildren}</>, {}, 0)).toBeNull()
    expect(getFocusedSuggestionEntryForMentionChildren(mentionChildren, {}, 0)).toBeNull()
    expect(getFlattenedSuggestions(<>{mentionChildren}</>, suggestions)).toHaveLength(1)
    expect(getPreferredQueryState({} as never)).toBeNull()
  })

  it('computes inline suggestion remainders and details', () => {
    expect(getInlineSuggestionRemainder('Alice', { ...suggestions[0].queryInfo, query: '' })).toBe(
      'Alice'
    )
    expect(getInlineSuggestionRemainder('Alice', suggestions[0].queryInfo)).toBe('ice')
    expect(
      getInlineSuggestionRemainder('Alice', { ...suggestions[0].queryInfo, query: 'zz' })
    ).toBe('Alice')

    expect(
      getInlineSuggestionDetailsForMentionChildren(
        mentionChildren,
        {
          0: {
            queryInfo: suggestions[0].queryInfo,
            results: [{ id: 'alice', display: 'Alice' }],
          },
        },
        0
      )
    ).toMatchObject({
      announcement: 'Alice',
      hiddenPrefix: 'Al',
      visibleText: 'ice ',
    })

    expect(
      getInlineSuggestionDetailsForMentionChildren(
        mentionChildren,
        {
          0: {
            queryInfo: { ...suggestions[0].queryInfo, query: 'zz' },
            results: [{ id: 'alice', display: 'Alice' }],
          },
        },
        0
      )
    ).toMatchObject({
      hiddenPrefix: '',
      announcement: 'Alice',
    })

    expect(
      getInlineSuggestionDetailsForMentionChildren(
        [
          <Mention
            key="blank"
            trigger="@"
            data={[]}
            displayTransform={() => ''}
            appendSpaceOnAdd
          />,
        ],
        {
          0: {
            queryInfo: { ...suggestions[0].queryInfo, query: '' },
            results: [{ id: 'alice', display: 'Alice' }],
          },
        },
        0
      )
    ).toMatchObject({
      announcement: ' ',
    })

    expect(
      getInlineSuggestionDetailsForMentionChildren(
        mentionChildren,
        {
          0: {
            queryInfo: { ...suggestions[0].queryInfo, childIndex: 99 },
            results: [{ id: 'alice', display: 'Alice' }],
          },
        },
        0
      )
    ).toBeNull()

    expect(
      getInlineSuggestionDetails(
        <>
          <Mention trigger="@" data={[]} displayTransform={() => 'Al'} />
        </>,
        {
          0: {
            queryInfo: { ...suggestions[0].queryInfo, query: 'Al', querySequenceEnd: 2 },
            results: [{ id: 'alice', display: 'Alice' }],
          },
        },
        0
      )
    ).toBeNull()
  })

  it('resolves status content for empty states', () => {
    const children = (
      <>
        <Mention trigger="@" data={[]} />
        <Mention trigger="#" data={[]} renderEmpty={() => undefined} />
        <Mention trigger="$" data={[]} renderEmpty={() => false} />
      </>
    )
    const resolvedChildren = getMentionChildren(children)

    expect(
      getSuggestionsStatusContentForMentionChildren(
        resolvedChildren,
        { 0: { ...suggestions[0] } },
        {}
      )
    ).toEqual({
      statusContent: null,
      statusType: null,
    })

    expect(
      getSuggestionsStatusContent(children, {}, {
        0: { status: 'loading', results: [], queryInfo: suggestions[0].queryInfo },
      } as never)
    ).toEqual({
      statusContent: null,
      statusType: null,
    })

    expect(
      getSuggestionsStatusContentForMentionChildren(resolvedChildren, {}, {
        0: { status: 'success', results: [], queryInfo: suggestions[0].queryInfo },
      } as never)
    ).toEqual({
      statusContent: DEFAULT_EMPTY_SUGGESTIONS_MESSAGE,
      statusType: 'empty',
    })

    expect(
      getSuggestionsStatusContentForMentionChildren(resolvedChildren, {}, {
        1: {
          status: 'success',
          results: [],
          queryInfo: { ...suggestions[0].queryInfo, childIndex: 1 },
        },
      } as never)
    ).toEqual({
      statusContent: DEFAULT_EMPTY_SUGGESTIONS_MESSAGE,
      statusType: 'empty',
    })

    expect(
      getSuggestionsStatusContentForMentionChildren(resolvedChildren, {}, {
        2: {
          status: 'success',
          results: [],
          queryInfo: { ...suggestions[0].queryInfo, childIndex: 2 },
        },
      } as never)
    ).toEqual({
      statusContent: null,
      statusType: null,
    })
  })

  it('resolves status content for error states', () => {
    const children = (
      <>
        <Mention trigger="@" data={[]} />
        <Mention trigger="#" data={[]} renderError={() => undefined} />
        <Mention trigger="$" data={[]} renderError={() => 'Broken'} />
        <Mention trigger="%" data={[]} renderError={() => null} />
      </>
    )
    const resolvedChildren = getMentionChildren(children)

    expect(
      getSuggestionsStatusContentForMentionChildren(resolvedChildren, {}, {
        1: {
          status: 'error',
          error: new Error('boom'),
          results: [],
          queryInfo: { ...suggestions[0].queryInfo, childIndex: 1 },
        },
      } as never)
    ).toEqual({
      statusContent: DEFAULT_ERROR_SUGGESTIONS_MESSAGE,
      statusType: 'error',
    })

    expect(
      getSuggestionsStatusContentForMentionChildren(resolvedChildren, {}, {
        2: {
          status: 'error',
          error: new Error('boom'),
          results: [],
          queryInfo: { ...suggestions[0].queryInfo, childIndex: 2 },
        },
      } as never)
    ).toEqual({
      statusContent: 'Broken',
      statusType: 'error',
    })

    expect(
      getSuggestionsStatusContentForMentionChildren(resolvedChildren, {}, {
        3: {
          status: 'error',
          error: new Error('boom'),
          results: [],
          queryInfo: { ...suggestions[0].queryInfo, childIndex: 3 },
        },
      } as never)
    ).toEqual({
      statusContent: null,
      statusType: null,
    })

    expect(
      getSuggestionsStatusContentForMentionChildren(resolvedChildren, {}, {
        99: {
          status: 'error',
          error: new Error('boom'),
          results: [],
          queryInfo: { ...suggestions[0].queryInfo, childIndex: 99 },
        },
      } as never)
    ).toEqual({
      statusContent: null,
      statusType: null,
    })
  })

  it('uses custom empty render output and falls back for undefined empty content', () => {
    const children = (
      <>
        <Mention trigger="@" data={[]} renderEmpty={() => 'Nothing here'} />
        <Mention trigger="#" data={[]} renderEmpty={() => undefined} />
      </>
    )
    const resolvedChildren = getMentionChildren(children)

    expect(
      getSuggestionsStatusContentForMentionChildren(resolvedChildren, {}, {
        0: {
          status: 'success',
          results: [],
          queryInfo: { ...suggestions[0].queryInfo, childIndex: 0 },
        },
      } as never)
    ).toEqual({
      statusContent: 'Nothing here',
      statusType: 'empty',
    })

    expect(
      getSuggestionsStatusContentForMentionChildren(resolvedChildren, {}, {
        1: {
          status: 'success',
          results: [],
          queryInfo: { ...suggestions[0].queryInfo, childIndex: 1 },
        },
      } as never)
    ).toEqual({
      statusContent: DEFAULT_EMPTY_SUGGESTIONS_MESSAGE,
      statusType: 'empty',
    })
  })

  it('prefers inline announcements, then string status text, then the fallback announcement', () => {
    expect(
      getInlineSuggestionAnnouncement(
        {
          announcement: 'Alice',
          hiddenPrefix: 'Al',
          queryInfo: suggestions[0].queryInfo,
          suggestion: suggestions[0].results[0],
          visibleText: 'ice',
        },
        { statusContent: 'ignored', statusType: 'empty' }
      )
    ).toBe('Alice')

    expect(
      getInlineSuggestionAnnouncement(null, {
        statusContent: 'Nothing here',
        statusType: 'empty',
      })
    ).toBe('Nothing here')

    expect(
      getInlineSuggestionAnnouncement(null, {
        statusContent: <span>Nothing here</span>,
        statusType: 'empty',
      })
    ).toBe(INLINE_AUTOCOMPLETE_FALLBACK_ANNOUNCEMENT)
  })

  it('preserves empty display strings when filtering static suggestion data', async () => {
    const provider = getDataProvider([{ id: '123', display: '' }, { id: '123' }], {
      ignoreAccents: false,
      signal: new AbortController().signal,
      getSubstringIndex: (value: string, query: string) => value.indexOf(query),
      maxSuggestions: undefined,
    })

    await expect(provider('1')).resolves.toEqual([
      {
        id: '123',
        highlights: [{ start: 0, end: 1 }],
      },
    ])
  })

  it('rejects instead of throwing synchronously when static data filtering fails', async () => {
    const provider = getDataProvider([{ id: '123', display: 'Alpha' }], {
      ignoreAccents: false,
      signal: new AbortController().signal,
      getSubstringIndex: () => {
        throw new Error('boom')
      },
      maxSuggestions: undefined,
    })

    await expect(provider('a')).rejects.toThrow('boom')
  })

  it('stops static filtering when the signal is already aborted and applies maxSuggestions', async () => {
    const controller = new AbortController()
    controller.abort()

    const abortedProvider = getDataProvider(
      [
        { id: 'alice', display: 'Alice' },
        { id: 'adam', display: 'Adam' },
      ],
      {
        ignoreAccents: false,
        signal: controller.signal,
        getSubstringIndex: (value: string, query: string) => value.indexOf(query),
        maxSuggestions: 1,
      }
    )

    await expect(abortedProvider('a')).resolves.toEqual([])

    const limitedProvider = getDataProvider(
      [
        { id: 'alice', display: 'Alice' },
        { id: 'adam', display: 'Adam' },
      ],
      {
        ignoreAccents: false,
        signal: new AbortController().signal,
        getSubstringIndex: (value: string, query: string) => value.indexOf(query),
        maxSuggestions: 1,
      }
    )

    await expect(limitedProvider('A')).resolves.toHaveLength(1)
  })

  it('passes signals through async providers and limits the returned suggestions', async () => {
    const asyncData = vi.fn(async (_query: string, context: { signal: AbortSignal }) => [
      { id: 'alice', display: 'Alice', signalMatches: context.signal.aborted },
      { id: 'adam', display: 'Adam', signalMatches: context.signal.aborted },
    ])

    const controller = new AbortController()
    const provider = getDataProvider(asyncData, {
      ignoreAccents: true,
      signal: controller.signal,
      getSubstringIndex: () => 0,
      maxSuggestions: 1,
    })

    await expect(provider('a')).resolves.toEqual([
      {
        id: 'alice',
        display: 'Alice',
        signalMatches: false,
      },
    ])
    expect(asyncData).toHaveBeenCalledWith('a', {
      signal: controller.signal,
    })
  })
})
