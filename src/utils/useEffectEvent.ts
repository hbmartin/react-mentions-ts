import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Polyfill for the experimental React useEffectEvent hook.
 * Ensures a stable callback reference that always points to the latest handler.
 */
export function useEffectEvent<T extends (...args: any[]) => any>(handler: T): T {
  const handlerRef = useRef(handler)

  useIsomorphicLayoutEffect(() => {
    handlerRef.current = handler
  })

  return useCallback(((...args: Parameters<T>) => handlerRef.current(...args)) as T, [])
}
