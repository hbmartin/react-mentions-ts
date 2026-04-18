import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import {
  PERF_COMMAND,
  checkPerfAgainstBaseline,
  comparePerfNotes,
  findNearestBaselineNote,
  parseCommandLine,
  parsePerfOutput,
  recordPerfNote,
  readPerfNote,
  runPerfNotesCli,
  stringifyPerfNote,
  writePerfNote,
} from './perfNotes'

const PERF_NOTES_CLI_PATH = path.resolve(process.cwd(), 'scripts/perf-notes.mjs')

const SAMPLE_PERF_OUTPUT = `
[perf] array-provider-scan-count {"scanCount":5,"resultCount":5}
[perf] accent-provider-scan-count {"scanCount":5,"resultCount":5}
[perf] controlled-keystroke {"getPlainTextCalls":0,"deriveMentionValueSnapshotCalls":1,"prepareMentionsInputChildrenCalls":1}
[perf] selection-only {"deriveMentionValueSnapshotCalls":0}
[perf] inline-layout {"calculateSuggestionsPositionCalls":0,"calculateInlineSuggestionPositionCalls":1}
[perf] overlay-layout {"calculateSuggestionsPositionCalls":2,"calculateInlineSuggestionPositionCalls":0}
[perf] locality-render-counts {"stableSiblingRendersDuringInteraction":0,"activeBranchRendersDuringInteraction":1}
[perf] debounced-async-query {"providerCalls":1}
[perf] stale-async-result {"staleResultApplications":0,"freshResultApplications":1}
[perf] long-document-caret-mapping {"mapPlainTextIndexCalls":10,"deriveMentionValueSnapshotCalls":1}
[perf] paste-replace-mention {"applyPasteToMentionsValueCalls":1,"mapPlainTextIndexCalls":9,"getPlainTextCalls":1}
[perf] delete-around-mention {"applyInputChangeToMentionsValueCalls":1,"applyChangeToValueCalls":1,"mapPlainTextIndexCalls":10}
[perf] multiple-trigger-query-routing {"activeProviderCalls":2,"inactiveProviderCalls":0,"prepareMentionsInputChildrenCalls":0}
[perf] overlay-navigation-layout {"calculateSuggestionsPositionCalls":0,"calculateInlineSuggestionPositionCalls":0}
[perf] controlled-rerender-stability {"deriveMentionValueSnapshotCalls":0,"prepareMentionsInputChildrenCalls":0}
[perf] suggestions-measurement-events {"updateSuggestionsPositionCalls":2}
[perf] auto-resize-keystroke {"getTextareaResizePatchCalls":8,"applyTextareaResizePatchCalls":8}
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

const writeRepositoryFile = (repositoryRoot: string, name: string, content: string): string => {
  const filePath = path.join(repositoryRoot, name)
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- temp-repo tests intentionally write fixture files by computed path.
  writeFileSync(filePath, content, 'utf8')
  return filePath
}

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
  writeRepositoryFile(repositoryRoot, name, content)
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

const addRawPerfNote = (
  repositoryRoot: string,
  commit: string,
  rawPayload: string,
  notesRef = 'refs/notes/test-perf'
): void => {
  runGit(repositoryRoot, ['notes', `--ref=${notesRef}`, 'add', '--force', '-m', rawPayload, commit])
}

const createPerfCommand = (output: string): string => {
  const code = `process.stdout.write(${JSON.stringify(output)})`
  return `${JSON.stringify(process.execPath)} -e ${JSON.stringify(code)}`
}

const createPerfCommandScript = (repositoryRoot: string, output = SAMPLE_PERF_OUTPUT): string => {
  const outputWithTrailingNewline = `${output}\n`
  return writeRepositoryFile(
    repositoryRoot,
    'emit-perf-output.mjs',
    `process.stdout.write(${JSON.stringify(outputWithTrailingNewline)})\n`
  )
}

const createFailingPerfCommand = (stderr = 'perf failed'): string => {
  const code = `process.stderr.write(${JSON.stringify(stderr)}); process.exit(2)`
  return `${JSON.stringify(process.execPath)} -e ${JSON.stringify(code)}`
}

const createArgvCheckingPerfCommand = (expectedArgs: string[], commandTail: string): string => {
  const perfOutput = `${SAMPLE_PERF_OUTPUT}\n`
  const code = [
    `const expected = ${JSON.stringify(expectedArgs)}`,
    'const actual = process.argv.slice(1)',
    'if (JSON.stringify(actual) !== JSON.stringify(expected)) { process.stderr.write(`argv mismatch: ${JSON.stringify(actual)}`); process.exit(3) }',
    `process.stdout.write(${JSON.stringify(perfOutput)})`,
  ].join(';')

  return `${JSON.stringify(process.execPath)} -e ${JSON.stringify(code)} -- ${commandTail}`
}

const withProcessExecPath = <Result>(execPath: string, callback: () => Result): Result => {
  const originalExecPathDescriptor = Object.getOwnPropertyDescriptor(process, 'execPath')
  Object.defineProperty(process, 'execPath', {
    configurable: true,
    enumerable: originalExecPathDescriptor?.enumerable ?? true,
    value: execPath,
    writable: true,
  })

  try {
    return callback()
  } finally {
    if (originalExecPathDescriptor) {
      Object.defineProperty(process, 'execPath', originalExecPathDescriptor)
    }
  }
}

const createMemoryWriteStream = () => {
  const chunks: string[] = []

  return {
    write: vi.fn((chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'))
      return true
    }),
    toString: () => chunks.join(''),
  }
}

const runNode = (repositoryRoot: string, args: string[], env: NodeJS.ProcessEnv = process.env) => {
  const result = spawnSync(process.execPath, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.error) {
    throw result.error
  }

  return result
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
        'accent-provider-scan-count': {
          resultCount: 5,
          scanCount: 5,
        },
        'auto-resize-keystroke': {
          applyTextareaResizePatchCalls: 8,
          getTextareaResizePatchCalls: 8,
        },
        'controlled-keystroke': {
          deriveMentionValueSnapshotCalls: 1,
          getPlainTextCalls: 0,
          prepareMentionsInputChildrenCalls: 1,
        },
        'controlled-rerender-stability': {
          deriveMentionValueSnapshotCalls: 0,
          prepareMentionsInputChildrenCalls: 0,
        },
        'debounced-async-query': {
          providerCalls: 1,
        },
        'delete-around-mention': {
          applyChangeToValueCalls: 1,
          applyInputChangeToMentionsValueCalls: 1,
          mapPlainTextIndexCalls: 10,
        },
        'inline-layout': {
          calculateInlineSuggestionPositionCalls: 1,
          calculateSuggestionsPositionCalls: 0,
        },
        'long-document-caret-mapping': {
          deriveMentionValueSnapshotCalls: 1,
          mapPlainTextIndexCalls: 10,
        },
        'locality-render-counts': {
          activeBranchRendersDuringInteraction: 1,
          stableSiblingRendersDuringInteraction: 0,
        },
        'multiple-trigger-query-routing': {
          activeProviderCalls: 2,
          inactiveProviderCalls: 0,
          prepareMentionsInputChildrenCalls: 0,
        },
        'overlay-layout': {
          calculateInlineSuggestionPositionCalls: 0,
          calculateSuggestionsPositionCalls: 2,
        },
        'overlay-navigation-layout': {
          calculateInlineSuggestionPositionCalls: 0,
          calculateSuggestionsPositionCalls: 0,
        },
        'paste-replace-mention': {
          applyPasteToMentionsValueCalls: 1,
          getPlainTextCalls: 1,
          mapPlainTextIndexCalls: 9,
        },
        'selection-only': {
          deriveMentionValueSnapshotCalls: 0,
        },
        'stale-async-result': {
          freshResultApplications: 1,
          staleResultApplications: 0,
        },
        'suggestions-measurement-events': {
          updateSuggestionsPositionCalls: 2,
        },
      },
      schemaVersion: 1,
      suite: 'react-mentions-ts/perf',
    })
  })

  it('stamps the canonical perf command into the payload', () => {
    const payload = parsePerfOutput(SAMPLE_PERF_OUTPUT)

    expect(payload.command).toBe(PERF_COMMAND)
  })

  it('rejects duplicate perf scenarios', () => {
    expect(() =>
      parsePerfOutput(
        `${SAMPLE_PERF_OUTPUT}\n[perf] selection-only {"deriveMentionValueSnapshotCalls":0}`
      )
    ).toThrow('Duplicate perf scenario emitted: selection-only')
  })

  it('rejects perf output that does not emit any metrics', () => {
    expect(() => parsePerfOutput('ignored only')).toThrow(
      'No perf metrics were emitted by the perf command'
    )
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

  it('skips metrics that are absent from an older baseline note', () => {
    const baseline = parsePerfOutput(`
