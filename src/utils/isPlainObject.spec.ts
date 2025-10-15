import isPlainObject from './isPlainObject'

describe('isPlainObject', () => {
  for (const x of [
    { input: {}, expected: true },
    { input: { a: 1 }, expected: true },
    { input: new Object(), expected: true },
    { input: new Object({ a: 1 }), expected: true },
    { input: new Object({}), expected: true },
    { input: 2, expected: false },
    { input: 'Name', expected: false },
    { input: new Date(), expected: false },
  ]) {
    it('should check if input is object', () => {
      expect(isPlainObject(x.input)).toBe(x.expected)
    })
  }
})
