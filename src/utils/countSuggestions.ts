import type { SuggestionsMap } from '../types'

const countSuggestions = <
  Extra extends Record<string, unknown> = Record<string, unknown>
>(suggestions: SuggestionsMap<Extra>): number =>
  Object.values(suggestions).reduce((acc, { results }) => acc + results.length, 0)

export default countSuggestions
