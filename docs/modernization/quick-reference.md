# Quick Reference

## If You Need To...

### Localize rerenders

- Prefer moving state into the smallest branch that actually consumes it.
- Keep static siblings and decorative surfaces outside the stateful branch.
- Verify with the state locality lab and render badges before adding memoization.

### Change mention-child parsing

- Treat mention child parsing as an input-preparation step owned by `MentionsInput`.
- Do not reparse `children` in hot render branches unless you are preserving a standalone fallback path.

### Touch async suggestion flow

- Preserve debounce, abort, and stale-response semantics.
- Keep previous results visible while the next request loads when the same trigger stays active.
- Re-run async mention tests and the GitHub demo rehearsal after changes.

### Touch layout or overlay math

- Keep layout work in `MentionsInputLayout` and `MeasurementBridge`.
- Use `useLayoutEffect` only for paint-sensitive geometry.
- Rehearse against the portal, scrollable, and auto-resize demos.

### Consider memoization

- Measure first.
- Only memoize when a downstream memo boundary or dependency array requires referential stability.
- Prefer composition and ownership boundaries over `useMemo` noise.
