import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

// eslint-disable-next-line unicorn/prefer-global-this
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Polyfill for the experimental React useEffectEvent hook.
 * Ensures a stable callback reference that always points to the latest handler.
 */
export function useEffectEvent<T extends (...args: any[]) => any>(handler: T): T {
  const handlerRef = useRef<T | null>(null)

  useIsomorphicLayoutEffect(() => {
    handlerRef.current = handler
  })

  return useCallback(
    ((...args: Parameters<T>) => {
      const current = handlerRef.current
      if (current === null) {
        throw new Error('useEffectEvent callback executed before the handler was assigned.')
      }
      return current(...args)
    }) as T,
    []
  )
}
