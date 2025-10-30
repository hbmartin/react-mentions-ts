import findPositionOfCapturingGroup from './findPositionOfCapturingGroup'

describe('#findPositionOfCapturingGroup', () => {
  const testData = {
    '@[__display__](__id__)': { display: 0, id: 1 },
    '{{__id__#__display__}}': { display: 1, id: 0 },
    '{{__id__}}': { display: 0, id: 0 },
    '{{__display__}}': { display: 0, id: 0 },
  }

  for (const key of Object.keys(testData)) {
    const markup = key
    const positions = testData[key]

    it(`should return ${positions.display} for the 'display' position in markup '${markup}'`, () => {
      expect(findPositionOfCapturingGroup(markup, 'display')).toEqual(positions.display)
    })

    it(`should return ${positions.id} for the 'id' position in markup '${markup}'`, () => {
      expect(findPositionOfCapturingGroup(markup, 'id')).toEqual(positions.id)
    })
  }

  it("throws if markup doesn't contain any supported placeholders", () => {
    const markup = 'no placeholders here'
    expect(() => findPositionOfCapturingGroup(markup, 'display')).toThrow(
      "The markup 'no placeholders here' does not contain either of the placeholders '__id__' or '__display__'"
    )
  })
})
