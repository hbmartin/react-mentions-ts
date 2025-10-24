import { useCallback, useState } from 'react'
import type { MentionsInputChangeEvent, MentionsInputChangeHandler } from '../../../../src'

function useExampleValue(
  initialValue: string
): [string, MentionsInputChangeHandler, (...args: any[]) => void] {
  const [value, setValue] = useState(initialValue)

  const onMentionsChange = useCallback<MentionsInputChangeHandler>(
    ({ value: nextValue }: MentionsInputChangeEvent) => setValue(nextValue),
    [setValue]
  )
  const onAdd = useCallback((...args) => console.log(...args), [])

  return [value, onMentionsChange, onAdd]
}

export default useExampleValue
