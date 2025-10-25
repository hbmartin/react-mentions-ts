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

    // Track the starting position in `out` before adding `base`
    const outStartPos = out.length
    out += base

    // For each UTF-16 code unit added to `out`, map it back to position i
    // This ensures map[k] corresponds to indexOf results which operate on UTF-16 code units
    // Without this, surrogate pairs (emojis) would cause off-by-one mapping errors
    for (let j = outStartPos; j < out.length; j++) {
      map.push(i)
    }

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
    if (caseInsensitive === false) {
      return haystack.indexOf(needle)
    }
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
