import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const PERF_NOTES_REF = 'refs/notes/perf'
const PERF_TARGET_REF = 'origin/master'
export const PERF_COMMAND = 'pnpm test:perf'
const PERF_SCHEMA_VERSION = 1
const PERF_SUITE = 'react-mentions-ts/perf'

interface PerfNotePayload {
  command: string
  metrics: Record<string, Record<string, number | string>>
  schemaVersion: number
  suite: string
}

interface PerfRegression {
  baseline: number
  candidate: number
  metric: string
  scenario: string
}

interface PerfComparisonSkippedMetric {
  metric: string
  reason: 'baseline-missing-or-non-numeric'
  scenario: string
}

interface PerfComparisonError {
  metric: string
  reason: 'candidate-missing-or-non-numeric'
  scenario: string
}

interface PerfComparisonResult {
  errors: PerfComparisonError[]
  regressions: PerfRegression[]
  skipped: PerfComparisonSkippedMetric[]
}

interface BaselineLookupResult {
  baselineCommit: string | null
  mergeBase: string
  note: PerfNotePayload | null
}

interface CheckPerfAgainstBaselineResult {
  baselineCommit: string | null
  baselineNote: PerfNotePayload | null
  candidateNote: PerfNotePayload
  comparison: PerfComparisonResult
  mergeBase: string
  status: 'failed' | 'missing-baseline' | 'passed'
}

interface CommandResult {
  stderr: string
  stdout: string
}

interface ParsedCommandLine {
  args: string[]
  command: string
}

interface RunCommandOptions {
  env?: NodeJS.ProcessEnv
  repositoryRoot: string
}

const PERF_LINE_PATTERN = /^\[perf] (?<scenario>\S+) (?<metrics>{.+})$/

interface CommandArgumentParseState {
  args: string[]
  current: string
  inArgument: boolean
  quote: '"' | "'" | null
}

const PERF_COMPARISON_MANIFEST = [
  ['array-provider-scan-count', 'scanCount'],
  ['accent-provider-scan-count', 'scanCount'],
  ['controlled-keystroke', 'getPlainTextCalls'],
  ['controlled-keystroke', 'deriveMentionValueSnapshotCalls'],
  ['controlled-keystroke', 'prepareMentionsInputChildrenCalls'],
  ['selection-only', 'deriveMentionValueSnapshotCalls'],
  ['inline-layout', 'calculateSuggestionsPositionCalls'],
  ['inline-layout', 'calculateInlineSuggestionPositionCalls'],
  ['overlay-layout', 'calculateSuggestionsPositionCalls'],
  ['overlay-layout', 'calculateInlineSuggestionPositionCalls'],
  ['locality-render-counts', 'stableSiblingRendersDuringInteraction'],
  ['locality-render-counts', 'activeBranchRendersDuringInteraction'],
  ['debounced-async-query', 'providerCalls'],
  ['stale-async-result', 'staleResultApplications'],
  ['long-document-caret-mapping', 'mapPlainTextIndexCalls'],
  ['long-document-caret-mapping', 'deriveMentionValueSnapshotCalls'],
  ['paste-replace-mention', 'applyPasteToMentionsValueCalls'],
  ['paste-replace-mention', 'mapPlainTextIndexCalls'],
  ['paste-replace-mention', 'getPlainTextCalls'],
  ['delete-around-mention', 'applyInputChangeToMentionsValueCalls'],
  ['delete-around-mention', 'applyChangeToValueCalls'],
  ['delete-around-mention', 'mapPlainTextIndexCalls'],
  ['multiple-trigger-query-routing', 'activeProviderCalls'],
  ['multiple-trigger-query-routing', 'inactiveProviderCalls'],
  ['multiple-trigger-query-routing', 'prepareMentionsInputChildrenCalls'],
  ['overlay-navigation-layout', 'calculateSuggestionsPositionCalls'],
  ['overlay-navigation-layout', 'calculateInlineSuggestionPositionCalls'],
  ['controlled-rerender-stability', 'deriveMentionValueSnapshotCalls'],
  ['controlled-rerender-stability', 'prepareMentionsInputChildrenCalls'],
  ['suggestions-measurement-events', 'updateSuggestionsPositionCalls'],
  ['auto-resize-keystroke', 'getTextareaResizePatchCalls'],
  ['auto-resize-keystroke', 'applyTextareaResizePatchCalls'],
] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeMetricRecord = (
  value: unknown,
  context: string
): Record<string, number | string> => {
  if (!isRecord(value)) {
    throw new TypeError(`${context} must be an object`)
  }

  const normalizedMetrics: Record<string, number | string> = {}
  for (const [key, metricValue] of Object.entries(value)) {
    if (typeof metricValue !== 'number' && typeof metricValue !== 'string') {
      throw new TypeError(`${context}.${key} must be a string or number`)
    }

    normalizedMetrics[key] = metricValue
  }

  return normalizedMetrics
}

