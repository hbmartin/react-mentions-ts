import React, { useEffect, useRef } from 'react'
import { act, render } from '@testing-library/react'
import { useEventCallback } from './useEventCallback'

describe('useEventCallback', () => {
  it('always calls the latest handler without changing the callback identity', () => {
    const calls: string[] = []
    const callbackRef: { current: (() => void) | null } = { current: null }

    const Holder = ({ label }: { label: string }) => {
      const handlerRef = useRef(label)
      handlerRef.current = label

      const callback = useEventCallback(() => {
        calls.push(handlerRef.current)
      })

      useEffect(() => {
        callbackRef.current = callback
      }, [callback])

      return null
    }

    const { rerender } = render(<Holder label="first" />)

    act(() => {
      callbackRef.current?.()
    })

    rerender(<Holder label="second" />)

    act(() => {
      callbackRef.current?.()
    })

    expect(calls).toEqual(['first', 'second'])
  })
})
