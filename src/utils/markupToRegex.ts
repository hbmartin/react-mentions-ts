import createInternalRegExp from './createInternalRegExp'
import escapeRegex from './escapeRegex'
import PLACEHOLDERS from './placeholders'

const markupToRegex = (
  markup: string,
  {
    idPattern,
  }: {
    idPattern?: string
  } = {}
): RegExp => {
  const escapedMarkup = escapeRegex(markup)

  const charAfterDisplay = markup.charAt(
    markup.indexOf(PLACEHOLDERS.display) + PLACEHOLDERS.display.length
  )

  const charAfterId = markup.charAt(markup.indexOf(PLACEHOLDERS.id) + PLACEHOLDERS.id.length)

  return createInternalRegExp(
    escapedMarkup
      .replace(PLACEHOLDERS.display, `([^${escapeRegex(charAfterDisplay)}]+?)`)
      .replace(PLACEHOLDERS.id, idPattern ?? `([^${escapeRegex(charAfterId)}]+?)`)
  )
}

export default markupToRegex
