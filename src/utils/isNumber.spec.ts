import isNumber from './isNumber'

describe('#isNumber', () => {
  const passingValues = [1, 0, Number.NaN]
  const failingValues = [
    [1, 2, 3],
    new Object(0),
    true,
    new Date(),
    new Error(),
    { a: 1 },
    /x/,
    'a',
  ]

  for (const value of passingValues) {
    it(`should return "true" for numbers: ${value}`, () => {
      const result = isNumber(value)
      expect(result).toBe(true)
    })
  }

  for (const value of failingValues) {
    it(`should return "false" for non-numbers: ${value}`, () => {
      const result = isNumber(value)
      expect(result).toBe(false)
    })
  }
})
