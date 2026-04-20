import React from 'react'
import type { ReactNode } from 'react'
import { appendFileSync } from 'node:fs'

export interface RenderCounter {
  Probe: (props: { label: string; children?: ReactNode }) => React.ReactElement
  getCount: (label: string) => number
  reset: () => void
}

export const createRenderCounter = (): RenderCounter => {
  const counts = new Map<string, number>()

  const Probe = ({ label, children }: { label: string; children?: ReactNode }) => {
    counts.set(label, (counts.get(label) ?? 0) + 1)
    return <>{children}</>
  }

  return {
    Probe,
    getCount: (label) => counts.get(label) ?? 0,
    reset: () => {
      counts.clear()
    },
  }
}

export const emitPerformanceMetric = (
  name: string,
  metrics: Record<string, number | string>
): void => {
  const line = `[perf] ${name} ${JSON.stringify(metrics)}`
  process.stdout.write(`${line}\n`)

  const outputFile = process.env.PERF_OUTPUT_FILE
  if (typeof outputFile === 'string' && outputFile.length > 0) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- perf tests opt into a specific output file path
    appendFileSync(outputFile, `${line}\n`, 'utf8')
  }
}
