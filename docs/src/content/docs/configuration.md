---
title: Configuration
description: Every MentionsInput and Mention prop, the change payloads, the imperative API, and async data loading.
---

## MentionsInput props

| Prop name                  | Type                                                                                       | Default value  | Description                                                                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| value                      | string                                                                                     | `''`           | The value containing markup for mentions (omit for uncontrolled usage)                                                                                                                                                 |
| defaultValue               | string                                                                                     | `''`           | Initial markup value for uncontrolled usage; ignored when `value` is provided                                                                                                                                          |
| name                       | string                                                                                     | `undefined`    | Renders a hidden input with this name carrying the markup value, for native `<form>` submissions and form actions                                                                                                      |
| onMentionsChange           | function ({ trigger, value, plainTextValue, idValue, mentionId, mentions, previousValue }) | `undefined`    | Called when the mention markup changes; receives the updated markup value, plain text, id-based text, the affected mention id (when applicable), active mentions, and the previous markup value                        |
| onMentionSelectionChange   | function (selection, context)                                                              | `undefined`    | Called whenever the caret or selection overlaps one or more mentions; receives an ordered array of `MentionSelection` entries and a metadata context containing the current value, plain text, and mention identifiers |
| onKeyDown                  | function (event)                                                                           | empty function | A callback that is invoked when the user presses a key in the mentions input                                                                                                                                           |
| singleLine                 | boolean                                                                                    | `false`        | Renders a single line text input instead of a textarea, if set to `true`                                                                                                                                               |
| autoResize                 | boolean                                                                                    | `false`        | When `true`, resizes the textarea to match its scroll height after each input change (ignored when `singleLine` is `true`)                                                                                             |
| anchorMode                 | `'caret' \| 'left'`                                                                        | `'caret'`      | Controls whether the overlay follows the caret (`'caret'`) or pins to the control's leading edge (`'left'`)                                                                                                            |
| onMentionBlur              | function (event, clickedSuggestion)                                                        | `undefined`    | Receives an extra `clickedSuggestion` flag when focus left via the suggestions list                                                                                                                                    |
| suggestionsPortalHost      | DOM Element                                                                                | undefined      | Render suggestions into the DOM in the supplied host element.                                                                                                                                                          |
| inputRef                   | React ref                                                                                  | undefined      | Accepts a React ref to forward to the underlying input element                                                                                                                                                         |
| suggestionsPlacement       | `'auto' \| 'above' \| 'below'`                                                             | `'below'`      | Controls where the suggestion list renders relative to the caret (`'auto'` flips when space is limited)                                                                                                                |
| a11ySuggestionsListLabel   | string                                                                                     | `''`           | This label would be exposed to screen readers when suggestion popup appears                                                                                                                                            |
| customSuggestionsContainer | function(children)                                                                         | empty function | Allows customizing the container of the suggestions                                                                                                                                                                    |
| inputComponent             | React component                                                                            | undefined      | Allows the use of a custom input component                                                                                                                                                                             |
| suggestionsDisplay         | `'overlay' \| 'inline'`                                                                    | `'overlay'`    | Choose between the traditional suggestions overlay and inline autocomplete hints                                                                                                                                       |
| spellCheck                 | boolean                                                                                    | `false`        | Controls browser spell checking on the underlying input (disabled by default)                                                                                                                                          |
| onSelect                   | function (event)                                                                           | empty function | A callback that is invoked when the user selects a portion of the text in the input                                                                                                                                    |

### onMentionsChange payload

`onMentionsChange` receives an object with the following fields:

- `value`: the latest markup string containing mentions
- `plainTextValue`: the same content without mention markup
- `idValue`: the plain-text view with each mention display substituted for its identifier (useful for downstream parsing/search)
- `mentionId`: the identifier of the mention that triggered the change when the `trigger.type` is mention-specific (e.g. `'mention-add'`); otherwise `undefined`
- `mentions`: the mention occurrences extracted from the new value
- `previousValue`: the markup string before the change
- `trigger`: metadata about what caused the change. `trigger.type` is one of `'input'`, `'paste'`, `'cut'`, `'mention-add'`, `'mention-remove'`, or `'insert-text'`, and, when available, `trigger.nativeEvent` references the originating DOM event (optional; do not rely on its exact shape). Regular text edits (typing, Backspace/Delete) use `trigger.type: 'input'`.

### onMentionSelectionChange payload

