import { useEffect, useRef } from 'react'
import { areMentionConfigsEqual } from './MentionsInputChildren'
import { createMentionSelectionContext, deriveMentionValueSnapshot } from './MentionsInputDerived'
import type { MentionValueSnapshot } from './MentionsInputDerived'
import { computeMentionSelectionDetails, getMentionSelectionMap } from './MentionsInputSelection'
import type {
  MentionChildConfig,
  MentionSelectionState,
  MentionsInputProps,
  MentionsInputState,
} from './types'
import { areMentionSelectionsEqual } from './utils/areMentionSelectionsEqual'
import { useEventCallback } from './utils/useEventCallback'

interface UseMentionSelectionChangeArgs<Extra extends Record<string, unknown>> {
  props: MentionsInputProps<Extra>
  state: MentionsInputState<Extra>
  config: ReadonlyArray<MentionChildConfig<Extra>>
  getCurrentSnapshot: (
    value?: string,
    config?: ReadonlyArray<MentionChildConfig<Extra>>
  ) => MentionValueSnapshot<Extra>
}

interface PreviousSelectionCommit<Extra extends Record<string, unknown>> {
  value: string
  config: MentionChildConfig<Extra>[]
  selectionStart: number | null
  selectionEnd: number | null
}

export const useMentionSelectionChange = <Extra extends Record<string, unknown>>({
  props,
  state,
  config,
  getCurrentSnapshot,
}: UseMentionSelectionChangeArgs<Extra>) => {
  const previousCommitRef = useRef<PreviousSelectionCommit<Extra>>({
    value: props.value ?? '',
    config: [...config],
    selectionStart: state.selectionStart,
    selectionEnd: state.selectionEnd,
  })

  const getCurrentMentionSelectionMap = useEventCallback(
    (): Record<string, MentionSelectionState> => {
      const { selectionStart, selectionEnd } = state
      if (selectionStart === null || selectionEnd === null) {
        return {}
      }

      const { mentions } = getCurrentSnapshot(props.value ?? '', config)
      return getMentionSelectionMap(mentions, config, selectionStart, selectionEnd)
    }
  )

  useEffect(() => {
    const previousCommit = previousCommitRef.current
    const selectionPositionsChanged =
      state.selectionStart !== previousCommit.selectionStart ||
      state.selectionEnd !== previousCommit.selectionEnd
    const currentValue = props.value ?? ''
    const configChanged = !areMentionConfigsEqual(previousCommit.config, config)
    const valueChanged = currentValue !== previousCommit.value || configChanged
    const currentSnapshot = getCurrentSnapshot(currentValue, config)

    if ((selectionPositionsChanged || valueChanged) && props.onMentionSelectionChange) {
      const currentSelection = computeMentionSelectionDetails<Extra>(
        currentSnapshot.mentions,
        config,
        state.selectionStart,
        state.selectionEnd
      )
      let shouldEmit = selectionPositionsChanged

      if (!shouldEmit && valueChanged) {
        const previousSnapshot = deriveMentionValueSnapshot<Extra>(
          previousCommit.value,
          previousCommit.config
        )
        const previousSelection = computeMentionSelectionDetails<Extra>(
          previousSnapshot.mentions,
          previousCommit.config,
          previousCommit.selectionStart,
          previousCommit.selectionEnd
        )
        shouldEmit = !areMentionSelectionsEqual(
          previousSelection.selections,
          currentSelection.selections
        )
      }

      if (shouldEmit) {
        const selectionMentionIds = currentSelection.selections.map((selection) => selection.id)
        const selectionContext = createMentionSelectionContext(
          currentValue,
          currentSnapshot,
          selectionMentionIds
        )
        props.onMentionSelectionChange(currentSelection.selections, selectionContext)
      }
    }

    previousCommitRef.current = {
      value: currentValue,
      config: [...config],
      selectionStart: state.selectionStart,
      selectionEnd: state.selectionEnd,
    }
  })

  return {
    getCurrentMentionSelectionMap,
  }
}
