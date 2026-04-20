import ensureNumber from './ensureNumber'

describe('#ensureNumber', () => {
  it.each([
    { value: 0, fallback: 9, expected: 0 },
    { value: 4, fallback: 9, expected: 4 },
    { value: null, fallback: 9, expected: 9 },
    { value: undefined, fallback: 9, expected: 9 },
  ])(
    'returns $expected for value $value and fallback $fallback',
    ({ value, fallback, expected }) => {
      expect(ensureNumber(value, fallback)).toBe(expected)
    }
  )
})
