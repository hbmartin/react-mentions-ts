import React from 'react'
import { act, render } from '@testing-library/react'
import { Mention } from './index'
import type { MentionValueSnapshot } from './MentionsInputDerived'
import type { MentionsInputProps } from './types'
import { useMentionValueSnapshot } from './useMentionValueSnapshot'

type SnapshotApi = ReturnType<typeof useMentionValueSnapshot>

interface SnapshotHarnessProps {
  readonly children: MentionsInputProps['children']
  readonly value?: string
  readonly onApi: (api: SnapshotApi) => void
}

function SnapshotHarness({ children, value, onApi }: SnapshotHarnessProps) {
  const api = useMentionValueSnapshot(children, value)
  onApi(api)
  return null
}

const userMention = <Mention trigger="@" data={[]} />
const tagMention = <Mention trigger="#" data={[]} />

const renderSnapshotHarness = ({
  children = userMention,
  value,
}: {
  readonly children?: MentionsInputProps['children']
  readonly value?: string
} = {}) => {
  let currentApi: SnapshotApi | null = null
  const onApi = (api: SnapshotApi) => {
    currentApi = api
  }
  const view = render(
    <SnapshotHarness value={value} onApi={onApi}>
      {children}
    </SnapshotHarness>
  )
  const getApi = (): SnapshotApi => {
    if (currentApi === null) {
      throw new Error('Snapshot harness did not render')
    }
    return currentApi
  }

  return { ...view, getApi, onApi }
}

describe('useMentionValueSnapshot', () => {
  it('uses cached snapshots when the value and mention config still match', () => {
    const cachedSnapshot: MentionValueSnapshot = {
      plainText: 'cached plain text',
      idValue: 'cached id value',
      mentions: [],
    }
    const { getApi, rerender, onApi } = renderSnapshotHarness({ value: 'seed' })

    act(() => {
      getApi().cacheSnapshot('', getApi().getCurrentConfig(), cachedSnapshot)
    })

    rerender(
      <SnapshotHarness value={undefined} onApi={onApi}>
        {userMention}
      </SnapshotHarness>
    )

    expect(getApi().currentSnapshot).toBe(cachedSnapshot)
    expect(getApi().getCurrentSnapshot()).toBe(cachedSnapshot)
  })

  it('prepares replacement children and derives snapshots for uncached values or configs', () => {
    const { getApi } = renderSnapshotHarness({ value: '@[Ada](1)' })

    expect(getApi().getPreparedChildren()).toBe(getApi().preparedChildren)

    const replacementChildren = getApi().getPreparedChildren(tagMention)
    expect(replacementChildren).not.toBe(getApi().preparedChildren)
    expect(replacementChildren.config[0]?.trigger).toBe('#')

    const uncachedByValue = getApi().getCurrentSnapshot('@[Grace](2)')
    expect(uncachedByValue.plainText).toBe('Grace')
    expect(uncachedByValue.idValue).toBe('2')

    const uncachedByConfig = getApi().getCurrentSnapshot('@[Ada](1)', replacementChildren.config)
    expect(uncachedByConfig.plainText).toBe('@[Ada](1)')
    expect(uncachedByConfig.mentions).toEqual([])
  })

  it('returns a cached snapshot only when both requested value and config match', () => {
    const cachedSnapshot: MentionValueSnapshot = {
      plainText: 'cached',
      idValue: 'cached',
      mentions: [],
    }
    const { getApi } = renderSnapshotHarness({ value: '@[Ada](1)' })
    const currentConfig = getApi().getCurrentConfig()
    const replacementConfig = getApi().getPreparedChildren(tagMention).config

    act(() => {
      getApi().cacheSnapshot('@[Grace](2)', currentConfig, cachedSnapshot)
    })

    expect(getApi().getCurrentSnapshot('@[Grace](2)', currentConfig)).toBe(cachedSnapshot)
    expect(getApi().getCurrentSnapshot('@[Grace](2)', replacementConfig)).not.toBe(cachedSnapshot)
  })
})
