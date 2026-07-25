import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Mention as CoreMention, MentionsInput as CoreMentionsInput } from './core'
import { Mention, MentionsInput } from './index'
import type { ClassNameJoiner } from './types'

const data = [
  { id: 'walter', display: 'Walter White' },
  { id: 'jesse', display: 'Jesse Pinkman' },
]

const openSuggestions = async (textarea: HTMLElement) => {
  fireEvent.focus(textarea)
  ;(textarea as HTMLTextAreaElement).setSelectionRange(1, 1)
  fireEvent.select(textarea)

  await waitFor(() => {
    expect(screen.getAllByRole('option', { hidden: true })).toHaveLength(2)
  })
}

describe('unstyled mode', () => {
  it('renders no default classes but keeps structural styles and function', async () => {
    const onMentionsChange = vi.fn()

    const { container } = render(
      <MentionsInput unstyled value="@" onMentionsChange={onMentionsChange}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    expect(textarea.className).toBe('')
    expect(textarea).toHaveStyle({ display: 'block', position: 'relative' })

    const highlighter = container.querySelector('[data-slot="highlighter"]')
    expect(highlighter?.className).toBe('')
    expect(highlighter).toHaveStyle({ position: 'absolute', color: 'rgba(0, 0, 0, 0)' })

    await openSuggestions(textarea)
    expect(screen.getAllByRole('option', { hidden: true })[0].className).toBe('')

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

  it('cascades unstyled to Mention chips unless the child opts out', () => {
    const value = 'Hi @[Walter White](walter)!'

    const { container: unstyledContainer } = render(
      <MentionsInput unstyled value={value} onMentionsChange={() => undefined}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )
    const unstyledChip = unstyledContainer.querySelector('[data-slot="mention"]')
    expect(unstyledChip?.className).toBe('')
    expect(unstyledChip).toHaveStyle({ display: 'inline', color: 'rgba(0, 0, 0, 0)' })

    const { container: optOutContainer } = render(
      <MentionsInput unstyled value={value} onMentionsChange={() => undefined}>
        <Mention trigger="@" data={data} unstyled={false} />
      </MentionsInput>
    )
    expect(optOutContainer.querySelector('[data-slot="mention"]')?.className).toBe(
      'rounded-md bg-primary/20'
    )
  })

  it('keeps default classes and cascades them to chips when not unstyled', () => {
    const { container } = render(
      <MentionsInput value="Hi @[Walter White](walter)!" onMentionsChange={() => undefined}>
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    expect(screen.getByRole('combobox').className).not.toBe('')
    expect(container.querySelector('[data-slot="mention"]')?.className).toBe(
      'rounded-md bg-primary/20'
    )
  })

  it('routes every slot merge through a custom mergeClassNames', async () => {
    // Appends a sentinel token so any element styled via the custom merger is observable.
    const merge = vi.fn<ClassNameJoiner>((...classNames) =>
      [...classNames, 'via-custom-merge']
        .filter((className): className is string => typeof className === 'string')
        .join(' ')
        .trim()
    )

    const { unmount } = render(
      <MentionsInput
        value="@"
        onMentionsChange={() => undefined}
        mergeClassNames={merge}
        classNames={{ input: 'my-input', suggestionItem: 'my-item' }}
      >
        <Mention trigger="@" data={data} />
      </MentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    expect(merge).toHaveBeenCalled()
    expect(textarea.className).toContain('my-input')
    expect(textarea.className).toContain('via-custom-merge')

    await openSuggestions(textarea)
    const firstOption = screen.getAllByRole('option', { hidden: true })[0]
    expect(firstOption.className).toContain('my-item')
    expect(firstOption.className).toContain('via-custom-merge')
    unmount()

    const { container } = render(
      <MentionsInput
        value="Hi @[Walter White](walter)!"
        onMentionsChange={() => undefined}
        mergeClassNames={merge}
      >
        <Mention trigger="@" data={data} className="my-chip" />
      </MentionsInput>
    )

    const chip = container.querySelector('[data-slot="mention"]')
    expect(chip?.className).toContain('my-chip')
    expect(chip?.className).toContain('via-custom-merge')
  })
})

describe('core entry', () => {
  it('renders unstyled by default and supports opting back into styling', async () => {
    const { container, unmount } = render(
      <CoreMentionsInput value="@" onMentionsChange={() => undefined}>
        <CoreMention trigger="@" data={data} />
      </CoreMentionsInput>
    )

    const textarea = screen.getByRole('combobox')
    expect(textarea.className).toBe('')
    expect(container.querySelector('[data-slot="highlighter"]')?.className).toBe('')
    await openSuggestions(textarea)
    expect(screen.getAllByRole('option', { hidden: true })[0].className).toBe('')
    unmount()

    render(
      <CoreMentionsInput value="@" onMentionsChange={() => undefined} unstyled={false}>
        <CoreMention trigger="@" data={data} unstyled={false} />
      </CoreMentionsInput>
    )
    expect(screen.getByRole('combobox').className).not.toBe('')
  })
})

describe('styling dependencies', () => {
  it('imports no styling packages anywhere in src', () => {
    const sourceDir = import.meta.dirname
    const offenders: string[] = []

    const visit = (dir: string): void => {
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- traversal stays inside the repo's src directory.
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          visit(fullPath)
          continue
        }

        if (!/\.(?:ts|tsx)$/.test(entry.name) || entry.name.endsWith('.spec.tsx')) {
          continue
        }

        // eslint-disable-next-line security/detect-non-literal-fs-filename -- reads only discovered repo source files.
        const source = readFileSync(fullPath, 'utf8')
        // The `from` matcher covers static imports and export-from re-exports alike.
        if (
          /from\s+['"](?:clsx|tailwind-merge|class-variance-authority)['"]/.test(source) ||
          /require\(\s*['"](?:clsx|tailwind-merge|class-variance-authority)['"]\s*\)/.test(
            source
          ) ||
          /import\(\s*['"](?:clsx|tailwind-merge|class-variance-authority)['"]\s*\)/.test(source)
        ) {
          offenders.push(fullPath)
        }
      }
    }

    visit(sourceDir)
    expect(offenders).toEqual([])
  })
})
