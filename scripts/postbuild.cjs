#!/usr/bin/env node
const { writeFileSync, mkdirSync, rmSync } = require('node:fs')
const { join } = require('node:path')

const cjsDir = join(__dirname, '..', 'dist', 'cjs')

mkdirSync(cjsDir, { recursive: true })

writeFileSync(
  join(cjsDir, 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 2),
  'utf8'
)

for (const infoFile of [
  ['esm', 'tsconfig.build.esm.tsbuildinfo'],
  ['cjs', 'tsconfig.build.cjs.tsbuildinfo'],
]) {
  const target = join(__dirname, '..', 'dist', infoFile[0], infoFile[1])
  rmSync(target, { force: true })
}
