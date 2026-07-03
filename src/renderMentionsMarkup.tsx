import { Fragment, type ReactNode } from 'react'
import { DEFAULT_MENTION_PROPS } from './MentionDefaultProps'
import type { DisplayTransform, MentionChildConfig, MentionSerializer } from './types'
import createMarkupSerializer from './utils/createMarkupSerializer'
import iterateMentionsMarkup from './utils/iterateMentionsMarkup'

export interface MentionsTextMention {
  id: string
  display: string
  /** Index of the mention's markup within the raw markup value */
  index: number
  /** Index of the mention's display text within the rendered plain text */
  plainTextIndex: number
  /** Id of the serializer (markup template) that matched this mention */
  serializerId: string
}

export type MentionsTextSegment =
  | { type: 'text'; text: string; index: number; plainTextIndex: number }
  | ({ type: 'mention'; markup: string } & MentionsTextMention)

export interface ParseMentionsMarkupOptions {
  /**
   * Markup template(s) or serializer(s) used when the value was created.
   * Defaults to the library's default markup `@[__display__](__id__)`.
   */
  markup?: string | MentionSerializer | ReadonlyArray<string | MentionSerializer>
  /** Same transform passed to `Mention` when the value was created */
  displayTransform?: DisplayTransform
}

const toSerializer = (markup: string | MentionSerializer): MentionSerializer =>
  typeof markup === 'string' ? createMarkupSerializer(markup) : markup

const buildRenderConfig = ({
  markup = DEFAULT_MENTION_PROPS.markup,
  displayTransform = DEFAULT_MENTION_PROPS.displayTransform,
}: ParseMentionsMarkupOptions): MentionChildConfig[] => {
  const markups: ReadonlyArray<string | MentionSerializer> = Array.isArray(markup)
    ? markup
    : [markup as string | MentionSerializer]

  return markups.map((entry) => ({
    ...DEFAULT_MENTION_PROPS,
    data: [],
    displayTransform,
    serializer: toSerializer(entry),
  }))
}

/**
 * Parses a stored markup value (e.g. `Hi @[Walter](walter)!`) into an ordered list of
 * text and mention segments, for rendering saved values outside of `MentionsInput`.
 */
export const parseMentionsMarkup = (
  value: string,
  options: ParseMentionsMarkupOptions = {}
): MentionsTextSegment[] => {
  const config = buildRenderConfig(options)
  const segments: MentionsTextSegment[] = []

  iterateMentionsMarkup(
    value,
    config,
    (markup, index, plainTextIndex, id, display, childIndex) => {
      segments.push({
        type: 'mention',
        markup,
        id,
        display,
        index,
        plainTextIndex,
        serializerId: config[childIndex].serializer.id,
      })
    },
    (text, index, plainTextIndex) => {
      if (text.length > 0) {
        segments.push({ type: 'text', text, index, plainTextIndex })
      }
    }
  )

  return segments
}

export interface RenderMentionsOptions extends ParseMentionsMarkupOptions {
  /** Custom renderer for each mention; the default renders `<strong data-mention-id>` */
  renderMention?: (mention: MentionsTextMention) => ReactNode
  /** Class applied to the default mention element (ignored when `renderMention` is set) */
  mentionClassName?: string
}

/**
 * Renders a stored markup value to an array of React nodes, replacing each mention
 * with a styled element (or the result of `renderMention`).
 */
export const renderMentionsToReact = (
  value: string,
  options: RenderMentionsOptions = {}
): ReactNode[] => {
  const { renderMention, mentionClassName, ...parseOptions } = options

  return parseMentionsMarkup(value, parseOptions).map((segment) => {
    if (segment.type === 'text') {
      return segment.text
    }

    const { type: _type, markup: _markup, ...mention } = segment
    const key = `${segment.index.toString()}-${segment.id}`

    if (renderMention) {
      return <Fragment key={key}>{renderMention(mention)}</Fragment>
    }

    return (
      <strong key={key} data-mention-id={segment.id} className={mentionClassName}>
        {segment.display}
      </strong>
    )
  })
}
