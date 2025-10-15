#!/usr/bin/env node
const { writeFileSync, mkdirSync, rmSync, readdirSync, renameSync } = require('node:fs')
const { join } = require('node:path')

const cjsDir = join(__dirname, '..', 'dist', 'cjs')

mkdirSync(cjsDir, { recursive: true })

writeFileSync(
  join(cjsDir, 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 2),
  'utf8'
)

// Rename .d.ts files to .d.cts in the CJS directory
function renameDtsFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      renameDtsFiles(fullPath)
    } else if (entry.name.endsWith('.d.ts')) {
      const newPath = fullPath.replace(/\.d\.ts$/, '.d.cts')
      renameSync(fullPath, newPath)
    } else if (entry.name.endsWith('.d.ts.map')) {
      const newPath = fullPath.replace(/\.d\.ts\.map$/, '.d.cts.map')
      renameSync(fullPath, newPath)
    }
  }
}

renameDtsFiles(cjsDir)

for (const infoFile of [
  ['esm', 'tsconfig.build.esm.tsbuildinfo'],
  ['cjs', 'tsconfig.build.cjs.tsbuildinfo'],
]) {
  const target = join(__dirname, '..', 'dist', infoFile[0], infoFile[1])
  rmSync(target, { force: true })
}
