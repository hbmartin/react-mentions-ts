import { getDataProvider } from './MentionsInputSelectors'

describe('MentionsInputSelectors', () => {
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
})
