---
name: minimizing-rerenders
description: 'Rules for eliminating unnecessary React re-renders. Use when writing or reviewing React components, hooks, state updates, memoization (memo, useMemo, useCallback), useEffect dependencies, derived state, refs for transient values, useDeferredValue, or startTransition — or when the user mentions slow renders, wasted re-renders, render performance, cursor jumps while typing, or React DevTools/why-did-you-render profiling results.'
---

# Minimizing re-renders

Rules for keeping React render work proportional to what actually changed:
state placement, derived values, memoization, refs, and scheduling. Apply when
writing or reviewing any component or hook, especially ones on per-keystroke,
per-frame, or otherwise hot render paths.

How to use this skill:

- Scan the tables top-down (highest impact first) against the code at hand.
- Before applying a rule non-trivially, read its reference file for the full
  incorrect/correct examples and trade-offs.

## High

| Rule                                                                                                                                         | Reference                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Never define a component inside another component — the new type remounts every render, destroying state, DOM, and focus; pass props instead | [references/rerender-no-inline-components.md](references/rerender-no-inline-components.md) |

## Medium

| Rule                                                                                                                               | Reference                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Use functional `setState(current => ...)` when new state depends on old — prevents stale closures and stabilizes callbacks         | [references/rerender-functional-setstate.md](references/rerender-functional-setstate.md)           |
| Store frequently-changing values that shouldn't re-render (mouse position, intervals, transient flags) in `useRef`, not `useState` | [references/rerender-use-ref-transient-values.md](references/rerender-use-ref-transient-values.md) |
| Compute derived values during render — don't store them in state and sync them in effects when props change                        | [references/rerender-derived-state-no-effect.md](references/rerender-derived-state-no-effect.md)   |
| Subscribe to derived boolean state (`useMediaQuery`) instead of continuous values (`useWindowWidth`)                               | [references/rerender-derived-state.md](references/rerender-derived-state.md)                       |
| Don't subscribe to dynamic state (searchParams, localStorage) you only read inside callbacks — read it on demand                   | [references/rerender-defer-reads.md](references/rerender-defer-reads.md)                           |
| Pass a function to `useState` for expensive initial values so the initializer runs only once                                       | [references/rerender-lazy-state-init.md](references/rerender-lazy-state-init.md)                   |
| Extract expensive work into memoized child components to enable early returns before the computation                               | [references/rerender-memo.md](references/rerender-memo.md)                                         |
| Hoist a memoized component's non-primitive default parameter values (array, object, function) to module constants                  | [references/rerender-memo-with-default-value.md](references/rerender-memo-with-default-value.md)   |
| Split a `useMemo`/`useEffect` doing independent tasks with different dependencies into separate hooks                              | [references/rerender-split-combined-hooks.md](references/rerender-split-combined-hooks.md)         |
| Mark frequent non-urgent updates (e.g. scroll position) with `startTransition` to keep the UI responsive                           | [references/rerender-transitions.md](references/rerender-transitions.md)                           |
| Use `useDeferredValue` (plus `useMemo` on the deferred value) so input stays responsive while expensive derived renders lag behind | [references/rerender-use-deferred-value.md](references/rerender-use-deferred-value.md)             |
| Run interaction-triggered side effects in the event handler, not modeled as state plus `useEffect`                                 | [references/rerender-move-effect-to-event.md](references/rerender-move-effect-to-event.md)         |

## Low-medium

| Rule                                                                                                              | Reference                                                                                            |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Don't wrap simple expressions with primitive results in `useMemo` — the hook overhead exceeds the expression cost | [references/rerender-simple-expression-in-memo.md](references/rerender-simple-expression-in-memo.md) |

## Low

| Rule                                                                                                  | Reference                                                                  |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Depend on primitives (`user.id`, a precomputed boolean) instead of objects to minimize effect re-runs | [references/rerender-dependencies.md](references/rerender-dependencies.md) |

## Scope notes

- The memoization rules (`rerender-memo`, `rerender-memo-with-default-value`,
  `rerender-simple-expression-in-memo`) carry React Compiler notes — honor them
  when the consuming project enables the compiler.
- Measure before memoizing: add `memo`, `useMemo`, or `useCallback` only when
  referential stability or a measured bottleneck requires it, keep simple
  primitive derivations inline, and preserve render locality — keep state and
  derived work in the smallest branch that consumes it.
