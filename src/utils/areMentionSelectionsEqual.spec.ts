import { areMentionSelectionsEqual } from './areMentionSelectionsEqual'
import type { MentionSelection } from '../types'

const baseSelection = (overrides: Partial<MentionSelection> = {}): MentionSelection => ({
  id: 'alpha',
  display: 'Alpha',
  childIndex: 0,
  plainTextStart: 0,
  plainTextEnd: 5,
  selection: 'inside',
  serializerId: 'mention',
  ...overrides,
})

describe('areMentionSelectionsEqual', () => {
  it('returns true when every selection matches', () => {
    const prev = [baseSelection()]
    const next = [baseSelection()]
    expect(areMentionSelectionsEqual(prev, next)).toBe(true)
  })

  it('returns false when lengths differ', () => {
    const prev: MentionSelection[] = []
    const next = [baseSelection()]
    expect(areMentionSelectionsEqual(prev, next)).toBe(false)
  })

  it('returns false when any tracked field changes', () => {
    const prev = [baseSelection()]
    const next = [baseSelection({ plainTextEnd: 6 })]
    expect(areMentionSelectionsEqual(prev, next)).toBe(false)
  })
})
