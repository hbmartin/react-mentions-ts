---
title: Styling
description: Tailwind setup, class name slots, inline styles, and caret-driven mention styling.
---

react-mentions-ts ships its markup with **Tailwind utility classes**. Consumers should have Tailwind configured in their application build so these classes compile to real CSS. If you do not use Tailwind you can still provide your own styles via `className`, CSS modules, or inline styles.

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

See [demo/src/examples/defaultStyle.ts](https://github.com/hbmartin/react-mentions-ts/blob/master/demo/src/examples/defaultStyle.ts) for a full styling example.
