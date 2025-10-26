import escapeRegex from './escapeRegex'

describe('escapeRegex', () => {
  it('returns the same string when no regex special characters are present', () => {
    const input = 'alphaNumeric_123'
    expect(escapeRegex(input)).toBe(input)
  })

  it('escapes every regex control character with a single backslash prefix', () => {
    const characters = [
      ' ',
      '\t',
      '\n',
      '\r',
      '\f',
      '\v',
      '#',
      '$',
      '(',
      ')',
      '*',
      '+',
      ',',
      '.',
      '?',
      '[',
      '\\',
      ']',
      '^',
      '{',
      '|',
      '}',
      '-',
    ]
    const input = characters.join('')
    const expected = characters.map((char) => `\\${char}`).join('')

    expect(escapeRegex(input)).toBe(expected)
  })

  it('escapes special characters embedded in text', () => {
    const input = 'hello.*world?[test]'
    expect(escapeRegex(input)).toBe('hello\\.\\*world\\?\\[test\\]')
  })

  it('returns an empty string when input is empty', () => {
    expect(escapeRegex('')).toBe('')
  })
})
