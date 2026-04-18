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
    const secondConfig = prepareMentionsInputChildren(
      <>
        <Mention trigger="@" data={[]} />
        <>
          <Mention trigger="#" data={[]} />
        </>
      </>
    ).config

    expect(areMentionConfigsEqual(config, secondConfig)).toBe(true)
    expect(
      areMentionConfigsEqual(
        config,
        prepareMentionsInputChildren(
          <>
            <Mention trigger="@" data={[]} />
            <>
              <Mention trigger="$" data={[]} />
            </>
          </>
        ).config
      )
    ).toBe(false)
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

  it('treats regex trigger flags as part of the mention identity', () => {
    expect(() =>
      validateMentionChildTree(
        <>
          <Mention trigger={/(@([a-z]*))$/i} data={[]} />
          <Mention trigger={/(@([a-z]*))$/iu} data={[]} />
        </>
      )
    ).not.toThrow()

    const flaggedConfig = prepareMentionsInputChildren(
      <>
        <Mention trigger={/(@([a-z]*))$/i} data={[]} />
      </>
    ).config
    const sameConfig = prepareMentionsInputChildren(
      <>
        <Mention trigger={/(@([a-z]*))$/i} data={[]} />
      </>
    ).config
    const differentFlagsConfig = prepareMentionsInputChildren(
      <>
        <Mention trigger={/(@([a-z]*))$/iu} data={[]} />
      </>
    ).config

    expect(areMentionConfigsEqual(flaggedConfig, sameConfig)).toBe(true)
    expect(areMentionConfigsEqual(flaggedConfig, differentFlagsConfig)).toBe(false)
  })
})
