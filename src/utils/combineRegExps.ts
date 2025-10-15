const serializedRegexParser = /^\/(.+)\/(\w+)?$/

const combineRegExps = (regExps: ReadonlyArray<RegExp>): RegExp => {
  if (regExps.length === 0) {
    throw new Error('combineRegExps requires at least one regular expression')
  }
  const pattern = regExps
    .map((regex) => {
      const match = serializedRegexParser.exec(regex.toString())

      if (!match) {
        throw new Error(`Invalid regular expression: ${String(regex)}`)
      }

      const [, regexString, regexFlags] = match

      if (regexFlags) {
        throw new Error(
          `RegExp flags are not supported. Change /${regexString}/${regexFlags} into /${regexString}/`
        )
      }

      return `(${regexString})`
    })
    .join('|')

  return new RegExp(pattern, 'g')
}

export default combineRegExps
