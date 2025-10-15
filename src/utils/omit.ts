const omit = <T extends Record<string, unknown>, K extends PropertyKey>(
  obj: T,
  ...rest: Array<K | ReadonlyArray<K>>
): Partial<T> => {
  const keysToOmit = new Set(rest.flat() as PropertyKey[])
  return Object.keys(obj).reduce<Partial<T>>((acc, key) => {
    // eslint-disable-next-line sonarjs/different-types-comparison
    if (Object.hasOwn(obj, key) && !keysToOmit.has(key) && obj[key as keyof T] !== undefined) {
      acc[key as keyof T] = obj[key as keyof T]
    }
    return acc
  }, {})
}

export default omit