const normalizePerfNotePayload = (value: unknown, expectedCommand?: string): PerfNotePayload => {
  if (!isRecord(value)) {
    throw new TypeError('Perf note payload must be an object')
  }

  const { command, metrics, schemaVersion, suite } = value

  if (schemaVersion !== PERF_SCHEMA_VERSION) {
    throw new Error(`Unsupported perf note schema version: ${String(schemaVersion)}`)
  }

  if (typeof command !== 'string' || command.length === 0) {
    throw new TypeError('Perf note command must be a non-empty string')
  }

  if (typeof expectedCommand === 'string' && command !== expectedCommand) {
    throw new Error(`Unsupported perf note command: ${command}`)
  }

  if (suite !== PERF_SUITE) {
    throw new Error(`Unsupported perf note suite: ${String(suite)}`)
  }

  if (!isRecord(metrics)) {
    throw new TypeError('Perf note metrics must be an object')
  }

  const normalizedMetrics: Record<string, Record<string, number | string>> = {}
  for (const [scenario, scenarioMetrics] of Object.entries(metrics)) {
    normalizedMetrics[scenario] = normalizeMetricRecord(scenarioMetrics, `metrics.${scenario}`)
  }

  return {
    command,
    metrics: normalizedMetrics,
    schemaVersion,
    suite,
  }
}

const pushCurrentCommandArgument = (state: CommandArgumentParseState): void => {
  if (state.inArgument) {
    state.args.push(state.current)
    state.current = ''
    state.inArgument = false
  }
}

const appendCommandArgumentCharacter = (
  state: CommandArgumentParseState,
  commandLine: string,
  index: number
): number => {
  const char = commandLine[index]

  if (char === '\\') {
    const nextChar = commandLine.charAt(index + 1)

    if (
      nextChar.length > 0 &&
      (nextChar === '\\' || nextChar === '"' || nextChar === "'" || /\s/u.test(nextChar))
    ) {
      state.inArgument = true
      state.current += nextChar
      return index + 1
    }

    state.inArgument = true
    state.current += '\\'
    return index
  }

  if (state.quote !== null) {
    if (char === state.quote) {
      state.quote = null
    } else {
      state.inArgument = true
      state.current += char
    }
    return index
  }

  if (char === '"' || char === "'") {
    state.quote = char
    state.inArgument = true
    return index
  }

  if (/\s/u.test(char)) {
    pushCurrentCommandArgument(state)
    return index
  }

  state.inArgument = true
  state.current += char
  return index
}

const parseCommandArguments = (commandLine: string): string[] => {
  const state: CommandArgumentParseState = {
    args: [],
    current: '',
    inArgument: false,
    quote: null,
  }

  let index = 0
  while (index < commandLine.length) {
    index = appendCommandArgumentCharacter(state, commandLine, index) + 1
  }

  if (state.quote !== null) {
    throw new Error(`Unterminated quoted string in perf command: ${commandLine}`)
  }

  pushCurrentCommandArgument(state)

  return state.args
}

export const parseCommandLine = (commandLine: string): ParsedCommandLine => {
  if (commandLine === process.execPath) {
    return {
      args: [],
      command: process.execPath,
    }
  }

  if (commandLine.startsWith(`${process.execPath} `)) {
    return {
      args: parseCommandArguments(commandLine.slice(process.execPath.length)),
      command: process.execPath,
    }
  }

  const [command, ...args] = parseCommandArguments(commandLine)
  if (typeof command !== 'string' || command.length === 0) {
    throw new TypeError('Perf command must be a non-empty string')
  }

  return {
    args,
    command,
  }
}

