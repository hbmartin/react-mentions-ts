#!/usr/bin/env node

import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const distDir = new URL('../dist/', import.meta.url)
const distPath = fileURLToPath(distDir)
const sourceMapCommentPattern = /(\r?\n)\/\/# sourceMappingURL=.*\.map\s*$/u
const outputExtensions = ['.js', '.cjs', '.mjs', '.d.ts', '.d.cts', '.d.mts']

const cleanSourceMaps = async (directoryPath) => {
  const entries = await readdir(directoryPath, { withFileTypes: true })

  for (const entry of entries) {
    const filePath = join(directoryPath, entry.name)

    if (entry.isDirectory()) {
      await cleanSourceMaps(filePath)
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    if (entry.name.endsWith('.map')) {
      await rm(filePath)
      continue
    }

    if (!outputExtensions.some((extension) => entry.name.endsWith(extension))) {
      continue
    }

    const contents = await readFile(filePath, 'utf8')
    const nextContents = contents.replace(sourceMapCommentPattern, '$1')

    if (nextContents !== contents) {
      await writeFile(filePath, nextContents)
    }
  }
}

await cleanSourceMaps(distPath)
