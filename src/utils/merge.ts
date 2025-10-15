import { mergeDeep, type PlainObject } from './mergeDeep'

const merge = (target: PlainObject, ...sources: PlainObject[]): PlainObject => {
  return sources.reduce<PlainObject>(
    (acc, source) => {
      return mergeDeep(acc, source)
    },
    { ...target }
  )
}

export default merge
