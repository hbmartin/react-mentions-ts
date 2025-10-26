import applyChangeToValue from './applyChangeToValue'
import createMarkupSerializer from './createMarkupSerializer'
import * as getPlainTextModule from './getPlainText'

describe('#applyChangeToValue', () => {
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
  const plainText = "Hi John Doe, \n\nlet's add joe@smoe.com to this conversation..."

  const displayTransform = (id) => `<--${id}-->`
  const plainTextDisplayTransform =
    "Hi <--johndoe-->, \n\nlet's add <--joe@smoe.com--> to this conversation..."

  it('should correctly add a character at the end, beginning, and in the middle of text', () => {
    let changed = `S${plainText}`
    let result = applyChangeToValue(
      value,
      changed,
      {
        selectionStartBefore: 0,
        selectionEndBefore: 0,
        selectionEndAfter: 1,
      },
      config
    )
    expect(result).toEqual(`S${value}`)

    changed = `${plainText}E`
    result = applyChangeToValue(
      value,
      changed,
      {
        selectionStartBefore: plainText.length,
        selectionEndBefore: plainText.length,
        selectionEndAfter: changed.length,
      },
      config
    )
    expect(result).toEqual(`${value}E`)

    changed = "Hi John Doe, \n\nlet's Madd joe@smoe.com to this conversation..."
    result = applyChangeToValue(
      value,
      changed,
      {
        selectionStartBefore: 21,
        selectionEndBefore: 21,
        selectionEndAfter: 22,
      },
      config
    )
    expect(result).toEqual(
      "Hi @[John Doe](user:johndoe), \n\nlet's Madd @[joe@smoe.com](email:joe@smoe.com) to this conversation..."
    )
  })

  it('should correctly delete single characters and ranges of selected text', () => {
    // delete "i"
    let changed = "H John Doe, \n\nlet's add joe@smoe.com to this conversation..."
    let result = applyChangeToValue(
      value,
      changed,
      {
        selectionStartBefore: 2,
        selectionEndBefore: 2,
        selectionEndAfter: 1,
      },
      config
    )
    expect(result).toEqual(
      "H @[John Doe](user:johndoe), \n\nlet's add @[joe@smoe.com](email:joe@smoe.com) to this conversation..."
    )

    // delete "add "
    changed = "Hi John Doe, \n\nlet's joe@smoe.com to this conversation..."
    result = applyChangeToValue(
      value,
      changed,
      {
        selectionStartBefore: plainText.indexOf('add '),
        selectionEndBefore: plainText.indexOf('add ') + 'add '.length,
        selectionEndAfter: plainText.indexOf('add '),
      },
      config
    )
    expect(result).toEqual(
      "Hi @[John Doe](user:johndoe), \n\nlet's @[joe@smoe.com](email:joe@smoe.com) to this conversation..."
    )
  })

  it('should correctly add ranges of pasted text and replace the selected range with the new range', () => {
    // add range
    let changed = plainText.replace('add', 'add add')
    let result = applyChangeToValue(
      value,
      changed,
      {
        selectionStartBefore: plainText.indexOf('add') + 'add'.length,
        selectionEndBefore: plainText.indexOf('add') + 'add'.length,
        selectionEndAfter: plainText.indexOf('add') + 'add add'.length,
      },
      config
    )
    expect(result).toEqual(value.replace('add', 'add add'))

    // replace range
    changed = plainText.replace('add', 'remove')
    result = applyChangeToValue(
      value,
      changed,
      {
        selectionStartBefore: plainText.indexOf('add'),
        selectionEndBefore: plainText.indexOf('add') + 'add'.length,
        selectionEndAfter: plainText.indexOf('add') + 'remove'.length,
      },
      config
    )
    expect(result).toEqual(value.replace('add', 'remove'))
  })

  it('should remove mentions markup contained in deleted text ranges', () => {
    // delete without a range selection
    let changed = "Hi John Do, \n\nlet's add joe@smoe.com to this conversation..."
    let result = applyChangeToValue(
      value,
      changed,
      {
        selectionStartBefore: 11,
        selectionEndBefore: 11,
        selectionEndAfter: 10,
      },
      config
    )
    expect(result).toEqual(
      "Hi , \n\nlet's add @[joe@smoe.com](email:joe@smoe.com) to this conversation..."
    )

    // delete mention inside the range
    changed = "Hi let's add joe@smoe.com to this conversation..."
    result = applyChangeToValue(
      value,
      changed,
      {
        selectionStartBefore: 3,
        selectionEndBefore: 15,
        selectionEndAfter: 3,
      },
      config
    )
    expect(result).toEqual(
      "Hi let's add @[joe@smoe.com](email:joe@smoe.com) to this conversation..."
    )

    // delete mention partially inside the range
    changed = "Hi John Doe, \n\nlet's add joe@smoe.com to this conversation..."
    result = applyChangeToValue(
      value,
      changed,
      {
        selectionStartBefore: plainText.indexOf(' add'),
        selectionEndBefore: plainText.indexOf(' add') + ' add joe@'.length,
        selectionEndAfter: plainText.indexOf(' add'),
      },
      config
    )
    expect(result).toEqual("Hi @[John Doe](user:johndoe), \n\nlet's to this conversation...")
  })

  it('should correctly add a new character after a mention at the end of the string', () => {
    const value = 'Hi @[John Doe](user:johndoe)'
    const changed = 'Hi John Doe,'

    const result = applyChangeToValue(
      value,
      changed,
      {
        selectionStartBefore: 11,
        selectionEndBefore: 11,
        selectionEndAfter: 12,
      },
      config
    )
    expect(result).toEqual('Hi @[John Doe](user:johndoe),')
  })

  it('should support deletion of whole words (Alt + Backspace) and whole lines (Cmd + Backspace)', () => {
    const changed = plainText.replace('add', '')

    const result = applyChangeToValue(
      value,
      changed,
      {
        selectionStartBefore: 24,
        selectionEndBefore: 24,
        selectionEndAfter: 21,
      },
      config
    )
    expect(result).toEqual(
      "Hi @[John Doe](user:johndoe), \n\nlet's  @[joe@smoe.com](email:joe@smoe.com) to this conversation..."
    )
  })

  it('should support deletion to the right using Del key', () => {
    const changed = plainText.replace('add', 'dd')

    const result = applyChangeToValue(
      value,
      changed,
      {
        selectionStartBefore: 21,
        selectionEndBefore: 21,
        selectionEndAfter: 21,
      },
      config
    )
    expect(result).toEqual(
      "Hi @[John Doe](user:johndoe), \n\nlet's dd @[joe@smoe.com](email:joe@smoe.com) to this conversation..."
    )
  })

  it('should support deletion to the right using Del key when using the displayTransform option', () => {
    const changed = plainTextDisplayTransform.replace('add', 'dd')
    const result = applyChangeToValue(
      value,
      changed,
      {
        selectionStartBefore: 26,
        selectionEndBefore: 26,
        selectionEndAfter: 26,
      },
      config.map((c) => ({ ...c, displayTransform }))
    )
    expect(result).toEqual(
      "Hi @[John Doe](user:johndoe), \n\nlet's dd @[joe@smoe.com](email:joe@smoe.com) to this conversation..."
    )
  })

  it('normalizes selection values that are reported as the string "undefined"', () => {
    const baseValue = 'Sample value'
    const basePlain = 'Sample value'
    const changed = `x${basePlain}`

    const result = applyChangeToValue(
      baseValue,
      changed,
      {
        selectionStartBefore: 'undefined',
        selectionEndBefore: 'undefined',
        selectionEndAfter: 1,
      },
      config
    )

    expect(result).toEqual(`x${baseValue}`)
  })

  it('adjusts for composition events that leave selections unchanged', () => {
    const result = applyChangeToValue(
      value,
      plainText,
      {
        selectionStartBefore: 10,
        selectionEndBefore: 10,
        selectionEndAfter: 10,
      },
      config
    )

    expect(result).toEqual(value)
  })

  it('should correctly handle text auto-correction', () => {
    const result = applyChangeToValue(
      'ill',
      "I'll",
      {
        selectionStartBefore: 3,
        selectionEndBefore: 3,
        selectionEndAfter: 4,
      },
      config
    )
    expect(result).toEqual("I'll")
  })

  it('re-runs splice logic when the reconstructed plain text differs from the target plain text', () => {
    const actualGetPlainText = getPlainTextModule.default
    const getPlainTextSpy = jest
      .spyOn(getPlainTextModule, 'default')
      .mockImplementationOnce((inputValue, inputConfig) =>
        actualGetPlainText(inputValue, inputConfig)
      )
      .mockImplementationOnce(() => 'intermediate mismatch')
      .mockImplementation((inputValue, inputConfig) => actualGetPlainText(inputValue, inputConfig))

    try {
      const baseValue = 'Hello world'
      const changed = 'Hello brave world'
      const result = applyChangeToValue(
        baseValue,
        changed,
        {
          selectionStartBefore: 6,
          selectionEndBefore: 6,
          selectionEndAfter: 12,
        },
        config
      )

      expect(result).toEqual(changed)
      expect(getPlainTextSpy).toHaveBeenCalledTimes(3)
    } finally {
      getPlainTextSpy.mockRestore()
    }
  })
})
