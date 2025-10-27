import createMarkupSerializer from './createMarkupSerializer'
import getMentionsAndPlainText from './getMentionsAndPlainText'

describe('#getMentionsAndPlainText', () => {
  const userMarkup = '@[__display__](user:__id__)'
  const emailMarkup = '@[__display__](email:__id__)'
  const defaultDisplayTransform = (id, display) => display
  const config = [
    {
      markup: userMarkup,
      displayTransform: defaultDisplayTransform,
      serializer: createMarkupSerializer(userMarkup),
    },
    {
      markup: emailMarkup,
      displayTransform: defaultDisplayTransform,
      serializer: createMarkupSerializer(emailMarkup),
    },
  ]

  const value =
    "Hi @[John Doe](user:johndoe), \n\nlet's add @[joe@smoe.com](email:joe@smoe.com) to this conversation..."

  const displayTransform = (id) => `<--${id}-->`

  it('returns mentions and plain text in a single pass', () => {
    const { mentions, plainText } = getMentionsAndPlainText(value, config)
    expect(mentions).toEqual([
      {
        id: 'johndoe',
        display: 'John Doe',
        childIndex: 0,
        index: 3,
        plainTextIndex: 3,
      },
      {
        id: 'joe@smoe.com',
        display: 'joe@smoe.com',
        childIndex: 1,
        index: 42,
        plainTextIndex: 25,
      },
    ])
    expect(plainText).toBe("Hi John Doe, \n\nlet's add joe@smoe.com to this conversation...")
  })

  it('respects displayTransform for plain text and mention occurrences', () => {
    const { mentions, plainText } = getMentionsAndPlainText(
      value,
      config.map((c) => ({ ...c, displayTransform }))
    )
    expect(mentions).toEqual([
      {
        id: 'johndoe',
        display: '<--johndoe-->',
        childIndex: 0,
        index: 3,
        plainTextIndex: 3,
      },
      {
        id: 'joe@smoe.com',
        display: '<--joe@smoe.com-->',
        childIndex: 1,
        index: 42,
        plainTextIndex: 30,
      },
    ])
    expect(plainText).toBe(
      "Hi <--johndoe-->, \n\nlet's add <--joe@smoe.com--> to this conversation..."
    )
  })
})
