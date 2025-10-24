import createMarkupSerializer from '../serializers/createMarkupSerializer'
import getPlainText from './getPlainText'

describe('#getPlainText', () => {
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

  it('should replace markup with the correct display values ', () => {
    expect(getPlainText(value, config)).toEqual(
      "Hi John Doe, \n\nlet's add joe@smoe.com to this conversation..."
    )
  })

  it('should take the displayTransform into account', () => {
    expect(
      getPlainText(
        value,
        config.map((c) => ({ ...c, displayTransform: (id) => `<--${id}-->` }))
      )
    ).toEqual("Hi <--johndoe-->, \n\nlet's add <--joe@smoe.com--> to this conversation...")
  })
})
