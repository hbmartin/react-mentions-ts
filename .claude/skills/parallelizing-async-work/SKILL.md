---
name: parallelizing-async-work
description: 'Rules for structuring async TypeScript so independent work runs concurrently. Use when writing or reviewing code with multiple awaits, sequential fetches, Promise.all, dependent async steps (better-all), await placement inside branches, cheap synchronous guards before awaited feature flags, API routes or Server Actions, or Suspense boundaries for streaming — or when the user mentions waterfalls, slow endpoints, request latency, or parallel data fetching.'
---

# Parallelizing async work

Rules for structuring async TypeScript so independent operations run concurrently
and no code path blocks on work it does not need. Apply to any code with more
than one `await`, on the client or the server.

How to use this skill:

- Scan the tables top-down (highest impact first) against the code at hand.
- Before applying a rule non-trivially, read its reference file for the full
  incorrect/correct examples and trade-offs.

## Critical

| Rule                                                                                                                                        | Reference                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Run independent async operations concurrently with `Promise.all()`, never as sequential awaits                                              | [references/async-parallel.md](references/async-parallel.md)         |
| For partially dependent steps, start every task at the earliest possible moment — `better-all`, or create promises first and await together | [references/async-dependencies.md](references/async-dependencies.md) |
| In API routes and Server Actions, start independent operations immediately instead of chaining awaits into waterfalls                       | [references/async-api-routes.md](references/async-api-routes.md)     |

## High

| Rule                                                                                                                                  | Reference                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Move `await` into the branch that actually uses the result; return early before fetching                                              | [references/async-defer-await.md](references/async-defer-await.md)                                   |
| Evaluate cheap synchronous conditions before awaited flags so compound checks can short-circuit without paying for the async call     | [references/async-cheap-condition-before-await.md](references/async-cheap-condition-before-await.md) |
| Wrap only the data-dependent subtree in `Suspense` so static layout paints immediately; share one promise across siblings via `use()` | [references/async-suspense-boundaries.md](references/async-suspense-boundaries.md)                   |

## Scope notes

- `async-api-routes` targets server code (API routes, Server Actions), not
  client components.
- The async-component examples in `async-suspense-boundaries` require React
  Server Components; in client components use the `use(promise)` alternative
  shown in the reference.
- Keep UI-driven async flows race-safe: abort or ignore stale responses so a
  slow earlier request cannot overwrite the result of a newer one.
