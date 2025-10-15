import isPlainObject from './isPlainObject'
import keys from './keys'

type PlainObject = Record<string, unknown>

const mergeDeep = <T extends PlainObject, S extends PlainObject>(
  target: T,
  source: S
): T & S => {
  const output: PlainObject = { ...target }
  if (isPlainObject(target) && isPlainObject(source)) {
    keys(source).forEach(key => {
      const sourceValue = source[key as keyof S]
      if (isPlainObject(sourceValue)) {
        const targetValue = target[key as keyof T]
        const base = isPlainObject(targetValue)
          ? (targetValue as PlainObject)
          : {}
        output[key as string] = mergeDeep(
          base,
          sourceValue as PlainObject
        )
      } else {
        output[key as string] = sourceValue
      }
    })
  }
  return output as T & S
}

export default mergeDeep
