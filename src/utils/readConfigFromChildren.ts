import { Children } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { MentionChildConfig, MentionComponentProps } from '../types'
import { DEFAULT_MENTION_PROPS } from '../MentionDefaultProps'
import createMarkupSerializer from '../serializers/createMarkupSerializer'

const readConfigFromChildren = (children: ReactNode): MentionChildConfig[] =>
  Children.toArray(children).map((child) => {
    const props = (child as ReactElement<MentionComponentProps>).props
    const markup = props.markup ?? DEFAULT_MENTION_PROPS.markup
    const displayTransform = props.displayTransform ?? DEFAULT_MENTION_PROPS.displayTransform
    const serializer =
      props.serializer ??
      (props.markup ? createMarkupSerializer(props.markup) : DEFAULT_MENTION_PROPS.serializer)
    return {
      ...DEFAULT_MENTION_PROPS,
      ...props,
      markup,
      displayTransform,
      serializer,
    } satisfies MentionChildConfig
  })

export default readConfigFromChildren
