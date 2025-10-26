// eslint-disable-next-line code-complete/low-function-cohesion, code-complete/enforce-meaningful-names
const stripWithMap = (s: string) => {
  let out = ''
  const map: number[] = []
  // Iterate by code point to preserve surrogate pairs
  for (let i = 0; i < s.length; ) {
    const codePoint = s.codePointAt(i)
    if (codePoint === undefined) {
      continue
    }
    const char = String.fromCodePoint(codePoint)
    // NFD: base + combining marks (if any)
    const normalized = char.normalize('NFD')
    // Remove combining marks
    const base = normalized.replaceAll(/\p{M}/gu, '')

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

  // eslint-disable-next-line code-complete/enforce-meaningful-names
  const prep = (s: string) => {
    const { text, map } = stripWithMap(s)
    const transformedText = caseInsensitive === false ? text : text.toLowerCase()
    return { text: transformedText, map }
  }

  const { text: H, map } = prep(haystack)
  const { text: N } = prep(needle)

  const k = H.indexOf(N)
  return k === -1 ? -1 : map[k]
}

export default getSubstringIndex
