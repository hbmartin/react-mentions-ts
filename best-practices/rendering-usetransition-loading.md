---
title: Use useTransition for Non-Urgent Result Updates
impact: LOW
impactDescription: reduces re-renders and improves code clarity
tags: rendering, transitions, useTransition, loading, state
---

## Use useTransition for Non-Urgent Result Updates

Use `useTransition` for non-urgent result rendering after async work completes.
It provides `isPending` while React renders the transition; keep separate
loading/error state when the network lifecycle matters.

**Incorrect (manual loading state):**

```tsx
function SearchResults() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (value: string) => {
    setIsLoading(true)
    setQuery(value)
    const data = await fetchResults(value)
    setResults(data)
    setIsLoading(false)
  }

  return (
    <>
      <input value={query} onChange={(e) => handleSearch(e.target.value)} />
      {isLoading && <Spinner />}
      <ResultsList results={results} />
    </>
  )
}
```

**Correct (useTransition with built-in pending state):**

```tsx
import { useTransition, useState } from 'react'

function SearchResults() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isFetching, setIsFetching] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSearch = async (value: string) => {
    setQuery(value) // Update input immediately

    setIsFetching(true)
    try {
      const data = await fetchResults(value)

      startTransition(() => {
        // Mark the expensive result update as non-urgent
        setResults(data)
      })
    } finally {
      setIsFetching(false)
    }
  }

  return (
    <>
      <input value={query} onChange={(e) => handleSearch(e.target.value)} />
      {(isFetching || isPending) && <Spinner />}
      <ResultsList results={results} />
    </>
  )
}
```

**Benefits:**

- **Pending semantics**: `isPending` indicates when a transition render is in progress; handle async loading and failures separately.
- **Better responsiveness**: Keeps the UI responsive during updates
- **Interrupt handling**: New transitions automatically cancel pending ones

Reference: [useTransition](https://react.dev/reference/react/useTransition)
