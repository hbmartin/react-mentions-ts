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
      it('should match and capture text exactly as typed', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: false })

        const match1 = '@José'.match(regex)
        expect(match1).not.toBeNull()
        expect(match1?.[2]).toBe('José')

        const match2 = '@Jose'.match(regex)
        expect(match2).not.toBeNull()
        expect(match2?.[2]).toBe('Jose')
      })

      it('should not normalize accents by default', () => {
        const regex = makeTriggerRegex('@')

        const match1 = '@Café'.match(regex)
        const match2 = '@Cafe'.match(regex)

        expect(match1?.[2]).toBe('Café')
        expect(match2?.[2]).toBe('Cafe')
      })
    })

    describe('when ignoreAccents is true', () => {
      it('should capture characters with diacritics preserving the original input', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        // Composed form (single character)
        const composed = '@José'
        const match1 = composed.match(regex)
        expect(match1).not.toBeNull()
        expect(match1?.[2]).toBe('José') // Preserves original

        // Decomposed form (base + combining mark)
        const decomposed = '@Jose\u0301'
        const match2 = decomposed.match(regex)
        expect(match2).not.toBeNull()
        expect(match2?.[2]).toBe('Jose\u0301') // Preserves original decomposed form
      })

      it('should match and preserve common European accented characters', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        const testCases = [
          { input: '@Café', expected: 'Café' },
          { input: '@café', expected: 'café' },
          { input: '@Curaçao', expected: 'Curaçao' },
          { input: '@François', expected: 'François' },
          { input: '@Müller', expected: 'Müller' },
          { input: '@Øre', expected: 'Øre' },
          { input: '@Andrés', expected: 'Andrés' },
          { input: '@Søren', expected: 'Søren' },
        ]

        for (const { input, expected } of testCases) {
          const match = input.match(regex)
          expect(match).not.toBeNull()
          expect(match?.[2]).toBe(expected)
        }
      })

      it('should handle Unicode flag properly', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })
        // Verify the regex has the 'u' flag
        expect(regex.flags).toContain('u')
      })

      it('should preserve mixed accented and non-accented characters', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        const match = '@JoséSmith'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('JoséSmith')
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
          allowSpaceInQuery: true,
        })

        const match = '@José García'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('José García')
      })

      it('should preserve original case', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        const testCases = [
          { input: '@JOSÉ', expected: 'JOSÉ' },
          { input: '@José', expected: 'José' },
          { input: '@josé', expected: 'josé' },
          { input: '@JoSé', expected: 'JoSé' },
        ]

        for (const { input, expected } of testCases) {
          const match = input.match(regex)
          expect(match?.[2]).toBe(expected)
        }
      })

      it('should handle triggers at the start of text', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        const match = '@Café'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('Café')
      })

      it('should handle triggers after whitespace', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        const match = 'Hello @Café'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('Café')
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
        expect(match?.[2]).toBe('Åéîõü')
      })

      it('should preserve names with tildes', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        const testCases = [
          { input: '@Peña', expected: 'Peña' },
          { input: '@São', expected: 'São' },
          { input: '@Niño', expected: 'Niño' },
        ]

        for (const { input, expected } of testCases) {
          const match = input.match(regex)
          expect(match?.[2]).toBe(expected)
        }
      })

      it('should match text with combining diacritical marks', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        // Test with various combining marks
        const withAcute = '@e\u0301' // e + combining acute accent
        const matchAcute = withAcute.match(regex)
        expect(matchAcute).not.toBeNull()
        expect(matchAcute?.[2]).toBe('e\u0301')

        const withGrave = '@a\u0300' // a + combining grave accent
        const matchGrave = withGrave.match(regex)
        expect(matchGrave).not.toBeNull()
        expect(matchGrave?.[2]).toBe('a\u0300')
      })
    })
  })
})
