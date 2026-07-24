---
name: reducing-bundle-size
description: 'Rules for shrinking JavaScript bundles and code-splitting React apps. Use when adding dependencies, importing from barrel files or icon libraries, lazy-loading heavy components with dynamic import(), loading modules conditionally or preloading on user intent (hover, focus), deferring third-party scripts like analytics, or keeping import paths statically analyzable — or when the user mentions bundle size, tree-shaking, code splitting, initial load time, or size-limit failures.'
---

# Reducing bundle size

Rules for keeping JavaScript bundles small and loading code only when it is
needed. Apply when adding dependencies or imports to the library, and when
working on the demo or docs apps.

How to use this skill:

- Scan the tables top-down (highest impact first) against the code at hand.
- Before applying a rule non-trivially, read its reference file for the full
  incorrect/correct examples and trade-offs.
- Files under `references/` are byte-identical copies of `best-practices/*.md`
  at the repo root. Edit the originals, re-copy, and verify with `pnpm skills:check`.

## Critical

| Rule                                                                                                            | Reference                                                                    |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Code-split heavy components not needed on initial render with `React.lazy` and `Suspense`                       | [references/bundle-dynamic-imports.md](references/bundle-dynamic-imports.md) |
| Import directly from source files, not barrel files (index re-exports) that pull in thousands of unused modules | [references/bundle-barrel-imports.md](references/bundle-barrel-imports.md)   |

## High

| Rule                                                                                                                               | Reference                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Load large data or modules only when the feature that needs them is activated, via dynamic `import()` behind the flag              | [references/bundle-conditional.md](references/bundle-conditional.md)           |
| Keep `import()` and filesystem paths statically analyzable — explicit maps of import thunks or literal paths, not composed strings | [references/bundle-analyzable-paths.md](references/bundle-analyzable-paths.md) |

## Medium

| Rule                                                                                                     | Reference                                                                        |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Preload heavy bundles on user intent (hover, focus) or when a feature flag turns on, via `void import()` | [references/bundle-preload.md](references/bundle-preload.md)                     |
| Defer analytics, logging, and error tracking until after hydration                                       | [references/bundle-defer-third-party.md](references/bundle-defer-third-party.md) |

## Scope notes

- For the published library itself, the operative rules are
  `bundle-analyzable-paths` and keeping the export surface small — enforced by
  the size-limit budget (`pnpm size:check`, 30 kB gzip). Dynamic imports,
  preloading, and third-party deferral target apps that embed the library
  (demo, docs).
- See AGENTS.md: avoid unnecessary exports, overly dynamic import/path
  patterns, and dependency choices that bloat the library bundle.
