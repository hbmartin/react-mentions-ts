import React from 'react'
import { Mention } from './index'
import {
  areMentionConfigsEqual,
  prepareMentionsInputChildren,
  validateMentionChildTree,
} from './MentionsInputChildren'

describe('MentionsInputChildren', () => {
  it('prepares mention children and config from fragments once the tree is validated', () => {
    const { mentionChildren, config } = prepareMentionsInputChildren(
      <>
        <Mention trigger="@" data={[]} />
        <>
          <Mention trigger="#" data={[]} />
        </>
      </>
    )

    expect(mentionChildren).toHaveLength(2)
    expect(config).toHaveLength(2)
    expect(config[0]?.trigger).toBe('@')
    expect(config[1]?.trigger).toBe('#')
    expect(areMentionConfigsEqual(config, config)).toBe(true)
  })

  it('rejects duplicate triggers during validation', () => {
    expect(() =>
      validateMentionChildTree(
        <>
          <Mention trigger="@" data={[]} />
          <Mention trigger="@" data={[]} />
        </>
      )
    ).toThrow('duplicate triggers')
  })
})
