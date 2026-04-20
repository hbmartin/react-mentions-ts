- never run publint with pnpm, instead always use `npx publint --pack npm`
- use `pnpm` for all commands except `pack`
- always run `pnpm fmt && pnpm lint && pnpm test && pnpm dupes` after completing work and fix findings

## Relevant best-practice guidance for this library

- keep `MentionsInput` as the orchestration shell; prefer extracting helpers or leaf components before considering a full hooks rewrite
- preserve render locality: move state and derived work into the smallest branch that consumes it, and do not reparse mention children/config in hot render paths
- prefer composition and the existing extension points (`children`, `inputComponent`, `customSuggestionsContainer`, targeted render callbacks) over adding boolean props, prop explosions, HOCs, or broad context layers
- measure before memoizing; only add `useMemo`, `useCallback`, or `memo` when referential stability or a measured bottleneck requires it, and keep simple primitive derivations inline
- never define components inside components; preserve stable keys and element identity across suggestions, highlighter output, and other dynamic lists
- derive values during render when possible; avoid prop-to-state syncing in effects, and keep interaction-driven side effects in event handlers instead of `useEffect`
- use refs and stable callback helpers for transient values, subscriptions, and stale-closure avoidance; keep user-visible data in state and preserve imperative/ref compatibility
- keep async suggestion flows race-safe: debounce side effects rather than controlled input updates, abort or ignore stale requests, and preserve existing suggestions while a same-trigger refresh is loading
- keep paint-sensitive measurement and overlay math inside `MentionsInputLayout`, `MeasurementBridge`, and minimal `useLayoutEffect` usage; preserve portal, scroll, and auto-resize behavior
- keep the published surface small and analyzable: avoid unnecessary exports, overly dynamic import/path patterns, and dependency choices that bloat the library bundle
- verify render-locality, async, and layout changes with focused tests and the demo harness before treating a refactor as safe
