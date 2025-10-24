import { Children } from 'react'
import React from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { MentionChildConfig, MentionComponentProps, MentionSerializer } from '../types'
import { DEFAULT_MENTION_PROPS } from '../MentionDefaultProps'
import createMarkupSerializer from '../serializers/createMarkupSerializer'
import Mention from '../Mention'

const DEFAULT_SERIALIZER = createMarkupSerializer(DEFAULT_MENTION_PROPS.markup)

const isMentionElement = (child: unknown): child is ReactElement<MentionComponentProps> =>
  React.isValidElement(child) &&
  (child.type === Mention ||
    (typeof child.props === 'object' &&
      child.props !== null &&
      ('data' in child.props || 'markup' in child.props || 'trigger' in child.props)))

const collectMentionElements = (
  children: ReactNode,
  acc: ReactElement<MentionComponentProps>[] = []
): ReactElement<MentionComponentProps>[] => {
  Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) {
      return
    }

    if (child.type === React.Fragment) {
      collectMentionElements(child.props.children, acc)
      return
    }

    if (isMentionElement(child)) {
      acc.push(child)
    }
  })

  return acc
}

const readConfigFromChildren = (children: ReactNode): MentionChildConfig[] =>
  collectMentionElements(children).map((child) => {
    const props = (child as ReactElement<MentionComponentProps>).props
    const markupProp = props.markup ?? DEFAULT_MENTION_PROPS.markup
    const displayTransform = props.displayTransform ?? DEFAULT_MENTION_PROPS.displayTransform
    let resolvedMarkup: string
    let serializer: MentionSerializer

    if (typeof markupProp === 'string') {
      resolvedMarkup = markupProp
      serializer =
        markupProp === DEFAULT_MENTION_PROPS.markup
          ? DEFAULT_SERIALIZER
          : createMarkupSerializer(markupProp)
    } else {
      resolvedMarkup =
        typeof DEFAULT_MENTION_PROPS.markup === 'string'
          ? DEFAULT_MENTION_PROPS.markup
          : '@[__display__](__id__)'
      serializer = markupProp
    }

    return {
      ...DEFAULT_MENTION_PROPS,
      ...props,
      markup: resolvedMarkup,
      displayTransform,
      serializer,
    } satisfies MentionChildConfig
  })

export default readConfigFromChildren
