import { DEFAULT_MENTION_PROPS } from '../MentionDefaultProps'
import type { MentionChildConfig } from '../types'
import createMarkupSerializer from './createMarkupSerializer'
import {
  buildMentionsClipboardHtml,
  extractMentionsMarkupFromHtml,
  MENTIONS_MARKUP_HTML_ATTRIBUTE,
} from './mentionsClipboard'

const config: MentionChildConfig[] = [
  {
    ...DEFAULT_MENTION_PROPS,
    data: [],
    serializer: createMarkupSerializer('@[__display__](__id__)'),
  },
]

describe('buildMentionsClipboardHtml', () => {
  it('renders mentions as strong elements and carries the raw markup on the wrapper', () => {
    const markup = "Hi @[First](first), let's go"
    const html = buildMentionsClipboardHtml(markup, config)

    expect(html).toBe(
      `<span ${MENTIONS_MARKUP_HTML_ATTRIBUTE}="Hi @[First](first), let&#39;s go">` +
        'Hi <strong data-mention-id="first">First</strong>, let&#39;s go</span>'
    )
  })

  it('escapes HTML in text, ids, and displays', () => {
    const html = buildMentionsClipboardHtml('<b>&</b> @[<script>](x"y)', config)

    expect(html).not.toContain('<b>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;b&gt;&amp;&lt;/b&gt;')
    expect(html).toContain('data-mention-id="x&quot;y"')
    expect(html).toContain('<strong data-mention-id="x&quot;y">&lt;script&gt;</strong>')
  })

  it('converts newlines to <br> in the visible content but preserves them in the attribute', () => {
    const html = buildMentionsClipboardHtml('line one\nline two', config)

    expect(html).toContain('line one<br>line two')
    expect(html).toContain(`${MENTIONS_MARKUP_HTML_ATTRIBUTE}="line one&#10;line two"`)
  })
})

describe('extractMentionsMarkupFromHtml', () => {
  it('round-trips markup through the HTML payload', () => {
    const markup = 'Hi @[First](first),\nsee "quotes" & <tags>'
    const html = buildMentionsClipboardHtml(markup, config)

    expect(extractMentionsMarkupFromHtml(html)).toBe(markup)
  })

  it('returns null for foreign HTML', () => {
    expect(extractMentionsMarkupFromHtml('<p>hello <b>world</b></p>')).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(extractMentionsMarkupFromHtml('')).toBeNull()
  })

  it('returns null when DOMParser is unavailable', () => {
    vi.stubGlobal('DOMParser', undefined)
    try {
      expect(extractMentionsMarkupFromHtml('<span data-react-mentions="x">x</span>')).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
