import isPlainObject from './isPlainObject'

export type PlainObject = Record<string, unknown>

// eslint-disable-next-line code-complete/low-function-cohesion
export const mergeDeep = <T extends PlainObject, S extends PlainObject>(
  target: T,
  source: S
): T & S => {
  const output: PlainObject = { ...target }
  if (isPlainObject(target) && isPlainObject(source)) {
    for (const key of Object.keys(source)) {
      const sourceValue = source[key]
      if (isPlainObject(sourceValue)) {
        const targetValue = target[key as keyof T]
        const base = isPlainObject(targetValue) ? (targetValue as PlainObject) : {}
        output[key] = mergeDeep(base, sourceValue as PlainObject)
      } else {
        output[key] = sourceValue
      }
    }
  }
  return output as T & S
}
