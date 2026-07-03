import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Mock } from 'vitest'
import { Mention, MentionsInput } from '../src/index'
import type { MentionsInputChangeEvent } from '../src/types'
import { buildMentionsClipboardHtml } from '../src/utils/mentionsClipboard'
import { DEFAULT_MENTION_PROPS } from '../src/MentionDefaultProps'
import createMarkupSerializer from '../src/utils/createMarkupSerializer'

const data = [
  { id: 'first', display: 'First' },
  { id: 'second', display: 'Second' },
  { id: 'third', display: 'Third' },
]

const value = 'Hi @[First](first)!'

const getLastMentionsChange = (mock: Mock): MentionsInputChangeEvent =>
  mock.mock.calls.at(-1)?.[0] as MentionsInputChangeEvent

const renderInput = (onMentionsChange: Mock) => {
  render(
    <MentionsInput value={value} onMentionsChange={onMentionsChange}>
      <Mention trigger="@" data={data} />
    </MentionsInput>
  )
  return screen.getByRole<HTMLTextAreaElement>('combobox')
}

const firePaste = (
  textarea: HTMLTextAreaElement,
  clipboardContent: Record<string, string>
): void => {
  const event = new Event('paste', { bubbles: true }) as Event & {
    clipboardData: { getData: Mock }
  }
  event.clipboardData = {
    getData: vi.fn((type: string) => clipboardContent[type] ?? ''),
  }
  fireEvent(textarea, event)
}

describe('MentionsInput clipboard HTML fidelity', () => {
  it('reconstructs mentions from the HTML payload when the custom clipboard type is stripped', () => {
    const onMentionsChange = vi.fn()
    const textarea = renderInput(onMentionsChange)
    textarea.setSelectionRange(0, 0)

    const copiedMarkup = 'ping @[Second](second) and @[Third](third)'
    const html = buildMentionsClipboardHtml(copiedMarkup, [
      {
        ...DEFAULT_MENTION_PROPS,
        data: [],
        serializer: createMarkupSerializer('@[__display__](__id__)'),
      },
    ])

    firePaste(textarea, {
      'text/html': html,
      'text/plain': 'ping Second and Third',
    })

    const change = getLastMentionsChange(onMentionsChange)
    expect(change.trigger.type).toBe('paste')
    expect(change.value).toBe(`${copiedMarkup}${value}`)
    expect(change.mentions.map((mention) => mention.id)).toEqual(['second', 'third', 'first'])
  })

  it('prefers the custom clipboard type over the HTML payload', () => {
    const onMentionsChange = vi.fn()
    const textarea = renderInput(onMentionsChange)
    textarea.setSelectionRange(0, 0)

    firePaste(textarea, {
      'text/react-mentions': '@[Second](second) ',
      'text/html': '<span data-react-mentions="@[Third](third) ">Third</span>',
      'text/plain': 'Second ',
    })

    expect(getLastMentionsChange(onMentionsChange).value).toBe(`@[Second](second) ${value}`)
  })

  it('falls back to plain text when HTML mention markup does not match the visible text', () => {
    const onMentionsChange = vi.fn()
    const textarea = renderInput(onMentionsChange)
    textarea.setSelectionRange(0, 0)

    firePaste(textarea, {
      'text/html': '<span data-react-mentions="@[Third](third)">Second</span>',
      'text/plain': 'Second',
    })

    const change = getLastMentionsChange(onMentionsChange)
    expect(change.value).toBe(`Second${value}`)
    expect(change.mentions.map((mention) => mention.id)).toEqual(['first'])
  })

  it('ignores paste events without clipboard data', () => {
    const onMentionsChange = vi.fn()
    const textarea = renderInput(onMentionsChange)
    const event = new Event('paste', { bubbles: true })

    expect(() => fireEvent(textarea, event)).not.toThrow()
    expect(onMentionsChange).not.toHaveBeenCalled()
  })

  it('falls back to plain text for foreign HTML', () => {
    const onMentionsChange = vi.fn()
    const textarea = renderInput(onMentionsChange)
    textarea.setSelectionRange(0, 0)

    firePaste(textarea, {
      'text/html': '<p>copied from a <b>web page</b></p>',
      'text/plain': 'plain fallback ',
    })

    expect(getLastMentionsChange(onMentionsChange).value).toBe(`plain fallback ${value}`)
  })
})
