import React from 'react'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { render } from '@testing-library/react'
import { createRenderCounter, emitPerformanceMetric } from './performance'

describe('performance helpers', () => {
  it('tracks render counts and resets them', () => {
    const { Probe, getCount, reset } = createRenderCounter()
    const { rerender } = render(
      <Probe label="alpha">
        <span>First render</span>
      </Probe>
    )

    expect(getCount('alpha')).toBe(1)
    expect(getCount('missing')).toBe(0)

    rerender(
      <Probe label="alpha">
        <span>Second render</span>
      </Probe>
    )

    expect(getCount('alpha')).toBe(2)

    reset()

    expect(getCount('alpha')).toBe(0)
  })

  it('emits performance metrics to stdout', () => {
    const stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const originalPerfOutputFile = process.env.PERF_OUTPUT_FILE

    try {
      delete process.env.PERF_OUTPUT_FILE

      emitPerformanceMetric('render-pass', {
        count: 2,
      })

      expect(stdoutWriteSpy).toHaveBeenCalledWith('[perf] render-pass {"count":2}\n')
    } finally {
      if (originalPerfOutputFile === undefined) {
        delete process.env.PERF_OUTPUT_FILE
      } else {
        process.env.PERF_OUTPUT_FILE = originalPerfOutputFile
      }
      stdoutWriteSpy.mockRestore()
    }
  })

  it('appends performance metrics to the configured output file', () => {
    const stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const originalPerfOutputFile = process.env.PERF_OUTPUT_FILE
    const directory = mkdtempSync(path.join(tmpdir(), 'react-mentions-ts-performance-spec-'))
    const outputFile = path.join(directory, 'perf.log')

    try {
      process.env.PERF_OUTPUT_FILE = outputFile

      emitPerformanceMetric('array-provider-scan-count', {
        resultCount: 5,
        scanCount: 5,
      })

      // eslint-disable-next-line security/detect-non-literal-fs-filename -- test owns this temporary output path.
      expect(readFileSync(outputFile, 'utf8')).toBe(
        '[perf] array-provider-scan-count {"resultCount":5,"scanCount":5}\n'
      )
    } finally {
      if (originalPerfOutputFile === undefined) {
        delete process.env.PERF_OUTPUT_FILE
      } else {
        process.env.PERF_OUTPUT_FILE = originalPerfOutputFile
      }
      stdoutWriteSpy.mockRestore()
      rmSync(directory, { force: true, recursive: true })
    }
  })
})
