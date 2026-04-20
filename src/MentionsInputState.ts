import { useRef, useState } from 'react'
import type { MentionsInputState } from './types'
import { useEventCallback } from './utils/useEventCallback'

export type MentionsInputStatePatch<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> = Partial<MentionsInputState<Extra>>

export type MentionsInputStateUpdate<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> =
  | MentionsInputStatePatch<Extra>
  | ((prevState: MentionsInputState<Extra>) => MentionsInputStatePatch<Extra>)

export type SetMentionsInputState<Extra extends Record<string, unknown> = Record<string, unknown>> =
  (update: MentionsInputStateUpdate<Extra>) => void

export const createInitialMentionsInputState = <
  Extra extends Record<string, unknown> = Record<string, unknown>,
>(): MentionsInputState<Extra> => ({
  focusIndex: 0,
  selectionStart: null,
  selectionEnd: null,
  suggestions: {},
  queryStates: {},
  caretPosition: null,
  suggestionsPosition: {},
  inlineSuggestionPosition: null,
  pendingSelectionUpdate: false,
  highlighterRecomputeVersion: 0,
  generatedId: null,
})

export const useMentionsInputState = <
  Extra extends Record<string, unknown> = Record<string, unknown>,
>() => {
  const [state, setReactState] = useState<MentionsInputState<Extra>>(() =>
    createInitialMentionsInputState<Extra>()
  )
  const stateRef = useRef(state)
  stateRef.current = state

  const setState = useEventCallback((update: MentionsInputStateUpdate<Extra>) => {
    setReactState((prevState) => {
      const patch = typeof update === 'function' ? update(prevState) : update
      const nextState = {
        ...prevState,
        ...patch,
      }
      stateRef.current = nextState
      return nextState
    })
  })

  return {
    state,
    stateRef,
    setState,
  }
}
