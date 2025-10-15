const isPlainObject = (obj: unknown): obj is Record<string, unknown> =>
  !(obj instanceof Date) && typeof obj === 'object' && obj !== null && !Array.isArray(obj)

export default isPlainObject
