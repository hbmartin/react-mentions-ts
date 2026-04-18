import createInternalRegExp from './createInternalRegExp'

describe('createInternalRegExp', () => {
  it('creates regular expressions with valid flags', () => {
    expect(createInternalRegExp('abc', 'gi')).toEqual(/abc/gi)
  })

  it('rejects invalid regular expression flags', () => {
    expect(() => createInternalRegExp('abc', 'gz!')).toThrow('Invalid RegExp flags: gz!')
  })
})
