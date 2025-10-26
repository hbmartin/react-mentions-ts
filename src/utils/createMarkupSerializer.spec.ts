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
})
