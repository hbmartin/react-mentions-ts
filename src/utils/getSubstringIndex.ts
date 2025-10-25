/* eslint-disable code-complete/enforce-meaningful-names */
const stripWithMap = (s: string) => {
  let out = ''
  const map: number[] = []
  // Iterate by code point to preserve surrogate pairs
  for (let i = 0; i < s.length; ) {
    const cp = s.codePointAt(i)!
    const char = String.fromCodePoint(cp)
    // NFD: base + combining marks (if any)
    const nfd = char.normalize('NFD')
    // Remove combining marks
    const base = nfd.replaceAll(/\p{M}/gu, '')
    // For each code point added to `out`, store its original index
    // (NFD won't expand letters like 'æ' → 'ae', so this is safe for most accents)
    for (const _ of base) {
      map.push(i)
    }
    out += base
    i += char.length
  }
  return { text: out, map }
}

const getSubstringIndex = (
  haystack: string,
  needle: string,
  ignoreAccents?: boolean,
  caseInsensitive?: boolean
): number => {
  if (ignoreAccents !== true) {
    return haystack.toLowerCase().indexOf(needle.toLowerCase())
  }

  const prep = (s: string) => {
    const { text, map } = stripWithMap(s)
    const t = caseInsensitive === false ? text : text.toLowerCase()
    return { text: t, map }
  }

  const { text: H, map } = prep(haystack)
  const { text: N } = prep(needle)

  const k = H.indexOf(N)
  return k === -1 ? -1 : map[k]
}

export default getSubstringIndex
