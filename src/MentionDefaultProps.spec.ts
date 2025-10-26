import { DEFAULT_MENTION_PROPS } from './MentionDefaultProps'

describe('DEFAULT_MENTION_PROPS', () => {
  it('provides a no-op onRemove handler.', () => {
    expect(DEFAULT_MENTION_PROPS.onRemove('123')).toBeUndefined()
  })

  it('falls back to stringifying the id when display is missing.', () => {
    expect(DEFAULT_MENTION_PROPS.displayTransform(456)).toBe('456')
  })
})
