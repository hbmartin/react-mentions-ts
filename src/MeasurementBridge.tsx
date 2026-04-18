import { useLayoutEffect } from 'react'
import type { InputElement } from './types'
import type { PendingViewSync } from './MentionsInputLayout'
import { useEventCallback } from './utils/useEventCallback'

export interface MeasurementBridgeProps {
  readonly container: HTMLDivElement | null
  readonly highlighter: HTMLDivElement | null
  readonly input: InputElement | null
  readonly suggestions: HTMLDivElement | null
  readonly requestViewSync: (flags: Partial<PendingViewSync>) => void
}

const ALL_MEASUREMENT_FLAGS: Partial<PendingViewSync> = {
  syncScroll: true,
  measureSuggestions: true,
  measureInline: true,
}

const SUGGESTIONS_ONLY_FLAGS: Partial<PendingViewSync> = {
  measureSuggestions: true,
}

const MeasurementBridge = ({
  container,
  highlighter,
  input,
  suggestions,
  requestViewSync,
}: MeasurementBridgeProps) => {
  const requestAllMeasurements = useEventCallback(() => {
    requestViewSync(ALL_MEASUREMENT_FLAGS)
  })

  const requestSuggestionsMeasurement = useEventCallback(() => {
    requestViewSync(SUGGESTIONS_ONLY_FLAGS)
  })

  const observe = useEventCallback((element: Element | null, callback: () => void) => {
    const resizeObserverConstructor = Reflect.get(globalThis, 'ResizeObserver') as
      | typeof ResizeObserver
      | undefined

    if (!element || resizeObserverConstructor === undefined) {
      return undefined
    }

    const observer = new resizeObserverConstructor(() => {
      callback()
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  })

  useLayoutEffect(() => {
    requestAllMeasurements()
  }, [requestAllMeasurements])

  useLayoutEffect(
    () => observe(container, requestAllMeasurements),
    [container, observe, requestAllMeasurements]
  )
  useLayoutEffect(
    () => observe(highlighter, requestAllMeasurements),
    [highlighter, observe, requestAllMeasurements]
  )
  useLayoutEffect(
    () => observe(input, requestAllMeasurements),
    [input, observe, requestAllMeasurements]
  )
  useLayoutEffect(
    () => observe(suggestions, requestSuggestionsMeasurement),
    [suggestions, observe, requestSuggestionsMeasurement]
  )

  useLayoutEffect(() => {
    const windowObject = Reflect.get(globalThis, 'window') as Window | undefined

    if (windowObject === undefined) {
      return undefined
    }

    const handleViewportChange = () => {
      requestAllMeasurements()
    }

    windowObject.addEventListener('resize', handleViewportChange)
    windowObject.addEventListener('orientationchange', handleViewportChange)

    return () => {
      windowObject.removeEventListener('resize', handleViewportChange)
      windowObject.removeEventListener('orientationchange', handleViewportChange)
    }
  }, [requestAllMeasurements])

  useLayoutEffect(() => {
    if (!input) {
      return undefined
    }

    const handleScroll = () => {
      requestAllMeasurements()
    }

    input.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      input.removeEventListener('scroll', handleScroll)
    }
  }, [input, requestAllMeasurements])

  return null
}

export default MeasurementBridge
