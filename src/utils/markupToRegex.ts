import escapeRegex from './escapeRegex'
import PLACEHOLDERS from './placeholders'

const markupToRegex = (markup: string): RegExp => {
  const escapedMarkup = escapeRegex(markup)

  const charAfterDisplay =
    markup[markup.indexOf(PLACEHOLDERS.display) + PLACEHOLDERS.display.length]

  const charAfterId = markup[markup.indexOf(PLACEHOLDERS.id) + PLACEHOLDERS.id.length]

  return new RegExp(
    escapedMarkup
      .replace(PLACEHOLDERS.display, `([^${escapeRegex(charAfterDisplay || '')}]+?)`)
      .replace(PLACEHOLDERS.id, `([^${escapeRegex(charAfterId || '')}]+?)`)
  )
}

export default markupToRegex