const runCommand = (command: string, args: string[], options: RunCommandOptions): CommandResult => {
  const result = spawnSync(command, args, {
    // eslint-disable-next-line code-complete/enforce-meaningful-names -- child_process uses the standard cwd option name.
    cwd: options.repositoryRoot,
    encoding: 'utf8',
    env: options.env ?? process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.error) {
    throw result.error
  }

  const stderr = result.stderr
  const stdout = result.stdout

  if (result.status !== 0) {
    const renderedCommand = [command, ...args].join(' ')
    const error = new Error(
      [`Command failed: ${renderedCommand}`, stdout.trim(), stderr.trim()]
        .filter(Boolean)
        .join('\n')
    )
    Object.assign(error, { stderr, stdout })
    throw error
  }

  return {
    stderr,
    stdout,
  }
}

const runGit = (repositoryRoot: string, args: string[]): CommandResult =>
  runCommand('git', args, { repositoryRoot })

const tryShowPerfNote = (
  repositoryRoot: string,
  commit: string,
  notesRef: string
): string | null => {
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- git notes are the canonical storage for perf metadata in this repository.
  const result = spawnSync('git', ['notes', `--ref=${notesRef}`, 'show', commit], {
    // eslint-disable-next-line code-complete/enforce-meaningful-names -- child_process uses the standard cwd option name.
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.error) {
    throw result.error
  }

  if (result.status === 0) {
    return result.stdout
  }

  const stderr = result.stderr
  if (stderr.includes('no note found')) {
    return null
  }

  throw new Error(
    [`Failed to read git note for ${commit} from ${notesRef}`, result.stdout.trim(), stderr.trim()]
      .filter(Boolean)
      .join('\n')
  )
}

const resolvePnpmPerfOutput = (
  repositoryRoot: string,
  env?: NodeJS.ProcessEnv,
  perfCommand = PERF_COMMAND
): string => {
  const { args, command } = parseCommandLine(perfCommand)

  try {
    return runCommand(command, args, {
      env: {
        ...process.env,
        ...env,
      },
      repositoryRoot,
    }).stdout
  } catch (error) {
    const commandError = error as {
      stderr?: string | Buffer
      stdout?: string | Buffer
    }
    const stderr = String(commandError.stderr ?? '').trim()
    const stdout = String(commandError.stdout ?? '').trim()
    throw new Error(
      [`Perf command failed: ${perfCommand}`, stdout, stderr].filter(Boolean).join('\n'),
      {
        cause: error,
      }
    )
  }
}

const resolveBaselineStartCommit = (
  repositoryRoot: string,
  head: string,
  targetRef: string,
  explicitBaselineCommit?: string
): { mergeBase: string; startCommit: string } => {
  if (typeof explicitBaselineCommit === 'string' && explicitBaselineCommit.length > 0) {
    return {
      mergeBase: explicitBaselineCommit,
      startCommit: explicitBaselineCommit,
    }
  }

  const mergeBase = runGit(repositoryRoot, ['merge-base', head, targetRef]).stdout.trim()

  return {
    mergeBase,
    startCommit: mergeBase,
  }
}

export const parsePerfOutput = (output: string, command = PERF_COMMAND): PerfNotePayload => {
  const metricsByScenario = new Map<string, Record<string, number | string>>()

  for (const line of output.split(/\r?\n/u)) {
    const match = line.match(PERF_LINE_PATTERN)
    if (!match?.groups) {
      continue
    }

    const { metrics: rawMetrics, scenario } = match.groups

    if (metricsByScenario.has(scenario)) {
      throw new Error(`Duplicate perf scenario emitted: ${scenario}`)
    }

    metricsByScenario.set(scenario, normalizeMetricRecord(JSON.parse(rawMetrics), scenario))
  }

  if (metricsByScenario.size === 0) {
    throw new Error('No perf metrics were emitted by the perf command')
  }

  const normalizedMetrics: Record<string, Record<string, number | string>> = {}
  for (const [scenario, scenarioMetrics] of metricsByScenario) {
    normalizedMetrics[scenario] = scenarioMetrics
  }

  return {
    command,
    metrics: normalizedMetrics,
    schemaVersion: PERF_SCHEMA_VERSION,
    suite: PERF_SUITE,
  }
}

export const stringifyPerfNote = (payload: PerfNotePayload): string =>
  `${JSON.stringify(payload, null, 2)}\n`

export const readPerfNote = (
  repositoryRoot: string,
  commit: string,
  notesRef = PERF_NOTES_REF,
  expectedCommand?: string
): PerfNotePayload | null => {
  const rawNote = tryShowPerfNote(repositoryRoot, commit, notesRef)
  if (rawNote === null) {
    return null
  }

  return normalizePerfNotePayload(JSON.parse(rawNote), expectedCommand)
}

export const writePerfNote = (
  repositoryRoot: string,
  commit: string,
  payload: PerfNotePayload,
  notesRef = PERF_NOTES_REF
): void => {
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'react-mentions-ts-perf-note-'))
  const tempFile = path.join(tempDirectory, 'note.json')

  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- perf notes intentionally use a temporary file path for git notes input.
    writeFileSync(tempFile, stringifyPerfNote(payload), 'utf8')
    runGit(repositoryRoot, [
      'notes',
      `--ref=${notesRef}`,
      'add',
      '--force',
      '--file',
      tempFile,
      commit,
    ])
  } finally {
    rmSync(tempDirectory, { force: true, recursive: true })
  }
}

