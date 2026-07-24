---
name: writing-efficient-javascript
description: 'Plain JavaScript and TypeScript performance rules that apply outside React too. Use when writing or reviewing loops, array methods (map, filter, sort, flatMap), Set or Map lookups, RegExp creation, caching of function results or property access, localStorage access, batching DOM reads and writes, or scheduling non-critical work with requestIdleCallback — or when the user mentions algorithmic complexity, O(n^2) hot paths, layout thrashing, or micro-optimizations.'
---

# Writing efficient JavaScript

Language-level performance rules that hold with or without React: data
structures, iteration, caching, and scheduling. Apply in hot paths — code
that runs per keystroke, per frame, per render, or over large collections.

How to use this skill:

- Scan the tables top-down (highest impact first) against the code at hand.
- Before applying a rule non-trivially, read its reference file for the full
  incorrect/correct examples and trade-offs.

## Medium-high

| Rule                                                                                                                             | Reference                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Use `.toSorted()`, `.toReversed()`, `.toSpliced()`, `.with()` instead of mutating `.sort()` and friends on props or state arrays | [references/js-tosorted-immutable.md](references/js-tosorted-immutable.md) |
| Before expensive array comparisons (sorting, deep equality, serialization), compare `length` first and exit early on mismatch    | [references/js-length-check-first.md](references/js-length-check-first.md) |

## Medium

| Rule                                                                                                                                            | Reference                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Cache pure function results in a bounded `Map` when the same inputs recur during render; isolate the cache per request in SSR                   | [references/js-cache-function-results.md](references/js-cache-function-results.md) |
| Never interleave style writes with layout reads (`offsetWidth`, `getBoundingClientRect`) — batch writes, then read once                         | [references/js-batch-dom-css.md](references/js-batch-dom-css.md)                   |
| Defer non-critical work (analytics, storage saves, prefetch) with `requestIdleCallback`, chunked by `deadline.timeRemaining()`, with a fallback | [references/js-request-idle-callback.md](references/js-request-idle-callback.md)   |

## Low-medium

| Rule                                                                                                                     | Reference                                                                        |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Convert arrays to `Set`/`Map` for repeated membership checks — `has` is O(1), `includes` is O(n)                         | [references/js-set-map-lookups.md](references/js-set-map-lookups.md)             |
| Replace repeated `.find()` by the same key with a `Map` index built once                                                 | [references/js-index-maps.md](references/js-index-maps.md)                       |
| Combine multiple `.filter()`/`.map()` passes over the same array into one loop                                           | [references/js-combine-iterations.md](references/js-combine-iterations.md)       |
| Don't create `RegExp` during render — hoist to module scope or memoize, and beware global-flag `lastIndex` state         | [references/js-hoist-regexp.md](references/js-hoist-regexp.md)                   |
| Return early once the result is determined instead of processing the remaining items                                     | [references/js-early-exit.md](references/js-early-exit.md)                       |
| Use `.flatMap()` to map and filter in one pass instead of `.map().filter(x => x != null)`                                | [references/js-flatmap-filter.md](references/js-flatmap-filter.md)               |
| Cache deep property lookups and `.length` in hot loops                                                                   | [references/js-cache-property-access.md](references/js-cache-property-access.md) |
| Cache synchronous `localStorage`/`sessionStorage`/cookie reads in memory; invalidate on `storage` and `visibilitychange` | [references/js-cache-storage.md](references/js-cache-storage.md)                 |

## Low

| Rule                                                                                                         | Reference                                                      |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Find min/max with a single-pass loop, not `.sort()`; spread into `Math.min`/`Math.max` only for small arrays | [references/js-min-max-loop.md](references/js-min-max-loop.md) |

## Scope notes

- These are micro-optimizations: they pay off in hot paths and are noise in
  cold ones. Confirm a path is hot with a profiler before restructuring
  readable code.
- `js-batch-dom-css` applies wherever code touches layout — keep DOM
  measurement centralized so read/write batching stays enforceable.
