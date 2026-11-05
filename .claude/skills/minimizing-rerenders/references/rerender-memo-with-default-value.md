---
title: Extract Default Non-primitive Parameter Value from Memoized Component to Constant
impact: MEDIUM
impactDescription: avoids per-render default allocations
tags: rerender, memo, optimization
---

## Extract Default Non-primitive Parameter Value from Memoized Component to Constant

When a memoized component has a default value for a non-primitive optional
parameter, such as an array, function, or object, that default is created each
time the component actually renders. This does not break `memo()` for omitted
props, but it can add avoidable allocations when another prop change causes a
render.

To address this issue, extract the default value into a constant.

**Avoid (creates a new default during each render):**

```tsx
const UserAvatar = memo(function UserAvatar({ onClick = () => {} }: { onClick?: () => void }) {
  // ...
})

// Used without optional onClick
<UserAvatar />
```

**Prefer (stable default value):**

```tsx
const NOOP = () => {};

const UserAvatar = memo(function UserAvatar({ onClick = NOOP }: { onClick?: () => void }) {
  // ...
})

// Used without optional onClick
<UserAvatar />
```
