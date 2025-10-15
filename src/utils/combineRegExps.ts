import invariant from 'invariant'

const serializedRegexParser = /^\/(.+)\/(\w+)?$/

const combineRegExps = (regExps: ReadonlyArray<RegExp>): RegExp => {
  const pattern = regExps
    .map(regex => {
      const match = serializedRegexParser.exec(regex.toString())

      invariant(
        match,
        `Invalid regular expression: ${String(regex)}`
      )

      const [, regexString, regexFlags] = match as RegExpExecArray

      invariant(
        !regexFlags,
        `RegExp flags are not supported. Change /${regexString}/${regexFlags} into /${regexString}/`
      )

      return `(${regexString})`
    })
    .join('|')

  return new RegExp(pattern, 'g')
}

export default combineRegExps
