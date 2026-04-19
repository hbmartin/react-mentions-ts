import React, { useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import MentionsInput from './MentionsInput'
import Mention from './Mention'
import * as mentionsInputChildren from './MentionsInputChildren'
import * as mentionsInputDerived from './MentionsInputDerived'
import * as mentionsInputEditing from './MentionsInputEditing'
import * as mentionsInputLayout from './MentionsInputLayout'
import * as applyChangeToValueModule from './utils/applyChangeToValue'
import * as getPlainTextModule from './utils/getPlainText'
import * as mapPlainTextIndexModule from './utils/mapPlainTextIndex'
import { createRenderCounter, emitPerformanceMetric } from './test/performance'
import type { MentionsInputChangeHandler } from './types'

const mentionData = [
  { id: 'alice', display: 'Alice' },
  { id: 'albert', display: 'Albert' },
  { id: 'bob', display: 'Bob' },
]

const hashMentionData = [{ id: 'alpha-tag', display: 'Alpha Tag' }]

const longDocumentDisplays = Array.from({ length: 40 }, (_, index) => `Person ${index.toString()}`)
const longDocumentMarkupValue = `${longDocumentDisplays
  .map((display, index) => `@[${display}](person-${index.toString()})`)
  .join(' ')} @`
const longDocumentPlainTextValue = `${longDocumentDisplays.join(' ')} @`

type TextControl = HTMLInputElement | HTMLTextAreaElement

type ControlledMentionsInputProps = Readonly<{
  initialValue?: string
  suggestionsDisplay?: 'overlay' | 'inline'
  onMentionsChange?: MentionsInputChangeHandler
}>

function ControlledMentionsInput({
  initialValue,
  suggestionsDisplay,
  onMentionsChange,
}: ControlledMentionsInputProps) {
  const [value, setValue] = useState(initialValue ?? '')

  return (
    <MentionsInput
      value={value}
      suggestionsDisplay={suggestionsDisplay}
      onMentionsChange={(change) => {
        setValue(change.value)
        onMentionsChange?.(change)
      }}
    >
      <Mention trigger="@" data={mentionData} />
    </MentionsInput>
  )
}

const focusControlAt = (control: TextControl, position: number): void => {
  fireEvent.focus(control)
  control.setSelectionRange(position, position)
  fireEvent.select(control)
}

const flushMicrotasks = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('MentionsInput performance', () => {
  it('reports controlled keystroke work counts', async () => {
    const getPlainTextSpy = vi.spyOn(getPlainTextModule, 'default')
    const deriveSnapshotSpy = vi.spyOn(mentionsInputDerived, 'deriveMentionValueSnapshot')
    const prepareChildrenSpy = vi.spyOn(mentionsInputChildren, 'prepareMentionsInputChildren')

    render(<ControlledMentionsInput initialValue="@" />)

    getPlainTextSpy.mockClear()
    deriveSnapshotSpy.mockClear()
    prepareChildrenSpy.mockClear()

    const combobox = screen.getByRole('combobox')
    fireEvent.focus(combobox)
    combobox.setSelectionRange(1, 1)
    fireEvent.select(combobox)
    fireEvent.change(combobox, { target: { value: '@a' } })

    await waitFor(() => {
      expect(combobox).toHaveValue('@a')
    })

    const metrics = {
      getPlainTextCalls: getPlainTextSpy.mock.calls.length,
      deriveMentionValueSnapshotCalls: deriveSnapshotSpy.mock.calls.length,
      prepareMentionsInputChildrenCalls: prepareChildrenSpy.mock.calls.length,
    }
    emitPerformanceMetric('controlled-keystroke', metrics)

    expect(metrics.getPlainTextCalls).toBeLessThanOrEqual(2)
    expect(metrics.deriveMentionValueSnapshotCalls).toBeLessThanOrEqual(1)
    expect(metrics.prepareMentionsInputChildrenCalls).toBeLessThanOrEqual(1)
  })

  it('reports selection-only snapshot derivation count', async () => {
    const deriveSnapshotSpy = vi.spyOn(mentionsInputDerived, 'deriveMentionValueSnapshot')

    render(<ControlledMentionsInput initialValue="@a" />)

    const combobox = screen.getByRole('combobox')
    fireEvent.focus(combobox)
    combobox.setSelectionRange(2, 2)
    fireEvent.select(combobox)

    await waitFor(() => {
      expect(combobox).toHaveValue('@a')
    })

    deriveSnapshotSpy.mockClear()

    combobox.setSelectionRange(1, 1)
    fireEvent.select(combobox)

    await waitFor(() => {
      expect(combobox.selectionStart).toBe(1)
    })

    const metrics = {
      deriveMentionValueSnapshotCalls: deriveSnapshotSpy.mock.calls.length,
    }
    emitPerformanceMetric('selection-only', metrics)

    expect(metrics.deriveMentionValueSnapshotCalls).toBe(0)
  })

  it('reports layout measurement counts for inline autocomplete interactions', async () => {
    const overlayPositionSpy = vi.spyOn(mentionsInputLayout, 'calculateSuggestionsPosition')
    const inlinePositionSpy = vi.spyOn(mentionsInputLayout, 'calculateInlineSuggestionPosition')

    render(<ControlledMentionsInput initialValue="@a" suggestionsDisplay="inline" />)

    overlayPositionSpy.mockClear()
    inlinePositionSpy.mockClear()

    const combobox = screen.getByRole('combobox')
    fireEvent.focus(combobox)
    combobox.setSelectionRange(2, 2)
    fireEvent.select(combobox)

    await waitFor(() => {
      expect(combobox.selectionStart).toBe(2)
    })

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Alice')
    })

    fireEvent.keyDown(combobox, { key: 'ArrowRight' })

    await waitFor(() => {
      expect(combobox).toHaveValue('Alice')
    })

    const metrics = {
      calculateSuggestionsPositionCalls: overlayPositionSpy.mock.calls.length,
      calculateInlineSuggestionPositionCalls: inlinePositionSpy.mock.calls.length,
    }
    emitPerformanceMetric('inline-layout', metrics)

    expect(metrics.calculateSuggestionsPositionCalls).toBe(0)
    expect(metrics.calculateInlineSuggestionPositionCalls).toBeLessThanOrEqual(1)
  })

  it('reports layout measurement counts for overlay interactions', async () => {
    const overlayPositionSpy = vi.spyOn(mentionsInputLayout, 'calculateSuggestionsPosition')
    const inlinePositionSpy = vi.spyOn(mentionsInputLayout, 'calculateInlineSuggestionPosition')

    render(<ControlledMentionsInput initialValue="@a" suggestionsDisplay="overlay" />)

    overlayPositionSpy.mockClear()
    inlinePositionSpy.mockClear()

    const combobox = screen.getByRole('combobox')
    fireEvent.focus(combobox)
    combobox.setSelectionRange(2, 2)
    fireEvent.select(combobox)

    await waitFor(() => {
      const options = screen.getAllByRole('option', { hidden: true })
      expect(options.length).toBeGreaterThan(0)
    })

    fireEvent.keyDown(combobox, { key: 'ArrowDown' })

    const metrics = {
      calculateSuggestionsPositionCalls: overlayPositionSpy.mock.calls.length,
      calculateInlineSuggestionPositionCalls: inlinePositionSpy.mock.calls.length,
    }
    emitPerformanceMetric('overlay-layout', metrics)

    expect(metrics.calculateSuggestionsPositionCalls).toBeLessThanOrEqual(2)
    expect(metrics.calculateInlineSuggestionPositionCalls).toBe(0)
  })

  it('reports stable-sibling render counts in a locality fixture', async () => {
    const counter = createRenderCounter()

    function StableSibling() {
      return (
        <counter.Probe label="stable-sibling">
          <div>Stable sibling</div>
        </counter.Probe>
      )
    }

    function ActiveBranch() {
      const [value, setValue] = useState('@')

      return (
        <counter.Probe label="active-branch">
          <MentionsInput
            value={value}
            onMentionsChange={({ value: nextValue }) => setValue(nextValue)}
          >
            <Mention trigger="@" data={mentionData} />
          </MentionsInput>
        </counter.Probe>
      )
    }

    render(
      <div>
        <StableSibling />
        <ActiveBranch />
      </div>
    )

    const initialStableCount = counter.getCount('stable-sibling')
    const initialActiveCount = counter.getCount('active-branch')

    const combobox = screen.getByRole('combobox')
    fireEvent.focus(combobox)
    combobox.setSelectionRange(1, 1)
    fireEvent.select(combobox)
    fireEvent.change(combobox, { target: { value: '@a' } })

    await waitFor(() => {
      expect(combobox).toHaveValue('@a')
    })

    const metrics = {
      stableSiblingRendersDuringInteraction:
        counter.getCount('stable-sibling') - initialStableCount,
      activeBranchRendersDuringInteraction: counter.getCount('active-branch') - initialActiveCount,
    }
    emitPerformanceMetric('locality-render-counts', metrics)

    expect(metrics.stableSiblingRendersDuringInteraction).toBe(0)
    expect(metrics.activeBranchRendersDuringInteraction).toBeLessThanOrEqual(1)
  })

  it('reports debounced async provider collapse counts', async () => {
    vi.useFakeTimers()

    try {
      const asyncData = vi.fn(async () => [{ id: 'alice', display: 'Alice' }])
      function DebouncedAsyncWrapper() {
        const [value, setValue] = useState('@')

        return (
          <MentionsInput
            value={value}
            onMentionsChange={({ value: nextValue }) => setValue(nextValue)}
          >
            <Mention trigger="@" data={asyncData} debounceMs={200} />
          </MentionsInput>
        )
      }

      render(<DebouncedAsyncWrapper />)

      const combobox = screen.getByRole('combobox')
      focusControlAt(combobox, 1)

      fireEvent.change(combobox, {
        target: { value: '@a', selectionStart: 2, selectionEnd: 2 },
      })
      fireEvent.change(combobox, {
        target: { value: '@al', selectionStart: 3, selectionEnd: 3 },
      })
      fireEvent.change(combobox, {
        target: { value: '@ali', selectionStart: 4, selectionEnd: 4 },
      })

      expect(asyncData).not.toHaveBeenCalled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(200)
      })
      await flushMicrotasks()

      const metrics = {
        providerCalls: asyncData.mock.calls.length,
      }
      emitPerformanceMetric('debounced-async-query', metrics)

      expect(asyncData).toHaveBeenCalledWith(
        'ali',
        expect.objectContaining({ signal: expect.any(Object) })
      )
      expect(metrics.providerCalls).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('reports stale async result suppression counts', async () => {
    interface DeferredRequest {
      resolve: (value: Array<{ id: string; display: string }>) => void
      signal: AbortSignal
    }

    const requests = new Map<string, DeferredRequest>()
    const asyncData = vi.fn(
      (query: string, { signal }: { signal: AbortSignal }) =>
        new Promise<Array<{ id: string; display: string }>>((resolve) => {
          requests.set(query, { resolve, signal })
        })
    )
    const ref = React.createRef<any>()
    const { rerender } = render(
      <MentionsInput ref={ref} value="@a">
        <Mention trigger="@" data={asyncData} />
      </MentionsInput>
    )

    const combobox = screen.getByRole('combobox')
    focusControlAt(combobox, 2)

    await waitFor(() => {
      expect(asyncData).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    })

    rerender(
      <MentionsInput ref={ref} value="@ab">
        <Mention trigger="@" data={asyncData} />
      </MentionsInput>
    )
    focusControlAt(combobox, 3)

    await waitFor(() => {
      expect(asyncData).toHaveBeenCalledWith(
        'ab',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    })

    const firstRequest = requests.get('a')
    const secondRequest = requests.get('ab')
    if (!firstRequest || !secondRequest) {
      throw new Error('Expected both async requests to be captured')
    }

    expect(firstRequest.signal.aborted).toBe(true)
    expect(secondRequest.signal.aborted).toBe(false)

    const instance = ref.current as { replaceSuggestions: (...args: unknown[]) => void }
    const replaceSuggestionsSpy = vi.spyOn(instance, 'replaceSuggestions')

    firstRequest.resolve([{ id: 'alice', display: 'Alice' }])
    await flushMicrotasks()

    const staleResultApplications = replaceSuggestionsSpy.mock.calls.length

    secondRequest.resolve([{ id: 'albert', display: 'Albert' }])

    await waitFor(() => {
      expect(replaceSuggestionsSpy.mock.calls.length).toBeGreaterThan(staleResultApplications)
    })

    const freshResultApplications =
      replaceSuggestionsSpy.mock.calls.length - staleResultApplications
    const metrics = {
      staleResultApplications,
      freshResultApplications,
    }
    emitPerformanceMetric('stale-async-result', metrics)

    expect(metrics.staleResultApplications).toBe(0)
    expect(metrics.freshResultApplications).toBe(1)

    replaceSuggestionsSpy.mockRestore()
  })

  it('reports long-document caret mapping counts', async () => {
    const deriveSnapshotSpy = vi.spyOn(mentionsInputDerived, 'deriveMentionValueSnapshot')
    const mapPlainTextIndexSpy = vi.spyOn(mapPlainTextIndexModule, 'default')

    render(<ControlledMentionsInput initialValue={longDocumentMarkupValue} />)

    const combobox = screen.getByRole('combobox')

    deriveSnapshotSpy.mockClear()
    mapPlainTextIndexSpy.mockClear()

    focusControlAt(combobox, longDocumentPlainTextValue.length)
    fireEvent.change(combobox, {
      target: {
        value: `${longDocumentPlainTextValue}a`,
      },
    })

    await waitFor(() => {
      expect(combobox).toHaveValue(`${longDocumentPlainTextValue}a`)
    })

    const metrics = {
      mapPlainTextIndexCalls: mapPlainTextIndexSpy.mock.calls.length,
      deriveMentionValueSnapshotCalls: deriveSnapshotSpy.mock.calls.length,
    }
    emitPerformanceMetric('long-document-caret-mapping', metrics)

    expect(metrics.mapPlainTextIndexCalls).toBeLessThanOrEqual(14)
    expect(metrics.deriveMentionValueSnapshotCalls).toBeLessThanOrEqual(1)
  })

  it('reports paste replacement helper counts over mentions', async () => {
    const applyPasteSpy = vi.spyOn(mentionsInputEditing, 'applyPasteToMentionsValue')
    const getPlainTextSpy = vi.spyOn(getPlainTextModule, 'default')
    const mapPlainTextIndexSpy = vi.spyOn(mapPlainTextIndexModule, 'default')
    const onMentionsChange = vi.fn()

    render(
      <MentionsInput value="@[Alice](alice)!" onMentionsChange={onMentionsChange}>
        <Mention trigger="@" data={mentionData} />
      </MentionsInput>
    )

    const combobox = screen.getByRole('combobox')

    applyPasteSpy.mockClear()
    getPlainTextSpy.mockClear()
    mapPlainTextIndexSpy.mockClear()

    fireEvent.focus(combobox)
    combobox.setSelectionRange(0, 'Alice'.length)
    fireEvent.select(combobox, {
      target: { selectionStart: 0, selectionEnd: 'Alice'.length },
    })

    const event = new Event('paste', { bubbles: true })
    event.clipboardData = {
      getData: vi.fn((type) => (type === 'text/plain' ? 'Replacement' : '')),
    }

    fireEvent(combobox, event)

    await waitFor(() => {
      expect(onMentionsChange).toHaveBeenCalledTimes(1)
    })

    const metrics = {
      applyPasteToMentionsValueCalls: applyPasteSpy.mock.calls.length,
      mapPlainTextIndexCalls: mapPlainTextIndexSpy.mock.calls.length,
      getPlainTextCalls: getPlainTextSpy.mock.calls.length,
    }
    emitPerformanceMetric('paste-replace-mention', metrics)

    expect(metrics.applyPasteToMentionsValueCalls).toBe(1)
    expect(metrics.mapPlainTextIndexCalls).toBeLessThanOrEqual(10)
    expect(metrics.getPlainTextCalls).toBeLessThanOrEqual(1)
  })

  it('reports delete-path helper counts around mentions', async () => {
    const applyChangeToValueSpy = vi.spyOn(applyChangeToValueModule, 'default')
    const applyInputChangeSpy = vi.spyOn(mentionsInputEditing, 'applyInputChangeToMentionsValue')
    const mapPlainTextIndexSpy = vi.spyOn(mapPlainTextIndexModule, 'default')

    render(<ControlledMentionsInput initialValue="@[Alice](alice)!" />)

    const combobox = screen.getByRole('combobox')

    applyChangeToValueSpy.mockClear()
    applyInputChangeSpy.mockClear()
    mapPlainTextIndexSpy.mockClear()

    focusControlAt(combobox, 'Alice'.length)
    fireEvent.change(combobox, {
      target: {
        value: 'Alic!',
        selectionStart: 'Alic'.length,
        selectionEnd: 'Alic'.length,
      },
    })

    await waitFor(() => {
      expect(combobox).toHaveValue('!')
    })

    const metrics = {
      applyInputChangeToMentionsValueCalls: applyInputChangeSpy.mock.calls.length,
      applyChangeToValueCalls: applyChangeToValueSpy.mock.calls.length,
      mapPlainTextIndexCalls: mapPlainTextIndexSpy.mock.calls.length,
    }
    emitPerformanceMetric('delete-around-mention', metrics)

    expect(metrics.applyInputChangeToMentionsValueCalls).toBe(1)
    expect(metrics.applyChangeToValueCalls).toBe(1)
    expect(metrics.mapPlainTextIndexCalls).toBeLessThanOrEqual(14)
  })

  it('reports multiple-trigger query routing counts', async () => {
    const activeProvider = vi.fn(async () => [{ id: 'alice', display: 'Alice' }])
    const inactiveProvider = vi.fn(async () => hashMentionData)
    const prepareChildrenSpy = vi.spyOn(mentionsInputChildren, 'prepareMentionsInputChildren')

    render(
      <MentionsInput value="@a">
        <Mention trigger="@" data={activeProvider} />
        <Mention trigger="#" data={inactiveProvider} />
      </MentionsInput>
    )

    const combobox = screen.getByRole('combobox')
    fireEvent.focus(combobox)

    activeProvider.mockClear()
    inactiveProvider.mockClear()
    prepareChildrenSpy.mockClear()
    combobox.setSelectionRange(2, 2)
    fireEvent.select(combobox)

    await waitFor(() => {
      expect(activeProvider).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    })

    const metrics = {
      activeProviderCalls: activeProvider.mock.calls.length,
      inactiveProviderCalls: inactiveProvider.mock.calls.length,
      prepareMentionsInputChildrenCalls: prepareChildrenSpy.mock.calls.length,
    }
    emitPerformanceMetric('multiple-trigger-query-routing', metrics)

    expect(metrics.activeProviderCalls).toBeGreaterThan(0)
    expect(metrics.activeProviderCalls).toBeLessThanOrEqual(2)
    expect(metrics.inactiveProviderCalls).toBe(0)
    expect(metrics.prepareMentionsInputChildrenCalls).toBeLessThanOrEqual(1)
  })

  it('reports overlay navigation layout counts across focus churn', async () => {
    const overlayPositionSpy = vi.spyOn(mentionsInputLayout, 'calculateSuggestionsPosition')
    const inlinePositionSpy = vi.spyOn(mentionsInputLayout, 'calculateInlineSuggestionPosition')

    render(<ControlledMentionsInput initialValue="@a" suggestionsDisplay="overlay" />)

    const combobox = screen.getByRole('combobox')
    focusControlAt(combobox, 2)

    await waitFor(() => {
      expect(screen.getAllByRole('option', { hidden: true }).length).toBeGreaterThan(0)
    })

    overlayPositionSpy.mockClear()
    inlinePositionSpy.mockClear()

    fireEvent.keyDown(combobox, { key: 'ArrowDown' })
    fireEvent.keyDown(combobox, { key: 'ArrowDown' })
    fireEvent.keyDown(combobox, { key: 'ArrowUp' })
    fireEvent.keyDown(combobox, { key: 'ArrowDown' })

    const metrics = {
      calculateSuggestionsPositionCalls: overlayPositionSpy.mock.calls.length,
      calculateInlineSuggestionPositionCalls: inlinePositionSpy.mock.calls.length,
    }
    emitPerformanceMetric('overlay-navigation-layout', metrics)

    expect(metrics.calculateSuggestionsPositionCalls).toBeLessThanOrEqual(1)
    expect(metrics.calculateInlineSuggestionPositionCalls).toBe(0)
  })

  it('reports controlled rerender stability counts for unchanged value and config', async () => {
    const deriveSnapshotSpy = vi.spyOn(mentionsInputDerived, 'deriveMentionValueSnapshot')
    const prepareChildrenSpy = vi.spyOn(mentionsInputChildren, 'prepareMentionsInputChildren')
    const sharedMentionChild = <Mention trigger="@" data={mentionData} />

    function StableWrapper() {
      const [tick, setTick] = useState(0)

      return (
        <div>
          <button type="button" onClick={() => setTick((currentTick) => currentTick + 1)}>
            rerender {tick.toString()}
          </button>
          <MentionsInput value="@a">{sharedMentionChild}</MentionsInput>
        </div>
      )
    }

    render(<StableWrapper />)

    deriveSnapshotSpy.mockClear()
    prepareChildrenSpy.mockClear()

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('rerender 1')
    })

    const metrics = {
      deriveMentionValueSnapshotCalls: deriveSnapshotSpy.mock.calls.length,
      prepareMentionsInputChildrenCalls: prepareChildrenSpy.mock.calls.length,
    }
    emitPerformanceMetric('controlled-rerender-stability', metrics)

    expect(metrics.deriveMentionValueSnapshotCalls).toBe(0)
    expect(metrics.prepareMentionsInputChildrenCalls).toBeLessThanOrEqual(1)
  })

  it('reports suggestion measurement counts for scroll and resize events', async () => {
    const ref = React.createRef<any>()

    const requestAnimationFrameSpy = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0)
        return 1
      })

    render(
      <MentionsInput ref={ref} value="@a">
        <Mention trigger="@" data={mentionData} />
      </MentionsInput>
    )

    try {
      const combobox = screen.getByRole('combobox')
      focusControlAt(combobox, 2)

      await waitFor(() => {
        expect(screen.getAllByRole('option', { hidden: true }).length).toBeGreaterThan(0)
      })

      const instance = ref.current as { updateSuggestionsPosition: () => boolean }
      const updateSuggestionsPositionSpy = vi
        .spyOn(instance, 'updateSuggestionsPosition')
        .mockImplementation(() => true)

      updateSuggestionsPositionSpy.mockClear()

      fireEvent.scroll(combobox, { target: { scrollTop: 24 } })
      fireEvent(globalThis, new Event('resize'))

      const metrics = {
        updateSuggestionsPositionCalls: updateSuggestionsPositionSpy.mock.calls.length,
      }
      emitPerformanceMetric('suggestions-measurement-events', metrics)

      expect(metrics.updateSuggestionsPositionCalls).toBeLessThanOrEqual(3)

      updateSuggestionsPositionSpy.mockRestore()
    } finally {
      requestAnimationFrameSpy.mockRestore()
    }
  })

  it('reports auto-resize helper counts for long content updates', async () => {
    const applyTextareaResizePatchSpy = vi.spyOn(mentionsInputLayout, 'applyTextareaResizePatch')
    const getTextareaResizePatchSpy = vi.spyOn(mentionsInputLayout, 'getTextareaResizePatch')
    const requestAnimationFrameSpy = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0)
        return 1
      })

    function AutoResizeWrapper() {
      const [value, setValue] = useState('short text')

      return (
        <MentionsInput
          autoResize
          value={value}
          onMentionsChange={({ value: nextValue }) => setValue(nextValue)}
        >
          <Mention trigger="@" data={mentionData} />
        </MentionsInput>
      )
    }

    render(<AutoResizeWrapper />)

    try {
      const combobox = screen.getByRole('combobox')
      let scrollHeight = 0
      Object.defineProperty(combobox, 'scrollHeight', {
        configurable: true,
        get: () => scrollHeight,
      })

      applyTextareaResizePatchSpy.mockClear()
      getTextareaResizePatchSpy.mockClear()

      const updatedValue = `${combobox.value} that is now much longer than before`
      combobox.focus()
      combobox.setSelectionRange(combobox.value.length, combobox.value.length)
      scrollHeight = 150

      await act(async () => {
        fireEvent.change(combobox, {
          target: {
            value: updatedValue,
            selectionStart: updatedValue.length,
            selectionEnd: updatedValue.length,
          },
        })
      })

      await waitFor(() => {
        expect(combobox).toHaveValue(updatedValue)
      })

      const metrics = {
        getTextareaResizePatchCalls: getTextareaResizePatchSpy.mock.calls.length,
        applyTextareaResizePatchCalls: applyTextareaResizePatchSpy.mock.calls.length,
      }
      emitPerformanceMetric('auto-resize-keystroke', metrics)

      expect(metrics.getTextareaResizePatchCalls).toBeLessThanOrEqual(10)
      expect(metrics.applyTextareaResizePatchCalls).toBeLessThanOrEqual(10)
    } finally {
      requestAnimationFrameSpy.mockRestore()
    }
  })
})
