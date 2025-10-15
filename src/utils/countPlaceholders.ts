const countPlaceholders = (markup: string): number => {
  let count = 0
  if (markup.includes('__id__')) {
    count++
  }
  if (markup.includes('__display__')) {
    count++
  }
  return count
}

export default countPlaceholders
