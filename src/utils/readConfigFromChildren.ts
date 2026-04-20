import React, { Children } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type {
  MentionComponentProps,
  PreparedMentionChildConfig,
  MentionQueryConfig,
  MentionSerializer,
  MentionTrigger,
} from '../types'
import { DEFAULT_MENTION_PROPS } from '../MentionDefaultProps'
import createMarkupSerializer from './createMarkupSerializer'
import { isMentionElement } from './isMentionElement'
import { makeTriggerRegex } from './makeTriggerRegex'
import PLACEHOLDERS from './placeholders'
import { stripStatefulRegexFlags } from './regexFlags'

/**
 * Generates a markup template based on the trigger character.
 * This ensures each trigger has a unique markup pattern to avoid collisions
 * when multiple Mentions use different triggers.
 */
const generateMarkupForTrigger = (trigger: string | RegExp | undefined): string => {
  // For RegExp triggers or undefined, fall back to the default markup
  if (trigger === undefined || trigger instanceof RegExp) {
    return DEFAULT_MENTION_PROPS.markup
  }

  // If the trigger string contains placeholder patterns, it's likely being misused
  // as a markup template (legacy incorrect usage). Fall back to default markup.
  if (trigger.includes(PLACEHOLDERS.id) || trigger.includes(PLACEHOLDERS.display)) {
    return DEFAULT_MENTION_PROPS.markup
  }

  // Generate trigger-specific markup by using the trigger as a prefix
  return `${trigger}[${PLACEHOLDERS.display}](${PLACEHOLDERS.id})`
}

const appendSerializerMarker = (markup: string, occurrenceIndex: number): string => {
  return `${markup}|${occurrenceIndex.toString()}`
}

const isReactFragment = (child: unknown): child is ReactElement<{ children?: ReactNode }> =>
  React.isValidElement(child) && child.type === React.Fragment

export const createMentionQueryConfig = (trigger: MentionTrigger): MentionQueryConfig => {
  const regex =
    typeof trigger === 'string'
      ? makeTriggerRegex(trigger)
      : // eslint-disable-next-line security/detect-non-literal-regexp -- reconstructing a vetted RegExp to strip stateful flags
        new RegExp(trigger.source, stripStatefulRegexFlags(trigger.flags))

  return {
    regex,
    ignoreAccents: regex.flags.includes('u'),
  }
}

export const collectMentionElements = <Extra extends Record<string, unknown>>(
  children: ReactNode
): ReactElement<MentionComponentProps<Extra>>[] =>
  Children.toArray(children).flatMap((child) => {
    if (isReactFragment(child)) {
      return collectMentionElements<Extra>(child.props.children)
    }

    if (isMentionElement<Extra>(child)) {
      return [child]
    }

    return []
  })

const readConfigFromChildren = <Extra extends Record<string, unknown> = Record<string, unknown>>(
  children: ReactNode
): PreparedMentionChildConfig<Extra>[] => {
  const mentionChildren = collectMentionElements<Extra>(children)
  const serializerIdCounts = new Map<string, number>()

  for (const child of mentionChildren) {
    const serializerId =
      child.props.markup === undefined
        ? generateMarkupForTrigger(child.props.trigger)
        : typeof child.props.markup === 'string'
          ? child.props.markup
          : child.props.markup.id

    serializerIdCounts.set(serializerId, (serializerIdCounts.get(serializerId) ?? 0) + 1)
  }

  const autoSerializerOccurrences = new Map<string, number>()

  return mentionChildren.map((child) => {
    const props = child.props
    const trigger = props.trigger ?? DEFAULT_MENTION_PROPS.trigger
    const displayTransform = props.displayTransform ?? DEFAULT_MENTION_PROPS.displayTransform
    const baseMarkup = generateMarkupForTrigger(trigger)
    const serializer: MentionSerializer =
      props.markup !== undefined && typeof props.markup !== 'string'
        ? props.markup
        : createMarkupSerializer(
            props.markup ??
              ((serializerIdCounts.get(baseMarkup) ?? 0) > 1
                ? appendSerializerMarker(baseMarkup, autoSerializerOccurrences.get(baseMarkup) ?? 0)
                : baseMarkup)
          )

    if (props.markup === undefined) {
      autoSerializerOccurrences.set(
        baseMarkup,
        (autoSerializerOccurrences.get(baseMarkup) ?? 0) + 1
      )
    }

    return {
      ...DEFAULT_MENTION_PROPS,
      ...props,
      trigger,
      displayTransform,
      query: createMentionQueryConfig(trigger),
      serializer,
    } satisfies PreparedMentionChildConfig<Extra>
  })
}

export default readConfigFromChildren
