#!/usr/bin/env node

import { spawn } from 'node:child_process'

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

const child = spawn(pnpmCommand, ['vite', '--config', 'demo/vite.config.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_WDYR: 'true',
  },
})

child.on('error', (error) => {
  console.error('Failed to start dev server:', error)
  process.exit(1)
})

child.on('close', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
