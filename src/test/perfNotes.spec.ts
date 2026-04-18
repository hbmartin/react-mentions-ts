import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import {
  checkPerfAgainstBaseline,
  comparePerfNotes,
  findNearestBaselineNote,
  parsePerfOutput,
  recordPerfNote,
  readPerfNote,
  writePerfNote,
} from './perfNotes'

const SAMPLE_PERF_OUTPUT = `
[perf] array-provider-scan-count {"scanCount":5,"resultCount":5}
[perf] controlled-keystroke {"getPlainTextCalls":0,"deriveMentionValueSnapshotCalls":1,"prepareMentionsInputChildrenCalls":1}
[perf] selection-only {"deriveMentionValueSnapshotCalls":0}
[perf] inline-layout {"calculateSuggestionsPositionCalls":0,"calculateInlineSuggestionPositionCalls":1}
[perf] overlay-layout {"calculateSuggestionsPositionCalls":2,"calculateInlineSuggestionPositionCalls":0}
[perf] locality-render-counts {"stableSiblingRendersDuringInteraction":0,"activeBranchRendersDuringInteraction":1}
`.trim()

const runGit = (repositoryRoot: string, args: string[]): string => {
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- temp-repo integration tests intentionally exercise the local git binary.
  const result = spawnSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(
      [`git ${args.join(' ')}`, result.stdout, result.stderr]
        .map((value) => value.trim())
        .filter(Boolean)
        .join('\n')
    )
  }

  return result.stdout.trim()
}

const tempDirectories: string[] = []

const createTempRepository = (): string => {
  const directory = mkdtempSync(path.join(tmpdir(), 'react-mentions-ts-perf-notes-spec-'))
  tempDirectories.push(directory)

  runGit(directory, ['init', '--initial-branch=master'])
  runGit(directory, ['config', 'user.name', 'Perf Notes Test'])
  runGit(directory, ['config', 'user.email', 'perf-notes@example.com'])

  return directory
}

const commitFile = (
  repositoryRoot: string,
  name: string,
  content: string,
  message: string
): string => {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- temp-repo tests intentionally write fixture files by computed path.
  writeFileSync(path.join(repositoryRoot, name), content, 'utf8')
  runGit(repositoryRoot, ['add', name])
  runGit(repositoryRoot, ['commit', '-m', message])
  return runGit(repositoryRoot, ['rev-parse', 'HEAD'])
}

const createFeatureRepository = (): {
  commits: { feature: string; first: string; mergeBase: string; masterHead: string }
  cwd: string
} => {
  const repositoryRoot = createTempRepository()
  const first = commitFile(repositoryRoot, 'fixture.txt', 'one\n', 'first')
  const mergeBase = commitFile(repositoryRoot, 'fixture.txt', 'two\n', 'second')
  const masterHead = commitFile(repositoryRoot, 'fixture.txt', 'three\n', 'third')
  runGit(repositoryRoot, ['update-ref', 'refs/remotes/origin/master', masterHead])
  runGit(repositoryRoot, ['checkout', '-b', 'feature', mergeBase])
  const feature = commitFile(repositoryRoot, 'feature.txt', 'feature\n', 'feature')

  return {
    commits: {
      feature,
      first,
      masterHead,
      mergeBase,
    },
    cwd: repositoryRoot,
  }
}

afterEach(() => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop()
    if (typeof directory === 'string') {
      rmSync(directory, { force: true, recursive: true })
    }
  }
})

