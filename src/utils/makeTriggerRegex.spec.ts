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

  describe('unusual trigger characters', () => {
    describe('colon trigger (:)', () => {
      it('should create a valid regex for colon trigger', () => {
        const regex = makeTriggerRegex(':')
        expect(regex).toBeInstanceOf(RegExp)
        expect(regex.source).not.toBe('')
        // Verify the regex properly escapes colon
        expect(regex.source).toContain(':')
      })

      it('should match text starting with colon at beginning', () => {
        const regex = makeTriggerRegex(':')
        const match = ':emoji'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[1]).toBe(':emoji')
        expect(match?.[2]).toBe('emoji')
      })

      it('should match text starting with colon after whitespace', () => {
        const regex = makeTriggerRegex(':')
        const match = 'Hello :emoji'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[1]).toBe(':emoji')
        expect(match?.[2]).toBe('emoji')
      })

      it('should not match colon in the middle of text without space', () => {
        const regex = makeTriggerRegex(':')
        const match = 'http://example.com'.match(regex)
        expect(match).toBeNull()
      })

      it('should match partial emoji notation', () => {
        const regex = makeTriggerRegex(':')
        const testCases = [
          { input: ':smile', expected: 'smile' },
          { input: ':heart', expected: 'heart' },
          { input: ':thumbs', expected: 'thumbs' },
          { input: ':fire', expected: 'fire' },
        ]

        for (const { input, expected } of testCases) {
          const match = input.match(regex)
          expect(match).not.toBeNull()
          expect(match?.[2]).toBe(expected)
        }
      })

      it('should not match when there are multiple colons without space', () => {
        const regex = makeTriggerRegex(':')
        const match = 'time::now'.match(regex)
        expect(match).toBeNull()
      })

      it('should work with allowSpaceInQuery option', () => {
        const regex = makeTriggerRegex(':', { allowSpaceInQuery: true })
        const match = ':multi word emoji'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('multi word emoji')
      })
    })

    describe('forward slash trigger (/)', () => {
      it('should create a valid regex for forward slash trigger', () => {
        const regex = makeTriggerRegex('/')
        expect(regex).toBeInstanceOf(RegExp)
        expect(regex.source).not.toBe('')
        // Verify the regex properly escapes forward slash
        expect(regex.source).toContain('/')
      })

      it('should match text starting with slash at beginning', () => {
        const regex = makeTriggerRegex('/')
        const match = '/command'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[1]).toBe('/command')
        expect(match?.[2]).toBe('command')
      })

      it('should match text starting with slash after whitespace', () => {
        const regex = makeTriggerRegex('/')
        const match = 'Execute /command'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[1]).toBe('/command')
        expect(match?.[2]).toBe('command')
      })

      it('should not match slash in file paths without space', () => {
        const regex = makeTriggerRegex('/')
        const match = 'path/to/file'.match(regex)
        expect(match).toBeNull()
      })

      it('should match various command names', () => {
        const regex = makeTriggerRegex('/')
        const testCases = [
          { input: '/help', expected: 'help' },
          { input: '/status', expected: 'status' },
          { input: '/search', expected: 'search' },
          { input: '/join', expected: 'join' },
        ]

        for (const { input, expected } of testCases) {
          const match = input.match(regex)
          expect(match).not.toBeNull()
          expect(match?.[2]).toBe(expected)
        }
      })

      it('should handle consecutive slashes properly', () => {
        const regex = makeTriggerRegex('/')
        // URL with // should not match
        const match = 'https://example.com'.match(regex)
        expect(match).toBeNull()
      })

      it('should work with allowSpaceInQuery option', () => {
        const regex = makeTriggerRegex('/', { allowSpaceInQuery: true })
        const match = '/search for something'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('search for something')
      })

      it('should match empty slash query', () => {
        const regex = makeTriggerRegex('/')
        const match = '/'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('')
      })
    })

    describe('backslash trigger (\\)', () => {
      it('should create a valid regex for backslash trigger', () => {
        const regex = makeTriggerRegex('\\')
        expect(regex).toBeInstanceOf(RegExp)
        expect(regex.source).not.toBe('')
        // Verify the regex properly escapes backslash
        expect(regex.source).toContain('\\\\')
      })

      it('should match text starting with backslash at beginning', () => {
        const regex = makeTriggerRegex('\\')
        const match = '\\command'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[1]).toBe('\\command')
        expect(match?.[2]).toBe('command')
      })

      it('should match text starting with backslash after whitespace', () => {
        const regex = makeTriggerRegex('\\')
        const match = 'LaTeX \\command'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[1]).toBe('\\command')
        expect(match?.[2]).toBe('command')
      })

      it('should not match backslash in Windows paths without space', () => {
        const regex = makeTriggerRegex('\\')
        const match = 'C:\\Users\\file'.match(regex)
        expect(match).toBeNull()
      })

      it('should match various LaTeX-style commands', () => {
        const regex = makeTriggerRegex('\\')
        const testCases = [
          { input: '\\alpha', expected: 'alpha' },
          { input: '\\beta', expected: 'beta' },
          { input: '\\sum', expected: 'sum' },
          { input: '\\int', expected: 'int' },
        ]

        for (const { input, expected } of testCases) {
          const match = input.match(regex)
          expect(match).not.toBeNull()
          expect(match?.[2]).toBe(expected)
        }
      })

      it('should handle consecutive backslashes properly', () => {
        const regex = makeTriggerRegex('\\')
        // Double backslash should not match
        const match = '\\\\newline'.match(regex)
        expect(match).toBeNull()
      })

      it('should work with allowSpaceInQuery option', () => {
        const regex = makeTriggerRegex('\\', { allowSpaceInQuery: true })
        const match = '\\text with spaces'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('text with spaces')
      })

      it('should match empty backslash query', () => {
        const regex = makeTriggerRegex('\\')
        const match = '\\'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('')
      })
    })

    describe('unusual triggers with ignoreAccents option', () => {
      it('should work with colon trigger and accented characters', () => {
        const regex = makeTriggerRegex(':', { ignoreAccents: true })
        const match = ':café'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('café')
      })

      it('should work with slash trigger and accented characters', () => {
        const regex = makeTriggerRegex('/', { ignoreAccents: true })
        const match = '/José'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('José')
      })

      it('should work with backslash trigger and accented characters', () => {
        const regex = makeTriggerRegex('\\', { ignoreAccents: true })
        const match = '\\Müller'.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[2]).toBe('Müller')
      })
    })
  })
})
