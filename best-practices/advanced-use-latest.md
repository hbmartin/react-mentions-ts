---
title: useEffectEvent for Stable Callback Refs
impact: LOW
impactDescription: prevents effect re-runs
tags: advanced, hooks, useEffectEvent, refs, optimization
---

## useEffectEvent for Stable Callback Refs

Access latest values in callbacks without adding them to dependency arrays.
Prevents effect re-runs while avoiding stale closures.

`useEffectEvent` requires React 19.2+. If your supported range includes React
19.0 or 19.1, keep the ref-based callback pattern instead.

Note: the function returned by `useEffectEvent` is excluded from dependency
arrays but does not have a stable identity — it changes on every render. Never
add it to a dependency array or pass it to other components or Hooks.

**Incorrect (effect re-runs on every callback change):**

```tsx
function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => onSearch(query), 300)
    return () => clearTimeout(timeout)
  }, [query, onSearch])
}
```

**Correct (React 19.2+ with useEffectEvent):**

```tsx
import { useEffectEvent } from 'react'

function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('')
  const onSearchEvent = useEffectEvent(onSearch)

  useEffect(() => {
    const timeout = setTimeout(() => onSearchEvent(query), 300)
    return () => clearTimeout(timeout)
  }, [query])
}
```
