---
name: composing-react-components
description: 'Component-architecture rules for flexible, maintainable React APIs. Use when designing or refactoring component APIs, props, context providers, or shared state: compound components, avoiding boolean prop proliferation, explicit variant components, children over render props, lifting state into providers, decoupling state implementation from UI, and generic context interfaces with state, actions, and meta — or when the user mentions prop explosion, component API design, context design, or state architecture.'
---

# Composing React components

Architecture rules for component APIs and shared state: composition over
configuration, explicit variants over boolean modes, and context contracts
over implementation coupling. Apply when designing or refactoring any
component's public API or state ownership.

How to use this skill:

- Scan the tables top-down (highest impact first) against the design at hand.
- Before applying a rule non-trivially, read its reference file for the full
  incorrect/correct examples and trade-offs.
- Files under `references/` are byte-identical copies of `best-practices/*.md`
  at the repo root. Edit the originals, re-copy, and verify with `pnpm skills:check`.

## Critical

| Rule                                                                                                                                | Reference                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Don't add boolean props (`isThread`, `isEditing`) to customize behavior — each one doubles the state space; use composition instead | [references/architecture-avoid-boolean-props.md](references/architecture-avoid-boolean-props.md) |

## High

| Rule                                                                                                                                            | Reference                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Structure complex components as compound components sharing context, so consumers compose exactly the pieces they need                          | [references/architecture-compound-components.md](references/architecture-compound-components.md) |
| Lift state into dedicated provider components so components outside the visual frame read and update it without prop drilling or effect syncing | [references/state-lift-state.md](references/state-lift-state.md)                                 |
| Define generic context interfaces split into `state`, `actions`, and `meta` so UI consumes a contract, not an implementation                    | [references/state-context-interface.md](references/state-context-interface.md)                   |

## Medium

| Rule                                                                                                                               | Reference                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Keep the provider as the only place that knows how state is managed — the same UI must work with useState, Zustand, or server sync | [references/state-decouple-implementation.md](references/state-decouple-implementation.md)             |
| Replace one component with many boolean modes by explicit named variants that each compose shared parts — no impossible states     | [references/patterns-explicit-variants.md](references/patterns-explicit-variants.md)                   |
| Prefer `children` composition over `renderX` props; use render props only when the parent must pass data back to the child         | [references/patterns-children-over-render-props.md](references/patterns-children-over-render-props.md) |

## Scope notes

- In this library, prefer the existing extension points — `children`,
  `inputComponent`, `customSuggestionsContainer`, and targeted render
  callbacks — before adding new boolean props, HOCs, or broad context layers
  (AGENTS.md).
- Keep `MentionsInput` as the orchestration shell; extract helpers or leaf
  components before considering larger rewrites.
