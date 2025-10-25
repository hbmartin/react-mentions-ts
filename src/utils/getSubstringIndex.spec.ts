import getSubstringIndex from './getSubstringIndex'

describe('#getSubstringIndex', () => {
  it('finds substrings regardless of case and accents', () => {
    expect(getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'aurait-il')).toEqual(0)
    expect(getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'adore')).toEqual(14)
    expect(getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'not existing substring')).toEqual(-1)
    expect(getSubstringIndex('Curaçao', 'cao')).toEqual(4)
    const decomposed = 'Jose\u0301'
    expect(getSubstringIndex(decomposed, 'josé')).toEqual(0)
  })
  it('Should return the index of the substring or -1 ignoring only the case', () => {
    expect(getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'aurait-il')).toEqual(0)
    expect(getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'adore')).toEqual(-1)
    expect(getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'not existing substring')).toEqual(-1)
  })
  it('Should return the index of the substring or -1 ignoring the accents and the case', () => {
    expect(getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'adore', true)).toEqual(14)
    expect(
      getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'not existing substring', true)
    ).toEqual(-1)
  })
})
