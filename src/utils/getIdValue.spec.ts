import createMarkupSerializer from './createMarkupSerializer'
import getIdValue from './getIdValue'

describe('#getIdValue', () => {
  const userMarkup = '@[__display__](user:__id__)'
  const emailMarkup = '@[__display__](email:__id__)'
  const config = [
    {
      markup: userMarkup,
      displayTransform: (id: string, display?: string | null) => display ?? id,
      serializer: createMarkupSerializer(userMarkup),
    },
    {
      markup: emailMarkup,
      displayTransform: (id: string) => `<${id}>`,
      serializer: createMarkupSerializer(emailMarkup),
    },
  ]

  it('returns text with mention identifiers substituted for displays', () => {
    const value =
      "Hi @[John Doe](user:johndoe), let's add @[joe@smoe.com](email:joe@smoe.com) to this thread."

    expect(getIdValue(value, config)).toBe("Hi johndoe, let's add joe@smoe.com to this thread.")
  })

  it('stringifies numeric identifiers while preserving surrounding text', () => {
    const numberMarkup = '@[__display__](num:__id__)'
    const numberConfig = [
      {
        markup: numberMarkup,
        displayTransform: (_id: number, display?: string | null) => display ?? '',
        serializer: createMarkupSerializer(numberMarkup),
      },
    ]

    const value = 'Count @[One](num:1), @[Two](num:2), @[Three](num:3)!'

    expect(getIdValue(value, numberConfig)).toBe('Count 1, 2, 3!')
  })
})
