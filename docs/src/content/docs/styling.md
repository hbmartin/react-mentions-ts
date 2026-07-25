---
title: Styling
description: Tailwind setup, class name slots, inline styles, and caret-driven mention styling.
---

Styling is layered so every setup works with no extra dependencies:

- **Structural inline styles** always apply (overlay mirroring, caret measurement, font-metric parity, visually-hidden accessibility text) — the component functions with no CSS framework at all.
- **Default Tailwind utility classes** decorate every slot unless you opt out. They are inert strings compiled by your app's Tailwind build.
- **`unstyled`** (a prop on `MentionsInput`, cascading to `Mention` children) skips the default classes entirely.

## Without Tailwind

Import the unstyled-by-default entry — the same components with `unstyled` already set:

```tsx
import { MentionsInput, Mention } from 'react-mentions-ts/core'
```

Style the parts with your own CSS via the `className`/`classNames` props or the `data-slot` attributes each element carries (`control`, `input`, `highlighter`, `suggestions`, `suggestion-item`, `mention`, …). For a minimal baseline look using system colors (it follows light/dark mode automatically), optionally add:

```css
@import 'react-mentions-ts/styles/default.css';
```

Every rule in that file has zero specificity (`:where()`), so any CSS of yours overrides it.

Beyond looks, `default.css` also carries the box-model parity rules (`width`, `box-sizing`, `overflow` on the input and highlighter). If you skip it, replicate those — e.g. via the `classNames` slots — so long text wraps identically in the input and its mirrored highlighter.

## Merging class names

Default classes and your `className`/`classNames` overrides are concatenated in order (yours last). If you rely on Tailwind conflict resolution — e.g. replacing the default `text-sm` with `text-base` — pass your app's merger once; it is used for every slot merge, including `Mention` children:

```tsx
import { twMerge } from 'tailwind-merge'

<MentionsInput mergeClassNames={twMerge} ... />
```

## Tailwind CSS

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

## CSS class names

Assign a `className` prop to `MentionsInput`. All DOM nodes will receive derived class names:

```tsx
<MentionsInput className="mentions">
  <Mention className="mentions__mention" />
</MentionsInput>
```

For fine-grained control, the `classNames` prop exposes a slot for every internal element — `control`, `highlighter`, `input`, `suggestions`, `suggestionsList`, `suggestionItem`, `suggestionItemFocused`, `loadingIndicator`, the inline-suggestion slots, and more. See the `MentionsInputClassNames` type for the full list with descriptions.

## Inline styles

```tsx
<MentionsInput style={customStyle}>
  <Mention style={mentionStyle} />
</MentionsInput>
```

## Caret-driven styling hooks

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

## Inline autocomplete styling

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

See [demo/src/examples/MentionSelection.tsx](https://github.com/hbmartin/react-mentions-ts/blob/master/demo/src/examples/MentionSelection.tsx) and [demo/src/examples/mentionsClassNames.ts](https://github.com/hbmartin/react-mentions-ts/blob/master/demo/src/examples/mentionsClassNames.ts) for full styling examples.
