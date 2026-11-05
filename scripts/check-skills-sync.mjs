#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const sourceDir = join(rootDir, 'best-practices')
const skillsDir = join(rootDir, '.claude', 'skills')

const sources = new Set((await readdir(sourceDir)).filter((name) => name.endsWith('.md')))
const mapped = new Map()
const problems = []

for (const skill of await readdir(skillsDir)) {
  const referencesDir = join(skillsDir, skill, 'references')
  let references
  try {
    references = await readdir(referencesDir)
  } catch {
    continue
  }

  for (const reference of references) {
    if (!sources.has(reference)) {
      problems.push(`${skill}/references/${reference}: no matching source in best-practices/`)
      continue
    }

    if (mapped.has(reference)) {
      problems.push(`${reference}: mapped to both ${mapped.get(reference)} and ${skill}`)
      continue
    }

    mapped.set(reference, skill)

    const [source, copy] = await Promise.all([
      readFile(join(sourceDir, reference)),
      readFile(join(referencesDir, reference)),
    ])

    if (!source.equals(copy)) {
      problems.push(`${skill}/references/${reference}: differs from best-practices/${reference}`)
    }
  }
}

for (const source of sources) {
  if (!mapped.has(source)) {
    problems.push(`best-practices/${source}: not mapped to any skill`)
  }
}

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(problem)
  }
  process.exit(1)
}

console.log(`skills in sync: ${mapped.size} rule files match best-practices/`)
