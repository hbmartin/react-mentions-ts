import { Children } from 'react'
import type { ReactElement, ReactNode } from 'react'
import invariant from 'invariant'
import markupToRegex from './markupToRegex'
import countPlaceholders from './countPlaceholders'
import { DEFAULT_MENTION_PROPS } from '../Mention'
import type {
  MentionChildConfig,
  MentionComponentProps,
} from '../types'

const readConfigFromChildren = (
  children: ReactNode
): MentionChildConfig[] =>
  Children.toArray(children).map(child => {
    const props = (child as ReactElement<MentionComponentProps>).props
    const markup = props.markup ?? DEFAULT_MENTION_PROPS.markup
    const displayTransform =
      props.displayTransform ?? DEFAULT_MENTION_PROPS.displayTransform
    const regex = props.regex
      ? coerceCapturingGroups(props.regex, markup)
      : markupToRegex(markup)

    return {
      ...DEFAULT_MENTION_PROPS,
      ...props,
      markup,
      displayTransform,
      regex,
    } satisfies MentionChildConfig
  })

// make sure that the custom regex defines the correct number of capturing groups
const coerceCapturingGroups = (regex: RegExp, markup: string): RegExp => {
  const execResult = new RegExp(`${regex.source}|`).exec('')
  const numberOfGroups = (execResult?.length ?? 1) - 1
  const numberOfPlaceholders = countPlaceholders(markup)

  invariant(
    numberOfGroups === numberOfPlaceholders,
    `Number of capturing groups in RegExp ${regex.toString()} (${numberOfGroups}) does not match the number of placeholders in the markup '${markup}' (${numberOfPlaceholders})`
  )

  return regex
}

export default readConfigFromChildren
