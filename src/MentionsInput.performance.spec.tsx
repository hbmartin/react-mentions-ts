import React, { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import MentionsInput from './MentionsInput'
import Mention from './Mention'
import * as mentionsInputChildren from './MentionsInputChildren'
import * as mentionsInputDerived from './MentionsInputDerived'
import * as mentionsInputLayout from './MentionsInputLayout'
import * as utils from './utils'
import { createRenderCounter, emitPerformanceMetric } from './test/performance'
import type { MentionsInputChangeHandler } from './types'

const mentionData = [
  { id: 'alice', display: 'Alice' },
  { id: 'albert', display: 'Albert' },
  { id: 'bob', display: 'Bob' },
]

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

describe('MentionsInput performance', () => {
  it('reports controlled keystroke work counts', async () => {
    const getPlainTextSpy = vi.spyOn(utils, 'getPlainText')
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

    expect(metrics.getPlainTextCalls).toBe(0)
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
})
