import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { Mention, MentionsInput } from './core'

const data = [
  { id: 'walter', display: 'Walter White' },
  { id: 'jesse', display: 'Jesse Pinkman' },
]

const srcDir = import.meta.dirname
const localImportPattern =
  // eslint-disable-next-line security/detect-unsafe-regex -- test-only import scanner reads bounded source files.
  /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"](\.{1,2}\/[^'"]+)['"]/g

const resolveSourcePath = (fromFile: string, specifier: string): string | null => {
  const base = resolve(dirname(fromFile), specifier)
  const candidates = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- candidates stay inside the local source graph under test.
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

const collectCoreSourceGraph = (): Set<string> => {
  const visited = new Set<string>()
  const pending = [resolve(srcDir, 'core.ts')]

  while (pending.length > 0) {
    const current = pending.pop()
    if (current === undefined || visited.has(current)) {
      continue
    }

    visited.add(current)
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- source graph traversal only reads discovered repo source files.
    const source = readFileSync(current, 'utf8')

    for (const match of source.matchAll(localImportPattern)) {
      const specifier = match[1]
      if (specifier === undefined) {
        continue
      }

      const resolvedPath = resolveSourcePath(current, specifier)
      if (resolvedPath !== null) {
        pending.push(resolvedPath)
      }
    }
  }

  return visited
}

describe('core entry', () => {
  it('renders functional suggestions without styled Tailwind defaults', async () => {
    const onMentionsChange = vi.fn()

    const { container } = render(
      <MentionsInput value="@" onMentionsChange={onMentionsChange}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    expect(textarea.className).toBe('')
    expect(container.querySelector('[data-slot="highlighter"]')?.className).toBe('')

    fireEvent.focus(textarea)
    textarea.setSelectionRange(1, 1)
    fireEvent.select(textarea)

    await waitFor(() => {
      expect(screen.getAllByRole('option', { hidden: true })).toHaveLength(2)
    })

    const firstOption = screen.getAllByRole('option', { hidden: true })[0]
    expect(firstOption.className).toBe('')

    fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 13 })

    await waitFor(() => {
      expect(onMentionsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: expect.objectContaining({ type: 'mention-add' }),
          mentionId: 'walter',
        })
      )
    })
  })

  it('keeps styled-only helpers out of the core source graph', () => {
    const graph = collectCoreSourceGraph()
    const graphText = [...graph]
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- source graph traversal only reads discovered repo source files.
      .map((file) => `${file}\n${readFileSync(file, 'utf8')}`)
      .join('\n')

    expect(graphText).not.toContain('tailwind-merge')
    expect(graphText).not.toContain('class-variance-authority')
    expect(graphText).not.toContain("from './styles/styled'")
    expect(graphText).not.toContain("from './utils/cn'")
  })
})
