import { useEffect } from 'react'
import type React from 'react'
import type { InputElement } from './types'

interface UseMentionsDocumentEventsArgs {
  inputElementRef: React.RefObject<InputElement | null>
  onCopy: (event: ClipboardEvent) => void
  onCut: (event: ClipboardEvent) => void
  onPaste: (event: ClipboardEvent) => void
  onSelectionChange: () => void
}

export const useMentionsDocumentEvents = ({
  inputElementRef,
  onCopy,
  onCut,
  onPaste,
  onSelectionChange,
}: UseMentionsDocumentEventsArgs): void => {
  useEffect(() => {
    const ownerDocument =
      inputElementRef.current?.ownerDocument ??
      (Reflect.get(globalThis, 'document') as Document | undefined)

    if (ownerDocument === undefined) {
      return undefined
    }

    ownerDocument.addEventListener('copy', onCopy)
    ownerDocument.addEventListener('cut', onCut)
    ownerDocument.addEventListener('paste', onPaste)
    ownerDocument.addEventListener('selectionchange', onSelectionChange)

    return () => {
      ownerDocument.removeEventListener('copy', onCopy)
      ownerDocument.removeEventListener('cut', onCut)
      ownerDocument.removeEventListener('paste', onPaste)
      ownerDocument.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [inputElementRef, onCopy, onCut, onPaste, onSelectionChange])
}
