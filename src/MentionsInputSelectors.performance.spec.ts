import * as selectors from './MentionsInputSelectors'
import { emitPerformanceMetric } from './test/performance'

describe('MentionsInputSelectors performance', () => {
  it('reports array-provider scan counts with maxSuggestions early matches', async () => {
    const items = Array.from({ length: 1000 }, (_, index) => ({
      id: `user-${index.toString()}`,
      display: index < 5 ? `Alpha ${index.toString()}` : `User ${index.toString()}`,
    }))
    let scanCount = 0

    const provider = selectors.getDataProvider(items, {
      ignoreAccents: false,
      maxSuggestions: 5,
      signal: new AbortController().signal,
      getSubstringIndex: (haystack, needle, ignoreAccents) => {
        scanCount += 1
        return needle.length === 0 ? 0 : haystack.toLowerCase().indexOf(needle.toLowerCase())
      },
    })

    const results = await provider('alpha')

    const metrics = {
      scanCount,
      resultCount: results.length,
    }
    emitPerformanceMetric('array-provider-scan-count', metrics)

    expect(metrics.scanCount).toBe(5)
    expect(metrics.resultCount).toBe(5)
  })
})
