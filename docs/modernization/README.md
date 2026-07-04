# Modernization Pack

This folder turns the modernization directives into a repo-specific backlog for `react-mentions-ts`.

## Intent

- Keep phase 1 non-breaking.
- Treat [`src/MentionsInput.tsx`](../../src/MentionsInput.tsx) as the legacy orchestration shell.
- Prefer extraction, profiling, and regression tests before any full hooks rewrite.
- Use the demo as the rehearsal surface for render locality, async races, and measurement work.

## Label Legend

- `planned`: worthwhile follow-up work that is not implemented yet
- `already covered`: behavior already exists in the library or tests
- `verified by case study`: behavior can be rehearsed in the demo harness
- `not applicable`: directive is valid in app code but not a good fit for this library today

## Shared Glossary

- `MentionsInput`: the public input shell that orchestrates selection, queries, layout sync, and rendering.
- `Mention`: a child configuration element that defines a trigger, serializer, rendering behavior, and data source.
- `markup value`: the controlled string with serialized mentions, for example `@[Walter White](user:walter)`.
- `plain-text value`: the human-readable version of the markup value with mention displays inserted.
- `id value`: the plain-text representation with mention identifiers inserted instead of display labels.
- `suggestion query state`: the per-trigger loading, success, or error status tracked while suggestions resolve.
- `overlay`: the listbox-style suggestions surface rendered beside the caret or control edge.
- `inline suggestion`: the autocomplete hint rendered inside the composer when `suggestionsDisplay="inline"`.
- `portal host`: the DOM node or `Document` used to render overlay suggestions outside the local subtree.
- `highlighter`: the hidden mirrored layer that renders mentions and caret geometry for layout calculations.
- `measurement bridge`: the observer layer that requests scroll, resize, and overlay recomputation when layout changes.

## Foreword Note

The source material provided no technical foreword. That omission is intentional here: there is no foreword guidance to port, and future maintainers should not assume anything is missing from this pack.

## Files

- [backlog.md](./backlog.md): chapter-by-chapter modernization backlog with status labels
- [case-studies.md](./case-studies.md): rehearsal checklist tied to the demo harness
- [quick-reference.md](./quick-reference.md): short lookup notes for common modernization decisions
