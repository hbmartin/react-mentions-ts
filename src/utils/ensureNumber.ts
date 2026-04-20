const ensureNumber = (value: number | null | undefined, fallback: number): number =>
  typeof value === 'number' ? value : fallback

export default ensureNumber
