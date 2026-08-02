---
title: Prefer SVG Wrapper Animation Only When Needed
impact: LOW
impactDescription: avoids SVG animation edge cases
tags: rendering, svg, css, animation, performance
---

## Prefer SVG Wrapper Animation Only When Needed

Modern browsers handle common SVG transform animations well. Wrapping an SVG in
a `<div>` is still useful when profiling shows direct SVG animation jank or when
you need more predictable CSS layout behavior, but it is not a blanket hardware
acceleration requirement.

**Usually fine (animate SVG directly):**

```tsx
function LoadingSpinner() {
  return (
    <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" />
    </svg>
  )
}
```

**Alternative (animate wrapper for layout or browser edge cases):**

```tsx
function LoadingSpinner() {
  return (
    <div className="animate-spin">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" />
      </svg>
    </div>
  )
}
```

Measure before adding wrappers. Prefer the direct SVG animation unless a target
browser or a specific transform shows poor frame timing.
