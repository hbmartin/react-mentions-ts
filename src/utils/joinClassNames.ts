import type { ClassNameJoiner, ClassNameValue } from '../types'

/**
 * Default class merger: concatenates truthy class strings in order.
 * Consumers wanting Tailwind conflict resolution can supply their own
 * joiner (e.g. a twMerge-based `cn`) via the `mergeClassNames` prop.
 */
const joinClassNames: ClassNameJoiner = (...classNames: ClassNameValue[]): string =>
  classNames
    .filter(
      (className): className is string => typeof className === 'string' && className.length > 0
    )
    .join(' ')

export default joinClassNames
