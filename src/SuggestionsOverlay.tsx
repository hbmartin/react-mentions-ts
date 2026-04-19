import SuggestionsOverlayBase from './SuggestionsOverlayBase'
import type { SuggestionsOverlayProps } from './SuggestionsOverlayBase'
import styledStyles from './styles/styled'

export default function SuggestionsOverlay<
  Extra extends Record<string, unknown> = Record<string, unknown>,
>(props: Readonly<Omit<SuggestionsOverlayProps<Extra>, 'styles'>>) {
  return <SuggestionsOverlayBase {...props} styles={styledStyles.suggestionsOverlay} />
}
