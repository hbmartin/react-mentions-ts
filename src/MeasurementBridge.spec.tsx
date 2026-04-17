import React from 'react'
import { act, render, waitFor } from '@testing-library/react'
import MeasurementBridge from './MeasurementBridge'

describe('MeasurementBridge', () => {
  it('requests view sync from mount, observers, scroll, and viewport listeners, then cleans up', async () => {
    const requestViewSync = jest.fn()
    const container = document.createElement('div')
    const highlighter = document.createElement('div')
    const input = document.createElement('textarea')
    const suggestions = document.createElement('div')

    const originalResizeObserver = (globalThis as typeof globalThis & { ResizeObserver?: unknown })
      .ResizeObserver
    const observers: Array<{
      callback: () => void
      observe: jest.Mock
      disconnect: jest.Mock
    }> = []

    class MockResizeObserver {
      readonly callback: () => void
      readonly observe: jest.Mock
      readonly disconnect: jest.Mock

      constructor(callback: () => void) {
        this.callback = callback
        this.observe = jest.fn()
        this.disconnect = jest.fn()
        observers.push(this)
      }
    }

    ;(globalThis as typeof globalThis & { ResizeObserver?: unknown }).ResizeObserver =
      MockResizeObserver

    const originalAdd = globalThis.addEventListener
    const originalRemove = globalThis.removeEventListener
    const handlers: Partial<Record<string, EventListener>> = {}

    const addListener = jest
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

    const removeListener = jest
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
        observers.forEach((observer) => {
          observer.callback()
        })
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
})
