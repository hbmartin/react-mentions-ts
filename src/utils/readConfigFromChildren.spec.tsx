import React from 'react'
import Mention from '../Mention'
import getPlainText from './getPlainText'
import readConfigFromChildren from './readConfigFromChildren'

describe('readConfigFromChildren', () => {
  describe('trigger-specific markup generation', () => {
    it('should generate unique markup for different triggers when no markup is specified', () => {
      const children = [
        <Mention key="1" trigger="@" data={[]} />,
        <Mention key="2" trigger=":" data={[]} />,
      ]

      const config = readConfigFromChildren(children)

      expect(config).toHaveLength(2)
      expect(config[0].serializer.id).toBe('@[__display__](__id__)')
      expect(config[1].serializer.id).toBe(':[__display__](__id__)')
    })

    it('should use custom markup when explicitly provided', () => {
      const children = [
        <Mention key="1" trigger="@" markup="@[__display__](user:__id__)" data={[]} />,
        <Mention key="2" trigger=":" markup=":[__display__](emoji:__id__)" data={[]} />,
      ]

      const config = readConfigFromChildren(children)

      expect(config).toHaveLength(2)
      expect(config[0].serializer.id).toBe('@[__display__](user:__id__)')
      expect(config[1].serializer.id).toBe(':[__display__](emoji:__id__)')
    })

    it('should prevent serializer collisions between different triggers', () => {
      const children = [
        <Mention key="1" trigger="@" displayTransform={(id) => `@${id}`} data={[]} />,
        <Mention key="2" trigger=":" displayTransform={String} data={[]} />,
      ]

      const config = readConfigFromChildren(children)

      // Simulate adding an emoji mention (trigger: ':')
      const emojiMarkup = config[1].serializer.insert({ id: '😀', display: '😀' })
      expect(emojiMarkup).toBe(':[😀](😀)')

      // Simulate adding a user mention (trigger: '@')
      const userMarkup = config[0].serializer.insert({ id: 'john', display: 'John' })
      expect(userMarkup).toBe('@[John](john)')

      // Test that getPlainText correctly uses each mention's displayTransform
      const value = `Hello ${userMarkup} ${emojiMarkup}`
      const plainText = getPlainText(value, config)

      // The emoji should NOT have '@' prefix (bug fix verification)
      expect(plainText).toBe('Hello @john 😀')
    })

    it('should handle RegExp triggers with default markup', () => {
      const children = [<Mention key="1" trigger={/@/} data={[]} />]

      const config = readConfigFromChildren(children)

      expect(config).toHaveLength(1)
      expect(config[0].serializer.id).toBe('@[__display__](__id__)')
    })

    it('should correctly apply displayTransform for each mention type', () => {
      const children = [
        <Mention
          key="1"
          trigger="@"
          displayTransform={(id, display) => `@${display || id}`}
          data={[]}
        />,
        <Mention key="2" trigger=":" displayTransform={String} data={[]} />,
        <Mention key="3" trigger="#" displayTransform={(id) => `#${id}`} data={[]} />,
      ]

      const config = readConfigFromChildren(children)

      const atMention = config[0].serializer.insert({ id: 'user1', display: 'User One' })
      const colonMention = config[1].serializer.insert({ id: '🎉', display: '🎉' })
      const hashMention = config[2].serializer.insert({ id: 'tag1', display: 'tag1' })

      const value = `Message ${atMention} ${colonMention} ${hashMention}`
      const plainText = getPlainText(value, config)

      expect(plainText).toBe('Message @User One 🎉 #tag1')
    })
  })

  describe('backward compatibility', () => {
    it('should use the shared DEFAULT_SERIALIZER when trigger is @ and no markup is provided', () => {
      const children = [
        <Mention key="1" trigger="@" data={[]} />,
        <Mention key="2" trigger="@" data={[]} />,
      ]

      const config = readConfigFromChildren(children)

      // Both should use the same serializer instance for efficiency
      expect(config[0].serializer.id).toBe('@[__display__](__id__)')
      expect(config[1].serializer.id).toBe('@[__display__](__id__)')
    })

    it('should maintain existing behavior when custom markup is provided', () => {
      const customMarkup = '@[__display__](custom:__id__)'
      const children = [<Mention key="1" trigger="@" markup={customMarkup} data={[]} />]

      const config = readConfigFromChildren(children)

      expect(config[0].serializer.id).toBe(customMarkup)
    })
  })
})
