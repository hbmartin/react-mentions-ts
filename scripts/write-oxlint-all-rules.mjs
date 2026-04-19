#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const projectRoot = resolve(import.meta.dirname, '..')
const [schemaArgument, configArgument] = process.argv.slice(2)
const schemaPath = resolve(
  projectRoot,
  schemaArgument ?? 'node_modules/oxlint/configuration_schema.json'
)
const configPath = resolve(projectRoot, configArgument ?? '.oxlintrc.json')

const schema = readJson(schemaPath)
const plugins = getLintPlugins(schema)
const ruleIds = getExplicitRuleIds(schema)

// Current Oxlint schemas expose plugin names, while rule IDs come from `oxlint --rules`.
const rules = Object.fromEntries(
  (ruleIds.length > 0 ? ruleIds : getRegisteredRuleIds(plugins)).map((ruleId) => [ruleId, 'error'])
)

const existingConfig = readJsonIfExists(configPath)
const nextConfig = {
  $schema: existingConfig.$schema ?? './node_modules/oxlint/configuration_schema.json',
  plugins,
  rules,
  ...omitKeys(existingConfig, ['$schema', 'plugins', 'rules']),
}

writeFileSync(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`)

console.log(
  `Wrote ${Object.keys(rules).length} rules as "error" to ${relative(projectRoot, configPath)}`
)

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function readJsonIfExists(path) {
  try {
    return readJson(path)
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {}
    }

    throw error
  }
}

function omitKeys(object, keys) {
  const keysToOmit = new Set(keys)

  return Object.fromEntries(Object.entries(object).filter(([key]) => !keysToOmit.has(key)))
}

function getLintPlugins(schema) {
  const plugins = schema.definitions?.LintPluginOptionsSchema?.enum

  if (!Array.isArray(plugins) || plugins.length === 0) {
    throw new Error('Could not read lint plugin names from Oxlint configuration schema.')
  }

  return plugins
}

function getExplicitRuleIds(schema) {
  const ruleDefinitionRef = schema.properties?.rules?.allOf?.[0]?.$ref
  const rootRuleDefinition = ruleDefinitionRef
    ? resolveSchemaRef(schema, ruleDefinitionRef)
    : schema.definitions?.OxlintRules
  const ruleIds = new Set()
  const visited = new Set()

  collectRuleIds(schema, rootRuleDefinition, ruleIds, visited)

  return [...ruleIds]
}

function collectRuleIds(schema, definition, ruleIds, visited) {
  if (!definition || visited.has(definition)) {
    return
  }

  visited.add(definition)

  if (definition.$ref) {
    collectRuleIds(schema, resolveSchemaRef(schema, definition.$ref), ruleIds, visited)
  }

  if (definition.properties) {
    for (const ruleId of Object.keys(definition.properties)) {
      ruleIds.add(ruleId)
    }
  }

  for (const key of ['allOf', 'anyOf', 'oneOf']) {
    for (const childDefinition of definition[key] ?? []) {
      collectRuleIds(schema, childDefinition, ruleIds, visited)
    }
  }
}

function resolveSchemaRef(schema, ref) {
  return ref
    .replace(/^#\//, '')
    .split('/')
    .reduce((value, pathPart) => value?.[pathPart], schema)
}

function getRegisteredRuleIds(plugins) {
  const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const output = execFileSync(
    pnpmCommand,
    ['exec', 'oxlint', '--rules', ...getPluginFlags(plugins)],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )

  return parseRuleIds(output)
}

function getPluginFlags(plugins) {
  const flagsByPlugin = new Map([
    ['import', '--import-plugin'],
    ['jsdoc', '--jsdoc-plugin'],
    ['jsx-a11y', '--jsx-a11y-plugin'],
    ['nextjs', '--nextjs-plugin'],
    ['node', '--node-plugin'],
    ['promise', '--promise-plugin'],
    ['react', '--react-plugin'],
    ['react-perf', '--react-perf-plugin'],
    ['vitest', '--vitest-plugin'],
    ['vue', '--vue-plugin'],
  ])

  return plugins.flatMap((plugin) => {
    const flag = flagsByPlugin.get(plugin)

    return flag ? [flag] : []
  })
}

function parseRuleIds(output) {
  const ruleIds = new Set()

  for (const line of output.split('\n')) {
    if (!line.startsWith('|')) {
      continue
    }

    const [ruleName, source] = line
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim())

    if (
      !ruleName ||
      !source ||
      ruleName === 'Rule name' ||
      source === 'Source' ||
      /^-+$/.test(ruleName) ||
      /^-+$/.test(source)
    ) {
      continue
    }

    ruleIds.add(toRuleId(ruleName, source))
  }

  if (ruleIds.size === 0) {
    throw new Error('Could not parse any rule IDs from `oxlint --rules`.')
  }

  return [...ruleIds]
}

function toRuleId(ruleName, source) {
  if (source === 'eslint') {
    return ruleName
  }

  const sourceName = {
    jsx_a11y: 'jsx-a11y',
    react_perf: 'react-perf',
  }[source]

  return `${sourceName ?? source}/${ruleName}`
}
