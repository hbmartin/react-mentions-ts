# React Mentions TS

[![npm version](https://badge.fury.io/js/react-mentions-ts.svg)](https://www.npmjs.com/package/react-mentions-ts)
[![codecov](https://codecov.io/gh/hbmartin/react-mentions-ts/graph/badge.svg?token=Po1nDYEr5f)](https://codecov.io/gh/hbmartin/react-mentions-ts)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/react-mentions-ts)](https://bundlephobia.com/package/react-mentions-ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://reactjs.org/)
[![Context7](https://img.shields.io/badge/[]-Context7-059669)](https://context7.com/hbmartin/react-mentions-ts)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/hbmartin/react-mentions-ts)

A React component that enables Facebook/Twitter-style @mentions and tagging in textarea inputs with full TypeScript support.

### [Try out the live demos now!](https://hbmartin.github.io/react-mentions-ts/)

## 🎯 Features

- ✅ **Flexible Triggers** - Use any character or pattern to trigger mentions (@, #, :, or custom)
- 🎨 **Tailwind v4 Ready** - First-class support for Tailwind CSS v4 utility styling
- ⚡ **Async Data Loading** - Load suggestions dynamically from APIs
- 🔍 **Smart Suggestions** - Real-time filtering and matching
- 🪄 **Caret Aware** - Detect when the caret overlaps mentions and style them via data attributes
- ♿ **Accessible** - Built with ARIA labels and keyboard navigation
- 🎯 **TypeScript First** - Written in TypeScript with complete type definitions
- 🧪 **Well Tested** - Comprehensive test suite with Testing Library
- 🌐 **SSR Compatible** - Works with Next.js and other SSR frameworks
- 📱 **Mobile Friendly** - Touch-optimized for mobile devices

## 📦 Installation

```bash
# npm
npm install react-mentions-ts --save

# yarn
yarn add react-mentions-ts

# pnpm
pnpm add react-mentions-ts
```

React Mentions TS uses peer dependencies for its styling helpers and React runtime. Ensure these are installed in your application (skip any you already have):

```bash
# npm
npm install class-variance-authority clsx react react-dom tailwind-merge

# yarn
yarn add class-variance-authority clsx react react-dom tailwind-merge

# pnpm
pnpm add class-variance-authority clsx react react-dom tailwind-merge
```

Check `package.json` for the latest peer dependency version ranges.

## 🚀 Quick Start

### Add a MentionsInput with Mention children

```tsx
import { useState } from 'react'
import { MentionsInput, Mention } from 'react-mentions-ts'

function MyComponent() {
  const [value, setValue] = useState('')

  return (
    <MentionsInput value={value} onMentionsChange={({ value: nextValue }) => setValue(nextValue)}>
      <Mention trigger="@" data={users} renderSuggestion={(entry) => <div>{entry.display}</div>} />
      <Mention trigger="#" data={tags} />
    </MentionsInput>
  )
}
```

### Configure boilerplate tailwind styling in your styles/tailwind.css

```css
@import "tailwindcss";
(...)
@import "react-mentions-ts/styles/tailwind.css";
```

## 💡 How It Works

`MentionsInput` is the main component that renders the textarea control. It accepts one or multiple `Mention` components as children. Each `Mention` component represents a data source for a specific class of mentionable objects:

- 👥 **Users** - `@username` mentions
- 🏷️ **Tags** - `#hashtag` mentions
- 📋 **Templates** - `{{variable}}` mentions
- 🎭 **Emojis** - `:emoji:` mentions
- ✨ **Custom** - Any pattern you need!

**[View more examples](https://github.com/hbmartin/react-mentions-ts/tree/master/demo/src/examples)**

## ⚙️ Configuration

### MentionsInput Props

The `MentionsInput` component supports the following props:

| Prop name                  | Type                                                                   | Default value  | Description                                                                                                                           |
| -------------------------- | ---------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| value                      | string                                                                 | `''`           | The value containing markup for mentions                                                                                              |
| onMentionsChange           | function ({ trigger, value, plainTextValue, idValue, mentionId, mentions, previousValue }) | `undefined`    | Called when the mention markup changes; receives the updated markup value, plain text, id-based text, the affected mention id (when applicable), active mentions, and the previous markup value |
| onMentionSelectionChange   | function (selection, context)                                          | `undefined`    | Called whenever the caret or selection overlaps one or more mentions; receives an ordered array of `MentionSelection` entries and a metadata context containing the current value, plain text, and mention identifiers |
| onKeyDown                  | function (event)                                                       | empty function | A callback that is invoked when the user presses a key in the mentions input                                                          |
| singleLine                 | boolean                                                                | `false`        | Renders a single line text input instead of a textarea, if set to `true`                                                              |
| autoResize                 | boolean                                                                | `false`        | When `true`, resizes the textarea to match its scroll height after each input change (ignored when `singleLine` is `true`)           |
| anchorMode                 | `'caret' \| 'left'`                                                    | `'caret'`      | Controls whether the overlay follows the caret (`'caret'`) or pins to the control’s leading edge (`'left'`)                         |
| onMentionBlur              | function (event, clickedSuggestion)                                    | `undefined`    | Receives an extra `clickedSuggestion` flag when focus left via the suggestions list                                                   |
| suggestionsPortalHost      | DOM Element                                                            | undefined      | Render suggestions into the DOM in the supplied host element.                                                                         |
| inputRef                   | React ref                                                              | undefined      | Accepts a React ref to forward to the underlying input element                                                                        |
| suggestionsPlacement       | `'auto' \| 'above' \| 'below'`                                         | `'below'`      | Controls where the suggestion list renders relative to the caret (`'auto'` flips when space is limited)                               |
| a11ySuggestionsListLabel   | string                                                                 | `''`           | This label would be exposed to screen readers when suggestion popup appears                                                           |
| customSuggestionsContainer | function(children)                                                     | empty function | Allows customizing the container of the suggestions                                                                                   |
| inputComponent             | React component                                                        | undefined      | Allows the use of a custom input component                                                                                            |
| suggestionsDisplay         | `'overlay' \| 'inline'`                                                | `'overlay'`    | Choose between the traditional suggestions overlay and inline autocomplete hints                                                      |
| spellCheck                 | boolean                                                                | `false`        | Controls browser spell checking on the underlying input (disabled by default)                                                         |
| onSelect                   | function (event)                                                       | empty function | A callback that is invoked when the user selects a portion of the text in the input                                                   |

#### onMentionsChange payload

`onMentionsChange` receives an object with the following fields:

- `value`: the latest markup string containing mentions
- `plainTextValue`: the same content without mention markup
- `idValue`: the plain-text view with each mention display substituted for its identifier (useful for downstream parsing/search)
- `mentionId`: the identifier of the mention that triggered the change when the `trigger.type` is mention-specific (e.g. `'mention-add'`); otherwise `undefined`
- `mentions`: the mention occurrences extracted from the new value
- `previousValue`: the markup string before the change
- `trigger`: metadata about what caused the change. `trigger.type` is one of `'input'`, `'paste'`, `'cut'`, `'mention-add'`, or `'mention-remove'`, and, when available, `trigger.nativeEvent` references the originating DOM event (optional; do not rely on its exact shape). Regular text edits (typing, Backspace/Delete) use `trigger.type: 'input'`.

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

| Prop name        | Type                                                         | Default value              | Description                                                                                                                                            |
| ---------------- | ------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| trigger          | RegExp or string                                             | `'@'`                      | Defines the char sequence upon which to trigger querying the data source                                                                               |
| data             | array or function `(query, { signal })`                     | `null`                     | An array of mentionable entries, or a filtering function that returns matching entries for the current query. Async providers receive an `AbortSignal` so stale requests can be cancelled safely |
| renderSuggestion | function (entry, search, highlightedDisplay, index, focused) | `null`                     | Allows customizing how mention suggestions are rendered (optional)                                                                                     |
| renderEmpty      | function `(query) => ReactNode`                             | `null`                     | Renders custom empty-state content when a query completes without any suggestions                                                                      |
| renderError      | function `(query, error) => ReactNode`                      | `null`                     | Renders custom error-state content when an async data provider rejects                                                                                 |
| markup           | string \| `MentionSerializer`                                | `'@[__display__](__id__)'` | Template string for stored markup, or pass a `MentionSerializer` instance for full control                                                             |
| displayTransform | function (id, display)                                       | returns `display`          | Accepts a function for customizing the string that is displayed for a mention                                                                          |
| onAdd            | function ({id, display, startPos, endPos, serializerId})     | empty function             | Callback invoked when a suggestion has been added (optional)                                                                                           |
| appendSpaceOnAdd | boolean                                                      | `false`                    | Append a space when a suggestion has been added (optional)                                                                                             |
| debounceMs       | number                                                       | `0`                        | Debounces async provider calls to reduce network chatter while typing                                                                                  |
| maxSuggestions   | number                                                       | unlimited                  | Caps the number of suggestions rendered from a given provider result                                                                                   |

> Need the legacy `markup` customization? Import `createMarkupSerializer` from `react-mentions` and pass `markup={createMarkupSerializer(':__id__')}` (or any other template) to keep markup/parse logic in sync without wiring a regex manually.

> When passing a `RegExp` as `trigger`, omit the global `/g` flag. The component clones the pattern internally; global regexes maintain shared `lastIndex` state and will skip matches across renders. Your custom `RegExp` should also be anchored to the end of the string with `$` to match only at the current cursor position, and it must contain two capturing groups: the first for the trigger and query (e.g., `@mention`), and the second for just the query (e.g., `mention`).

> Want to allow spaces (or other advanced patterns) after a trigger? Pass a custom `RegExp`—for example `trigger={makeTriggerRegex('@', { allowSpaceInQuery: true })}`—instead of relying on a boolean flag. The `makeTriggerRegex` utility handles the regex construction for you.

### 🔄 Async Data Loading

If a function is passed as the `data` prop, it receives the current search query plus an `AbortSignal` and should return a promise that resolves with the list of suggestions. When the user keeps typing, the previous request is aborted and its results are ignored automatically.

```tsx
type User = { id: string; display: string }

const fetchUsers = async (
  query: string,
  { signal }: MentionSearchContext
): Promise<User[]> => {
  const response = await fetch(`/api/users?search=${query}`, { signal })
  return response.json()
}

<Mention trigger="@" data={fetchUsers} debounceMs={150} maxSuggestions={8} />
```

## 🎨 Styling

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

### Inline Styles

```tsx
<MentionsInput style={customStyle}>
  <Mention style={mentionStyle} />
</MentionsInput>
```

### Caret-driven styling hooks

Every rendered mention (both in the hidden highlighter and the user-editable input) now exposes a `data-mention-selection` attribute whenever the caret or selection overlaps it. The attribute reflects the current coverage (`inside`, `boundary`, `partial`, or `full`), so you can target focus states without extra bookkeeping:

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

See the “Caret mention states” demo (`demo/src/examples/MentionSelection.tsx`) for a complete example that combines styling with the `onMentionSelectionChange` callback.

When `suggestionsDisplay="inline"`, override the `inlineSuggestion` style slot to customize the inline hint (the default demo style lives in `demo/src/examples/defaultStyle.ts`).

See [demo/src/examples/defaultStyle.ts](https://github.com/hbmartin/react-mentions-ts/blob/master/demo/src/examples/defaultStyle.ts) for examples.

### CSS

Simply assign a `className` prop to `MentionsInput`. All DOM nodes will receive derived class names:

```tsx
<MentionsInput className="mentions">
  <Mention className="mentions__mention" />
</MentionsInput>
```

## 🧪 Testing

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

## 🙏 Acknowledgments

This project is a TypeScript rewrite and modernization of the original [react-mentions](https://github.com/signavio/react-mentions) library.

<a href="https://github.com/hbmartin/react-mentions-ts/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=hbmartin/react-mentions-ts" alt="Contributors to react-mentions-ts" />
</a>

Made with [contrib.rocks](https://contrib.rocks).
