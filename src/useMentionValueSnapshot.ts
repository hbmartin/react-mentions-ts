import { useMemo, useRef } from 'react'
import type { PreparedMentionsInputChildren } from './MentionsInputChildren'
import { areMentionConfigsEqual, prepareMentionsInputChildren } from './MentionsInputChildren'
import type { MentionValueSnapshot } from './MentionsInputDerived'
import { deriveMentionValueSnapshot } from './MentionsInputDerived'
import type { MentionChildConfig, MentionsInputProps } from './types'
import { useEventCallback } from './utils/useEventCallback'

interface SnapshotCache<Extra extends Record<string, unknown>> {
  value: string
  config: MentionChildConfig<Extra>[]
  snapshot: MentionValueSnapshot<Extra>
}

export const useMentionValueSnapshot = <Extra extends Record<string, unknown>>(
  children: MentionsInputProps<Extra>['children'],
  value: string | undefined
) => {
  const snapshotCacheRef = useRef<SnapshotCache<Extra> | null>(null)
  const preparedChildren = useMemo(() => prepareMentionsInputChildren<Extra>(children), [children])
  const currentValue = value ?? ''
  const currentSnapshot = useMemo(() => {
    const cachedSnapshot = snapshotCacheRef.current

    if (
      cachedSnapshot?.value === currentValue &&
      areMentionConfigsEqual(preparedChildren.config, cachedSnapshot.config)
    ) {
      return cachedSnapshot.snapshot
    }

    return deriveMentionValueSnapshot<Extra>(currentValue, preparedChildren.config)
  }, [currentValue, preparedChildren.config])

  const getPreparedChildren = useEventCallback(
    (
      nextChildren: MentionsInputProps<Extra>['children'] = children
    ): PreparedMentionsInputChildren<Extra> => {
      if (nextChildren === children) {
        return preparedChildren
      }

      return prepareMentionsInputChildren<Extra>(nextChildren)
    }
  )

  const cacheSnapshot = useEventCallback(
    (
      nextValue: string,
      config: ReadonlyArray<MentionChildConfig<Extra>>,
      snapshot: MentionValueSnapshot<Extra>
    ): MentionValueSnapshot<Extra> => {
      snapshotCacheRef.current = {
        value: nextValue,
        config: [...config],
        snapshot,
      }
      return snapshot
    }
  )

  const getCurrentConfig = useEventCallback(() => preparedChildren.config)

  const getMentionChildren = useEventCallback(() => preparedChildren.mentionChildren)

  const getCurrentSnapshot = useEventCallback(
    (
      nextValue: string = currentValue,
      config: ReadonlyArray<MentionChildConfig<Extra>> = getCurrentConfig()
    ): MentionValueSnapshot<Extra> => {
      if (nextValue === currentValue && areMentionConfigsEqual(config, preparedChildren.config)) {
        return currentSnapshot
      }

      const cachedSnapshot = snapshotCacheRef.current

      if (
        cachedSnapshot?.value === nextValue &&
        areMentionConfigsEqual(config, cachedSnapshot.config)
      ) {
        return cachedSnapshot.snapshot
      }

      return cacheSnapshot(nextValue, config, deriveMentionValueSnapshot<Extra>(nextValue, config))
    }
  )

  return {
    preparedChildren,
    currentSnapshot,
    getPreparedChildren,
    getMentionChildren,
    getCurrentConfig,
    getCurrentSnapshot,
    cacheSnapshot,
  }
}
