import mergeDeep from './mergeDeep'

type PlainObject = Record<string, unknown>

const merge = (target: PlainObject, ...sources: PlainObject[]): PlainObject => {
  return sources.reduce<PlainObject>((acc, source) => {
    return mergeDeep(acc as PlainObject, source)
  }, { ...target })
}

export default merge
