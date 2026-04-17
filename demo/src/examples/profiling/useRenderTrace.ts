import { useEffect, useRef } from 'react'

const wdyrFlag = String(import.meta.env.VITE_WDYR ?? '').toLowerCase()
export const isProfilingConsoleEnabled =
  import.meta.env.DEV && (wdyrFlag === 'true' || wdyrFlag === '1')

export function useRenderTrace(label: string): number {
  const renderCount = useRef(0)
  renderCount.current += 1
  const currentCount = renderCount.current

  useEffect(() => {
    if (!isProfilingConsoleEnabled) {
      return
    }

    console.info(`[trace] ${label} render #${currentCount.toString()}`)
  }, [currentCount, label])

  return currentCount
}
