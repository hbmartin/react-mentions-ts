import React from 'react'
import { render } from '@testing-library/react'
import MentionsText from './MentionsText'
import { parseMentionsMarkup, renderMentionsToReact } from './renderMentionsMarkup'
import createMarkupSerializer from './utils/createMarkupSerializer'

const value = 'Hi @[Walter White](walter), meet @[Jesse](jesse)!'

describe('parseMentionsMarkup', () => {
  it('splits a default-markup value into text and mention segments', () => {
    const segments = parseMentionsMarkup(value)

    expect(segments).toEqual([
      { type: 'text', text: 'Hi ', index: 0, plainTextIndex: 0 },
      {
        type: 'mention',
        markup: '@[Walter White](walter)',
        id: 'walter',
        display: 'Walter White',
        index: 3,
        plainTextIndex: 3,
        serializerId: '@[__display__](__id__)',
      },
      { type: 'text', text: ', meet ', index: 26, plainTextIndex: 15 },
      {
        type: 'mention',
        markup: '@[Jesse](jesse)',
        id: 'jesse',
        display: 'Jesse',
        index: 33,
        plainTextIndex: 22,
        serializerId: '@[__display__](__id__)',
      },
      { type: 'text', text: '!', index: 48, plainTextIndex: 27 },
    ])
  })

  it('returns a single text segment when there are no mentions', () => {
    expect(parseMentionsMarkup('no mentions here')).toEqual([
      { type: 'text', text: 'no mentions here', index: 0, plainTextIndex: 0 },
    ])
  })

  it('returns no segments for an empty value', () => {
    expect(parseMentionsMarkup('')).toEqual([])
  })

  it('supports custom string markup', () => {
    const segments = parseMentionsMarkup('ping {{jesse}}', { markup: '{{__id__}}' })

    expect(segments).toEqual([
      { type: 'text', text: 'ping ', index: 0, plainTextIndex: 0 },
      {
        type: 'mention',
        markup: '{{jesse}}',
        id: 'jesse',
        display: 'jesse',
        index: 5,
        plainTextIndex: 5,
        serializerId: '{{__id__}}',
      },
    ])
  })

  it('supports multiple markups for values with several triggers', () => {
    const segments = parseMentionsMarkup('@[Walter](walter) likes #[cooking](topic-1)', {
      markup: ['@[__display__](__id__)', '#[__display__](__id__)'],
    })

    expect(segments.filter((segment) => segment.type === 'mention')).toEqual([
      expect.objectContaining({ id: 'walter', serializerId: '@[__display__](__id__)' }),
      expect.objectContaining({ id: 'topic-1', serializerId: '#[__display__](__id__)' }),
    ])
  })

  it('supports custom serializer objects', () => {
    const serializer = createMarkupSerializer('<mention id="__id__">__display__</mention>')
    const segments = parseMentionsMarkup('see <mention id="w">Walt</mention>', {
      markup: serializer,
    })

    expect(segments).toEqual([
      { type: 'text', text: 'see ', index: 0, plainTextIndex: 0 },
      expect.objectContaining({ type: 'mention', id: 'w', display: 'Walt' }),
    ])
  })

  it('applies a custom displayTransform', () => {
    const segments = parseMentionsMarkup('hey @[Walter](walter)', {
      displayTransform: (id) => `<${String(id)}>`,
    })

    expect(segments[1]).toEqual(expect.objectContaining({ display: '<walter>' }))
  })
})

describe('renderMentionsToReact', () => {
  it('renders mentions as strong elements with data-mention-id', () => {
    const { container } = render(<span>{renderMentionsToReact(value)}</span>)

    expect(container.textContent).toBe('Hi Walter White, meet Jesse!')
    const mentionElements = container.querySelectorAll('strong[data-mention-id]')
    expect(mentionElements).toHaveLength(2)
    expect(mentionElements[0]).toHaveAttribute('data-mention-id', 'walter')
    expect(mentionElements[0]).toHaveTextContent('Walter White')
    expect(mentionElements[1]).toHaveAttribute('data-mention-id', 'jesse')
  })

  it('applies mentionClassName to the default mention element', () => {
    const { container } = render(
      <span>{renderMentionsToReact(value, { mentionClassName: 'mention-pill' })}</span>
    )

    expect(container.querySelector('strong[data-mention-id]')).toHaveClass('mention-pill')
  })

  it('uses a custom renderMention callback', () => {
    const { container } = render(
      <span>
        {renderMentionsToReact(value, {
          renderMention: (mention) => <a href={`/users/${mention.id}`}>@{mention.display}</a>,
        })}
      </span>
    )

    const link = container.querySelector('a')
    expect(link).toHaveAttribute('href', '/users/walter')
    expect(link).toHaveTextContent('@Walter White')
    expect(container.querySelector('strong')).toBeNull()
  })
})

describe('MentionsText', () => {
  it('renders the plain text with highlighted mentions', () => {
    const { container } = render(<MentionsText value={value} />)

    const root = container.firstElementChild
    expect(root?.tagName).toBe('SPAN')
    expect(root).toHaveClass('whitespace-pre-wrap')
    expect(root?.textContent).toBe('Hi Walter White, meet Jesse!')
    expect(root?.querySelectorAll('strong[data-mention-id]')).toHaveLength(2)
  })

  it('merges a custom className', () => {
    const { container } = render(<MentionsText value={value} className="text-sm" />)

    expect(container.firstElementChild).toHaveClass('whitespace-pre-wrap', 'text-sm')
  })

  it('forwards render options', () => {
    const { container } = render(
      <MentionsText
        value="ping {{jesse}}"
        markup="{{__id__}}"
        renderMention={(mention) => <em>{mention.id}</em>}
      />
    )

    expect(container.querySelector('em')).toHaveTextContent('jesse')
  })
})
