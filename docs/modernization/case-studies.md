# Case Studies

Use the demo as a repeatable rehearsal surface before landing deeper refactors.

## Commands

- `pnpm demo`: visual harness with in-UI render badges
- `pnpm dev`: same demo plus why-did-you-render and console render traces

## Rehearsal Order

1. State locality lab
   Watch the controller badge change while the stable sibling badge stays flat.
2. Inline autocomplete
   Type `@a`, cycle suggestions, and confirm the inline branch changes without waking the overlay path.
3. Suggestions via portal
   Scroll the portal host and verify the list remains visible, positioned, and unclipped.
4. Async GitHub mentions
   Type quickly through multiple queries and confirm stale suggestions never flash back into view.
5. Scrollable composer + auto-resizing composer
   Scroll the long draft, then grow the auto-resize example, and confirm measurement work stays near the composer shell.

## Expected Signals

- WDYR logs should primarily mention the branch you interacted with.
- Render badges should change locally, not globally.
- Async demos should keep the latest query active and discard older responses.
- Overlay and inline behavior should remain unchanged after internal refactors.
