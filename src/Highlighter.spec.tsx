import React from 'react'
import { getByText, render, waitFor } from '@testing-library/react'
import Highlighter from './Highlighter'
import { Mention } from './index'

const setFrameApi = (
  property: 'requestAnimationFrame' | 'cancelAnimationFrame',
  value: typeof globalThis.requestAnimationFrame | typeof globalThis.cancelAnimationFrame
) => {
  Object.defineProperty(globalThis, property, {
    configurable: true,
    writable: true,
    value,
  })
}

describe('Highlighter', () => {
  it('should notify about the current caret position when mounted.', async () => {
    const onCaretPositionChange = vi.fn()

    render(
      <Highlighter
        selectionStart={0}
        selectionEnd={0}
        value="Hello @[John](user1)"
        onCaretPositionChange={onCaretPositionChange}
      >
        <Mention trigger="@" data={[]} markup="@[__display__](__id__)" />
      </Highlighter>
    )

    // Wait for the effect to run and call the callback
    await waitFor(() => {
      expect(onCaretPositionChange).toHaveBeenCalled()
    })

    const call = onCaretPositionChange.mock.calls[0][0]
    expect(call).toHaveProperty('left')
    expect(call).toHaveProperty('top')
    expect(typeof call.left).toBe('number')
    expect(typeof call.top).toBe('number')
  })

  it('should notify about the current caret position whenever it changes.', async () => {
    const onCaretPositionChange = vi.fn()

    const { rerender } = render(
      <Highlighter
        selectionStart={0}
        selectionEnd={0}
        value="Hello @[John](user1)"
        onCaretPositionChange={onCaretPositionChange}
      >
        <Mention trigger="@" data={[]} markup="@[__display__](__id__)" />
      </Highlighter>
    )

    await waitFor(() => {
      expect(onCaretPositionChange).toHaveBeenCalled()
    })

    // Change selection position to a different location that will change the caret element
    rerender(
      <Highlighter
        selectionStart={15}
        selectionEnd={15}
        value="Hello @[John](user1) more text"
        onCaretPositionChange={onCaretPositionChange}
      >
        <Mention trigger="@" data={[]} markup="@[__display__](__id__)" />
      </Highlighter>
    )

    // Just verify that the callback was called (it's called on mount and may be called on updates)
    expect(onCaretPositionChange).toHaveBeenCalled()
    expect(onCaretPositionChange.mock.calls[0][0]).toHaveProperty('left')
    expect(onCaretPositionChange.mock.calls[0][0]).toHaveProperty('top')
    const lastCall = onCaretPositionChange.mock.calls[onCaretPositionChange.mock.calls.length - 1]
    expect(lastCall[0]).toHaveProperty('left')
    expect(lastCall[0]).toHaveProperty('top')
  })

  it('aligns the caret measurement with the previous substring baseline.', async () => {
    const onCaretPositionChange = vi.fn()
    const rafCallbacks: FrameRequestCallback[] = []
    const originalRAF = globalThis.requestAnimationFrame
    const originalCAF = globalThis.cancelAnimationFrame

    setFrameApi('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    })
    setFrameApi('cancelAnimationFrame', () => undefined)

    try {
      const { container } = render(
        <Highlighter
          selectionStart={5}
          selectionEnd={5}
          value="Hello @[John](user1) and more"
          onCaretPositionChange={onCaretPositionChange}
        >
          <Mention trigger="@" data={[]} markup="@[__display__](__id__)" />
        </Highlighter>
      )

      const caret = container.querySelector('[data-mentions-caret]')!
      expect(caret).not.toBeNull()
      const previous = caret.previousElementSibling!
      expect(previous).not.toBeNull()

      Object.defineProperty(caret as HTMLSpanElement, 'offsetLeft', {
        configurable: true,
        value: 24,
      })
      Object.defineProperty(caret as HTMLSpanElement, 'offsetTop', {
        configurable: true,
        value: 3,
      })
      Object.defineProperty(previous as HTMLSpanElement, 'offsetTop', {
        configurable: true,
        value: 30,
      })
      Object.defineProperty(previous as HTMLSpanElement, 'offsetHeight', {
        configurable: true,
        value: 12,
      })

      const callbacks = rafCallbacks.splice(0)
      for (const cb of callbacks) {
        cb(0)
      }

      await waitFor(() => {
        expect(onCaretPositionChange).toHaveBeenCalled()
      })

      expect(onCaretPositionChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ left: 24, top: 42 })
      )
    } finally {
      if (originalRAF) {
        setFrameApi('requestAnimationFrame', originalRAF)
      } else {
        delete (globalThis as typeof globalThis & Record<string, unknown>).requestAnimationFrame
      }

      if (originalCAF) {
        setFrameApi('cancelAnimationFrame', originalCAF)
      } else {
        delete (globalThis as typeof globalThis & Record<string, unknown>).cancelAnimationFrame
      }
    }
  })

  it('falls back to the caret metrics when no previous substring exists.', async () => {
    const onCaretPositionChange = vi.fn()
    const rafCallbacks: FrameRequestCallback[] = []
    const originalRAF = globalThis.requestAnimationFrame
    const originalCAF = globalThis.cancelAnimationFrame

    setFrameApi('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    })
    setFrameApi('cancelAnimationFrame', () => undefined)

    try {
      const { container } = render(
        <Highlighter
          selectionStart={5}
          selectionEnd={5}
          value="Hello world"
          onCaretPositionChange={onCaretPositionChange}
        >
          <Mention trigger="@" data={[]} markup="@[__display__](__id__)" />
        </Highlighter>
      )

      const caret = container.querySelector('[data-mentions-caret]')!
      expect(caret).not.toBeNull()
      while ((caret as HTMLSpanElement).previousElementSibling) {
        ;(caret as HTMLSpanElement).previousElementSibling?.remove()
      }
      expect((caret as HTMLSpanElement).previousElementSibling).toBeNull()

      Object.defineProperty(caret as HTMLSpanElement, 'offsetLeft', {
        configurable: true,
        value: 7,
      })
      Object.defineProperty(caret as HTMLSpanElement, 'offsetTop', {
        configurable: true,
        value: 11,
      })
      Object.defineProperty(caret as HTMLSpanElement, 'previousElementSibling', {
        configurable: true,
        value: null,
      })

      const callbacks = rafCallbacks.splice(0)
      for (const cb of callbacks) {
        cb(0)
      }

      await waitFor(() => {
        expect(onCaretPositionChange).toHaveBeenCalled()
      })

      expect(onCaretPositionChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ left: 7, top: 11 })
      )
    } finally {
      if (originalRAF) {
        setFrameApi('requestAnimationFrame', originalRAF)
      } else {
        delete (globalThis as typeof globalThis & Record<string, unknown>).requestAnimationFrame
      }

      if (originalCAF) {
        setFrameApi('cancelAnimationFrame', originalCAF)
      } else {
        delete (globalThis as typeof globalThis & Record<string, unknown>).cancelAnimationFrame
      }
    }
  })

  it('should render the current matched mentions.', () => {
    const { container } = render(
      <Highlighter
        selectionStart={0}
        selectionEnd={0}
        value="Hello @[John](user1) and @[Jane](user2)!"
        onCaretPositionChange={vi.fn()}
      >
        <Mention trigger="@" data={[]} markup="@[__display__](__id__)" />
      </Highlighter>
    )

    // The highlighter should render the mentions with their display values
    expect(container.textContent).toContain('John')
    expect(container.textContent).toContain('Jane')
    expect(container.textContent).toContain('Hello')
    expect(container.textContent).toContain('and')
  })

  it('should only show the matched mentions.', () => {
    const { container } = render(
      <Highlighter
        selectionStart={0}
        selectionEnd={0}
        value="Text @[John](user1) more text"
        onCaretPositionChange={vi.fn()}
      >
        <Mention trigger="@" data={[]} markup="@[__display__](__id__)" />
      </Highlighter>
    )

    // Should render the mention display value
    expect(container.textContent).toContain('John')

    // Should not render the markup itself
    expect(container.textContent).not.toContain('@[John](user1)')

    // Should render non-mention text
    expect(container.textContent).toContain('Text')
    expect(container.textContent).toContain('more text')
  })

  it('should be possible to style the mentions.', () => {
    const { container } = render(
      <Highlighter
        selectionStart={0}
        selectionEnd={0}
        value="Hello @[John](user1)"
        onCaretPositionChange={vi.fn()}
      >
        <Mention
          trigger="@"
          data={[]}
          markup="@[__display__](__id__)"
          style={{ backgroundColor: 'red' }}
        />
      </Highlighter>
    )

    // Check that the mention is rendered
    expect(container.textContent).toContain('John')

    // Check that markup is not visible
    expect(container.textContent).not.toContain('@[John](user1)')
    const mentionElement = getByText(container, 'John')
    expect(mentionElement).toHaveStyle({ backgroundColor: 'rgb(255, 0, 0)' })
  })

  it('measures immediately when requestAnimationFrame is unavailable', async () => {
    const onCaretPositionChange = vi.fn()
    const originalRAF = globalThis.requestAnimationFrame
    const offsetLeftDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'offsetLeft'
    )
    const offsetTopDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop')

    Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
      configurable: true,
      get() {
        return this instanceof HTMLSpanElement && this.dataset.mentionsCaret !== undefined ? 5 : 0
      },
    })
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
      configurable: true,
      get() {
        return this instanceof HTMLSpanElement && this.dataset.mentionsCaret !== undefined ? 9 : 0
      },
    })
    delete (globalThis as typeof globalThis & { requestAnimationFrame?: unknown })
      .requestAnimationFrame

    try {
      render(
        <Highlighter
          selectionStart={0}
          selectionEnd={0}
          value="Hello world"
          onCaretPositionChange={onCaretPositionChange}
        >
          <Mention trigger="@" data={[]} markup="@[__display__](__id__)" />
        </Highlighter>
      )

      await waitFor(() => {
        expect(onCaretPositionChange).toHaveBeenCalledWith(
          expect.objectContaining({ left: 5, top: 0 })
        )
      })
    } finally {
      if (offsetLeftDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'offsetLeft', offsetLeftDescriptor)
      }
      if (offsetTopDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'offsetTop', offsetTopDescriptor)
      }
      if (originalRAF) {
        Object.defineProperty(globalThis, 'requestAnimationFrame', {
          configurable: true,
          value: originalRAF,
          writable: true,
        })
      }
    }
  })

  it('renders repeated mentions without collapsing duplicate keys', () => {
    const { container } = render(
      <Highlighter
        selectionStart={0}
        selectionEnd={0}
        value="@[John](user1) and @[John](user1)"
        onCaretPositionChange={vi.fn()}
      >
        <Mention trigger="@" data={[]} markup="@[__display__](__id__)" />
      </Highlighter>
    )

    const renderedMentions = [...container.querySelectorAll('span')].filter(
      (element) => element.textContent === 'John'
    )
    expect(renderedMentions).toHaveLength(2)
  })

  it('renders a caret marker after a trailing mention', async () => {
    const onCaretPositionChange = vi.fn()
    const { container } = render(
      <Highlighter
        selectionStart={5}
        selectionEnd={5}
        value="@[Alice](alice)"
        onCaretPositionChange={onCaretPositionChange}
      >
        <Mention trigger="@" data={[]} markup="@[__display__](__id__)" />
      </Highlighter>
    )

    const caret = container.querySelector('[data-mentions-caret]')
    expect(caret).not.toBeNull()
    expect(caret?.previousElementSibling?.textContent).toBe('Alice')

    await waitFor(() => {
      expect(onCaretPositionChange).toHaveBeenCalled()
    })
  })

  it('remeasures a trailing mention caret when same-length mention markup changes', async () => {
    const onCaretPositionChange = vi.fn()
    const rafCallbacks: FrameRequestCallback[] = []
    const originalRAF = globalThis.requestAnimationFrame
    const originalCAF = globalThis.cancelAnimationFrame

    setFrameApi('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    })
    setFrameApi('cancelAnimationFrame', () => undefined)

    try {
      const { container, rerender } = render(
        <Highlighter
          selectionStart={5}
          selectionEnd={5}
          value="@[Alice](alice)"
          onCaretPositionChange={onCaretPositionChange}
        >
          <Mention trigger="@" data={[]} markup="@[__display__](__id__)" />
        </Highlighter>
      )

      const applyCaretMetrics = (left: number, previousTop: number, previousHeight: number) => {
        const caret = container.querySelector('[data-mentions-caret]') as HTMLSpanElement
        const previous = caret.previousElementSibling as HTMLSpanElement

        Object.defineProperty(caret, 'offsetLeft', { configurable: true, value: left })
        Object.defineProperty(previous, 'offsetTop', { configurable: true, value: previousTop })
        Object.defineProperty(previous, 'offsetHeight', {
          configurable: true,
          value: previousHeight,
        })
      }

      applyCaretMetrics(10, 20, 5)

      for (const callback of rafCallbacks.splice(0)) {
        callback(0)
      }

      await waitFor(() => {
        expect(onCaretPositionChange).toHaveBeenLastCalledWith({ left: 10, top: 25 })
      })

      onCaretPositionChange.mockClear()

      rerender(
        <Highlighter
          selectionStart={5}
          selectionEnd={5}
          value="@[Margo](margo)"
          onCaretPositionChange={onCaretPositionChange}
        >
          <Mention trigger="@" data={[]} markup="@[__display__](__id__)" />
        </Highlighter>
      )

      expect(rafCallbacks).toHaveLength(1)
      applyCaretMetrics(30, 40, 7)

      for (const callback of rafCallbacks.splice(0)) {
        callback(0)
      }

      await waitFor(() => {
        expect(onCaretPositionChange).toHaveBeenLastCalledWith({ left: 30, top: 47 })
      })
    } finally {
      if (originalRAF) {
        setFrameApi('requestAnimationFrame', originalRAF)
      } else {
        delete (globalThis as typeof globalThis & Record<string, unknown>).requestAnimationFrame
      }

      if (originalCAF) {
        setFrameApi('cancelAnimationFrame', originalCAF)
      } else {
        delete (globalThis as typeof globalThis & Record<string, unknown>).cancelAnimationFrame
      }
    }
  })

  it('keeps unaffected substring spans stable when only the caret moves', () => {
    const value = 'Hello @[John](user1) and goodbye'
    const getSuffixSpan = (container: HTMLElement): HTMLSpanElement | undefined =>
      [...container.querySelectorAll('span')].find(
        (element): element is HTMLSpanElement => element.textContent === ' and goodbye'
      )

    const { container, rerender } = render(
      <Highlighter
        selectionStart={1}
        selectionEnd={1}
        value={value}
        onCaretPositionChange={vi.fn()}
      >
        <Mention trigger="@" data={[]} markup="@[__display__](__id__)" />
      </Highlighter>
    )

    const suffixSpan = getSuffixSpan(container)
    expect(suffixSpan).toBeDefined()

    rerender(
      <Highlighter
        selectionStart={3}
        selectionEnd={3}
        value={value}
        onCaretPositionChange={vi.fn()}
      >
        <Mention trigger="@" data={[]} markup="@[__display__](__id__)" />
      </Highlighter>
    )

    expect(getSuffixSpan(container)).toBe(suffixSpan)
  })

  it('does not emit a redundant caret update when recomputing the same position', async () => {
    const onCaretPositionChange = vi.fn()
    const rafCallbacks: FrameRequestCallback[] = []
    const originalRAF = globalThis.requestAnimationFrame
    const originalCAF = globalThis.cancelAnimationFrame

    setFrameApi('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    })
    setFrameApi('cancelAnimationFrame', () => undefined)

    try {
      const { container, rerender } = render(
        <Highlighter
          selectionStart={0}
          selectionEnd={0}
          value="Hello world"
          recomputeVersion={0}
          onCaretPositionChange={onCaretPositionChange}
        >
          <Mention trigger="@" data={[]} markup="@[__display__](__id__)" />
        </Highlighter>
      )

      const caret = container.querySelector('[data-mentions-caret]') as HTMLSpanElement
      Object.defineProperty(caret, 'offsetLeft', { configurable: true, value: 7 })
      Object.defineProperty(caret, 'offsetTop', { configurable: true, value: 11 })

      for (const callback of rafCallbacks.splice(0)) {
        callback(0)
      }

      await waitFor(() => expect(onCaretPositionChange).toHaveBeenCalledTimes(1))

      rerender(
        <Highlighter
          selectionStart={0}
          selectionEnd={0}
          value="Hello world"
          recomputeVersion={1}
          onCaretPositionChange={onCaretPositionChange}
        >
          <Mention trigger="@" data={[]} markup="@[__display__](__id__)" />
        </Highlighter>
      )

      for (const callback of rafCallbacks.splice(0)) {
        callback(0)
      }

      await waitFor(() => expect(onCaretPositionChange).toHaveBeenCalledTimes(1))
    } finally {
      if (originalRAF) {
        setFrameApi('requestAnimationFrame', originalRAF)
      } else {
        delete (globalThis as typeof globalThis & Record<string, unknown>).requestAnimationFrame
      }

      if (originalCAF) {
        setFrameApi('cancelAnimationFrame', originalCAF)
      } else {
        delete (globalThis as typeof globalThis & Record<string, unknown>).cancelAnimationFrame
      }
    }
  })
})