describe('perfNotes', () => {
  it('parses [perf] lines into a stable note payload', () => {
    const payload = parsePerfOutput(`ignored line\n${SAMPLE_PERF_OUTPUT}\ntrailing line`)

    expect(payload).toEqual({
      command: 'pnpm test:perf',
      metrics: {
        'array-provider-scan-count': {
          resultCount: 5,
          scanCount: 5,
        },
        'controlled-keystroke': {
          deriveMentionValueSnapshotCalls: 1,
          getPlainTextCalls: 0,
          prepareMentionsInputChildrenCalls: 1,
        },
        'inline-layout': {
          calculateInlineSuggestionPositionCalls: 1,
          calculateSuggestionsPositionCalls: 0,
        },
        'locality-render-counts': {
          activeBranchRendersDuringInteraction: 1,
          stableSiblingRendersDuringInteraction: 0,
        },
        'overlay-layout': {
          calculateInlineSuggestionPositionCalls: 0,
          calculateSuggestionsPositionCalls: 2,
        },
        'selection-only': {
          deriveMentionValueSnapshotCalls: 0,
        },
      },
      schemaVersion: 1,
      suite: 'react-mentions-ts/perf',
    })
  })

  it('ignores informational metrics and only flags tracked regressions', () => {
    const baseline = parsePerfOutput(SAMPLE_PERF_OUTPUT)
    const candidate = parsePerfOutput(
      SAMPLE_PERF_OUTPUT.replace('"resultCount":5', '"resultCount":999').replace(
        '"scanCount":5',
        '"scanCount":6'
      )
    )

    const result = comparePerfNotes(baseline, candidate)

    expect(result.errors).toEqual([])
    expect(result.skipped).toEqual([])
    expect(result.regressions).toEqual([
      {
        baseline: 5,
        candidate: 6,
        metric: 'scanCount',
        scenario: 'array-provider-scan-count',
      },
    ])
  })

  it('writes and reads perf notes through a custom notes ref', () => {
    const cwd = createTempRepository()
    const headCommit = commitFile(cwd, 'fixture.txt', 'hello\n', 'initial')
    const payload = parsePerfOutput(SAMPLE_PERF_OUTPUT)

    writePerfNote(cwd, headCommit, payload, 'refs/notes/test-perf')

    expect(readPerfNote(cwd, headCommit, 'refs/notes/test-perf')).toEqual(payload)
  })

  it('records a perf note on HEAD without touching the default notes ref', () => {
    const cwd = createTempRepository()
    const headCommit = commitFile(cwd, 'fixture.txt', 'hello\n', 'initial')

    const payload = recordPerfNote(cwd, {
      notesRef: 'refs/notes/test-perf',
      perfOutput: SAMPLE_PERF_OUTPUT,
    })

    expect(payload).toEqual(readPerfNote(cwd, headCommit, 'refs/notes/test-perf'))
    expect(readPerfNote(cwd, headCommit)).toBeNull()
  })

  it('prefers an exact merge-base note when one exists', () => {
    const { commits, cwd } = createFeatureRepository()
    writePerfNote(
      cwd,
      commits.mergeBase,
      parsePerfOutput(SAMPLE_PERF_OUTPUT),
      'refs/notes/test-perf'
    )

    const result = findNearestBaselineNote(cwd, {
      head: commits.feature,
      notesRef: 'refs/notes/test-perf',
      targetRef: 'origin/master',
    })

    expect(result.mergeBase).toBe(commits.mergeBase)
    expect(result.baselineCommit).toBe(commits.mergeBase)
    expect(result.note?.metrics['array-provider-scan-count'].scanCount).toBe(5)
  })

  it('falls back to an earlier master note when the exact merge-base note is missing', () => {
    const { commits, cwd } = createFeatureRepository()
    writePerfNote(cwd, commits.first, parsePerfOutput(SAMPLE_PERF_OUTPUT), 'refs/notes/test-perf')

    const result = findNearestBaselineNote(cwd, {
      head: commits.feature,
      notesRef: 'refs/notes/test-perf',
      targetRef: 'origin/master',
    })

    expect(result.mergeBase).toBe(commits.mergeBase)
    expect(result.baselineCommit).toBe(commits.first)
    expect(result.note?.metrics['overlay-layout'].calculateSuggestionsPositionCalls).toBe(2)
  })

  it('returns a neutral result when no baseline note exists on master ancestry', () => {
    const { commits, cwd } = createFeatureRepository()

    const result = checkPerfAgainstBaseline(cwd, {
      head: commits.feature,
      notesRef: 'refs/notes/test-perf',
      perfOutput: SAMPLE_PERF_OUTPUT,
      targetRef: 'origin/master',
    })

    expect(result.status).toBe('missing-baseline')
    expect(result.mergeBase).toBe(commits.mergeBase)
    expect(result.baselineCommit).toBeNull()
    expect(result.baselineNote).toBeNull()
  })
})
