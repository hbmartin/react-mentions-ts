import { Children } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { MentionChildConfig, MentionComponentProps, MentionSerializer } from '../types'
import { DEFAULT_MENTION_PROPS } from '../MentionDefaultProps'
import createMarkupSerializer from '../serializers/createMarkupSerializer'

const DEFAULT_SERIALIZER = createMarkupSerializer(
  typeof DEFAULT_MENTION_PROPS.markup === 'string'
    ? DEFAULT_MENTION_PROPS.markup
    : '@[__display__](__id__)'
)

const readConfigFromChildren = (children: ReactNode): MentionChildConfig[] =>
  Children.toArray(children).map((child) => {
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
