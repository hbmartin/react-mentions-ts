import merge from './merge'

describe('#merge', () => {
  for (const x of [
    { input1: { a: 2 }, input2: {}, expected: { a: 2 } },
    { input1: { a: 2 }, input2: { b: 3 }, expected: { a: 2, b: 3 } },
    { input1: {}, input2: { b: 3 }, expected: { b: 3 } },
    { input1: {}, input2: {}, expected: {} },
    { input1: undefined, input2: undefined, expected: {} },
  ]) {
    it('should merge values from input1 + input2', () => {
      expect(merge(x.input1, x.input2)).toEqual(x.expected)
    })
  }
})
