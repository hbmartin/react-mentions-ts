import { useRef } from 'react'
import type { PreparedMentionsInputChildren } from './MentionsInputChildren'
import { areMentionConfigsEqual, prepareMentionsInputChildren } from './MentionsInputChildren'
import type { MentionValueSnapshot } from './MentionsInputDerived'
import { deriveMentionValueSnapshot } from './MentionsInputDerived'
import type { MentionChildConfig, MentionsInputProps } from './types'
import { useEventCallback } from './utils/useEventCallback'

interface PreparedChildrenCache<Extra extends Record<string, unknown>> {
  source: MentionsInputProps<Extra>['children']
  value: PreparedMentionsInputChildren<Extra>
}

interface SnapshotCache<Extra extends Record<string, unknown>> {
  value: string
  config: MentionChildConfig<Extra>[]
  snapshot: MentionValueSnapshot<Extra>
}

export const useMentionValueSnapshot = <Extra extends Record<string, unknown>>(
  children: MentionsInputProps<Extra>['children'],
  value: string | undefined
) => {
  const preparedChildrenCacheRef = useRef<PreparedChildrenCache<Extra> | null>(null)
  const snapshotCacheRef = useRef<SnapshotCache<Extra> | null>(null)

  const getPreparedChildren = useEventCallback(
    (
      nextChildren: MentionsInputProps<Extra>['children'] = children
    ): PreparedMentionsInputChildren<Extra> => {
      if (preparedChildrenCacheRef.current?.source === nextChildren) {
        return preparedChildrenCacheRef.current.value
      }

      const preparedChildren = prepareMentionsInputChildren<Extra>(nextChildren)

      if (nextChildren === children) {
        preparedChildrenCacheRef.current = {
          source: nextChildren,
          value: preparedChildren,
        }
      }

      return preparedChildren
    }
  )

  const preparedChildren = getPreparedChildren(children)
  const initialValue = value ?? ''

  if (snapshotCacheRef.current === null) {
    snapshotCacheRef.current = {
      value: initialValue,
      config: [...preparedChildren.config],
      snapshot: deriveMentionValueSnapshot<Extra>(initialValue, preparedChildren.config),
    }
  }

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

  const getCurrentConfig = useEventCallback(() => getPreparedChildren(children).config)

  const getMentionChildren = useEventCallback(() => getPreparedChildren(children).mentionChildren)

  const getCurrentSnapshot = useEventCallback(
    (
      nextValue: string = value ?? '',
      config: ReadonlyArray<MentionChildConfig<Extra>> = getCurrentConfig()
    ): MentionValueSnapshot<Extra> => {
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
    getPreparedChildren,
    getMentionChildren,
    getCurrentConfig,
    getCurrentSnapshot,
    cacheSnapshot,
  }
}
