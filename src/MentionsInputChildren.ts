import React from 'react'
import { DEFAULT_MENTION_PROPS } from './MentionDefaultProps'
import type { MentionChildConfig, MentionComponentProps } from './types'
import { isMentionElement } from './utils/isMentionElement'
import readConfigFromChildren, { collectMentionElements } from './utils/readConfigFromChildren'

export interface PreparedMentionsInputChildren<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> {
  mentionChildren: React.ReactElement<MentionComponentProps<Extra>>[]
  config: MentionChildConfig<Extra>[]
}

const getInvalidChildLabel = (child: React.ReactNode): string => {
  if (React.isValidElement(child)) {
    return typeof child.type === 'string' ? child.type : child.type?.name || 'unknown component'
  }

  return 'unknown component'
}

export const validateMentionChildTree = <Extra extends Record<string, unknown>>(
  children: React.ReactNode,
  seenChildren: Set<string> = new Set<string>()
): void => {
  React.Children.forEach(children, (child) => {
    if (
      React.isValidElement<{ children?: React.ReactNode }>(child) &&
      child.type === React.Fragment
    ) {
      validateMentionChildTree<Extra>(child.props.children, seenChildren)
      return
    }

    if (!isMentionElement<Extra>(child)) {
      throw new Error(
        `MentionsInput only accepts Mention components as children. Found: ${getInvalidChildLabel(child)}`
      )
    }

    const trigger =
      child.props.trigger === undefined
        ? DEFAULT_MENTION_PROPS.trigger
        : typeof child.props.trigger === 'string'
          ? child.props.trigger
          : child.props.trigger.source

    if (seenChildren.has(trigger)) {
      throw new Error(
        `MentionsInput does not support Mention children with duplicate triggers: ${trigger}.`
      )
    }

    seenChildren.add(trigger)
  })
}

export const prepareMentionsInputChildren = <Extra extends Record<string, unknown>>(
  children: React.ReactNode
): PreparedMentionsInputChildren<Extra> => {
  validateMentionChildTree<Extra>(children)
  const mentionChildren = collectMentionElements<Extra>(children)

  return {
    mentionChildren,
    config: readConfigFromChildren<Extra>(mentionChildren),
  }
}

export const areMentionConfigsEqual = <Extra extends Record<string, unknown>>(
  config1: ReadonlyArray<MentionChildConfig<Extra>>,
  config2: ReadonlyArray<MentionChildConfig<Extra>>
): boolean => {
  if (config1.length !== config2.length) {
    return false
  }

  return config1.every((cfg1, index) => {
    const cfg2 = config2[index]

    return (
      ((typeof cfg1.trigger === 'string' &&
        typeof cfg2.trigger === 'string' &&
        cfg1.trigger === cfg2.trigger) ||
        (cfg1.trigger instanceof RegExp &&
          cfg2.trigger instanceof RegExp &&
          cfg1.trigger.source === cfg2.trigger.source)) &&
      cfg1.serializer.id === cfg2.serializer.id
    )
  })
}
