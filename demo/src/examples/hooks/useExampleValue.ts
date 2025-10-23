import { useCallback, useState } from 'react'
import type {
  MentionsInputChangeEvent,
  MentionsInputChangeHandler,
} from '../../../../src'

function useExampleValue(
  initialValue: string
): [string, MentionsInputChangeHandler, (...args: any[]) => void] {
  const [value, setValue] = useState(initialValue)

  const onChange = useCallback<MentionsInputChangeHandler>(
    ({ value: nextValue }: MentionsInputChangeEvent) => setValue(nextValue),
    [setValue]
  )
  const onAdd = useCallback((...args) => console.log(...args), [])

  return [value, onChange, onAdd]
}

export default useExampleValue
