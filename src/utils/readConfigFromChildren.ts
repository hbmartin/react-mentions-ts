import React, { Children } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { MentionChildConfig, MentionComponentProps, MentionSerializer } from '../types'
import { DEFAULT_MENTION_PROPS } from '../MentionDefaultProps'
import createMarkupSerializer from './createMarkupSerializer'
import { isMentionElement } from './isMentionElement'
import PLACEHOLDERS from './placeholders'

/**
 * Generates a markup template based on the trigger character.
 * This ensures each trigger has a unique markup pattern to avoid collisions
 * when multiple Mentions use different triggers.
 */
const generateMarkupForTrigger = (trigger: string | RegExp | undefined): string => {
  // For RegExp triggers or undefined, fall back to the default markup
  if (!trigger || trigger instanceof RegExp) {
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

const isReactFragment = (child: unknown): child is ReactElement<{ children?: ReactNode }> =>
  React.isValidElement(child) && child.type === React.Fragment

const collectMentionElements = <Extra extends Record<string, unknown>>(
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
): MentionChildConfig<Extra>[] =>
  collectMentionElements<Extra>(children).map((child) => {
    const props = child.props
    const trigger = props.trigger ?? DEFAULT_MENTION_PROPS.trigger
    const displayTransform = props.displayTransform ?? DEFAULT_MENTION_PROPS.displayTransform
    const serializer: MentionSerializer =
      props.markup !== undefined && typeof props.markup !== 'string'
        ? props.markup
        : createMarkupSerializer(props.markup ?? generateMarkupForTrigger(trigger))

    return {
      ...DEFAULT_MENTION_PROPS,
      ...props,
      displayTransform,
      serializer,
    } satisfies MentionChildConfig<Extra>
  })

export default readConfigFromChildren
