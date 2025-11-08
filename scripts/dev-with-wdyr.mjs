#!/usr/bin/env node

import { spawn } from 'node:child_process'

const child = spawn('vite', ['--config', 'demo/vite.config.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_WDYR: 'true',
  },
})

child.on('close', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
