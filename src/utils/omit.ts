const omit = <T extends Record<string, unknown>, K extends PropertyKey>(
  obj: T,
  ...rest: Array<K | ReadonlyArray<K>>
): Partial<T> => {
  const keysToOmit = rest.flat().filter(Boolean) as PropertyKey[]
  return Object.keys(obj).reduce<Partial<T>>((acc, key) => {
    if (
      Object.prototype.hasOwnProperty.call(obj, key) &&
      !keysToOmit.includes(key) &&
      obj[key as keyof T] !== undefined
    ) {
      acc[key as keyof T] = obj[key as keyof T]
    }
    return acc
  }, {})
}

export default omit
