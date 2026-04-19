import MentionBase from './MentionBase'
import type { MentionProps } from './MentionBase'
import styledStyles from './styles/styled'

export type { MentionProps }

export default function Mention<Extra extends Record<string, unknown> = Record<string, unknown>>(
  props: Readonly<MentionProps<Extra>>
) {
  return <MentionBase {...props} styles={styledStyles.mention} />
}
