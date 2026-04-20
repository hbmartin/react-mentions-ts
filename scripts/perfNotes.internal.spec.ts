describe('perfNotes internal error paths', () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock('node:child_process')
  })

  it('rethrows spawn errors when recording git notes if git cannot be resolved', async () => {
    const { recordPerfNote } = await import('./perfNotes')
    const originalPath = process.env.PATH

    try {
      process.env.PATH = ''
      expect(() =>
        recordPerfNote(process.cwd(), {
          perfOutput: '[perf] scenario {"count":1}',
        })
      ).toThrow(/ENOENT/u)
    } finally {
      process.env.PATH = originalPath
    }
  })

  it('rethrows spawn errors when reading git notes if git cannot be resolved', async () => {
    const { readPerfNote } = await import('./perfNotes')
    const originalPath = process.env.PATH

    try {
      process.env.PATH = ''
      expect(() => readPerfNote(process.cwd(), 'HEAD')).toThrow(/ENOENT/u)
    } finally {
      process.env.PATH = originalPath
    }
  })

  it('wraps perf command failures even when stdout and stderr are absent', async () => {
    const execError = new Error('perf failed')
    vi.doMock('node:child_process', async (importOriginal) => {
      const actual = await importOriginal<Record<string, unknown>>()
      return {
        ...actual,
        spawnSync: vi.fn(() => {
          return {
            error: execError,
          }
        }),
      }
    })

    const { recordPerfNote } = await import('./perfNotes')

    expect(() =>
      recordPerfNote(process.cwd(), {
        perfCommand: 'pnpm broken:perf',
      })
    ).toThrow('Perf command failed: pnpm broken:perf')
  })
})
