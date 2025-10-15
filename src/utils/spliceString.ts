const spliceString = (str: string, start: number, end: number, insert: string): string =>
  str.slice(0, Math.max(0, start)) + insert + str.slice(Math.max(0, end))

export default spliceString
