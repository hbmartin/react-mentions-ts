import { createRequire } from 'node:module'
import jscodeshift from 'jscodeshift'

const require = createRequire(import.meta.url)

interface TransformApi {
  jscodeshift: typeof jscodeshift
  report: (message: string) => void
}

type Transform = (
  fileInfo: { path: string; source: string },
  api: TransformApi,
  options?: Record<string, unknown>
) => string

const transform = require('../../codemods/react-mentions-to-react-mentions-ts.cjs') as Transform

const applyCodemod = (source: string, path = 'fixture.tsx') => {
  const reports: string[] = []
  const output = transform(
    { path, source },
    {
      jscodeshift,
      report: (message) => reports.push(message),
    },
    {}
  )

  return { output, reports }
}

describe('react-mentions-to-react-mentions-ts codemod', () => {
  it('migrates ESM imports, inline handlers, static query options, and regex markup pairs', () => {
    const { output, reports } = applyCodemod(`
      import { MentionsInput, Mention } from 'react-mentions'

      export function Example({ value, setValue, users, handleBlur, record }) {
        return (
          <MentionsInput
            value={value}
            onChange={(event, newValue, newPlainTextValue, mentions) => {
              event?.preventDefault()
              setValue(newValue, newPlainTextValue, mentions)
            }}
            onBlur={handleBlur}
            allowSuggestionsAboveCursor
            allowSpaceInQuery
            ignoreAccents
          >
            <Mention
              trigger="@"
              data={users}
              onAdd={(id, display, startPos, endPos) =>
                record(id, display, startPos, endPos)}
              markup="@[__display__](__id__)"
              regex={/@\\[(.+?)]\\((.+?)\\)/}
            />
          </MentionsInput>
        )
      }
    `)

    const compactOutput = output.replaceAll(/\s+/g, ' ')

    expect(reports).toEqual([])
    expect(output).toContain(
      "import { MentionsInput, Mention, makeTriggerRegex, createMarkupSerializer } from 'react-mentions-ts'"
    )
    expect(output).toContain('onMentionsChange={')
    expect(output).toContain('value: newValue')
    expect(output).toContain('plainTextValue: newPlainTextValue')
    expect(output).toContain('const event = trigger.nativeEvent')
    expect(output).toContain('onMentionBlur={handleBlur}')
    expect(output).toMatch(/suggestionsPlacement=['"]auto['"]/)
    expect(output).toContain("trigger={makeTriggerRegex('@', {")
    expect(output).toContain('allowSpaceInQuery: true')
    expect(output).toContain('ignoreAccents: true')
    expect(compactOutput).toContain('{ id, display, startPos, endPos }')
    expect(output).toContain("markup={createMarkupSerializer('@[__display__](__id__)')}")
    expect(output).not.toContain('allowSuggestionsAboveCursor')
    expect(output).not.toContain('regex=')
  })

  it('wraps identifier and member callbacks and lets forceSuggestionsAboveCursor win', () => {
    const { output, reports } = applyCodemod(`
      import { MentionsInput as Input, Mention as M } from 'react-mentions'

      export function Example({ users, handlers }) {
        return (
          <Input
            value=""
            onChange={handleChange}
            forceSuggestionsAboveCursor
            allowSuggestionsAboveCursor
          >
            <M data={users} onAdd={handlers.add} />
          </Input>
        )
      }
    `)

    const compactOutput = output.replaceAll(/\s+/g, ' ')

    expect(reports).toEqual([])
    expect(output).toContain("from 'react-mentions-ts'")
    expect(output).toMatch(/suggestionsPlacement=['"]above['"]/)
    expect(output).toMatch(
      /handleChange\(\s*change\.trigger\.nativeEvent,\s*change\.value,\s*change\.plainTextValue,\s*change\.mentions\s*\)/
    )
    expect(compactOutput).toContain(
      'handlers.add(addition.id, addition.display, addition.startPos, addition.endPos)'
    )
    expect(output).not.toContain('forceSuggestionsAboveCursor')
    expect(output).not.toContain('allowSuggestionsAboveCursor')
  })

  it('rewrites CommonJS usage and adds helper requires for namespace JSX', () => {
    const { output, reports } = applyCodemod(`
      const ReactMentions = require('react-mentions')

      exports.Example = function Example({ users }) {
        return (
          <ReactMentions.MentionsInput value="" allowSpaceInQuery>
            <ReactMentions.Mention data={users} />
          </ReactMentions.MentionsInput>
        )
      }
    `)

    const compactOutput = output.replaceAll(/\s+/g, ' ')

    expect(reports).toEqual([])
    expect(output).toContain("const ReactMentions = require('react-mentions-ts')")
    expect(compactOutput).toContain("const { makeTriggerRegex } = require('react-mentions-ts')")
    expect(output).toContain("trigger={makeTriggerRegex('@', {")
    expect(output).toContain('allowSpaceInQuery: true')
  })

  it('collects existing react-mentions-ts CommonJS bindings before migrating JSX', () => {
    const { output, reports } = applyCodemod(`
      const { MentionsInput, Mention } = require('react-mentions-ts')
      const ReactMentions = require('react-mentions-ts')

      exports.Destructured = function Destructured({ users }) {
        return (
          <MentionsInput value="" allowSpaceInQuery>
            <Mention data={users} />
          </MentionsInput>
        )
      }

      exports.Namespaced = function Namespaced({ users }) {
        return (
          <ReactMentions.MentionsInput value="" ignoreAccents>
            <ReactMentions.Mention trigger="#" data={users} />
          </ReactMentions.MentionsInput>
        )
      }
    `)

    const compactOutput = output.replaceAll(/\s+/g, ' ')

    expect(reports).toEqual([])
    expect(compactOutput).toContain(
      "const { MentionsInput, Mention, makeTriggerRegex } = require('react-mentions-ts')"
    )
    expect(output).toContain("const ReactMentions = require('react-mentions-ts')")
    expect(output).toContain("trigger={makeTriggerRegex('@', {")
    expect(output).toContain("trigger={makeTriggerRegex('#', {")
    expect(output).toContain('allowSpaceInQuery: true')
    expect(output).toContain('ignoreAccents: true')
  })

  it('adds a separate helper import for namespace ESM imports', () => {
    const { output, reports } = applyCodemod(`
      import * as ReactMentions from 'react-mentions'

      export function Example({ users }) {
        return (
          <ReactMentions.MentionsInput value="" allowSpaceInQuery>
            <ReactMentions.Mention data={users} />
          </ReactMentions.MentionsInput>
        )
      }
    `)

    expect(reports).toEqual([])
    expect(output).toContain("import * as ReactMentions from 'react-mentions-ts'")
    expect(output).toContain("import { makeTriggerRegex } from 'react-mentions-ts'")
    expect(output).toContain("trigger={makeTriggerRegex('@', {")
  })

  it('does not duplicate existing helper imports', () => {
    const { output, reports } = applyCodemod(`
      import { MentionsInput, Mention, makeTriggerRegex } from 'react-mentions'

      export function Example({ users }) {
        return (
          <MentionsInput value="" allowSpaceInQuery>
            <Mention trigger="#" data={users} />
          </MentionsInput>
        )
      }
    `)

    expect(reports).toEqual([])
    const importLine = output.split('\n').find((line) => line.includes("from 'react-mentions-ts'"))
    expect(importLine?.match(/makeTriggerRegex/g)).toHaveLength(1)
  })

  it('reports dynamic or ambiguous migration cases', () => {
    const { output, reports } = applyCodemod(`
      import { MentionsInput, Mention } from 'react-mentions'

      export function Example({ users, trigger, shouldFlip, customRegex }) {
        return (
          <MentionsInput
            value=""
            allowSuggestionsAboveCursor={shouldFlip}
            allowSpaceInQuery
          >
            <Mention
              trigger={trigger}
              data={(query, callback) => callback(users)}
              regex={customRegex}
            />
          </MentionsInput>
        )
      }
    `)

    expect(output).toContain('suggestionsPlacement={shouldFlip ?')
    expect(output).not.toContain('allowSuggestionsAboveCursor')
    expect(reports.some((message) => message.includes('dynamic suggestion placement'))).toBe(true)
    expect(reports.some((message) => message.includes('dynamic Mention trigger'))).toBe(true)
    expect(reports.some((message) => message.includes('regex prop requires manual'))).toBe(true)
    expect(reports.some((message) => message.includes('callback-style async results'))).toBe(true)
  })
})
