import getSubstringIndex from './getSubstringIndex'

describe('#getSubstringIndex', () => {
  it('finds substrings regardless of case and accents', () => {
    expect(getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'aurait-il', true)).toEqual(0)
    expect(getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'adore', true)).toEqual(14)
    expect(
      getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'not existing substring', true)
    ).toEqual(-1)
    expect(getSubstringIndex('Curaçao', 'cao', true)).toEqual(4)
    const decomposed = 'Jose\u0301'
    expect(getSubstringIndex(decomposed, 'josé', true)).toEqual(0)
  })
  it('Should return the index of the substring or -1 ignoring only the case', () => {
    expect(getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'aurait-il')).toEqual(0)
    expect(getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'adore')).toEqual(-1)
    expect(getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'not existing substring')).toEqual(-1)
  })
  it('Should return the index of the substring or -1 ignoring the accents and the case', () => {
    expect(getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'adore', true)).toEqual(14)
    expect(
      getSubstringIndex('Aurait-Il été ãdOré là-bas ?', 'not existing substring', true)
    ).toEqual(-1)
  })

  it('should avoid off-by-one mapping errors with surrogate pairs and combining sequences when ignoreAccents is enabled', () => {
    // Test case: emoji (surrogate pair) followed by accented text
    // The emoji '😀' occupies 2 UTF-16 code units (positions 0-1 in the string)
    // When ignoreAccents is enabled, map[k] should point to valid character boundaries,
    // not inside a surrogate pair or combining sequence
    const haystack = '😀café'
    const result = getSubstringIndex(haystack, 'cafe', true)

    // The emoji '😀' is at positions 0-1 (surrogate pair)
    // 'c' should be at position 2
    // We expect result to be 2, not 1 (which would be inside the surrogate pair)
    expect(result).toBe(2)

    // Verify that slicing from the returned index works correctly
    // This ensures the returned index points to a proper character boundary
    const sliced = haystack.slice(result, result + 4)
    expect(sliced).toBe('café')

    // Additional test: multiple emojis with accented text
    const haystackMultiEmoji = '👍🏻café'
    const resultMultiEmoji = getSubstringIndex(haystackMultiEmoji, 'cafe', true)

    // '👍' is at 0-1, '🏻' is at 2-3, 'c' should be at position 4
    expect(resultMultiEmoji).toBe(4)
    expect(haystackMultiEmoji.slice(resultMultiEmoji, resultMultiEmoji + 4)).toBe('café')
  })

  it('should respect case sensitivity when ignoreAccents=true and caseInsensitive=false', () => {
    // When caseInsensitive is explicitly false, case should be preserved even with ignoreAccents
    const haystack = 'Café CAFÉ café'

    // Should match 'café' exactly (case-sensitive), but ignore accents
    expect(getSubstringIndex(haystack, 'cafe', true, false)).toBe(10)

    // Should NOT match 'Café' when looking for 'cafe' with case sensitivity
    // Note: the current implementation may have a bug here - documenting expected behavior
    expect(getSubstringIndex(haystack, 'CAFE', true, false)).toBe(5)

    // With case insensitivity (or default), should match first occurrence
    expect(getSubstringIndex(haystack, 'cafe', true, true)).toBe(0)
    expect(getSubstringIndex(haystack, 'CAFE', true, true)).toBe(0)
  })

  it('should document NFD normalization limitations with ligatures and special characters', () => {
    // LIMITATION: NFD normalization does NOT expand ligatures or special character pairs
    // These are documented limitations of the current implementation

    // Ligature 'æ' does NOT expand to 'ae' via NFD
    const haystackAE = 'Encyclopædia'
    // This will NOT match because 'æ' remains as a single character after NFD
    expect(getSubstringIndex(haystackAE, 'ae', true)).toBe(-1)
    // But 'æ' can be found as itself (with accent normalization applied)
    // 'Encyclop' = 8 chars (0-7), 'æ' starts at position 8
    expect(getSubstringIndex(haystackAE, 'æ', true)).toBe(8)

    // German sharp S 'ß' does NOT expand to 'ss' via NFD
    const haystackSS = 'Straße'
    // This will NOT match because 'ß' remains as a single character after NFD
    expect(getSubstringIndex(haystackSS, 'ss', true)).toBe(-1)
    // But 'ß' can be found as itself
    expect(getSubstringIndex(haystackSS, 'ß', true)).toBe(4)

    // Ligature 'œ' does NOT expand to 'oe' via NFD
    const haystackOE = 'cœur'
    expect(getSubstringIndex(haystackOE, 'oe', true)).toBe(-1)
    expect(getSubstringIndex(haystackOE, 'œ', true)).toBe(1)

    // These limitations are inherent to using NFD normalization, which only handles
    // combining marks (accents), not character decomposition into base letter sequences
  })

  it('skips characters gracefully when String#codePointAt reports undefined', () => {
    const haystackWrapper = new String('abc')
    const codePointAtMock = jest.fn(function (this: String, pos: number) {
      if (pos === 1) return undefined
      return String.prototype.codePointAt.call(this, pos)
    })
    ;(
      haystackWrapper as unknown as { codePointAt: (pos: number) => number | undefined }
    ).codePointAt = codePointAtMock

    const result = getSubstringIndex(haystackWrapper as unknown as string, 'c', true)

    expect(codePointAtMock).toHaveBeenCalledWith(1)
    expect(result).toBe(2)
  })
})
