import LoadingIndicatorBase from './LoadingIndicatorBase'
import type { LoadingIndicatorProps } from './LoadingIndicatorBase'
import styledStyles from './styles/styled'

export default function LoadingIndicator(props: Readonly<Omit<LoadingIndicatorProps, 'styles'>>) {
  return (
    <LoadingIndicatorBase {...props} styles={styledStyles.suggestionsOverlay.loadingIndicator} />
  )
}
