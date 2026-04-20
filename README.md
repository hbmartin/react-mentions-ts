# React Mentions TS

[![npm version](https://badge.fury.io/js/react-mentions-ts.svg)](https://www.npmjs.com/package/react-mentions-ts)
[![codecov](https://codecov.io/gh/hbmartin/react-mentions-ts/graph/badge.svg?token=Po1nDYEr5f)](https://codecov.io/gh/hbmartin/react-mentions-ts)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/react-mentions-ts)](https://bundlephobia.com/package/react-mentions-ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://reactjs.org/)
[![Context7](https://img.shields.io/badge/[]-Context7-059669)](https://context7.com/hbmartin/react-mentions-ts)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/hbmartin/react-mentions-ts)

A React component that enables Facebook/Twitter-style @mentions and tagging in textarea inputs with full TypeScript support.

### [Try out the live demos now!](https://hbmartin.github.io/react-mentions-ts/)

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Configuration](#configuration)
  - [MentionsInput Props](#mentionsinput-props)
  - [Mention Props](#mention-props)
  - [Async Data Loading](#async-data-loading)
- [More Examples](#more-examples)
- [Advanced Usage](#advanced-usage)
- [Package & Tree Shaking](#package--tree-shaking)
- [Styling](#styling)
- [Testing](#testing)
- [FAQ & Gotchas](#faq--gotchas)
- [Migrating from react-mentions](#migrating-from-react-mentions)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Features

- **Flexible Triggers** — any character, string, or custom `RegExp` (`@`, `#`, `:`, or your own)
- **Async Data Loading** — real-time filtering with debouncing, `AbortSignal` cancellation, and cursor pagination
- **Caret Aware** — detect when the caret overlaps mentions and style them via `data-mention-selection`
- **Inline Autocomplete** — ghost-text hints accepted with Tab, Enter, or arrow keys
- **Tailwind v4 Ready** — first-class support for Tailwind CSS v4 utility styling
- **TypeScript First** — written in TypeScript with complete type definitions
- **Accessible** — built with ARIA labels and keyboard navigation
- **SSR Compatible** — works with Next.js and other SSR frameworks
- **Mobile Friendly** — touch-optimized for mobile devices

## Installation

```bash
# npm
npm install react-mentions-ts --save

# yarn
yarn add react-mentions-ts

# pnpm
pnpm add react-mentions-ts
```

### Peer dependencies

`react` and `react-dom` are required. The remaining peers are only needed if you use the built-in Tailwind styling:

```bash
# Required
npm install react react-dom

# Required only if using the built-in Tailwind utility classes
npm install class-variance-authority clsx tailwind-merge
```

Check `package.json` for the latest peer dependency version ranges.

## Quick Start

### Basic usage

```tsx
import { useState } from 'react'
import { MentionsInput, Mention } from 'react-mentions-ts'

const users = [
  { id: 'walter', display: 'Walter White' },
  { id: 'jesse', display: 'Jesse Pinkman' },
  { id: 'gus', display: 'Gustavo "Gus" Fring' },
  { id: 'saul', display: 'Saul Goodman' },
]

function MyComponent() {
  const [value, setValue] = useState('')

  return (
    <MentionsInput value={value} onMentionsChange={({ value: nextValue }) => setValue(nextValue)}>
      <Mention trigger="@" data={users} />
    </MentionsInput>
  )
}
```

### Reading mentions and mixing multiple triggers

Most apps need both the text and the structured list of selected entities. Pass multiple `Mention` children for different triggers and read `mentions` from the change payload:

```tsx
import { useState } from 'react'
import { MentionsInput, Mention } from 'react-mentions-ts'

const users = [
  { id: 'walter', display: 'Walter White' },
  { id: 'jesse', display: 'Jesse Pinkman' },
]

const tags = [
  { id: 'urgent', display: 'urgent' },
  { id: 'followup', display: 'follow-up' },
]

function CommentBox() {
  const [value, setValue] = useState('')
  const [mentionedIds, setMentionedIds] = useState<string[]>([])

  return (
    <>
      <MentionsInput
        value={value}
        onMentionsChange={({ value: nextValue, mentions }) => {
          setValue(nextValue)
          setMentionedIds(mentions.map((m) => String(m.id)))
        }}
      >
        <Mention trigger="@" data={users} appendSpaceOnAdd />
        <Mention trigger="#" data={tags} markup="#[__display__](__id__)" appendSpaceOnAdd />
      </MentionsInput>

      <button type="button" onClick={() => submitComment({ body: value, mentionedIds })}>
        Post
      </button>
    </>
  )
}
```

See [Styling](#styling) for the Tailwind setup (optional; the component also works with plain CSS, CSS modules, or inline styles).

## How It Works

`MentionsInput` is the main component that renders the textarea control. It accepts one or multiple `Mention` components as children. Each `Mention` component represents a data source for a specific class of mentionable objects:

- **Users** — `@username` mentions
- **Tags** — `#hashtag` mentions
- **Templates** — `{{variable}}` mentions
- **Emojis** — `:emoji:` mentions
- **Custom** — any pattern you need

**[View more examples](https://github.com/hbmartin/react-mentions-ts/tree/master/demo/src/examples)**

## Configuration

### MentionsInput Props

The `MentionsInput` component supports the following props:

| Prop name                  | Type                                                                                       | Default value  | Description                                                                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| value                      | string                                                                                     | `''`           | The value containing markup for mentions                                                                                                                                                                               |
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

#### onMentionsChange payload

`onMentionsChange` receives an object with the following fields:

- `value`: the latest markup string containing mentions
- `plainTextValue`: the same content without mention markup
- `idValue`: the plain-text view with each mention display substituted for its identifier (useful for downstream parsing/search)
- `mentionId`: the identifier of the mention that triggered the change when the `trigger.type` is mention-specific (e.g. `'mention-add'`); otherwise `undefined`
- `mentions`: the mention occurrences extracted from the new value
- `previousValue`: the markup string before the change
- `trigger`: metadata about what caused the change. `trigger.type` is one of `'input'`, `'paste'`, `'cut'`, `'mention-add'`, `'mention-remove'`, or `'insert-text'`, and, when available, `trigger.nativeEvent` references the originating DOM event (optional; do not rely on its exact shape). Regular text edits (typing, Backspace/Delete) use `trigger.type: 'input'`.

#### Imperative API

Attach a ref to `MentionsInput` when you need to programmatically insert text at the current caret position or replace the current selection:

```tsx
import { useRef, useState } from 'react'
import { Mention, MentionsInput, type MentionsInputHandle } from 'react-mentions-ts'

const users = [
  { id: 'walter', display: 'Walter White' },
  { id: 'jesse', display: 'Jesse Pinkman' },
]

function ImperativeApiExample() {
  const mentionsRef = useRef<MentionsInputHandle>(null)
  const [value, setValue] = useState('')

  const handleInsertText = () => {
    mentionsRef.current?.insertText('anything')
  }

  return (
    <>
      <button type="button" onClick={handleInsertText}>
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

#### onMentionSelectionChange payload

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

### Mention Props

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

> Need the legacy `markup` customization? Import `createMarkupSerializer` from `react-mentions` and pass `markup={createMarkupSerializer(':__id__')}` (or any other template) to keep markup/parse logic in sync without wiring a regex manually.

> When passing a `RegExp` as `trigger`, omit the global `/g` flag. The component clones the pattern internally; global regexes maintain shared `lastIndex` state and will skip matches across renders. Your custom `RegExp` should also be anchored to the end of the string with `$` to match only at the current cursor position, and it must contain two capturing groups: the first for the trigger and query (e.g., `@mention`), and the second for just the query (e.g., `mention`).

> Want to allow spaces (or other advanced patterns) after a trigger? Pass a custom `RegExp`—for example `trigger={makeTriggerRegex('@', { allowSpaceInQuery: true })}`—instead of relying on a boolean flag. The `makeTriggerRegex` utility handles the regex construction for you.

### Async Data Loading

If a function is passed as the `data` prop, it receives the current search query plus a [`MentionSearchContext`](src/types.ts) containing an `AbortSignal`, and should return a promise that resolves with the list of suggestions. When the user keeps typing, the previous request is aborted and its results are ignored automatically.

```tsx
import type { MentionSearchContext } from 'react-mentions-ts'

type User = { id: string; display: string }

const fetchUsers = async (query: string, { signal }: MentionSearchContext): Promise<User[]> => {
  const response = await fetch(`/api/users?search=${query}`, { signal })
  return response.json()
}

;<Mention trigger="@" data={fetchUsers} debounceMs={150} maxSuggestions={8} />
```

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

## More Examples

The [live demo](https://hbmartin.github.io/react-mentions-ts/) includes many ready-to-use patterns. Each demo's source is in [`demo/src/examples/`](https://github.com/hbmartin/react-mentions-ts/tree/master/demo/src/examples):

| Demo                      | Description                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| **Multiple Triggers**     | Mention teammates with `@` or type an email address — styling switches based on the trigger |
| **Single Line**           | Compact single-line input for chat composer bars                                            |
| **Multi-Word Queries**    | Use `makeTriggerRegex('@', { allowSpaceInQuery: true })` for multi-word searches            |
| **Regex Trigger**         | Fire suggestions on any alphabetical word with no prefix character required                 |
| **Accent-Insensitive**    | Normalises diacritics before matching so `Lydia` finds `Lydìã`                              |
| **Scrollable Composer**   | Textarea and highlighter stay in sync while scrolling long drafts                           |
| **Auto-Resize**           | Textarea grows to match its content with `autoResize`                                       |
| **Copy & Paste**          | Mentions survive clipboard round-trips, even into plain-text fields                         |
| **Caret Mention States**  | Style mentions based on caret overlap via `data-mention-selection` attributes               |
| **Inline Autocomplete**   | Ghost-text completions accepted with Tab, Enter, or arrow keys                              |
| **Async GitHub Mentions** | Live GitHub API search with debouncing, cancellation, and stale-result suppression          |
| **Emoji Support**         | Mix people mentions with emoji search powered by a JSON data source                         |
| **Suggestions Portal**    | Render suggestions anywhere in the DOM for modals, drawers, or fixed toolbars               |
| **Custom Container**      | Wrap suggestions in bespoke UI chrome — badges, headlines, or analytics                     |
| **Left Anchored**         | Pin the overlay to the input's leading edge instead of following the caret                  |
| **Advanced Formatting**   | Custom markup, programmatic focus, and flipped suggestion lists                             |

## Advanced Usage

### Markup Format and Controlled State

`MentionsInput` is a **controlled component** — you must provide a `value` prop and handle updates via `onMentionsChange`. The `value` string uses a markup format to encode mentions inline with plain text.

The default markup template is `@[__display__](__id__)`, so a value containing a mention looks like:

```
Hey @[Walter White](walter), are you there?
```

The `__display__` placeholder stores the visible text and `__id__` stores the mention identifier. When rendered, the user sees plain text (`Hey @Walter White, are you there?`) while the underlying value preserves the structured mention data.

You can customize the template via the `markup` prop on `Mention`, or pass a `MentionSerializer` for full control (see below).

### `makeTriggerRegex`

A utility that builds a properly anchored regex from a trigger string. Useful when you need spaces in queries or accent-insensitive matching without hand-rolling a regex.

```ts
import { makeTriggerRegex } from 'react-mentions-ts'

makeTriggerRegex('@')
// default — matches @query at end of string

makeTriggerRegex('@', { allowSpaceInQuery: true })
// allows "@ John Doe" style multi-word queries

makeTriggerRegex('@', { ignoreAccents: true })
// Unicode-aware matching for accented characters
```

**Signature:**

```ts
makeTriggerRegex(
  trigger?: string | RegExp,  // default: '@'
  options?: {
    allowSpaceInQuery?: boolean
    ignoreAccents?: boolean   // enables the Unicode `u` flag
  }
): RegExp
```

When `trigger` is already a `RegExp`, it is returned as-is.

### `createMarkupSerializer`

Converts a markup template string into a `MentionSerializer` object. Use this when you want custom markup formats without manually wiring up insertion and parsing logic.

```ts
import { createMarkupSerializer } from 'react-mentions-ts'

const serializer = createMarkupSerializer(':__id__')
// serializer.insert({ id: 'wave', display: 'Wave' })  → ':wave'
// serializer.findAll('Hello :wave and :smile')         → [{ id: 'wave', ... }, { id: 'smile', ... }]
```

Pass the result as the `markup` prop on `Mention`:

```tsx
<Mention trigger=":" data={emojis} markup={createMarkupSerializer(':__id__')} />
```

### `MentionSerializer` Interface

For cases where `createMarkupSerializer` is not flexible enough, you can implement the `MentionSerializer` interface directly:

```ts
interface MentionSerializer {
  id: string
  insert: (input: { id: string | number; display: string }) => string
  findAll: (value: string) => MentionSerializerMatch[]
}

interface MentionSerializerMatch {
  markup: string // the full matched substring
  index: number // position in the value string
  id: string // extracted mention identifier
  display?: string | null // extracted display text
}
```

- **`id`** — a unique string identifying this serializer (used internally to distinguish multiple `Mention` children)
- **`insert`** — given a mention's `id` and `display`, returns the markup string to splice into the value
- **`findAll`** — scans a value string and returns every mention match with its position and extracted fields

### Custom serializer for IDs containing `)`

If your mention IDs can contain characters that would otherwise terminate a template placeholder early, write a custom serializer and encode the `id` before storing it in the markup.

The example below percent-encodes reserved characters so an ID like `team)west` is stored safely and decoded back to its original value when the controlled value is parsed:

```ts
import type { MentionSerializer } from 'react-mentions-ts'

const encodeMentionId = (id: string): string =>
  encodeURIComponent(id).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )

const decodeMentionId = (encoded: string): string => decodeURIComponent(encoded)

export const parenSafeSerializer: MentionSerializer = {
  id: 'paren-safe-serializer',
  insert: ({ id, display }) => `@[${display}](${encodeMentionId(String(id))})`,
  findAll: (value) => {
    const regex = /@\[([^\]]+)]\(([^)]+)\)/g
    const matches = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(value)) !== null) {
      matches.push({
        markup: match[0],
        index: match.index,
        display: match[1],
        id: decodeMentionId(match[2]),
      })
    }

    return matches
  },
}
```

Use it on `Mention` like any other serializer:

```tsx
<Mention trigger="@" data={users} markup={parenSafeSerializer} />
```

For example, selecting a mention with `id: 'team)west'` stores `@[Team West](team%29west)` in `value`, and `findAll` decodes it back to `team)west`.

### SSR and Next.js

The component is SSR-compatible out of the box. It guards against missing browser globals (`document`) during server rendering, so it works with Next.js, Remix, and other SSR frameworks without extra configuration.

In Next.js App Router, add the `'use client'` directive to any file that renders `MentionsInput`:

```tsx
'use client'

import { MentionsInput, Mention } from 'react-mentions-ts'
```

No dynamic imports or `next/dynamic` wrappers are needed.

## Package & Tree Shaking

The package is published as side-effect free, and the release evidence is repeatable:

```bash
pnpm tree-shake:report
```

The report command rebuilds `dist`, runs `npx publint --pack npm`, requires `"sideEffects": false`, inspects `npm pack --dry-run --json`, and bundles small Vite consumer fixtures against `dist/index.js`.

Current verified behavior:

- A fixture that imports only `Mention` and `getSubstringIndex` must not retain `LoadingIndicator`, `SuggestionsOverlay`, or inline-suggestion markers.
- A fixture that imports `MentionsInput` currently retains overlay, loading, and inline-suggestion markers because those branches are statically imported by the orchestration shell.
- The npm pack check prints the tarball filename, packed size, unpacked size, and file count so publish contents stay visible.

Maintainer follow-up opportunities are `LoadingIndicator`, `SuggestionsOverlay`, and the inline-suggestion UI/selector path. Those can be split or lazy-loaded in a future packaging change for consumers that never use those branches. This is not a consumer setup requirement; apps can keep importing `MentionsInput` normally, including in SSR frameworks, without `next/dynamic` wrappers.

## Styling

React Mentions ships its markup with **Tailwind utility classes**. Consumers should have Tailwind configured in their application build so these classes compile to real CSS. If you do not use Tailwind you can still provide your own styles via `className`, CSS modules, or inline styles.

### Tailwind CSS

The components assume Tailwind is available in the consuming app. A minimal setup looks like:

```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

```css
/* src/index.css (or your global stylesheet) */
@import 'tailwindcss';
@import 'react-mentions-ts/styles/tailwind.css';
```

The optional helper `react-mentions-ts/styles/tailwind.css` only declares an `@source "../dist";` directive so Tailwind v4 can detect the library's utility classes inside `node_modules/react-mentions-ts/dist`. Including it keeps your Tailwind config clean and avoids adding explicit `content` globs for the package.

If you are still on Tailwind v3, add `./node_modules/react-mentions-ts/dist/**/*.{js,jsx,ts,tsx}` to the `content` array instead of importing the helper file.

### CSS Class Names

Assign a `className` prop to `MentionsInput`. All DOM nodes will receive derived class names:

```tsx
<MentionsInput className="mentions">
  <Mention className="mentions__mention" />
</MentionsInput>
```

### Inline Styles

```tsx
<MentionsInput style={customStyle}>
  <Mention style={mentionStyle} />
</MentionsInput>
```

### Caret-Driven Styling Hooks

Every rendered mention exposes a `data-mention-selection` attribute whenever the caret or selection overlaps it. The attribute reflects the current coverage (`inside`, `boundary`, `partial`, or `full`), so you can target focus states purely in CSS without extra bookkeeping:

```tsx
<Mention
  trigger="@"
  data={users}
  className="rounded-full bg-indigo-500/25 px-2 py-0.5 text-sm font-semibold text-indigo-100 transition
             data-[mention-selection=inside]:bg-emerald-500/35 data-[mention-selection=inside]:text-emerald-50
             data-[mention-selection=boundary]:ring-2 data-[mention-selection=boundary]:ring-indigo-300
             data-[mention-selection=partial]:bg-amber-500/35 data-[mention-selection=partial]:text-amber-50
             data-[mention-selection=full]:bg-indigo-500 data-[mention-selection=full]:text-white"
/>
```

See the "Caret mention states" demo (`demo/src/examples/MentionSelection.tsx`) for a complete example that combines styling with the `onMentionSelectionChange` callback.

### Inline Autocomplete Styling

When `suggestionsDisplay="inline"` is set, the component renders a ghost-text hint next to the caret instead of a dropdown overlay. The user accepts the suggestion with Tab, Enter, or the right arrow key.

```tsx
<MentionsInput
  value={value}
  onMentionsChange={({ value: nextValue }) => setValue(nextValue)}
  suggestionsDisplay="inline"
>
  <Mention trigger="@" data={users} />
</MentionsInput>
```

Customize the inline hint appearance via the `classNames` prop:

| Class name slot          | What it targets                                   |
| ------------------------ | ------------------------------------------------- |
| `inlineSuggestion`       | The absolutely-positioned wrapper around the hint |
| `inlineSuggestionText`   | The visible completion text                       |
| `inlineSuggestionPrefix` | The already-typed portion (hidden with `sr-only`) |
| `inlineSuggestionSuffix` | The remaining suggestion shown after the caret    |

See [demo/src/examples/defaultStyle.ts](https://github.com/hbmartin/react-mentions-ts/blob/master/demo/src/examples/defaultStyle.ts) for a full styling example.

## Testing

Due to React Mentions' internal cursor tracking, use [@testing-library/user-event](https://github.com/testing-library/user-event) for realistic event simulation:

```tsx
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

test('mentions work correctly', async () => {
  const user = userEvent.setup()
  const { getByRole } = render(<MyMentionsComponent />)

  await user.type(getByRole('textbox'), '@john')
  // assertions...
})
```

## FAQ & Gotchas

**My Tailwind classes aren't applying to the library's DOM.**
Tailwind v4 only generates utilities it finds in your source. Either import `react-mentions-ts/styles/tailwind.css` (which adds an `@source` pointing at the library's `dist`), or on Tailwind v3 add `./node_modules/react-mentions-ts/dist/**/*.{js,jsx,ts,tsx}` to your `content` array. See [Tailwind CSS](#tailwind-css).

**The caret or highlighted mentions look misaligned inside a scroll container.**
The overlay and textarea must share the same font metrics, padding, and line-height. If you wrap `MentionsInput` in a scrollable element, avoid changing font size or box-sizing on an intermediate wrapper; apply styling directly to `MentionsInput` via `className` or `style`. The "Scrollable Composer" demo shows a working setup.

**I'm getting a "document is not defined" error during SSR.**
In Next.js App Router, add `'use client'` to any file that imports `MentionsInput`. The component itself guards against missing browser globals, but the module must only execute on the client for event listeners to attach correctly.

**My custom `trigger` RegExp isn't matching.**
Three rules: (1) do not include the global `/g` flag — the internal clone shares `lastIndex` and will skip matches; (2) anchor with `$` so it only matches at the cursor position; (3) expose exactly two capture groups — the first for trigger + query (e.g. `@mention`), the second for the query alone (e.g. `mention`). If you just need spaces or accent-insensitivity, use `makeTriggerRegex` instead of rolling your own.

**Mention IDs containing `)` or `]` corrupt my markup.**
The default template `@[__display__](__id__)` uses `)` as a terminator. Either switch to a template that can't collide with your IDs, or implement a custom `MentionSerializer` that encodes reserved characters. See [Custom serializer for IDs containing `)`](#custom-serializer-for-ids-containing-).

**Async requests aren't cancelling.**
You must forward the `signal` from `MentionSearchContext` into `fetch` (or your HTTP client's equivalent). Without it, stale responses will race and overwrite the active query's results.

**`onBlur` isn't firing with the expected signature.**
The native `onBlur` is unchanged. For the library-specific callback that also reports whether focus moved to a suggestion, use `onMentionBlur(event, clickedSuggestion)`.

## Migrating from react-mentions

This library is a TypeScript rewrite of [react-mentions](https://github.com/signavio/react-mentions). The API has been modernized — most changes are mechanical renames, but a few features work differently.

### Package & Imports

```diff
- npm install react-mentions
+ npm install react-mentions-ts

- import { MentionsInput, Mention } from 'react-mentions'
+ import { MentionsInput, Mention } from 'react-mentions-ts'
```

### Automated Codemod

The package ships a [jscodeshift](https://github.com/facebook/jscodeshift) transform that handles most of the mechanical renames. After installing `react-mentions-ts`, run it against your source tree:

```bash
npx jscodeshift \
  --parser=tsx \
  --extensions=tsx,ts,jsx,js \
  --transform=node_modules/react-mentions-ts/codemods/react-mentions-to-react-mentions-ts.cjs \
  src
```

What the codemod rewrites automatically:

- Updates ESM `import` and CommonJS `require` statements (including namespace and destructured forms) from `react-mentions` to `react-mentions-ts`.
- Renames `onChange` → `onMentionsChange` on `MentionsInput`. Inline arrow/function handlers have their positional parameters (`event`, `newValue`, `newPlainTextValue`, `mentions`) converted to the object payload; if the handler body references the event parameter, a `const event = trigger.nativeEvent` alias is prepended so existing code keeps working.
- Renames `onBlur` → `onMentionBlur` on `MentionsInput`.
- Rewrites `onAdd` on `Mention` from positional arguments (`id`, `display`, `startPos`, `endPos`) to the object payload.
- Consolidates `allowSuggestionsAboveCursor` / `forceSuggestionsAboveCursor` into `suggestionsPlacement="auto"` / `"above"`.
- Removes `allowSpaceInQuery` and `ignoreAccents` from `MentionsInput` and moves them onto each child `Mention`'s `trigger` via `makeTriggerRegex('@', { … })`, auto-importing the helper.
- Removes the separate `regex` prop and wraps static `markup` strings with `createMarkupSerializer(...)`, auto-importing the helper.
- When `onChange` or `onAdd` is passed as a bare identifier or member expression (e.g. `onChange={this.handleChange}`), wraps it in an adapter that calls the existing handler with the legacy positional arguments so the original implementation keeps working until you migrate it by hand.

The following cases are reported via `api.report(...)` (printed by jscodeshift) and must be migrated by hand:

- `data` providers that use the legacy `(query, callback) => …` signature must be rewritten to return an array or a promise (the codemod flags inline `data` functions that declare two or more parameters so you can confirm).
- Dynamic values for `allowSpaceInQuery`, `ignoreAccents`, `allowSuggestionsAboveCursor`, or `forceSuggestionsAboveCursor` (e.g. `allowSpaceInQuery={someFlag}`) — these are removed with a warning and the equivalent trigger regex must be wired up manually.
- `Mention` elements using `regex` when `markup` is missing or dynamic.
- Callback attributes whose value is not an inline function, identifier, or member expression.

Review the diff and run your test suite after applying it.

### Renamed Props

| react-mentions                                           | react-mentions-ts                                                                                   | Notes                                                                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `onChange(event, newValue, newPlainTextValue, mentions)` | `onMentionsChange({ trigger, value, plainTextValue, idValue, mentionId, mentions, previousValue })` | Receives a single object instead of positional arguments. See [onMentionsChange payload](#onmentionschange-payload) for details |
| `onBlur(event, clickedSuggestion)`                       | `onMentionBlur(event, clickedSuggestion)`                                                           | Renamed to avoid shadowing the native `onBlur` (which is also available)                                                        |
| `allowSuggestionsAboveCursor`                            | `suggestionsPlacement="auto"`                                                                       | Use `'auto'`, `'above'`, or `'below'` instead of two separate booleans                                                          |
| `forceSuggestionsAboveCursor`                            | `suggestionsPlacement="above"`                                                                      |                                                                                                                                 |
| `allowSpaceInQuery` (on `MentionsInput`)                 | `trigger={makeTriggerRegex('@', { allowSpaceInQuery: true })}` (on `Mention`)                       | Moved from a top-level boolean to a per-trigger option via the `makeTriggerRegex` utility                                       |
| `onAdd(id, display, startPos, endPos)`                   | `onAdd({ id, display, startPos, endPos, serializerId })`                                            | Receives a single object; adds `serializerId`                                                                                   |

### Replaced Props

| react-mentions              | react-mentions-ts                        | Notes                                                                                                                                                                                                                               |
| --------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `markup` (string) + `regex` | `markup` (string \| `MentionSerializer`) | The separate `regex` prop is removed. Pass a `MentionSerializer` for custom parsing, or use `createMarkupSerializer(template)` to convert a legacy template string. See [MentionSerializer Interface](#mentionserializer-interface) |

### New Features (no react-mentions equivalent)

| Feature                                    | Prop / API                                                           |
| ------------------------------------------ | -------------------------------------------------------------------- |
| Async data via Promises with `AbortSignal` | `data` accepts `(query, { signal, cursor, reason }) => Promise<...>` |
| Cursor-paginated async suggestions         | Return `{ items, nextCursor, hasMore }` from `data`                  |
| Debounced async queries                    | `debounceMs` on `Mention`                                            |
| Cap suggestion count                       | `maxSuggestions` on `Mention`                                        |
| Caret-aware mention styling                | `onMentionSelectionChange`, `data-mention-selection` attribute       |
| Inline ghost-text autocomplete             | `suggestionsDisplay="inline"`                                        |
| Auto-resizing textarea                     | `autoResize`                                                         |
| Left-anchored overlay                      | `anchorMode="left"`                                                  |
| Empty/error state rendering                | `renderEmpty`, `renderError` on `Mention`                            |
| Tailwind v4 styling out of the box         | Built-in utility classes                                             |

### Styling

react-mentions shipped no CSS and relied entirely on inline styles or manual class names. react-mentions-ts ships with Tailwind utility classes baked in. If you were using inline `style` props, they still work. If you were using `className` / `classNames`, those work too. See the [Styling](#-styling) section for setup.

### Minimal Migration Example

```diff
  <MentionsInput
    value={value}
-   onChange={(e, newValue) => setValue(newValue)}
+   onMentionsChange={({ value: nextValue }) => setValue(nextValue)}
-   allowSuggestionsAboveCursor
+   suggestionsPlacement="auto"
  >
    <Mention
      trigger="@"
      data={users}
-     markup="@[__display__](__id__)"
-     regex={/@\[(.+?)]\((.+?)\)/}
+     markup={createMarkupSerializer('@[__display__](__id__)')}
    />
  </MentionsInput>
```

> The default markup template `@[__display__](__id__)` is unchanged, so if you were using the default you can omit the `markup` prop entirely — no `createMarkupSerializer` call needed.

## Contributing

Pull requests, bug reports, and feature suggestions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup (Node 22+, Corepack, `pnpm install`), test instructions, and the PR checklist. All contributors are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[BSD-3-Clause](LICENSE)

## Acknowledgments

This project is a TypeScript rewrite and modernization of the original [react-mentions](https://github.com/signavio/react-mentions) library.

<a href="https://github.com/hbmartin/react-mentions-ts/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=hbmartin/react-mentions-ts" alt="Contributors to react-mentions-ts" />
</a>

Made with [contrib.rocks](https://contrib.rocks).