`onMentionSelectionChange` receives an array of [`MentionSelection`](https://github.com/hbmartin/react-mentions-ts/blob/master/src/types.ts) entries. The array is ordered by the mention positions in the current value and is empty when the caret/selection does not intersect with any mentions. Each entry includes:

- All fields from `MentionOccurrence` (`id`, `display`, `childIndex`, `index`, `plainTextIndex`, and the resolved `data` item when available)
- `plainTextStart` / `plainTextEnd`: the inclusive/exclusive plain-text boundaries of the mention
- `serializerId`: identifies which `Mention` child produced the selection (useful when multiple triggers share an `id`)
- `selection`: one of:
  - `'inside'` – the caret is collapsed somewhere between the mention boundaries
  - `'boundary'` – the caret is collapsed exactly on the start or end boundary
  - `'partial'` – a range selection overlaps the mention without covering it completely
  - `'full'` – the selection fully covers the mention

The callback fires on every selection change, so you can keep live state in sync with caret movement.

The optional `context` argument includes:

- `value` / `plainTextValue` / `idValue`: the latest markup, display-based plain text, and id-based plain text representations
- `mentions`: the mentions found in the current value
- `mentionIds`: the identifiers for the mentions covered by the current selection (ordered)
- `mentionId`: the identifier when the selection maps to a single mention; otherwise `undefined`

### Imperative API

Attach a ref to `MentionsInput` when you need to programmatically insert text at the current caret position or replace the current selection:

```tsx
import { useRef, useState } from 'react'
import { Mention, MentionsInput, type MentionsInputHandle } from 'react-mentions-ts'

function ImperativeApiExample() {
  const mentionsRef = useRef<MentionsInputHandle>(null)
  const [value, setValue] = useState('')

  return (
    <>
      <button type="button" onClick={() => mentionsRef.current?.insertText('anything')}>
        Insert text
      </button>

      <MentionsInput
        ref={mentionsRef}
        value={value}
        onMentionsChange={({ value: nextValue }) => setValue(nextValue)}
      >
        <Mention trigger="@" data={users} />
      </MentionsInput>
    </>
  )
}
```

## Mention props

Each data source is configured using a `Mention` component, which has the following props:

| Prop name        | Type                                                         | Default value              | Description                                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| trigger          | RegExp or string                                             | `'@'`                      | Defines the char sequence upon which to trigger querying the data source                                                                                                                    |
| data             | array or function `(query, { signal, cursor, reason })`      | `null`                     | An array of mentionable entries, or a filtering function that returns matching entries or a cursor page. Async providers receive an `AbortSignal` so stale requests can be cancelled safely |
| renderSuggestion | function (entry, search, highlightedDisplay, index, focused) | `null`                     | Allows customizing how mention suggestions are rendered (optional)                                                                                                                          |
| renderEmpty      | function `(query) => ReactNode`                              | `null`                     | Renders custom empty-state content when a query completes without any suggestions                                                                                                           |
| renderError      | function `(query, error) => ReactNode`                       | `null`                     | Renders custom error-state content when an async data provider rejects                                                                                                                      |
| markup           | string \| `MentionSerializer`                                | `'@[__display__](__id__)'` | Template string for stored markup, or pass a `MentionSerializer` instance for full control                                                                                                  |
| displayTransform | function (id, display)                                       | returns `display`          | Accepts a function for customizing the string that is displayed for a mention                                                                                                               |
| onAdd            | function ({id, display, startPos, endPos, serializerId})     | empty function             | Callback invoked when a suggestion has been added (optional)                                                                                                                                |
| appendSpaceOnAdd | boolean                                                      | `false`                    | Append a space when a suggestion has been added (optional)                                                                                                                                  |
| debounceMs       | number                                                       | `0`                        | Debounces async provider calls to reduce network chatter while typing                                                                                                                       |
| maxSuggestions   | number                                                       | unlimited                  | Caps the number of suggestions rendered from array results. Cursor page results own their page size and are not capped                                                                      |

:::note
When passing a `RegExp` as `trigger`, omit the global `/g` flag. The component clones the pattern internally; global regexes maintain shared `lastIndex` state and will skip matches across renders. Your custom `RegExp` should also be anchored to the end of the string with `$` to match only at the current cursor position, and it must contain two capturing groups: the first for the trigger and query (e.g., `@mention`), and the second for just the query (e.g., `mention`).
:::

:::tip
Want to allow spaces (or other advanced patterns) after a trigger? Pass a custom `RegExp` — for example `trigger={makeTriggerRegex('@', { allowSpaceInQuery: true })}` — instead of relying on a boolean flag. The [`makeTriggerRegex`](../advanced/#maketriggerregex) utility handles the regex construction for you.
:::

## Async data loading

If a function is passed as the `data` prop, it receives the current search query plus a `MentionSearchContext` containing an `AbortSignal`, and should return a promise that resolves with the list of suggestions. When the user keeps typing, the previous request is aborted and its results are ignored automatically.

```tsx
import type { MentionSearchContext } from 'react-mentions-ts'

type User = { id: string; display: string }

const fetchUsers = async (query: string, { signal }: MentionSearchContext): Promise<User[]> => {
  const response = await fetch(`/api/users?search=${query}`, { signal })
  return response.json()
}

;<Mention trigger="@" data={fetchUsers} debounceMs={150} maxSuggestions={8} />
```

### Cursor pagination

Async providers can also return cursor pages. The first request receives `reason: 'query'` and `cursor: null`. When the overlay list scrolls near the bottom, the provider is called again with `reason: 'page'` and the previous `nextCursor`; returned `items` are appended to the active suggestions. `null` or `undefined` `nextCursor`, or `hasMore: false`, stops pagination. Providers should avoid duplicate ids within the same query.

```tsx
type UserPage = {
  items: User[]
  nextCursor?: string | null
}

const fetchUsersPage = async (
  query: string,
  { cursor, signal }: MentionSearchContext
): Promise<UserPage> => {
  const params = new URLSearchParams({ search: query })
  if (typeof cursor === 'string') {
    params.set('cursor', cursor)
  }

  const response = await fetch(`/api/users?${params.toString()}`, { signal })
  return response.json()
}

;<Mention trigger="@" data={fetchUsersPage} debounceMs={150} />
```

Redux-Saga and similar async layers can bridge pagination by returning a promise from `data` and resolving it from the saga:

```tsx
const data = (query: string, { cursor, signal }: MentionSearchContext) =>
  new Promise<UserPage>((resolve, reject) => {
    dispatch(fetchMentionPage({ query, cursor, signal, resolve, reject }))
  })
```
