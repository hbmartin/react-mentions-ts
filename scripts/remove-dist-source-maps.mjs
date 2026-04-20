#!/usr/bin/env node

import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const distDir = new URL('../dist/', import.meta.url)
const sourceMapCommentPattern = /\n\/\/# sourceMappingURL=.*\.map\s*$/u

for (const fileName of await readdir(distDir)) {
  const filePath = join(distDir.pathname, fileName)

  if (fileName.endsWith('.map')) {
    await rm(filePath)
    continue
  }

  if (
    !fileName.endsWith('.js') &&
    !fileName.endsWith('.cjs') &&
    !fileName.endsWith('.d.ts') &&
    !fileName.endsWith('.d.cts')
  ) {
    continue
  }

  const contents = await readFile(filePath, 'utf8')
  const nextContents = contents.replace(sourceMapCommentPattern, '\n')

  if (nextContents !== contents) {
    await writeFile(filePath, nextContents)
  }
}
