import { mergeDeep } from './mergeDeep'

describe('mergeDeep', () => {
  it('merges nested plain objects without mutating the inputs', () => {
    const target = {
      theme: {
        colors: {
          primary: '#3366ff',
        },
        spacing: 4,
      },
      version: 1,
    }
    const source = {
      theme: {
        colors: {
          secondary: '#22cc88',
        },
      },
      version: 2,
    }

    const result = mergeDeep(target, source)

    expect(result).not.toBe(target)
    expect(target.version).toBe(1)
    expect(result.version).toBe(2)
    expect(result.theme.colors.primary).toBe('#3366ff')
    expect(result.theme.colors.secondary).toBe('#22cc88')
  })

  it('replaces non-plain values such as arrays with the source value', () => {
    const target = {
      items: [1, 2],
    }
    const source = {
      items: ['a', 'b'],
    }

    const result = mergeDeep(target, source)
    expect(result.items).toEqual(['a', 'b'])
  })

  it('creates nested objects when the target value is not a plain object', () => {
    const target = {
      meta: null as unknown as Record<string, unknown>,
    }
    const source = {
      meta: {
        nested: true,
      },
    }

    const result = mergeDeep(target, source)
    expect(result.meta).toEqual({ nested: true })
  })
})
