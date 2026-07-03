import React, { useState } from 'react'
import { page } from 'vitest/browser'
import { Mention, MentionsInput } from '../../src'
import { renderBrowser } from './render'

const users = [
  { id: 'first', display: 'First entry' },
  { id: 'second', display: 'Second entry' },
]

// The library ships Tailwind utility classes; browser tests don't load
// Tailwind, so replicate the layout-critical utilities the component relies on.
const tailwindUtilityStyles = `
.relative { position: relative; }
.block { display: block; }
.w-full { width: 100%; }
.box-border { box-sizing: border-box; }
.overflow-hidden { overflow: hidden; }
.whitespace-pre-wrap { white-space: pre-wrap; }
.break-words { overflow-wrap: break-word; }
.whitespace-pre { white-space: pre; }
.break-normal { overflow-wrap: normal; }
.inline { display: inline; }
.resize-none { resize: none; }
`

interface TypographyScenario {
  readonly name: string
  readonly css: string
  readonly singleLine?: boolean
}

// Each scenario applies IDENTICAL typography to the input and highlighter
// slots (the documented styling contract) and then asserts the component's
// internal structure doesn't introduce divergence.
const scenarios: TypographyScenario[] = [
  {
    name: 'default sans-serif',
    css: `font-family: Arial, sans-serif; font-size: 16px; line-height: 24px;
      letter-spacing: normal; padding: 8px 10px; border: 1px solid transparent; width: 320px;`,
  },
  {
    name: 'large serif with letter-spacing',
    css: `font-family: Georgia, serif; font-size: 20px; line-height: 40px;
      letter-spacing: 1.5px; padding: 12px 16px; border: 1px solid transparent; width: 420px;`,
  },
  {
    name: 'compact monospace with thick border',
    css: `font-family: monospace; font-size: 13px; line-height: 18px;
      letter-spacing: 0.5px; padding: 4px 6px; border: 2px solid transparent; width: 280px;`,
  },
]

const GLYPH_CRITICAL_STYLES = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'letterSpacing',
  'wordSpacing',
  'lineHeight',
  'textTransform',
  'textIndent',
  'boxSizing',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
] as const

interface FixtureProps {
  readonly initialValue: string
  readonly typographyCss: string
  readonly singleLine?: boolean
}

function AlignmentFixture({ initialValue, typographyCss, singleLine = false }: FixtureProps) {
  const [value, setValue] = useState(initialValue)

  return (
    <section>
      <style>{`${tailwindUtilityStyles}\n.scenario-typography { ${typographyCss} }`}</style>
      <MentionsInput
        aria-label="Composer"
        value={value}
        singleLine={singleLine}
        onMentionsChange={({ value: nextValue }) => setValue(nextValue)}
        classNames={{
          highlighter: 'scenario-typography',
          input: 'scenario-typography',
        }}
      >
        <Mention trigger="@" data={users} />
      </MentionsInput>
    </section>
  )
}

const getInput = async (): Promise<HTMLInputElement | HTMLTextAreaElement> => {
  const element = await page.getByRole('combobox', { name: 'Composer' }).findElement()

  if (!(element instanceof HTMLTextAreaElement) && !(element instanceof HTMLInputElement)) {
    throw new TypeError('Expected MentionsInput to render an input or textarea')
  }

  return element
}

const getHighlighter = (): HTMLElement => {
  const highlighter = document.querySelector<HTMLElement>('[data-slot="highlighter"]')

  if (!highlighter) {
    throw new Error('Highlighter element not found')
  }

  return highlighter
}

const findMentionSpan = (highlighter: HTMLElement, display: string): HTMLElement => {
  const spans = [...highlighter.querySelectorAll('span')]
  const mentionSpan = spans.find((span) => span.textContent === display)

  if (!mentionSpan) {
    throw new Error(`Mention span for "${display}" not found in highlighter`)
  }

  return mentionSpan
}

const measureTextWidth = (referenceStyle: CSSStyleDeclaration, text: string): number => {
  const context = document.createElement('canvas').getContext('2d')

  if (!context) {
    throw new Error('Canvas 2D context unavailable')
  }

  context.font = `${referenceStyle.fontStyle} ${referenceStyle.fontWeight} ${referenceStyle.fontSize} ${referenceStyle.fontFamily}`
  context.letterSpacing =
    referenceStyle.letterSpacing === 'normal' ? '0px' : referenceStyle.letterSpacing

  return context.measureText(text).width
}

const PIXEL_TOLERANCE = 1.5

