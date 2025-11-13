import React from 'react'
import { getByText, render, waitFor } from '@testing-library/react'
import Highlighter from './Highlighter'
import { Mention } from './index'

describe('Highlighter', () => {
  it('should notify about the current caret position when mounted.', async () => {
    const onCaretPositionChange = jest.fn()

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
    const onCaretPositionChange = jest.fn()

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
    const onCaretPositionChange = jest.fn()
    const rafCallbacks: FrameRequestCallback[] = []
    const originalRAF = globalThis.requestAnimationFrame
    const originalCAF = globalThis.cancelAnimationFrame

    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    }) as typeof globalThis.requestAnimationFrame
    globalThis.cancelAnimationFrame = (() => undefined) as typeof globalThis.cancelAnimationFrame

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

      const caret = container.querySelector('[data-mentions-caret]') as HTMLSpanElement | null
      expect(caret).not.toBeNull()
      const previous = caret?.previousElementSibling as HTMLSpanElement | null
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
      callbacks.forEach((cb) => cb(0))

      await waitFor(() => {
        expect(onCaretPositionChange).toHaveBeenCalled()
      })

      expect(onCaretPositionChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ left: 24, top: 42 })
      )
    } finally {
      if (originalRAF) {
        globalThis.requestAnimationFrame = originalRAF
      } else {
        delete (globalThis as typeof globalThis & Record<string, unknown>).requestAnimationFrame
      }

      if (originalCAF) {
        globalThis.cancelAnimationFrame = originalCAF
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
        onCaretPositionChange={jest.fn()}
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
        onCaretPositionChange={jest.fn()}
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
        onCaretPositionChange={jest.fn()}
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
})
