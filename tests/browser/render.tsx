import type React from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach } from 'vitest'

interface BrowserRenderResult {
  readonly container: HTMLDivElement
  readonly rerender: (ui: React.ReactNode) => Promise<void>
  readonly unmount: () => Promise<void>
}

const mounted = new Set<() => Promise<void>>()

const renderWithRoot = async (root: Root, ui: React.ReactNode): Promise<void> => {
  flushSync(() => {
    root.render(ui)
  })

  await Promise.resolve()
}

export const renderBrowser = async (ui: React.ReactNode): Promise<BrowserRenderResult> => {
  const container = document.createElement('div')
  document.body.append(container)

  const root = createRoot(container)
  let isMounted = true

  const rerender = async (nextUi: React.ReactNode): Promise<void> => {
    await renderWithRoot(root, nextUi)
  }

  const unmount = async (): Promise<void> => {
    if (!isMounted) {
      return
    }

    isMounted = false
    mounted.delete(unmount)

    flushSync(() => {
      root.unmount()
    })

    container.remove()
  }

  mounted.add(unmount)
  await rerender(ui)

  return {
    container,
    rerender,
    unmount,
  }
}

afterEach(async () => {
  for (const unmount of [...mounted]) {
    await unmount()
  }
})
