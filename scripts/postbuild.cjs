#!/usr/bin/env node
const {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} = require('node:fs')
const { dirname, join, resolve } = require('node:path')

const distDir = join(__dirname, '..', 'dist')
const esmDir = join(distDir, 'esm')

if (!existsSync(esmDir)) {
  throw new Error('Expected ESM build output in dist/esm; did the TypeScript build run?')
}

const JS_EXTENSION = '.js'
const FROM_SPECIFIER_PATTERN = /(from\s+['"])(\.{1,2}\/[^'"]+)(['"])/g
const BARE_IMPORT_PATTERN = /(import\s+['"])(\.{1,2}\/[^'"]+)(['"])/g

function normalizeSpecifier(spec, filePath) {
  if (!spec.startsWith('.')) {
    return spec
  }

  if (/\.(?:[cm]?js|json|node)$/i.test(spec)) {
    return spec
  }

  const absoluteTarget = resolve(dirname(filePath), spec)
  const candidateFile = `${absoluteTarget}${JS_EXTENSION}`
  if (existsSync(candidateFile)) {
    return `${spec}${JS_EXTENSION}`
  }

  if (existsSync(absoluteTarget) && statSync(absoluteTarget).isDirectory()) {
    const indexCandidate = join(absoluteTarget, `index${JS_EXTENSION}`)
    if (existsSync(indexCandidate)) {
      return `${spec.replace(/\/$/, '')}/index${JS_EXTENSION}`
    }
  }

  return spec
}

function rewriteSpecifiers(filePath) {
  const original = readFileSync(filePath, 'utf8')
  let updated = original

  const replace = (pattern) =>
    updated.replace(pattern, (match, prefix, specifier, suffix) => {
      const normalized = normalizeSpecifier(specifier, filePath)
      if (normalized !== specifier) {
        return `${prefix}${normalized}${suffix}`
      }
      return match
    })

  updated = replace(FROM_SPECIFIER_PATTERN)
  updated = replace(BARE_IMPORT_PATTERN)

  if (updated !== original) {
    writeFileSync(filePath, updated)
  }
}

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath)
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.js') || entry.name.endsWith('.d.ts')) {
        rewriteSpecifiers(fullPath)
      }
    }
  }
}

walk(esmDir)

const tsBuildInfo = join(esmDir, 'tsconfig.build.esm.tsbuildinfo')
if (existsSync(tsBuildInfo)) {
  rmSync(tsBuildInfo)
}
