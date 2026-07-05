# Modernization Backlog

## 1. Team Prerequisites And Shared Language

- `already covered`: the codebase is already React 19 and function-component heavy outside `MentionsInput`.
- `planned`: keep this pack updated so maintainers align on hooks, composition, and state locality before larger refactors.
- `already covered`: the glossary in [README.md](./README.md) standardizes repo terms around `MentionsInput`, `Mention`, markup/plain-text/id values, overlay, and measurement bridge.

## 2. State Ownership And Render Locality

- `already covered`: `MentionsInput` now precomputes mention children/config once per `children` change instead of reparsing inside every render path.
- `planned`: continue shrinking `MentionsInput` by pushing selection/editing, query lifecycle, and derived snapshot logic into internal helpers.
- `verified by case study`: use the “State locality lab” demo to confirm unrelated siblings stay out of the render loop.

## 3. Composition Over Prop-Driven Re-Renders

- `already covered`: the rendering shell already composes `Highlighter`, input control, inline hint, overlay, and measurement bridge as separate branches.
- `planned`: keep pushing expensive work behind stable branches before considering memoization.
- `verified by case study`: compare the inline autocomplete and portal demos while watching render badges and WDYR output.

## 4. Slots, Elements, And Extensible Surfaces

- `already covered`: the public API already exposes element-level extension points such as `customSuggestionsContainer`, `inputComponent`, and portal host configuration.
- `not applicable`: broad `cloneElement` slot defaulting is not a current priority; the library surface is already narrow enough to avoid prop explosions in most places.
- `planned`: keep unit coverage around extension points so render customization stays override-friendly.

## 5. Render Props

- `already covered`: `renderSuggestion`, `renderEmpty`, and `renderError` already provide focused render-prop style customisation where the API needs it.
- `not applicable`: do not introduce additional render-prop surfaces unless a DOM-coupled library requirement appears.

## 6. Memoization

- `already covered`: the codebase already avoids blanket `useMemo` and `useCallback` usage outside places that need referential stability.
- `planned`: only add memoization when a measured bottleneck points to parent-driven rerenders or dependency-array stability.

## 7. Reconciliation, Keys, And Component Identity

- `already covered`: suggestions and highlighter fragments use deterministic keys and dedicated utilities for mention identity.
- `planned`: keep render-boundary tests around child parsing and suggestion ordering so identity regressions are caught early.

## 8. Higher-Order Components

- `not applicable`: HOCs are an app-level retrofit tool and are not currently justified in this library surface.

## 9. Context

- `not applicable`: broad context refactors are a poor fit here because the library is intentionally small, local, and controlled by parent props.

## 10. Refs And Imperative APIs

- `already covered`: `inputRef`, portal host support, selection restoration, and layout measurement already rely on refs in the appropriate places.
- `planned`: preserve ref behavior during any future hooks rewrite; it is part of the compatibility surface.

## 11. Closures And Stable Callbacks

- `already covered`: callback stability is centralized through `useEventCallback` in hot functional branches.
- `planned`: keep stale-closure safeguards in tests whenever more controller logic moves out of the class shell.

## 12. Debounce And Throttle

- `already covered`: async suggestion providers already support `debounceMs`, abort signals, and stale-response suppression.
- `verified by case study`: rehearse quick typing in the async GitHub demo and confirm older requests never win.

## 13. Layout Effects And Measurement

- `already covered`: overlay and caret geometry use `useLayoutEffect`, `MeasurementBridge`, and extracted layout helpers.
- `verified by case study`: use the scrollable and auto-resize demos to confirm measurement work stays localized.
- `planned`: keep layout work synchronous and minimal; any new measurement should stay inside the bridge/layout layer.

## 14. Portals And Overlays

- `already covered`: suggestions can already render through `createPortal` with explicit placement math and portal host handling.
- `verified by case study`: use the portal demo to validate clipping avoidance and viewport-relative positioning.

## 15. Data Loading And Perceived Performance

- `already covered`: the query lifecycle preserves prior suggestions while the next async request loads.
- `planned`: keep staging improvements around perceived continuity rather than inventing a separate data layer.

## 16. Async Races

- `already covered`: active queries abort older requests, ignore stale responses, and preserve current suggestion ownership.
- `planned`: keep these helpers internal and regression-tested before any larger control-flow rewrite.

## 17. Error Boundaries

- `not applicable`: route-level error boundaries are app concerns, not a good fit for this package API.
- `planned`: keep async error rendering targeted to suggestion providers through `renderError` and status content instead.

## 18. Full Hooks Rewrite

- `planned`: defer a full `MentionsInput` hooks rewrite until the extracted shell, tests, and demo traces show the class itself is still the measured bottleneck.
