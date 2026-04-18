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

const getTriggerIdentity = (trigger: string | RegExp | undefined): string => {
  const normalizedTrigger = trigger ?? DEFAULT_MENTION_PROPS.trigger

  return typeof normalizedTrigger === 'string'
    ? `str:${normalizedTrigger}`
    : `re:${normalizedTrigger.source}/${normalizedTrigger.flags.replaceAll('g', '')}`
}

const getInvalidChildLabel = (child: React.ReactNode): string => {
  if (React.isValidElement(child)) {
    if (typeof child.type === 'string') {
      return child.type
    }

    return 'name' in child.type && typeof child.type.name === 'string' && child.type.name.length > 0
      ? child.type.name
      : 'unknown component'
  }

  return 'unknown component'
}

export const validateMentionChildTree = <Extra extends Record<string, unknown>>(
  children: React.ReactNode
): void => {
  React.Children.forEach(children, (child) => {
    if (
      React.isValidElement<{ children?: React.ReactNode }>(child) &&
      child.type === React.Fragment
    ) {
      validateMentionChildTree<Extra>(child.props.children)
      return
    }

    if (!isMentionElement<Extra>(child)) {
      throw new Error(
        `MentionsInput only accepts Mention components as children. Found: ${getInvalidChildLabel(child)}`
      )
    }
  })
}

const validateUniqueSerializerIds = <Extra extends Record<string, unknown>>(
  config: ReadonlyArray<MentionChildConfig<Extra>>
): void => {
  const seenSerializerIds = new Set<string>()

  for (const childConfig of config) {
    if (seenSerializerIds.has(childConfig.serializer.id)) {
      throw new Error(
        `MentionsInput does not support Mention children with duplicate serializer ids: ${childConfig.serializer.id}.`
      )
    }

    seenSerializerIds.add(childConfig.serializer.id)
  }
}

export const prepareMentionsInputChildren = <Extra extends Record<string, unknown>>(
  children: React.ReactNode
): PreparedMentionsInputChildren<Extra> => {
  validateMentionChildTree<Extra>(children)
  const mentionChildren = collectMentionElements<Extra>(children)
  const config = readConfigFromChildren<Extra>(mentionChildren)
  validateUniqueSerializerIds(config)

  return {
    mentionChildren,
    config,
  }
}

export const areMentionConfigsEqual = <Extra extends Record<string, unknown>>(
  config1: ReadonlyArray<MentionChildConfig<Extra>>,
  config2: ReadonlyArray<MentionChildConfig<Extra>>
): boolean => {
  if (config1.length !== config2.length) {
    return false
  }

  return config1.every((leftConfig, index) => {
    const rightConfig = config2[index]

    return (
      getTriggerIdentity(leftConfig.trigger) === getTriggerIdentity(rightConfig.trigger) &&
      leftConfig.serializer.id === rightConfig.serializer.id &&
      leftConfig.displayTransform === rightConfig.displayTransform
    )
  })
}
