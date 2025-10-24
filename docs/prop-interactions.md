# Prop Interactions in Mention Selection

This note follows the path from typing a trigger through selecting and committing a suggestion, focusing on `ignoreAccents`, `data`, `allowSpaceInQuery`, `markup`, and `regex`.

## 1. Detecting the active query
- The caret movement feeds `updateMentionsQueries`, which extracts the plain-text slice right before the caret `substring` (`src/MentionsInput.tsx:1402-1447`).
- Each `<Mention>` child contributes its `trigger` and `allowSpaceInQuery` flag. They are folded into a trigger-specific matcher via `makeTriggerRegex(trigger, { allowSpaceInQuery })`, so the regex captures either `@foo` or `@Ada Lovelace` when spaces are allowed (`src/utils/makeTriggerRegex.ts:6-22`).
- When the substring matches, capture group 2 (`match[2]`) becomes the query string that drives the data lookup. Without `allowSpaceInQuery`, typing a space terminates the match and no suggestions hydrate.

```
+-----------------------+
| caret + substring     |
+-----------+-----------+
            |
            v
 makeTriggerRegex(trigger, { allowSpaceInQuery })
            |
+-----------v-----------+
| substring.match(regex)| -- absent --> suggestions cleared
+-----------+-----------+
            |
            v
       queryData(query)
```

## 2. Retrieving suggestion candidates
- `queryData` resolves the `<Mention>` child by index and pulls its `data` prop (`src/MentionsInput.tsx:1461-1488`).
- `getDataProvider` wraps the `data` prop so that array sources and async providers expose the same interface (`src/MentionsInput.tsx:55-73`).
- When `data` is a static array, the filter inside `getDataProvider` leverages `getSubstringIndex(..., ignoreAccents)` to decide if a candidate matches the query. This is where the top-level `ignoreAccents` prop removes diacritics from both sides before comparing (`src/utils/getSubstringIndex.ts:16-22`).
- When `data` is a function, `ignoreAccents` does not alter the remote call, so the provider itself must respect accent handling if required.

```
queryData(query)                                      ignoreAccents
      |                                                    |
      v                                                    v
+-----+------------------+     use getSubstringIndex   +------------------------+
| getDataProvider(data)  |---------------------------->| filter display strings |
+-----+------------------+                             +-----------+------------+
      |                                                                  |
      v                                                                  v
 async results (array or promise)                                suggestions map
```

## 3. Highlighting and navigation in the overlay
- `SuggestionsOverlay` flattens results and renders `<Suggestion>` nodes, passing the parent `ignoreAccents` flag downstream (`src/SuggestionsOverlay.tsx:119-177`).
- Each `Suggestion` recomputes the match location with the same `getSubstringIndex` helper so that accent-insensitive filtering and highlighting stay in sync (`src/Suggestion.tsx:42-82`).
- Because the same query string from step 1 is reused, the user-visible emphasis and keyboard navigation align with the filtered list.

## 4. Committing a suggestion: `markup` meets `regex`
- Selecting a suggestion invokes `addMention`, which retrieves the `<Mention>` child configuration produced by `readConfigFromChildren` (`src/MentionsInput.tsx:1533-1560`).
- `readConfigFromChildren` pairs every child’s `markup` with a matching `regex`:
  - If no custom `regex` is supplied, it is synthesized from the `markup` placeholder layout via `markupToRegex` (`src/utils/readConfigFromChildren.ts:8-21`, `src/utils/markupToRegex.ts:1-18`).
  - If a custom `regex` is provided, `coerceCapturingGroups` validates that the number of capturing groups matches the placeholders present in `markup`; otherwise it throws, preventing desynchronised parsing (`src/utils/readConfigFromChildren.ts:24-36`).
- `makeMentionsMarkup(markup, id, display)` materialises the stored representation inserted into the textarea value (`src/utils/makeMentionsMarkup.ts:1-5`).
- The same `{ markup, regex }` pairs are threaded through `mapPlainTextIndex` and `iterateMentionsMarkup`, which are responsible for translating caret positions and stripping markup back to plain text (`src/MentionsInput.tsx:1402-1445`, `src/utils/mapPlainTextIndex.ts:6-62`, `src/utils/iterateMentionsMarkup.ts:20-88`). This guarantees that the overlay indices computed earlier still map to the correct offsets after insertion.

```
+-----------------------+
| addMention selection  |
+-----------+-----------+
            |
            v
 readConfigFromChildren(children)
            |
   +--------+---------+
   | markup | regex   |  <-- validated as a pair
   +--------+---------+
            |
            v
 makeMentionsMarkup(markup, id, display)
            |
+-----------v-----------+
| value with markup     |
+-----------+-----------+
            |
            v
 iterateMentionsMarkup / mapPlainTextIndex (reuse regex)
```

