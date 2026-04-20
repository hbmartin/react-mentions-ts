import React from 'react'
import { Mention } from './index'
import {
  areMentionConfigsEqual,
  prepareMentionsInputChildren,
  validateMentionChildTree,
} from './MentionsInputChildren'
import createMarkupSerializer from './utils/createMarkupSerializer'

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

  it('allows duplicate triggers during validation', () => {
    expect(() =>
      validateMentionChildTree(
        <>
          <Mention trigger="@" data={[]} />
          <Mention trigger="@" data={[]} />
        </>
      )
    ).not.toThrow()
  })

  it('treats omitted and default string triggers as the same mention identity', () => {
    const defaultedConfig = prepareMentionsInputChildren(
      <>
        <Mention data={[]} />
      </>
    ).config
    const explicitConfig = prepareMentionsInputChildren(
      <>
        <Mention trigger="@" data={[]} />
      </>
    ).config

    expect(areMentionConfigsEqual(defaultedConfig, explicitConfig)).toBe(true)
  })

  it('treats displayTransform identity as part of the mention equality check', () => {
    const sharedDisplayTransform = (id: string | number) => `@${String(id)}`

    const baseConfig = prepareMentionsInputChildren(
      <>
        <Mention trigger="@" data={[]} displayTransform={sharedDisplayTransform} />
      </>
    ).config
    const sameConfig = prepareMentionsInputChildren(
      <>
        <Mention trigger="@" data={[]} displayTransform={sharedDisplayTransform} />
      </>
    ).config
    const differentDisplayTransformConfig = prepareMentionsInputChildren(
      <>
        <Mention trigger="@" data={[]} displayTransform={(id) => `#${String(id)}`} />
      </>
    ).config

    expect(areMentionConfigsEqual(baseConfig, sameConfig)).toBe(true)
    expect(areMentionConfigsEqual(baseConfig, differentDisplayTransformConfig)).toBe(false)
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

  it('includes wrapped component names in invalid child errors', () => {
    function WrappedThing() {
      return <div>Wrapped</div>
    }

    expect(() =>
      validateMentionChildTree(
        <>
          <WrappedThing />
        </>
      )
    ).toThrow('MentionsInput only accepts Mention components as children. Found: WrappedThing')
  })

  it('falls back to an unknown component label for nameless invalid components', () => {
    const NamelessThing = () => <div>Nameless</div>
    Object.defineProperty(NamelessThing, 'name', {
      configurable: true,
      value: '',
    })

    expect(() => validateMentionChildTree(<NamelessThing />)).toThrow(
      'MentionsInput only accepts Mention components as children. Found: unknown component'
    )
  })

  it('rejects duplicate serializer identifiers', () => {
    const serializer = {
      insert: ({ id }: { id: string | number }) => `:${String(id)}`,
      findAll: (value: string) => {
        const regex = /:(\S+)/g
        const matches: Array<{ markup: string; index: number; id: string; display: null }> = []
        let match: RegExpExecArray | null

        while ((match = regex.exec(value)) !== null) {
          matches.push({
            markup: match[0],
            index: match.index,
            id: match[1],
            display: null,
          })
        }

        return matches
      },
      id: 'colon',
    }

    expect(() =>
      prepareMentionsInputChildren(
        <>
          <Mention trigger="@" data={[]} markup={serializer} />
          <Mention trigger="#" data={[]} markup={serializer} />
        </>
      )
    ).toThrow(
      'MentionsInput does not support Mention children with duplicate serializer ids: colon.'
    )
  })

  it('treats configs with different lengths as different', () => {
    const singleConfig = prepareMentionsInputChildren(<Mention trigger="@" data={[]} />).config
    const doubleConfig = prepareMentionsInputChildren(
      <>
        <Mention trigger="@" data={[]} />
        <Mention trigger="#" data={[]} />
      </>
    ).config

    expect(areMentionConfigsEqual(singleConfig, doubleConfig)).toBe(false)
  })

  it('normalizes regex trigger identities by stripping global flags', () => {
    const globalConfig = prepareMentionsInputChildren(
      <>
        <Mention trigger={/(@([a-z]*))$/gi} data={[]} />
      </>
    ).config
    const nonGlobalConfig = prepareMentionsInputChildren(
      <>
        <Mention trigger={/(@([a-z]*))$/i} data={[]} />
      </>
    ).config

    expect(areMentionConfigsEqual(globalConfig, nonGlobalConfig)).toBe(true)
  })

  it('normalizes regex trigger identities by stripping sticky flags', () => {
    const stickyConfig = prepareMentionsInputChildren(
      <>
        <Mention trigger={/(@([a-z]*))$/iy} data={[]} />
      </>
    ).config
    const nonStickyConfig = prepareMentionsInputChildren(
      <>
        <Mention trigger={/(@([a-z]*))$/i} data={[]} />
      </>
    ).config

    expect(areMentionConfigsEqual(stickyConfig, nonStickyConfig)).toBe(true)
  })

  it('prepares trigger query regex metadata once with normalized flags', () => {
    const [stringTriggerConfig, regexTriggerConfig] = prepareMentionsInputChildren(
      <>
        <Mention trigger="@" data={[]} />
        <Mention trigger={/(#([\p{L}\d_]*))$/iuy} data={[]} />
      </>
    ).config

    expect(stringTriggerConfig?.query.regex.test('@ali')).toBe(true)
    expect(regexTriggerConfig?.query.regex.flags).toContain('i')
    expect(regexTriggerConfig?.query.regex.flags).toContain('u')
    expect(regexTriggerConfig?.query.regex.flags).not.toContain('g')
    expect(regexTriggerConfig?.query.regex.flags).not.toContain('y')
    expect(regexTriggerConfig?.query.ignoreAccents).toBe(true)
  })

  it('treats prepared query metadata as part of mention config equality', () => {
    const config = prepareMentionsInputChildren(<Mention trigger="@" data={[]} />).config
    const changedQueryConfig = config.map((childConfig) => ({
      ...childConfig,
      query: {
        regex: /(@([a-z]+))$/i,
        ignoreAccents: childConfig.query.ignoreAccents,
      },
    }))

    expect(areMentionConfigsEqual(config, changedQueryConfig)).toBe(false)
  })

  it('treats raw undefined triggers as the default trigger identity', () => {
    const serializer = createMarkupSerializer('@[__display__](__id__)')
    const displayTransform = (id: string | number, display: string | null) => display ?? String(id)

    expect(
      areMentionConfigsEqual(
        [
          {
            trigger: undefined,
            serializer,
            displayTransform,
            query: {
              regex: /(@(\w*))$/,
              ignoreAccents: false,
            },
          } as never,
        ],
        [
          {
            trigger: '@',
            serializer,
            displayTransform,
            query: {
              regex: /(@(\w*))$/,
              ignoreAccents: false,
            },
          } as never,
        ]
      )
    ).toBe(true)
  })
})