[perf] array-provider-scan-count {"scanCount":5,"resultCount":5}
[perf] controlled-keystroke {"getPlainTextCalls":0,"deriveMentionValueSnapshotCalls":1,"prepareMentionsInputChildrenCalls":1}
[perf] selection-only {"deriveMentionValueSnapshotCalls":0}
[perf] inline-layout {"calculateSuggestionsPositionCalls":0,"calculateInlineSuggestionPositionCalls":1}
[perf] overlay-layout {"calculateSuggestionsPositionCalls":2,"calculateInlineSuggestionPositionCalls":0}
[perf] locality-render-counts {"stableSiblingRendersDuringInteraction":0,"activeBranchRendersDuringInteraction":1}
    `)
    const candidate = parsePerfOutput(SAMPLE_PERF_OUTPUT)

    const result = comparePerfNotes(baseline, candidate)

    expect(result.errors).toEqual([])
    expect(result.regressions).toEqual([])
    expect(result.skipped).toContainEqual({
      metric: 'scanCount',
      reason: 'baseline-missing-or-non-numeric',
      scenario: 'accent-provider-scan-count',
    })
    expect(result.skipped).toContainEqual({
      metric: 'providerCalls',
      reason: 'baseline-missing-or-non-numeric',
      scenario: 'debounced-async-query',
    })
  })

  it('reports missing candidate metrics and skips non-numeric baseline metrics', () => {
    const baseline = parsePerfOutput(SAMPLE_PERF_OUTPUT)
    const candidate = parsePerfOutput(SAMPLE_PERF_OUTPUT)

    baseline.metrics['inline-layout'].calculateInlineSuggestionPositionCalls = 'n/a'
    candidate.metrics['selection-only'].deriveMentionValueSnapshotCalls = 'n/a'

    const result = comparePerfNotes(baseline, candidate)

    expect(result.errors).toEqual([
      {
        metric: 'deriveMentionValueSnapshotCalls',
        reason: 'candidate-missing-or-non-numeric',
        scenario: 'selection-only',
      },
    ])
    expect(result.skipped).toEqual([
      {
        metric: 'calculateInlineSuggestionPositionCalls',
        reason: 'baseline-missing-or-non-numeric',
        scenario: 'inline-layout',
      },
    ])
    expect(result.regressions).toEqual([])
  })

  it('reports missing scenarios without throwing', () => {
    const baseline = parsePerfOutput(
      SAMPLE_PERF_OUTPUT.replace(
        '[perf] selection-only {"deriveMentionValueSnapshotCalls":0}\n',
        ''
      )
    )
    const candidate = parsePerfOutput(
      SAMPLE_PERF_OUTPUT.replace(
        '[perf] inline-layout {"calculateSuggestionsPositionCalls":0,"calculateInlineSuggestionPositionCalls":1}\n',
        ''
      )
    )

    const result = comparePerfNotes(baseline, candidate)

    expect(result.errors).toContainEqual({
      metric: 'calculateSuggestionsPositionCalls',
      reason: 'candidate-missing-or-non-numeric',
      scenario: 'inline-layout',
    })
    expect(result.errors).toContainEqual({
      metric: 'calculateInlineSuggestionPositionCalls',
      reason: 'candidate-missing-or-non-numeric',
      scenario: 'inline-layout',
    })
    expect(result.skipped).toContainEqual({
      metric: 'deriveMentionValueSnapshotCalls',
      reason: 'baseline-missing-or-non-numeric',
      scenario: 'selection-only',
    })
    expect(result.regressions).toEqual([])
  })

  it('writes and reads perf notes through a custom notes ref', () => {
    const cwd = createTempRepository()
    const headCommit = commitFile(cwd, 'fixture.txt', 'hello\n', 'initial')
    const payload = parsePerfOutput(SAMPLE_PERF_OUTPUT)

    writePerfNote(cwd, headCommit, payload, 'refs/notes/test-perf')

    expect(readPerfNote(cwd, headCommit, 'refs/notes/test-perf')).toEqual(payload)
  })

  it('records and reads perf notes with a custom perf command', () => {
    const cwd = createTempRepository()
    const headCommit = commitFile(cwd, 'fixture.txt', 'hello\n', 'initial')
    const perfCommand = createPerfCommand(`${SAMPLE_PERF_OUTPUT}\n`)

    const payload = recordPerfNote(cwd, {
      notesRef: 'refs/notes/test-perf',
      perfCommand,
      perfOutput: SAMPLE_PERF_OUTPUT,
    })

    expect(payload.command).toBe(perfCommand)
    expect(readPerfNote(cwd, headCommit, 'refs/notes/test-perf', perfCommand)).toEqual(payload)
  })

  it('passes explicitly empty quoted perf command arguments through to the child process', () => {
    const cwd = createTempRepository()
    const headCommit = commitFile(cwd, 'fixture.txt', 'hello\n', 'initial')
    const perfCommand = createArgvCheckingPerfCommand(
      ['--empty', '', '--next', 'value'],
      '--empty "" --next value'
    )

    const payload = recordPerfNote(cwd, {
      notesRef: 'refs/notes/test-perf',
      perfCommand,
    })

    expect(payload.command).toBe(perfCommand)
    expect(readPerfNote(cwd, headCommit, 'refs/notes/test-perf', perfCommand)).toEqual(payload)
  })

  it('preserves Windows path backslashes while supporting escaped whitespace', () => {
    const cwd = createTempRepository()
    const headCommit = commitFile(cwd, 'fixture.txt', 'hello\n', 'initial')
    const windowsPath = 'C:\\Program Files\\nodejs\\node.exe'
    const perfCommand = createArgvCheckingPerfCommand(
      ['--path', windowsPath, '--label', 'escaped value'],
      `--path "${windowsPath}" --label escaped\\ value`
    )

    const payload = recordPerfNote(cwd, {
      notesRef: 'refs/notes/test-perf',
      perfCommand,
    })

    expect(payload.command).toBe(perfCommand)
    expect(readPerfNote(cwd, headCommit, 'refs/notes/test-perf', perfCommand)).toEqual(payload)
  })

  it('preserves unquoted process.execPath commands that contain spaces', () => {
    const execPathWithSpaces = path.join(tmpdir(), 'runtime with spaces', 'node')
    const code = 'process.stdout.write("ok")'
    const commandLine = `${execPathWithSpaces} -e ${JSON.stringify(code)} --label escaped\\ value`

    expect(withProcessExecPath(execPathWithSpaces, () => parseCommandLine(commandLine))).toEqual({
      args: ['-e', code, '--label', 'escaped value'],
      command: execPathWithSpaces,
    })
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

  it('runs the shipped CLI wrapper end to end', () => {
    const cwd = createTempRepository()
    const headCommit = commitFile(cwd, 'fixture.txt', 'hello\n', 'initial')
    const perfCommandScript = createPerfCommandScript(cwd)
    const perfCommand = `node ${JSON.stringify(perfCommandScript)}`
    const env = {
      ...process.env,
      PERF_BASELINE_COMMIT: headCommit,
      PERF_COMMAND: perfCommand,
      PERF_NOTES_REF: 'refs/notes/test-perf',
    }

    const record = runNode(cwd, [PERF_NOTES_CLI_PATH, 'record'], env)

    expect(record.status).toBe(0)
    expect(record.stdout).toContain('Recorded perf note')
    expect(readPerfNote(cwd, headCommit, 'refs/notes/test-perf', perfCommand)).not.toBeNull()

    const check = runNode(cwd, [PERF_NOTES_CLI_PATH, 'check'], env)

    expect(check.status).toBe(0)
    expect(check.stdout).toContain(`Perf check passed against ${headCommit}.`)
  })

  it.each([
    {
      message: 'Perf note payload must be an object',
      payload: JSON.stringify('invalid'),
    },
    {
      message: 'Unsupported perf note schema version: 2',
      payload: JSON.stringify({
        ...parsePerfOutput(SAMPLE_PERF_OUTPUT),
        schemaVersion: 2,
      }),
    },
    {
      message: 'Perf note command must be a non-empty string',
      payload: JSON.stringify({
        ...parsePerfOutput(SAMPLE_PERF_OUTPUT),
        command: '',
      }),
    },
    {
      message: 'Unsupported perf note suite: other-suite',
      payload: JSON.stringify({
        ...parsePerfOutput(SAMPLE_PERF_OUTPUT),
        suite: 'other-suite',
      }),
    },
    {
      message: 'Perf note metrics must be an object',
      payload: JSON.stringify({
        ...parsePerfOutput(SAMPLE_PERF_OUTPUT),
        metrics: [],
      }),
    },
    {
      message: 'metrics.invalid must be an object',
      payload: JSON.stringify({
        ...parsePerfOutput(SAMPLE_PERF_OUTPUT),
        metrics: {
          invalid: [],
        },
      }),
    },
    {
      message: 'metrics.selection-only.deriveMentionValueSnapshotCalls must be a string or number',
      payload: JSON.stringify({
        ...parsePerfOutput(SAMPLE_PERF_OUTPUT),
        metrics: {
          'selection-only': {
            deriveMentionValueSnapshotCalls: false,
          },
        },
      }),
    },
  ])('rejects invalid persisted perf notes: $message', ({ message, payload }) => {
    const cwd = createTempRepository()
    const headCommit = commitFile(cwd, 'fixture.txt', 'hello\n', 'initial')
    addRawPerfNote(cwd, headCommit, payload)

    expect(() => readPerfNote(cwd, headCommit, 'refs/notes/test-perf')).toThrow(message)
  })

  it('rejects persisted notes when the caller expects a different perf command', () => {
    const cwd = createTempRepository()
    const headCommit = commitFile(cwd, 'fixture.txt', 'hello\n', 'initial')
    addRawPerfNote(
      cwd,
      headCommit,
      JSON.stringify({
        ...parsePerfOutput(SAMPLE_PERF_OUTPUT),
        command: 'pnpm nope',
      })
    )

    expect(() => readPerfNote(cwd, headCommit, 'refs/notes/test-perf', PERF_COMMAND)).toThrow(
      'Unsupported perf note command: pnpm nope'
    )
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

  it('uses an explicit baseline commit without resolving a merge-base', () => {
    const { commits, cwd } = createFeatureRepository()
    writePerfNote(cwd, commits.first, parsePerfOutput(SAMPLE_PERF_OUTPUT), 'refs/notes/test-perf')

    const result = findNearestBaselineNote(cwd, {
      baselineCommit: commits.first,
      head: commits.feature,
      notesRef: 'refs/notes/test-perf',
      targetRef: 'origin/master',
    })

    expect(result.mergeBase).toBe(commits.first)
    expect(result.baselineCommit).toBe(commits.first)
  })

  it('throws when baseline lookup cannot resolve the target ref', () => {
    const cwd = createTempRepository()
    commitFile(cwd, 'fixture.txt', 'hello\n', 'initial')

    expect(() =>
      findNearestBaselineNote(cwd, {
        targetRef: 'origin/does-not-exist',
      })
    ).toThrow('Command failed: git merge-base HEAD origin/does-not-exist')
  })

  it('throws when git notes return an unexpected read failure', () => {
    const cwd = createTempRepository()
    commitFile(cwd, 'fixture.txt', 'hello\n', 'initial')

    expect(() => readPerfNote(cwd, 'not-a-commit', 'refs/notes/test-perf')).toThrow(
      'Failed to read git note for not-a-commit from refs/notes/test-perf'
    )
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

  it('returns a passed status when candidate metrics match the baseline note', () => {
    const { commits, cwd } = createFeatureRepository()
    const baseline = parsePerfOutput(SAMPLE_PERF_OUTPUT)
    writePerfNote(cwd, commits.mergeBase, baseline, 'refs/notes/test-perf')

    const result = checkPerfAgainstBaseline(cwd, {
      head: commits.feature,
      notesRef: 'refs/notes/test-perf',
      perfOutput: SAMPLE_PERF_OUTPUT,
      targetRef: 'origin/master',
    })

    expect(result.status).toBe('passed')
    expect(result.baselineCommit).toBe(commits.mergeBase)
    expect(result.comparison).toEqual({
      errors: [],
      regressions: [],
      skipped: [],
    })
  })

  it('returns a failed status when candidate metrics regress or required values are missing', () => {
    const { commits, cwd } = createFeatureRepository()
    const baseline = parsePerfOutput(SAMPLE_PERF_OUTPUT)
    writePerfNote(cwd, commits.mergeBase, baseline, 'refs/notes/test-perf')

    const result = checkPerfAgainstBaseline(cwd, {
      head: commits.feature,
      notesRef: 'refs/notes/test-perf',
      perfOutput: SAMPLE_PERF_OUTPUT.replace('"scanCount":5', '"scanCount":6').replace(
        '"deriveMentionValueSnapshotCalls":0',
        '"deriveMentionValueSnapshotCalls":"oops"'
      ),
      targetRef: 'origin/master',
    })

    expect(result.status).toBe('failed')
    expect(result.comparison.errors).toHaveLength(1)
    expect(result.comparison.regressions).toHaveLength(1)
  })

  it('wraps perf command failures with stdout and stderr context', () => {
    const cwd = createTempRepository()
    commitFile(cwd, 'fixture.txt', 'hello\n', 'initial')

    expect(() =>
      recordPerfNote(cwd, {
        notesRef: 'refs/notes/test-perf',
        perfCommand: createFailingPerfCommand('perf command failed'),
      })
    ).toThrow('Perf command failed:')
  })

  it('stringifies perf notes with a trailing newline', () => {
    expect(stringifyPerfNote(parsePerfOutput(SAMPLE_PERF_OUTPUT)).endsWith('\n')).toBe(true)
  })

  it('records perf notes through the CLI', () => {
    const cwd = createTempRepository()
    const headCommit = commitFile(cwd, 'fixture.txt', 'hello\n', 'initial')
    const stdout = createMemoryWriteStream()
    const stderr = createMemoryWriteStream()
    const perfCommand = createPerfCommand(`${SAMPLE_PERF_OUTPUT}\n`)

    const exitCode = runPerfNotesCli(['record'], {
      repositoryRoot: cwd,
      env: {
        ...process.env,
        PERF_COMMAND: perfCommand,
        PERF_NOTES_REF: 'refs/notes/test-perf',
      },
      stdout: stdout as unknown as NodeJS.WriteStream,
      stderr: stderr as unknown as NodeJS.WriteStream,
    })

    expect(exitCode).toBe(0)
    expect(stdout.toString()).toContain(`Recorded perf note for ${headCommit.slice(0, 7)}`)
    expect(stderr.toString()).toBe('')
    expect(readPerfNote(cwd, headCommit, 'refs/notes/test-perf', perfCommand)).toEqual(
      parsePerfOutput(SAMPLE_PERF_OUTPUT, perfCommand)
    )
  })

  it('reports missing baselines through the CLI', () => {
    const { cwd } = createFeatureRepository()
    const stdout = createMemoryWriteStream()
    const stderr = createMemoryWriteStream()

    const exitCode = runPerfNotesCli(['check'], {
      repositoryRoot: cwd,
      env: {
        ...process.env,
        PERF_COMMAND: createPerfCommand(`${SAMPLE_PERF_OUTPUT}\n`),
        PERF_NOTES_REF: 'refs/notes/test-perf',
        PERF_TARGET_REF: 'origin/master',
      },
      stdout: stdout as unknown as NodeJS.WriteStream,
      stderr: stderr as unknown as NodeJS.WriteStream,
    })

    expect(exitCode).toBe(0)
    expect(stdout.toString()).toContain('No perf baseline note found')
    expect(stderr.toString()).toBe('')
  })

  it('reports candidate metric errors through the CLI', () => {
    const { commits, cwd } = createFeatureRepository()
    const perfCommand = createPerfCommand(
      `${SAMPLE_PERF_OUTPUT.replace('"deriveMentionValueSnapshotCalls":0', '"deriveMentionValueSnapshotCalls":"oops"')}\n`
    )
    writePerfNote(
      cwd,
      commits.mergeBase,
      parsePerfOutput(SAMPLE_PERF_OUTPUT, perfCommand),
      'refs/notes/test-perf'
    )
    const stdout = createMemoryWriteStream()
    const stderr = createMemoryWriteStream()

    const exitCode = runPerfNotesCli(['check'], {
      repositoryRoot: cwd,
      env: {
        ...process.env,
        PERF_COMMAND: perfCommand,
        PERF_NOTES_REF: 'refs/notes/test-perf',
        PERF_TARGET_REF: 'origin/master',
      },
      stdout: stdout as unknown as NodeJS.WriteStream,
      stderr: stderr as unknown as NodeJS.WriteStream,
    })

    expect(exitCode).toBe(1)
    expect(stderr.toString()).toContain('Perf check could not compare required candidate metrics')
    expect(stdout.toString()).toBe('')
  })

  it('reports regressions and skipped baseline metrics through the CLI', () => {
    const { commits, cwd } = createFeatureRepository()
    const perfCommand = createPerfCommand(
      `${SAMPLE_PERF_OUTPUT.replace('"scanCount":5', '"scanCount":6')}\n`
    )
    const baseline = parsePerfOutput(SAMPLE_PERF_OUTPUT, perfCommand)
    baseline.metrics['inline-layout'].calculateInlineSuggestionPositionCalls = 'n/a'
    writePerfNote(cwd, commits.mergeBase, baseline, 'refs/notes/test-perf')
    const stdout = createMemoryWriteStream()
    const stderr = createMemoryWriteStream()

    const exitCode = runPerfNotesCli(['check'], {
      repositoryRoot: cwd,
      env: {
        ...process.env,
        PERF_COMMAND: perfCommand,
        PERF_NOTES_REF: 'refs/notes/test-perf',
        PERF_TARGET_REF: 'origin/master',
      },
      stdout: stdout as unknown as NodeJS.WriteStream,
      stderr: stderr as unknown as NodeJS.WriteStream,
    })

    expect(exitCode).toBe(1)
    expect(stderr.toString()).toContain('Perf regressions detected')
    expect(stderr.toString()).toContain('Skipped baseline metrics')
    expect(stdout.toString()).toBe('')
  })

  it('reports a passing check and skipped metrics through the CLI', () => {
    const { commits, cwd } = createFeatureRepository()
    const perfCommand = createPerfCommand(`${SAMPLE_PERF_OUTPUT}\n`)
    const baseline = parsePerfOutput(SAMPLE_PERF_OUTPUT, perfCommand)
    baseline.metrics['inline-layout'].calculateInlineSuggestionPositionCalls = 'n/a'
    writePerfNote(cwd, commits.mergeBase, baseline, 'refs/notes/test-perf')
    const stdout = createMemoryWriteStream()
    const stderr = createMemoryWriteStream()

    const exitCode = runPerfNotesCli(['check'], {
      repositoryRoot: cwd,
      env: {
        ...process.env,
        PERF_COMMAND: perfCommand,
        PERF_NOTES_REF: 'refs/notes/test-perf',
        PERF_TARGET_REF: 'origin/master',
      },
      stdout: stdout as unknown as NodeJS.WriteStream,
      stderr: stderr as unknown as NodeJS.WriteStream,
    })

    expect(exitCode).toBe(0)
    expect(stdout.toString()).toContain(`Perf check passed against ${commits.mergeBase}.`)
    expect(stdout.toString()).toContain('Skipped baseline metrics')
    expect(stderr.toString()).toBe('')
  })

  it('prints CLI usage for unknown subcommands', () => {
    const stdout = createMemoryWriteStream()
    const stderr = createMemoryWriteStream()

    const exitCode = runPerfNotesCli(['nope'], {
      repositoryRoot: process.cwd(),
      env: {
        ...process.env,
        PERF_COMMAND,
      },
      stdout: stdout as unknown as NodeJS.WriteStream,
      stderr: stderr as unknown as NodeJS.WriteStream,
    })

    expect(exitCode).toBe(1)
    expect(stdout.toString()).toBe('')
    expect(stderr.toString()).toBe('Usage: node scripts/perf-notes.mjs <record|check>\n')
  })
})
