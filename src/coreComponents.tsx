import type { ReactElement } from 'react'
import type { MentionsInputComponentProps } from './MentionsInput'
import StyledMentionsInput from './MentionsInput'
import type { MentionProps } from './Mention'
import StyledMention from './Mention'

/**
 * Presets for `react-mentions-ts/core`: the same components with `unstyled`
 * defaulting to true, for apps that don't use Tailwind. Structural inline
 * styles keep the mention machinery working; visual styling comes from your
 * own CSS (target the `data-slot` attributes, or import
 * `react-mentions-ts/styles/default.css` for a minimal system-color baseline).
 */

export const MentionsInput = <Extra extends Record<string, unknown> = Record<string, unknown>>(
  props: MentionsInputComponentProps<Extra>
): ReactElement | null => (
  <StyledMentionsInput<Extra> {...props} unstyled={props.unstyled ?? true} />
)

export const Mention = <Extra extends Record<string, unknown> = Record<string, unknown>>(
  props: Readonly<MentionProps<Extra>>
): ReactElement => <StyledMention<Extra> {...props} unstyled={props.unstyled ?? true} />