export const comparePerfNotes = (
  baseline: PerfNotePayload,
  candidate: PerfNotePayload
): PerfComparisonResult => {
  const errors: PerfComparisonError[] = []
  const regressions: PerfRegression[] = []
  const skipped: PerfComparisonSkippedMetric[] = []
  const baselineMetrics = baseline.metrics as Partial<
    Record<string, Record<string, number | string>>
  >
  const candidateMetrics = candidate.metrics as Partial<
    Record<string, Record<string, number | string>>
  >

  for (const [scenario, metric] of PERF_COMPARISON_MANIFEST) {
    const baselineValue = baselineMetrics[scenario]?.[metric]
    const candidateValue = candidateMetrics[scenario]?.[metric]

    if (typeof candidateValue !== 'number') {
      errors.push({
        metric,
        reason: 'candidate-missing-or-non-numeric',
        scenario,
      })
      continue
    }

    if (typeof baselineValue !== 'number') {
      skipped.push({
        metric,
        reason: 'baseline-missing-or-non-numeric',
        scenario,
      })
      continue
    }

    if (candidateValue > baselineValue) {
      regressions.push({
        baseline: baselineValue,
        candidate: candidateValue,
        metric,
        scenario,
      })
    }
  }

  return {
    errors,
    regressions,
    skipped,
  }
}

export const findNearestBaselineNote = (
  repositoryRoot: string,
  {
    baselineCommit,
    head = 'HEAD',
    notesRef = PERF_NOTES_REF,
    perfCommand,
    targetRef = PERF_TARGET_REF,
  }: {
    baselineCommit?: string
    head?: string
    notesRef?: string
    perfCommand?: string
    targetRef?: string
  } = {}
): BaselineLookupResult => {
  const resolvedBaseline = resolveBaselineStartCommit(
    repositoryRoot,
    head,
    targetRef,
    baselineCommit
  )
  const commits = runGit(repositoryRoot, [
    'rev-list',
    '--first-parent',
    resolvedBaseline.startCommit,
  ])
    .stdout.split(/\r?\n/u)
    .filter(Boolean)

  for (const commit of commits) {
    const note = readPerfNote(repositoryRoot, commit, notesRef, perfCommand)
    if (note !== null) {
      return {
        baselineCommit: commit,
        mergeBase: resolvedBaseline.mergeBase,
        note,
      }
    }
  }

  return {
    baselineCommit: null,
    mergeBase: resolvedBaseline.mergeBase,
    note: null,
  }
}

export const recordPerfNote = (
  repositoryRoot: string,
  {
    commit = 'HEAD',
    env,
    notesRef = PERF_NOTES_REF,
    perfCommand = PERF_COMMAND,
    perfOutput,
  }: {
    commit?: string
    env?: NodeJS.ProcessEnv
    notesRef?: string
    perfCommand?: string
    perfOutput?: string
  } = {}
): PerfNotePayload => {
  const payload = parsePerfOutput(
    perfOutput ?? resolvePnpmPerfOutput(repositoryRoot, env, perfCommand),
    perfCommand
  )
  writePerfNote(repositoryRoot, commit, payload, notesRef)
  return payload
}