describe.each(scenarios)('highlighter/input alignment: $name', ({ css, singleLine }) => {
  const markupValue = 'Hi @[First entry](first), how are you'
  const plainPrefix = 'Hi '

  it('overlays the highlighter exactly on the input box', async () => {
    await renderBrowser(
      <AlignmentFixture initialValue={markupValue} typographyCss={css} singleLine={singleLine} />
    )

    const input = await getInput()
    const highlighter = getHighlighter()
    const inputRect = input.getBoundingClientRect()
    const highlighterRect = highlighter.getBoundingClientRect()

    expect(Math.abs(highlighterRect.left - inputRect.left)).toBeLessThanOrEqual(PIXEL_TOLERANCE)
    expect(Math.abs(highlighterRect.top - inputRect.top)).toBeLessThanOrEqual(PIXEL_TOLERANCE)
    expect(Math.abs(highlighterRect.width - inputRect.width)).toBeLessThanOrEqual(PIXEL_TOLERANCE)
  })

  it('keeps every glyph-critical computed style identical', async () => {
    await renderBrowser(
      <AlignmentFixture initialValue={markupValue} typographyCss={css} singleLine={singleLine} />
    )

    const input = await getInput()
    const highlighter = getHighlighter()
    const inputStyle = getComputedStyle(input)
    const highlighterStyle = getComputedStyle(highlighter)

    const divergent = GLYPH_CRITICAL_STYLES.filter(
      (property) => inputStyle[property] !== highlighterStyle[property]
    ).map((property) => `${property}: ${inputStyle[property]} != ${highlighterStyle[property]}`)

    expect(divergent).toEqual([])
  })

  it('positions the mention highlight where the input renders the text', async () => {
    await renderBrowser(
      <AlignmentFixture initialValue={markupValue} typographyCss={css} singleLine={singleLine} />
    )

    const input = await getInput()
    const highlighter = getHighlighter()
    const inputStyle = getComputedStyle(input)
    const inputRect = input.getBoundingClientRect()
    const mentionRect = findMentionSpan(highlighter, 'First entry').getBoundingClientRect()

    const contentLeft =
      inputRect.left +
      Number.parseFloat(inputStyle.borderLeftWidth) +
      Number.parseFloat(inputStyle.paddingLeft)
    const expectedLeft = contentLeft + measureTextWidth(inputStyle, plainPrefix)

    expect(Math.abs(mentionRect.left - expectedLeft)).toBeLessThanOrEqual(PIXEL_TOLERANCE)

    const expectedWidth = measureTextWidth(inputStyle, 'First entry')
    expect(Math.abs(mentionRect.width - expectedWidth)).toBeLessThanOrEqual(PIXEL_TOLERANCE)

    // vertical: the mention's line box must start at the content top (first line)
    const contentTop =
      inputRect.top +
      Number.parseFloat(inputStyle.borderTopWidth) +
      Number.parseFloat(inputStyle.paddingTop)
    const lineHeight = Number.parseFloat(inputStyle.lineHeight)
    const halfLeading = (lineHeight - mentionRect.height) / 2

    expect(Math.abs(mentionRect.top - (contentTop + halfLeading))).toBeLessThanOrEqual(
      PIXEL_TOLERANCE
    )
  })
})

describe('highlighter alignment in single-line mode', () => {
  it('aligns the mention highlight inside the input element', async () => {
    await renderBrowser(
      <AlignmentFixture
        initialValue="Hi @[First entry](first) there"
        typographyCss={`font-family: Arial, sans-serif; font-size: 18px; line-height: 28px;
          letter-spacing: 1px; padding: 6px 12px; border: 1px solid transparent; width: 360px;`}
        singleLine
      />
    )

    const input = await getInput()
    const highlighter = getHighlighter()
    const inputStyle = getComputedStyle(input)
    const inputRect = input.getBoundingClientRect()
    const mentionRect = findMentionSpan(highlighter, 'First entry').getBoundingClientRect()

    const contentLeft =
      inputRect.left +
      Number.parseFloat(inputStyle.borderLeftWidth) +
      Number.parseFloat(inputStyle.paddingLeft)
    const expectedLeft = contentLeft + measureTextWidth(inputStyle, 'Hi ')

    expect(Math.abs(mentionRect.left - expectedLeft)).toBeLessThanOrEqual(PIXEL_TOLERANCE)
  })
})

describe('highlighter scroll synchronization', () => {
  it('mirrors the input scroll position after scrolling a long document', async () => {
    const longValue = Array.from(
      { length: 40 },
      (_, index) => `line ${index.toString()} with some content`
    ).join('\n')

    await renderBrowser(
      <AlignmentFixture
        initialValue={`${longValue} @[First entry](first)`}
        typographyCss={`font-family: Arial, sans-serif; font-size: 16px; line-height: 24px;
          padding: 8px; border: 1px solid transparent; width: 320px; height: 120px;`}
      />
    )

    const input = await getInput()

    input.scrollTop = 200
    input.dispatchEvent(new Event('scroll', { bubbles: false }))

    await expect
      .poll(() => {
        const highlighter = getHighlighter()
        return Math.abs(highlighter.scrollTop - input.scrollTop)
      })
      .toBeLessThanOrEqual(1)

    expect(input.scrollTop).toBeGreaterThan(0)
  })
})
