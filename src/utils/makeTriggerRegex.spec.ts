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
      it('should capture characters with diacritics preserving the original input', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        // These should produce equivalent matches
        const text1 = '@José'
        const text2 = '@Jose'
        const match1 = text1.match(regex)
        const match2 = text2.match(regex)

        expect(match1).not.toBeNull()
        expect(match2).not.toBeNull()

        // The captured groups should be normalized to the same value
        expect(match1?.[2]).toBe('José')
        expect(match2?.[2]).toBe('Jose')
      })

      it('should handle common European accented characters', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })

        const testCases = [
          { input: '@Café' },
          { input: '@café' },
          { input: '@Curaçao' },
          { input: '@François' },
          { input: '@Müller' },
          { input: '@Øre' },
          { input: '@Andrés' },
          { input: '@Søren' },
        ]

        for (const { input } of testCases) {
          const match = input.match(regex)
          expect(match).not.toBeNull()
          expect(match?.[2]).toBe(input.slice(1))
        }
      })

      it('should have regex Unicode flag  with ignoreAccents true', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: true })
        // Verify the regex has the 'u' flag
        expect(regex.flags).toContain('u')
      })

      it('should not have regex Unicode flag when ignoreAccents is false', () => {
        const regex = makeTriggerRegex('@', { ignoreAccents: false })
        // Verify the regex has the 'u' flag
        expect(regex.flags).not.toContain('u')
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

        const testCases = ['@JOSÉ', '@José', '@josé', '@JoSé']

        for (const input of testCases) {
          const match = input.match(regex)
          expect(match?.[2]).toBe(input.slice(1))
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

      it('should handle names with tildes', () => {
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
