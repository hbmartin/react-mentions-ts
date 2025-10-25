import getSubstringIndex, { normalizeString } from './getSubstringIndex'

describe('#normalizeString', () => {
  it('Should return the string in lowercase without accents', () => {
    expect(normalizeString('Aurait-Il été ãdOré là-bas ?')).toEqual('aurait-il ete adore la-bas ?')
  })
})

describe('#getSubstringIndex', () => {
  it('finds substrings regardless of case and accents', () => {
    expect(getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'aurait-il')).toEqual(0)
    expect(getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'adore')).toEqual(14)
    expect(getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'not existing substring')).toEqual(-1)
    expect(getSubstringIndex('Curaçao', 'cao')).toEqual(4)
    const decomposed = 'Jose\u0301'
    expect(getSubstringIndex(decomposed, 'josé')).toEqual(0)
  })
})
