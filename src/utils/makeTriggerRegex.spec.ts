import { makeTriggerRegex } from './makeTriggerRegex'

describe('makeTriggerRegex', () => {
  describe('basic functionality', () => {
    it('should create a regex for simple @ trigger', () => {
      const regex = makeTriggerRegex('@')
      expect(regex.test('@john')).toBe(true)
      expect(regex.test('hello @john')).toBe(true)
      expect(regex.test('john')).toBe(false)
    })

    it('should return the RegExp as-is when trigger is already a RegExp', () => {
      const customRegex = /test/
      const result = makeTriggerRegex(customRegex)
      expect(result).toBe(customRegex)
    })

    it('should escape special regex characters in trigger', () => {
      const regex = makeTriggerRegex('$$')
      expect(regex.test('$$test')).toBe(true)
    })
  })

  describe('allowSpaceInQuery option', () => {
    it('should not allow spaces in query by default', () => {
      const regex = makeTriggerRegex('@')
      expect(regex.test('@john doe')).toBe(false)
      expect(regex.test('@john')).toBe(true)
    })

    it('should allow spaces when allowSpaceInQuery is true', () => {
      const regex = makeTriggerRegex('@', { allowSpaceInQuery: true })
      expect(regex.test('@john doe')).toBe(true)
    })
  })

  describe('ignoreAccents option', () => {
    describe('when ignoreAccents is false or not provided', () => {
      it('should match exact accented characters only', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: false })

        // Should match when accents are identical
        const match1 = '@José'.match(regex)
        expect(match1).not.toBeNull()
        expect(match1?.[2]).toBe('José')

        // Should not match when comparing accented to non-accented
        const text1 = '@Jose'
        const match2 = text1.match(regex)
        expect(match2?.[2]).toBe('Jose')

        // These are different strings - José vs Jose
        expect('@José'.match(regex)?.[2]).not.toBe('@Jose'.match(regex)?.[2])
      })

      it('should not normalize accents by default', () => {
        const regex = makeTriggerRegex('@')

        const match1 = '@Café'.match(regex)
        const match2 = '@Cafe'.match(regex)

        expect(match1?.[2]).toBe('Café')
        expect(match2?.[2]).toBe('Cafe')
        expect(match1?.[2]).not.toBe(match2?.[2])
      })
    })

    describe('when ignoreAccents is true', () => {
      it('should match accented characters with their non-accented equivalents', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        // These should produce equivalent matches
        const text1 = '@José'
        const text2 = '@Jose'
        const match1 = text1.match(regex)
        const match2 = text2.match(regex)

        expect(match1).not.toBeNull()
        expect(match2).not.toBeNull()

        // The captured groups should be normalized to the same value
        expect(match1?.[2]).toBe('jose')
        expect(match2?.[2]).toBe('jose')
      })

      it('should handle common European accented characters', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        const testCases = [
          { input: '@Café', expected: 'cafe' },
          { input: '@café', expected: 'cafe' },
          { input: '@Curaçao', expected: 'curacao' },
          { input: '@François', expected: 'francois' },
          { input: '@Müller', expected: 'muller' },
          { input: '@Øre', expected: 'ore' },
          { input: '@Andrés', expected: 'andres' },
          { input: '@Søren', expected: 'soren' },
        ]

        for (const { input, expected } of testCases) {
          const match = input.match(regex)
          expect(match).not.toBeNull()
          expect(match?.[2]).toBe(expected)
        }
      })

      it('should handle decomposed Unicode characters', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        // Composed: é (single character U+00E9)
        const composed = '@José'
        // Decomposed: é (e + combining acute accent U+0065 U+0301)
        const decomposed = '@Jose\u0301'

        const match1 = composed.match(regex)
        const match2 = decomposed.match(regex)

        expect(match1).not.toBeNull()
        expect(match2).not.toBeNull()
        expect(match1?.[2]).toBe('jose')
        expect(match2?.[2]).toBe('jose')
      })

      it('should work with mixed accented and non-accented characters', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        const match = '@JoséSmith'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('josesmith')
      })

      it('should handle empty query after trigger', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        const match = '@'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('')
      })

      it('should work with allowSpaceInQuery combined', () => {
        const regex = makeTriggerRegex('@', {
          ignoreAccents: true,
          allowSpaceInQuery: true
        })

        const match = '@José García'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('jose garcia')
      })

      it('should normalize case as well as accents', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        const testCases = [
          '@JOSÉ',
          '@José',
          '@josé',
          '@JoSé',
        ]

        for (const input of testCases) {
          const match = input.match(regex)
          expect(match?.[2]).toBe('jose')
        }
      })

      it('should handle triggers at the start of text', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        const match = '@Café'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('cafe')
      })

      it('should handle triggers after whitespace', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        const match = 'Hello @Café'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('cafe')
      })

      it('should not match triggers in the middle of words', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        const match = 'email@Café.com'.match(regex)
        expect(match).toBeNull()
      })

      it('should handle multiple accented characters in sequence', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        const match = '@Åéîõü'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('aeiou')
      })

      it('should handle names with tildes', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        const testCases = [
          { input: '@Peña', expected: 'pena' },
          { input: '@São', expected: 'sao' },
          { input: '@Niño', expected: 'nino' },
        ]

        for (const { input, expected } of testCases) {
          const match = input.match(regex)
          expect(match?.[2]).toBe(expected)
        }
      })
    })
  })
})
