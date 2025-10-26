import React, { Children } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { MentionChildConfig, MentionComponentProps, MentionSerializer } from '../types'
import Mention from '../Mention'
import { DEFAULT_MENTION_PROPS } from '../MentionDefaultProps'
import createMarkupSerializer from './createMarkupSerializer'
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

const isMentionElement = (child: unknown): child is ReactElement<MentionComponentProps> =>
  React.isValidElement(child) &&
  child.type === Mention &&
  typeof child.props === 'object' &&
  child.props !== null &&
  'data' in child.props

const isReactFragment = (child: unknown): child is ReactElement<{ children?: ReactNode }> =>
  React.isValidElement(child) && child.type === React.Fragment

const collectMentionElements = (children: ReactNode): ReactElement<MentionComponentProps>[] =>
  // eslint-disable-next-line code-complete/low-function-cohesion
  Children.toArray(children).flatMap((child) => {
    if (isReactFragment(child)) {
      return collectMentionElements(child.props.children)
    }

    if (isMentionElement(child)) {
      return [child]
    }

    return []
  })

const readConfigFromChildren = (children: ReactNode): MentionChildConfig[] =>
  collectMentionElements(children).map((child) => {
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
    } satisfies MentionChildConfig
  })

export default readConfigFromChildren
