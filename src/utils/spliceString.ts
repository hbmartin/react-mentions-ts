const spliceString = (
  str: string,
  start: number,
  end: number,
  insert: string
) =>
  str.substring(0, start) + insert + str.substring(end)

export default spliceString