export const checkPerfAgainstBaseline = (
  repositoryRoot: string,
  {
    baselineCommit,
    env,
    head = 'HEAD',
    notesRef = PERF_NOTES_REF,
    perfCommand = PERF_COMMAND,
    perfOutput,
    targetRef = PERF_TARGET_REF,
  }: {
    baselineCommit?: string
    env?: NodeJS.ProcessEnv
    head?: string
    notesRef?: string
    perfCommand?: string
    perfOutput?: string
    targetRef?: string
  } = {}
): CheckPerfAgainstBaselineResult => {
  const candidateNote = parsePerfOutput(
    perfOutput ?? resolvePnpmPerfOutput(repositoryRoot, env, perfCommand),
    perfCommand
  )
  const baseline = findNearestBaselineNote(repositoryRoot, {
    baselineCommit,
    head,
    notesRef,
    perfCommand,
    targetRef,
  })

  if (baseline.note === null) {
    return {
      baselineCommit: null,
      baselineNote: null,
      candidateNote,
      comparison: {
        errors: [],
        regressions: [],
        skipped: [],
      },
      mergeBase: baseline.mergeBase,
      status: 'missing-baseline',
    }
  }

  const comparison = comparePerfNotes(baseline.note, candidateNote)

  return {
    baselineCommit: baseline.baselineCommit,
    baselineNote: baseline.note,
    candidateNote,
    comparison,
    mergeBase: baseline.mergeBase,
    status: comparison.errors.length > 0 || comparison.regressions.length > 0 ? 'failed' : 'passed',
  }
}

const formatMetricList = (items: Array<{ metric: string; scenario: string }>): string =>
  items.map(({ metric, scenario }) => `- ${scenario}.${metric}`).join('\n')

const formatRegressions = (regressions: PerfRegression[]): string =>
  regressions
    .map(
      ({ baseline, candidate, metric, scenario }) =>
        `- ${scenario}.${metric}: candidate=${candidate} baseline=${baseline}`
    )
    .join('\n')

export const runPerfNotesCli = (
  argv: string[],
  {
    repositoryRoot = process.cwd(),
    env = process.env,
    stderr = process.stderr,
    stdout = process.stdout,
  }: {
    repositoryRoot?: string
    env?: NodeJS.ProcessEnv
    stderr?: NodeJS.WriteStream
    stdout?: NodeJS.WriteStream
  } = {}
): number => {
  const [subcommand] = argv
  const baselineCommit = env.PERF_BASELINE_COMMIT
  const notesRef = env.PERF_NOTES_REF ?? PERF_NOTES_REF
  const perfCommand = env.PERF_COMMAND ?? PERF_COMMAND
  const targetRef = env.PERF_TARGET_REF ?? PERF_TARGET_REF

  if (subcommand === 'record') {
    const payload = recordPerfNote(repositoryRoot, {
      commit: 'HEAD',
      env,
      notesRef,
      perfCommand,
    })
    const headCommit = runGit(repositoryRoot, ['rev-parse', '--short', 'HEAD']).stdout.trim()

    stdout.write(
      `Recorded perf note for ${headCommit} in ${notesRef} with ${Object.keys(payload.metrics).length} scenarios.\n`
    )
    return 0
  }

  if (subcommand === 'check') {
    const result = checkPerfAgainstBaseline(repositoryRoot, {
      baselineCommit,
      env,
      head: 'HEAD',
      notesRef,
      perfCommand,
      targetRef,
    })

    if (result.status === 'missing-baseline') {
      stdout.write(
        `No perf baseline note found from ${result.mergeBase} back on ${targetRef}; skipping regression check.\n`
      )
      return 0
    }

    if (result.comparison.errors.length > 0) {
      stderr.write(
        `Perf check could not compare required candidate metrics:\n${formatMetricList(result.comparison.errors)}\n`
      )
      return 1
    }

    if (result.comparison.regressions.length > 0) {
      stderr.write(
        `Perf regressions detected against ${result.baselineCommit}:\n${formatRegressions(result.comparison.regressions)}\n`
      )
      if (result.comparison.skipped.length > 0) {
        stderr.write(`Skipped baseline metrics:\n${formatMetricList(result.comparison.skipped)}\n`)
      }
      return 1
    }

    stdout.write(`Perf check passed against ${result.baselineCommit}.\n`)
    if (result.comparison.skipped.length > 0) {
      stdout.write(`Skipped baseline metrics:\n${formatMetricList(result.comparison.skipped)}\n`)
    }
    return 0
  }

  stderr.write('Usage: node scripts/perf-notes.mjs <record|check>\n')
  return 1
}
