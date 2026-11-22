---
title: Prevent Waterfall Chains in API Routes
impact: CRITICAL
impactDescription: 2-10× improvement
tags: api-routes, server-actions, waterfalls, parallelization
---

## Prevent Waterfall Chains in API Routes

In API routes and Server Actions, start independent operations immediately, even if you don't await them yet.

**Incorrect (config waits for auth, data waits for both):**

```typescript
export async function GET(request: Request) {
  const session = await auth()
  const config = await fetchConfig()
  const data = await fetchData(session.user.id)
  return Response.json({ data, config })
}
```

**Correct (auth and config start immediately):**

```typescript
export async function GET(request: Request) {
  const sessionPromise = auth()
  const configPromise = fetchConfig()
  const session = await sessionPromise
  const [config, data] = await Promise.all([configPromise, fetchData(session.user.id)])
  return Response.json({ data, config })
}
```

A promise started early has no rejection handler until it is awaited. If `fetchConfig()` can reject while `auth()` is still pending, the runtime reports an unhandled rejection (fatal by default in Node.js 15+). In that case, chain the dependent call with `.then()` and pass every started promise to a single `Promise.all` in the same tick:

```typescript
const sessionPromise = auth()
const configPromise = fetchConfig()
const dataPromise = sessionPromise.then((session) => fetchData(session.user.id))
const [config, data] = await Promise.all([configPromise, dataPromise])
```

For operations with more complex dependency chains, use `better-all` to automatically maximize parallelism (see Dependency-Based Parallelization).
