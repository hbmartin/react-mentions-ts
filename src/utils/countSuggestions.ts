import type { SuggestionsMap } from '../types'

const countSuggestions = (suggestions: SuggestionsMap): number =>
  Object.values(suggestions).reduce(
    (acc, { results }) => acc + results.length,
    0
  )

export default countSuggestions
