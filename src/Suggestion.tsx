import SuggestionBase from './SuggestionBase'
import type { SuggestionProps } from './SuggestionBase'
import styledStyles from './styles/styled'

export default function Suggestion<Extra extends Record<string, unknown> = Record<string, unknown>>(
  props: Readonly<Omit<SuggestionProps<Extra>, 'styles'>>
) {
  return <SuggestionBase {...props} styles={styledStyles.suggestionsOverlay.suggestion} />
}
