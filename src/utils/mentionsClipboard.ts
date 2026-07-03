import type { MentionChildConfig } from '../types'
import iterateMentionsMarkup from './iterateMentionsMarkup'

export const MENTIONS_MARKUP_HTML_ATTRIBUTE = 'data-react-mentions'

const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const escapeHtmlAttribute = (text: string): string =>
  escapeHtml(text).replaceAll('\r', '&#13;').replaceAll('\n', '&#10;')

/**
 * Serializes a markup fragment to an HTML clipboard payload: mentions become
 * `<strong data-mention-id>` elements for rich-text targets, and the raw markup is
 * carried on a wrapper attribute so another MentionsInput can restore it losslessly
 * even when the custom `text/react-mentions` clipboard type is stripped.
 */
export const buildMentionsClipboardHtml = <
  Extra extends Record<string, unknown> = Record<string, unknown>,
>(
  markupValue: string,
  config: ReadonlyArray<MentionChildConfig<Extra>>
): string => {
  let contentHtml = ''

  iterateMentionsMarkup(
    markupValue,
    config,
    (_match, _index, _plainTextIndex, id, display) => {
      contentHtml += `<strong data-mention-id="${escapeHtmlAttribute(id)}">${escapeHtml(display)}</strong>`
    },
    (text) => {
      contentHtml += escapeHtml(text).replaceAll('\n', '<br>')
    }
  )

  return `<span ${MENTIONS_MARKUP_HTML_ATTRIBUTE}="${escapeHtmlAttribute(markupValue)}">${contentHtml}</span>`
}

/**
 * Extracts the raw mentions markup from an HTML clipboard payload produced by
 * `buildMentionsClipboardHtml`. Returns null for foreign or unparsable HTML.
 */
export const extractMentionsMarkupFromHtml = (clipboardHtml: string): string | null => {
  if (clipboardHtml.length === 0 || typeof DOMParser === 'undefined') {
    return null
  }

  const doc = new DOMParser().parseFromString(clipboardHtml, 'text/html')
  return (
    doc
      .querySelector(`[${MENTIONS_MARKUP_HTML_ATTRIBUTE}]`)
      ?.getAttribute(MENTIONS_MARKUP_HTML_ATTRIBUTE) ?? null
  )
}
