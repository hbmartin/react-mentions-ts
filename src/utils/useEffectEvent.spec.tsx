import React, { useEffect, useRef } from 'react'
import { act, render } from '@testing-library/react'
import { useEffectEvent } from './useEffectEvent'

describe('useEffectEvent', () => {
  it('throws when the callback is invoked before the handler is assigned', () => {
    const ImmediateInvoker = ({ handler }: { handler: () => void }) => {
      const cb = useEffectEvent(handler)
      cb()
      return null
    }

    expect(() =>
      render(<ImmediateInvoker handler={() => undefined} />)
    ).toThrowErrorMatchingInlineSnapshot(
      '"useEffectEvent callback executed before the handler was assigned."'
    )
  })

  it('always calls the latest handler without changing the callback identity', () => {
    const calls: string[] = []
    const callbackRef: { current: (() => void) | null } = { current: null }

    const Holder = ({ label }: { label: string }) => {
      const handlerRef = useRef(label)
      handlerRef.current = label

      const callback = useEffectEvent(() => {
        calls.push(handlerRef.current!)
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
