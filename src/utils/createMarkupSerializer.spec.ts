import createMarkupSerializer from './createMarkupSerializer'

describe('createMarkupSerializer', () => {
  it('inserts markup using the provided template', () => {
    const serializer = createMarkupSerializer('@[__display__](__id__)')

    expect(serializer.insert({ id: '123', display: 'Ada' })).toBe('@[Ada](123)')
  })

  it('finds mentions and returns ids with displays', () => {
    const serializer = createMarkupSerializer('@[__display__](__id__)')
    const value = 'Hi @[Ada Lovelace](1) and @[Alan Turing](2)!'

    const matches = serializer.findAll(value)

    expect(matches).toEqual([
      {
        markup: '@[Ada Lovelace](1)',
        index: 3,
        id: '1',
        display: 'Ada Lovelace',
      },
      {
        markup: '@[Alan Turing](2)',
        index: 26,
        id: '2',
        display: 'Alan Turing',
      },
    ])
  })

  it('supports markups that only include an id placeholder', () => {
    const serializer = createMarkupSerializer('[__id__]')
    const value = 'Files [abc] loaded [xyz]'

    const matches = serializer.findAll(value)

    expect(matches).toEqual([
      {
        markup: '[abc]',
        index: 6,
        id: 'abc',
        display: null,
      },
      {
        markup: '[xyz]',
        index: 19,
        id: 'xyz',
        display: null,
      },
    ])
  })

  it('supports legacy duplicate-trigger serializer markup without returning duplicates', () => {
    const serializer = createMarkupSerializer('@[__display__](__id__)|0')
    const value = 'Hi @[Ada](1|0) and @[Ada](1)|0'

    expect(serializer.findAll(value)).toEqual([
      {
        markup: '@[Ada](1|0)',
        index: 3,
        id: '1|0',
        display: 'Ada',
      },
      {
        markup: '@[Ada](1)|0',
        index: 18,
        id: '1',
        display: 'Ada',
      },
    ])
  })

  it('ignores duplicate suffixes for serializers without id placeholders', () => {
    const serializer = createMarkupSerializer('[[__display__]]|0')

    expect(serializer.findAll('[[Ada]]|0')).toEqual([])
  })

  it('sorts overlapping matches by index and longer markup first', () => {
    const serializer = createMarkupSerializer('[__id__]')
    const value = 'Nested [abc][de]'

    expect(serializer.findAll(value)).toEqual([
      {
        markup: '[abc]',
        index: 7,
        id: 'abc',
        display: null,
      },
      {
        markup: '[de]',
        index: 12,
        id: 'de',
        display: null,
      },
    ])
  })
})
