#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const result = spawnSync('oxlint', ['src', '--format', 'json'], {
  encoding: 'utf8',
})
const exitCode = result.status ?? 1

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

if (result.stderr.length > 0) {
  process.stderr.write(result.stderr)
}

let payload
try {
  payload = JSON.parse(result.stdout)
} catch {
  process.stdout.write(result.stdout)
  process.exit(exitCode)
}

const diagnostics = Array.isArray(payload.diagnostics) ? payload.diagnostics : []
const counts = new Map()

for (const diagnostic of diagnostics) {
  const code = typeof diagnostic.code === 'string' ? diagnostic.code : 'unknown'
  counts.set(code, (counts.get(code) ?? 0) + 1)
}

const ruleCounts = [...counts]
  .map(([rule, count]) => ({ rule, count }))
  .toSorted((left, right) => right.count - left.count || left.rule.localeCompare(right.rule))

process.stdout.write(`${JSON.stringify(ruleCounts, null, 2)}\n`)
if (exitCode !== 0) {
  process.exit(exitCode)
}