## 5. Key takeaways
- `allowSpaceInQuery` only influences detection; it widens or narrows the trigger regex that governs when `queryData` runs.
- `data` supplies the raw suggestions, while `ignoreAccents` decides how array sources are filtered and how rendered suggestions highlight matches.
- `markup` defines the stored representation of a mention, and `regex` (whether generated or supplied) must align with it so that mapping helpers can safely move between plain text and marked-up text.
- Consistency hinges on passing the same `ignoreAccents` and `{ markup, regex }` configuration through all stages—trigger matching, data filtering, rendering, and insertion—so overrides should be introduced together rather than in isolation.

## 6. Options for simplification and foot-gun removal

The pain points above boil down to two themes:
1. The library mixes parsing and presentation responsibilities, so props like `ignoreAccents` and `allowSpaceInQuery` leak through multiple layers.
2. Configuration is spread across `markup`, `regex`, and `data`. When they drift apart the runtime either throws late or produces confusing results.

Below are exploration notes on how we could make the API harder to misuse while giving consumers explicit control over search semantics.

### Option A — Consumer-driven querying and filtering
- Replace `data` arrays with a required `onQuery` callback that receives `{ trigger, rawSubstring, plainTextValue }` and returns the suggestion list. The library would stop filtering altogether; it would only display the array it receives.
- Inline highlighting would move to either:
  - A token in the suggestion payload describing the matching ranges, or
  - A `renderSuggestion` convention that receives the full query context so the consumer can decide how to highlight.
- `ignoreAccents` disappears entirely because the consumer is responsible for normalization. Likewise, spaces in queries become a consumer concern because we no longer enforce trigger-based parsing beyond the literal trigger boundary.
- Risk: existing users relying on automatic filtering would need to reimplement accent logic. Mitigation: ship a utility (e.g. `createDefaultQueryHandler`) that mirrors the current behavior for migration.

### Option B — Strategy object instead of boolean props
- Introduce a `queryStrategy` prop per `<Mention>` that bundles `match(substring)`, `extractQuery(match)`, and `shouldOpen(match)` functions. This replaces implicit regex wiring and removes `allowSpaceInQuery`.
- The bundled strategy could reuse our current regex helpers, but the default strategy is opt-in; providing a custom strategy makes the data flow explicit.
- `ignoreAccents` can be folded into the strategy, letting people plug in locale-specific normalization; the library simply forwards queries downstream.
- Benefit: the API forces users to think about how queries are matched, while library code just calls the strategy.
- Tradeoff: more verbose configuration, and consumers must handle edge cases we previously papered over.

### Option C — Serializer contract instead of `{ markup, regex }`
- Replace the paired props with a single `serializer` object that exposes:
  - `insert({ id, display }): string`
  - `iterateMarkup(value, iteratee): void`
  - `plainTextLength(markupChunk): number`
- Internally we already need these behaviors; exposing them as an object makes the contract explicit and removes the possibility of mismatched markup and regex definitions.
- We can still ship a default `createMatcherSerializer({ markupTemplate })` helper that reproduces existing behavior.
- Upside: no runtime checks for capturing-group counts. Downside: writing a custom serializer requires more code than passing a template string, so casual customization becomes harder.

### Option D — Narrowed core + advanced escape hatch
- Offer two tiers:
  1. Core API with fixed trigger parsing (single regex), no accent handling, and locked-down markup (maybe always `@[__display__](__id__)`). This path is impossible to misconfigure.
  2. An advanced hook-based API (`useMentionsController`) that exposes low-level utilities for teams that need full control.
- Users start with the safe path; advanced teams opt into the expert mode and accept the extra burden.
- Migration could deprecate the current props in favor of the core API, and re-express them as helpers layered on top of the hook.

## 7. Tradeoffs snapshot

| Option | Eliminated foot guns | Impact on consumers | Library complexity | Notes |
| --- | --- | --- | --- | --- |
| A. Consumer-driven querying | `ignoreAccents`, `allowSpaceInQuery`, filtering mismatch | Must implement filtering, highlighting, and edge cases | Simplifies core to rendering & caret math | Provide scaffold utilities to ease migration |
| B. Strategy object | Boolean + implicit regex coupling | Configure strategy per trigger; more boilerplate | Moderate; strategy interface but reuse helpers | Encourages explicit rules without removing features |
| C. Serializer contract | Markup/regex mismatch, parsing drift | Write serializer or use factory helper | Higher upfront refactor; runtime code becomes straightforward | Most robust but steepest learning curve |
| D. Narrowed core + hook | Most legacy props hidden behind hook | Default path simpler; advanced users drop to hooks | Dual API surfaces to maintain | Transitional approach that balances safety and flexibility |
