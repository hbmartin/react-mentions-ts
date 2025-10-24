import React, { Children } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { MentionChildConfig, MentionComponentProps, MentionSerializer } from '../types'
import Mention from '../Mention'
import { DEFAULT_MENTION_PROPS } from '../MentionDefaultProps'
import createMarkupSerializer from '../serializers/createMarkupSerializer'

const DEFAULT_SERIALIZER = createMarkupSerializer(DEFAULT_MENTION_PROPS.markup)

const isMentionElement = (child: unknown): child is ReactElement<MentionComponentProps> =>
  React.isValidElement(child) &&
  (child.type === Mention ||
    (typeof child.props === 'object' &&
      child.props !== null &&
      ('data' in child.props || 'markup' in child.props || 'trigger' in child.props)))

const isReactFragment = (child: unknown): child is ReactElement<{ children?: ReactNode }> =>
  React.isValidElement(child) && child.type === React.Fragment

const collectMentionElements = (
  children: ReactNode,
  acc: ReactElement<MentionComponentProps>[] = []
): ReactElement<MentionComponentProps>[] => {
  Children.forEach(children, (child) => {
    if (isReactFragment(child)) {
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
    const props = child.props
    const markupProp = props.markup ?? DEFAULT_MENTION_PROPS.markup
    const displayTransform = props.displayTransform ?? DEFAULT_MENTION_PROPS.displayTransform
    let serializer: MentionSerializer

    if (typeof markupProp === 'string') {
      serializer =
        markupProp === DEFAULT_MENTION_PROPS.markup
          ? DEFAULT_SERIALIZER
          : createMarkupSerializer(markupProp)
    } else {
      serializer = markupProp
    }

    return {
      ...DEFAULT_MENTION_PROPS,
      ...props,
      displayTransform,
      serializer,
    } satisfies MentionChildConfig
  })

export default readConfigFromChildren
