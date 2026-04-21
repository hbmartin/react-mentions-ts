import React from 'react'
import { act } from '@testing-library/react'
import { createRoot } from 'react-dom/client'
import { useMentionsDocumentEvents } from './useMentionsDocumentEvents'
import type { InputElement } from './types'

interface DocumentEventsHarnessProps {
  inputElementRef: React.RefObject<InputElement | null>
  onCopy: (event: ClipboardEvent) => void
  onCut: (event: ClipboardEvent) => void
  onPaste: (event: ClipboardEvent) => void
  onSelectionChange: () => void
}

const DocumentEventsHarness = (props: DocumentEventsHarnessProps) => {
  useMentionsDocumentEvents(props)
  return null
}

describe('useMentionsDocumentEvents', () => {
  it('subscribes on the input owner document and cleans up listeners', () => {
    const input = document.createElement('textarea')
    const inputElementRef = { current: input }
    const onCopy = vi.fn()
    const onCut = vi.fn()
    const onPaste = vi.fn()
    const onSelectionChange = vi.fn()
    const addEventListenerSpy = vi.spyOn(input.ownerDocument, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(input.ownerDocument, 'removeEventListener')
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => {
      root.render(
        <DocumentEventsHarness
          inputElementRef={inputElementRef}
          onCopy={onCopy}
          onCut={onCut}
          onPaste={onPaste}
          onSelectionChange={onSelectionChange}
        />
      )
    })

    expect(addEventListenerSpy).toHaveBeenCalledWith('copy', onCopy)
    expect(addEventListenerSpy).toHaveBeenCalledWith('cut', onCut)
    expect(addEventListenerSpy).toHaveBeenCalledWith('paste', onPaste)
    expect(addEventListenerSpy).toHaveBeenCalledWith('selectionchange', onSelectionChange)

    act(() => {
      root.unmount()
    })

    expect(removeEventListenerSpy).toHaveBeenCalledWith('copy', onCopy)
    expect(removeEventListenerSpy).toHaveBeenCalledWith('cut', onCut)
    expect(removeEventListenerSpy).toHaveBeenCalledWith('paste', onPaste)
    expect(removeEventListenerSpy).toHaveBeenCalledWith('selectionchange', onSelectionChange)

    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  it('skips subscription when neither input nor global document is available', () => {
    const originalDocument = globalThis.document
    const inputElementRef = { current: null }
    const container = originalDocument.createElement('div')
    const root = createRoot(container)
    const onCopy = vi.fn()
    const onCut = vi.fn()
    const onPaste = vi.fn()
    const onSelectionChange = vi.fn()

    vi.stubGlobal('document', undefined)

    try {
      act(() => {
        root.render(
          <DocumentEventsHarness
            inputElementRef={inputElementRef}
            onCopy={onCopy}
            onCut={onCut}
            onPaste={onPaste}
            onSelectionChange={onSelectionChange}
          />
        )
      })
    } finally {
      act(() => {
        root.unmount()
      })
      vi.stubGlobal('document', originalDocument)
    }

    expect(onCopy).not.toHaveBeenCalled()
    expect(onCut).not.toHaveBeenCalled()
    expect(onPaste).not.toHaveBeenCalled()
    expect(onSelectionChange).not.toHaveBeenCalled()
  })
})
