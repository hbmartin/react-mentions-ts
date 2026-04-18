#!/usr/bin/env node

import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url)
const { runPerfNotesCli } = await jiti.import('../src/test/perfNotes.ts')

process.exit(runPerfNotesCli(process.argv.slice(2)))
