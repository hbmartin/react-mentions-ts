import HighlighterBase from './HighlighterBase'
import type { HighlighterProps } from './HighlighterBase'
import styledStyles from './styles/styled'

export default function Highlighter<
  Extra extends Record<string, unknown> = Record<string, unknown>,
>(props: Readonly<Omit<HighlighterProps<Extra>, 'styles'>>) {
  return <HighlighterBase {...props} styles={styledStyles.highlighter} />
}
