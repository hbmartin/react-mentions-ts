#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = process.cwd()
const packageJsonPath = resolve(root, 'package.json')
const distEntry = resolve(root, 'dist/index.js')
const reactExternals = ['react', 'react-dom', 'react/jsx-runtime']

const ownFeatureMarkers = [
  { label: 'LoadingIndicator', value: 'function LoadingIndicator' },
  { label: 'SuggestionsOverlay', value: 'function SuggestionsOverlay' },
  { label: 'inline suggestion UI', value: 'inline-suggestion-live-region' },
  { label: 'inline suggestion fallback', value: 'No inline suggestions available' },
]

const splitCandidateRegions = [
  'src/LoadingIndicator.tsx',
  'src/SuggestionsOverlay.tsx',
  'src/MentionsInputInlineSuggestion.tsx',
  'src/MentionsInputSelectors.ts',
]

const formatBytes = (bytes) => {
  const kib = bytes / 1024

  return `${kib.toFixed(2)} KiB`
}

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'))

const fail = (message) => {
  console.error(`tree-shake report failed: ${message}`)
  process.exit(1)
}

const readPackReport = () => {
  const output = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const parsed = JSON.parse(output)

  if (!Array.isArray(parsed) || parsed.length === 0) {
    fail('npm pack --dry-run --json returned no package entries')
  }

  return parsed[0]
}

const writeFixtureBundle = async ({ fixture, outDir }) => {
  const entry = join(outDir, `${fixture.name}.js`)
  const bundleDir = join(outDir, fixture.name)

  await writeFile(entry, fixture.source)
  await mkdir(bundleDir, { recursive: true })
  await build({
    logLevel: 'silent',
    build: {
      emptyOutDir: true,
      minify: false,
      outDir: bundleDir,
      lib: {
        entry,
        formats: ['es'],
        fileName: () => 'bundle.js',
      },
      rollupOptions: {
        external: reactExternals,
      },
    },
  })

  return readFile(join(bundleDir, 'bundle.js'), 'utf8')
}

const inspectMarkers = (bundle) =>
  ownFeatureMarkers.map((marker) => ({
    ...marker,
    present: bundle.includes(marker.value),
  }))

const describeMarkers = (markers) =>
  markers.map((marker) => `${marker.label}: ${marker.present ? 'present' : 'absent'}`).join(', ')

const getRegionSize = (bundle, region) => {
  const marker = `//#region ${region}`
  const start = bundle.indexOf(marker)

  if (start === -1) {
    return null
  }

  const nextRegion = bundle.indexOf('//#region ', start + marker.length)
  const end = nextRegion === -1 ? bundle.length : nextRegion

  return end - start
}

const main = async () => {
  const packageJson = await readJson(packageJsonPath)

  if (packageJson.sideEffects !== false) {
    fail('package.json must declare "sideEffects": false')
  }

  let distBundle

  try {
    distBundle = await readFile(distEntry, 'utf8')
  } catch (error) {
    fail(`missing ${distEntry}; run pnpm build before this report`)
  }

  const packReport = readPackReport()
  const tmp = await mkdtemp(join(tmpdir(), 'react-mentions-ts-tree-shake-'))
  const distEntrySpecifier = pathToFileURL(distEntry).href
  const fixtures = [
    {
      name: 'mention-utility-only',
      description: 'Mention + utility only',
      source: `import { Mention, getSubstringIndex } from ${JSON.stringify(distEntrySpecifier)}
console.log(Mention, getSubstringIndex('abc', 'b', 0))
`,
    },
    {
      name: 'mentions-input',
      description: 'MentionsInput shell',
      source: `import { Mention, MentionsInput } from ${JSON.stringify(distEntrySpecifier)}
console.log(Mention, MentionsInput)
`,
    },
  ]

  try {
    const results = []

    for (const fixture of fixtures) {
      const bundle = await writeFixtureBundle({ fixture, outDir: tmp })

      results.push({
        ...fixture,
        size: Buffer.byteLength(bundle),
        markers: inspectMarkers(bundle),
      })
    }

    const mentionOnly = results.find((result) => result.name === 'mention-utility-only')
    const mentionsInput = results.find((result) => result.name === 'mentions-input')

    if (!mentionOnly || !mentionsInput) {
      fail('fixture report was incomplete')
    }

    const leakedMarkers = mentionOnly.markers.filter((marker) => marker.present)

    if (leakedMarkers.length > 0) {
      fail(
        `Mention + utility fixture retained unused feature markers: ${leakedMarkers
          .map((marker) => marker.label)
          .join(', ')}`
      )
    }

    const missingStaticMarkers = mentionsInput.markers.filter((marker) => !marker.present)

    if (missingStaticMarkers.length > 0) {
      fail(
        `MentionsInput fixture no longer contains expected static feature markers: ${missingStaticMarkers
          .map((marker) => marker.label)
          .join(', ')}`
      )
    }

    console.log('SideEffects tree-shake report')
    console.log(`sideEffects: ${String(packageJson.sideEffects)}`)
    console.log(
      `npm pack: ${packReport.filename}; packed ${formatBytes(packReport.size)}; unpacked ${formatBytes(packReport.unpackedSize)}; files ${packReport.entryCount}`
    )
    console.log('')
    console.log('Consumer fixture bundles:')

    for (const result of results) {
      console.log(
        `- ${result.description}: ${formatBytes(result.size)} (${describeMarkers(result.markers)})`
      )
    }

    console.log('')
    console.log('Current split candidates inside dist/index.js:')

    for (const region of splitCandidateRegions) {
      const size = getRegionSize(distBundle, region)
      const formattedSize = size === null ? 'not found' : formatBytes(size)

      console.log(`- ${region}: ${formattedSize}`)
    }

    console.log('')
    console.log(
      'MentionsInput still statically imports overlay, loading, and inline-suggestion code; consumers that only import Mention/utilities can shake those branches.'
    )
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}

await main()
