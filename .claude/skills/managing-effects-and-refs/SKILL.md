---
name: managing-effects-and-refs
description: 'Advanced rules for effects, refs, and React 19 API usage. Use when working with useEffect subscriptions and their event handlers, stale closures in callbacks, useEffectEvent, storing handlers in refs, one-time app initialization (once per app, not per mount), ref as a regular prop instead of forwardRef, or use() for reading context — or when the user mentions effect re-runs, stale props or state, forwardRef migration, or React 19 API changes.'
---

# Managing effects and refs

Rules for effects that subscribe and resubscribe, callbacks that go stale,
initialization that must run exactly once, and the React 19 replacements for
`forwardRef` and `useContext`. Apply when writing or reviewing `useEffect`,
`useRef`, `useEffectEvent`, or imperative-handle code.

How to use this skill:

- Scan the tables top-down (highest impact first) against the code at hand.
- Before applying a rule non-trivially, read its reference file for the full
  incorrect/correct examples and trade-offs.

## Medium

| Rule                                                                                                        | Reference                                                                  |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| In React 19, take `ref` as a regular prop — drop `forwardRef`; `use()` can read context, even conditionally | [references/react19-no-forwardref.md](references/react19-no-forwardref.md) |

## Low-medium

| Rule                                                                                                                             | Reference                                                            |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Run once-per-app-load initialization behind a module-level guard or in the entry module — never in a component's `useEffect([])` | [references/advanced-init-once.md](references/advanced-init-once.md) |

## Low

| Rule                                                                                                                     | Reference                                                                              |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Store callbacks used by long-lived effects in refs so the effect doesn't re-subscribe when the callback identity changes | [references/advanced-event-handler-refs.md](references/advanced-event-handler-refs.md) |
| Never put `useEffectEvent` functions in dependency arrays — their identity intentionally changes every render            | [references/advanced-effect-event-deps.md](references/advanced-effect-event-deps.md)   |
| Read latest values inside effect callbacks via `useEffectEvent` without adding them to dependencies                      | [references/advanced-use-latest.md](references/advanced-use-latest.md)                 |

## Scope notes

- `useEffectEvent` requires React 19.2+; when earlier versions (including
  React 19.0–19.1) must be supported, use the ref-based callback pattern —
  the references show both.
- `react19-no-forwardref` is React 19-only; skip it for React 18 code.
- Keep user-visible data in state and transient values in refs; when a
  component exposes an imperative handle, preserve that ref contract across
  refactors.
