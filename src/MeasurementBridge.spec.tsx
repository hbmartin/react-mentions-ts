import React from 'react'
import { act, render, waitFor } from '@testing-library/react'
import type { Mock } from 'vitest'
import MeasurementBridge from './MeasurementBridge'

describe('MeasurementBridge', () => {
  it('requests view sync from mount, observers, scroll, and viewport listeners, then cleans up', async () => {
    const requestViewSync = vi.fn()
    const container = document.createElement('div')
    const highlighter = document.createElement('div')
    const input = document.createElement('textarea')
    const suggestions = document.createElement('div')

    const originalResizeObserver = (globalThis as typeof globalThis & { ResizeObserver?: unknown })
      .ResizeObserver
    const observers: Array<{
      callback: () => void
      observe: Mock
      disconnect: Mock
    }> = []

    class MockResizeObserver {
      readonly callback: () => void
      readonly observe: Mock
      readonly disconnect: Mock

      constructor(callback: () => void) {
        this.callback = callback
        this.observe = vi.fn()
        this.disconnect = vi.fn()
        observers.push(this)
      }
    }

    ;(globalThis as typeof globalThis & { ResizeObserver?: unknown }).ResizeObserver =
      MockResizeObserver

    const originalAdd = globalThis.addEventListener
    const originalRemove = globalThis.removeEventListener
    const handlers: Partial<Record<string, EventListener>> = {}

    const addListener = vi
      .spyOn(globalThis, 'addEventListener')
      .mockImplementation(
        (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | AddEventListenerOptions
        ) => {
          handlers[type] = listener as EventListener
          return originalAdd.call(globalThis, type, listener, options)
        }
      )

    const removeListener = vi
      .spyOn(globalThis, 'removeEventListener')
      .mockImplementation(
        (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | EventListenerOptions
        ) => originalRemove.call(globalThis, type, listener, options)
      )

    try {
      const { unmount } = render(
        <MeasurementBridge
          container={container}
          highlighter={highlighter}
          input={input}
          suggestions={suggestions}
          requestViewSync={requestViewSync}
        />
      )

      expect(requestViewSync).toHaveBeenCalledWith({
        syncScroll: true,
        measureSuggestions: true,
        measureInline: true,
      })

      act(() => {
        for (const observer of observers) {
          observer.callback()
        }
      })

      act(() => {
        input.dispatchEvent(new Event('scroll'))
      })

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
        globalThis.dispatchEvent(new Event('orientationchange'))
      })

      expect(requestViewSync).toHaveBeenCalledWith({
        measureSuggestions: true,
      })
      expect(requestViewSync.mock.calls.length).toBeGreaterThan(4)

      unmount()

      await waitFor(() => {
        for (const observer of observers) {
          expect(observer.disconnect).toHaveBeenCalled()
        }
      })

      expect(handlers.resize).toBeDefined()
      expect(handlers.orientationchange).toBeDefined()
      expect(addListener).toHaveBeenCalledWith('resize', handlers.resize)
      expect(addListener).toHaveBeenCalledWith('orientationchange', handlers.orientationchange)
      expect(removeListener).toHaveBeenCalledWith('resize', handlers.resize)
      expect(removeListener).toHaveBeenCalledWith('orientationchange', handlers.orientationchange)
    } finally {
      addListener.mockRestore()
      removeListener.mockRestore()
      ;(globalThis as typeof globalThis & { ResizeObserver?: unknown }).ResizeObserver =
        originalResizeObserver
    }
  })

  it('skips optional element observers when ResizeObserver is unavailable', () => {
    const requestViewSync = vi.fn()
    const originalResizeObserver = (globalThis as typeof globalThis & { ResizeObserver?: unknown })
      .ResizeObserver

    ;(globalThis as typeof globalThis & { ResizeObserver?: unknown }).ResizeObserver = undefined

    try {
      render(
        <MeasurementBridge
          container={document.createElement('div')}
          highlighter={document.createElement('div')}
          input={null}
          suggestions={document.createElement('div')}
          requestViewSync={requestViewSync}
        />
      )

      expect(requestViewSync).toHaveBeenCalledTimes(1)
      expect(requestViewSync).toHaveBeenCalledWith({
        syncScroll: true,
        measureSuggestions: true,
        measureInline: true,
      })
    } finally {
      ;(globalThis as typeof globalThis & { ResizeObserver?: unknown }).ResizeObserver =
        originalResizeObserver
    }
  })

  it('skips viewport listener registration when no owner or global window is available', () => {
    const requestViewSync = vi.fn()
    const addListener = vi.spyOn(globalThis, 'addEventListener')
    const originalReflectGet = Reflect.get
    const reflectGetSpy = vi
      .spyOn(Reflect, 'get')
      .mockImplementation((target: object, propertyKey: PropertyKey, receiver?: unknown) => {
        if (target === globalThis && propertyKey === 'window') {
          return undefined
        }

        if (target === null || target === undefined) {
          return undefined
        }

        return receiver === undefined
          ? originalReflectGet(target, propertyKey)
          : originalReflectGet(target, propertyKey, receiver)
      })

    try {
      render(
        <MeasurementBridge
          container={null}
          highlighter={null}
          input={null}
          suggestions={null}
          requestViewSync={requestViewSync}
        />
      )

      expect(requestViewSync).toHaveBeenCalledWith({
        syncScroll: true,
        measureSuggestions: true,
        measureInline: true,
      })
      expect(addListener).not.toHaveBeenCalledWith('resize', expect.any(Function))
      expect(addListener).not.toHaveBeenCalledWith('orientationchange', expect.any(Function))
    } finally {
      addListener.mockRestore()
      reflectGetSpy.mockRestore()
    }
  })
})
