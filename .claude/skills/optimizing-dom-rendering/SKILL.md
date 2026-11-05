---
name: optimizing-dom-rendering
description: 'Rules for faster paint, layout, and hydration in React DOM. Use when working on rendering performance, long lists (content-visibility), conditional rendering with && versus ternaries, hoisting static JSX, SVG size or animation, script loading with defer or async, resource hints (preload, preconnect), SSR hydration mismatch or flicker, suppressHydrationWarning, the Activity component, or useTransition loading states. Document-level and SSR rules apply to application shells, not inside component libraries.'
---

# Optimizing DOM rendering

Rules for getting pixels on screen faster: paint and layout costs, script
loading, resource hints, hydration correctness, and JSX-level rendering
details. Apply when working on rendering performance anywhere React output
reaches the DOM.

How to use this skill:

- Scan the tables top-down (highest impact first) against the code at hand.
- Before applying a rule non-trivially, read its reference file for the full
  incorrect/correct examples and trade-offs.

## High

| Rule                                                                                                                      | Reference                                                                                |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Apply `content-visibility: auto` (with `contain-intrinsic-size`) to long lists so off-screen items skip layout and paint  | [references/rendering-content-visibility.md](references/rendering-content-visibility.md) |
| Hint the browser with React DOM's `prefetchDNS`, `preconnect`, `preload`, `preinit` family for resources you'll need soon | [references/rendering-resource-hints.md](references/rendering-resource-hints.md)         |
| Give script tags `defer` (DOM-dependent, ordered) or `async` (independent, e.g. analytics) so they never block parsing    | [references/rendering-script-defer-async.md](references/rendering-script-defer-async.md) |

## Medium

| Rule                                                                                                                                     | Reference                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| For client-storage-dependent content, inject a synchronous inline script that sets the DOM before hydration — no mismatch and no flicker | [references/rendering-hydration-no-flicker.md](references/rendering-hydration-no-flicker.md) |
| Preserve state and DOM of expensive components that toggle visibility with React's `<Activity>` (React 19.2+)                            | [references/rendering-activity.md](references/rendering-activity.md)                         |

## Low-medium

| Rule                                                                                                                                       | Reference                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Use `suppressHydrationWarning` only for intentionally different server/client values (dates, random IDs, locale) — never to hide real bugs | [references/rendering-hydration-suppress-warning.md](references/rendering-hydration-suppress-warning.md) |

## Low

| Rule                                                                                                                                        | Reference                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Use `useTransition` and its `isPending` for non-urgent result updates; keep separate loading/error state when the network lifecycle matters | [references/rendering-usetransition-loading.md](references/rendering-usetransition-loading.md) |
| Hoist static JSX (especially large SVGs) to module scope so it isn't re-created every render                                                | [references/rendering-hoist-jsx.md](references/rendering-hoist-jsx.md)                         |
| Use ternaries, not `&&`, when the condition can be `0` or `NaN` — those render as text                                                      | [references/rendering-conditional-render.md](references/rendering-conditional-render.md)       |
| Reduce SVG coordinate precision (`svgo --precision=1 --multipass`) to shrink file size                                                      | [references/rendering-svg-precision.md](references/rendering-svg-precision.md)                 |
| Wrap an SVG in a `div` for animation only when profiling shows jank — modern browsers animate SVG transforms fine                           | [references/rendering-animate-svg-wrapper.md](references/rendering-animate-svg-wrapper.md)     |

## Scope notes

- The document-level and SSR rules (resource hints, script defer/async, both
  hydration rules) apply where you control the document — application shells
  and SSR frameworks — not inside a component library.
- `<Activity>` requires React 19.2+; for consumers on 19.0–19.1 use
  conditional rendering or CSS visibility.
- React Compiler hoists static JSX automatically; `rendering-hoist-jsx`
  matters only without the compiler.
- Keep paint-sensitive DOM measurement centralized and `useLayoutEffect`
  usage minimal — it blocks paint.
