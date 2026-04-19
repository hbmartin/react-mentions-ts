import type { ClassNameValue } from './types'

const joinClassNames = (...classNames: ClassNameValue[]): string =>
  classNames
    .filter(
      (className): className is string => typeof className === 'string' && className.length > 0
    )
    .join(' ')

export default joinClassNames
