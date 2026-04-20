import { stripStatefulRegexFlags } from './regexFlags'

describe('#stripStatefulRegexFlags', () => {
  it.each([
    { flags: '', expected: '' },
    { flags: 'g', expected: '' },
    { flags: 'y', expected: '' },
    { flags: 'giuy', expected: 'iu' },
    { flags: 'dimsuy', expected: 'dimsu' },
  ])('strips stateful flags from $flags', ({ flags, expected }) => {
    expect(stripStatefulRegexFlags(flags)).toBe(expected)
  })
})
