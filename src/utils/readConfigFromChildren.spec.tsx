import React from 'react'
import Mention from '../Mention'
import createMarkupSerializer from '../serializers/createMarkupSerializer'
import readConfigFromChildren from './readConfigFromChildren'

const makeMention = (props: Partial<React.ComponentProps<typeof Mention>> = {}) => (
  <Mention data={[]} {...props} />
)

describe('readConfigFromChildren', () => {
  it('returns default config when markup is omitted', () => {
    const config = readConfigFromChildren(makeMention())

    expect(config).toHaveLength(1)
    expect(config[0]?.markup).toBe('@[__display__](__id__)')
    expect(config[0]?.serializer.insert({ id: '123', display: 'Ada' })).toBe('@[Ada](123)')
  })

  it('creates a serializer from a markup string', () => {
    const config = readConfigFromChildren(makeMention({ markup: '[__id__]' }))

    const matches = config[0]?.serializer.findAll('Hello [42]')
    expect(matches?.[0]?.id).toBe('42')
  })

  it('accepts a MentionSerializer via the markup prop', () => {
    const serializer = createMarkupSerializer(':__id__')
    const config = readConfigFromChildren(makeMention({ markup: serializer }))

    expect(config[0]?.serializer.insert({ id: 'abc', display: 'User' })).toBe(':abc')
  })

  it('preserves per-child overrides such as displayTransform', () => {
    const config = readConfigFromChildren(
      <>
        {makeMention({ displayTransform: () => 'first' })}
        {makeMention({ displayTransform: () => 'second' })}
      </>
    )

    expect(config[0]?.displayTransform('1', 'one')).toBe('first')
    expect(config[1]?.displayTransform('2', 'two')).toBe('second')
  })

  it('ignores non-mention nodes', () => {
    const config = readConfigFromChildren(
      <>
        <span>text node</span>
        {null}
        {makeMention({ markup: '@[__display__](__id__)', trigger: '@' })}
        {makeMention({ markup: '#__id__', trigger: '#' })}
      </>
    )

    expect(config).toHaveLength(2)
    expect(config[0]?.trigger).toBe('@')
    expect(config[1]?.trigger).toBe('#')
  })

  it('handles nested fragments and arrays of mentions', () => {
    const config = readConfigFromChildren(
      <>
        {[makeMention({ markup: '(__id__)' })]}
        <React.Fragment>{makeMention({ markup: '[__id__]' })}</React.Fragment>
      </>
    )

    expect(config).toHaveLength(2)
    expect(config[0]?.serializer.findAll('x(foo)')[0]?.id).toBe('foo')
    expect(config[1]?.serializer.findAll('y[bar]')[0]?.id).toBe('bar')
  })
})
