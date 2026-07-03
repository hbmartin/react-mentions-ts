---
title: Migrating from react-mentions
description: Codemod-assisted migration from the original react-mentions library.
---

This library is a TypeScript rewrite of [react-mentions](https://github.com/signavio/react-mentions). The API has been modernized — most changes are mechanical renames, but a few features work differently.

## Package & imports

```diff
- npm install react-mentions
+ npm install react-mentions-ts

- import { MentionsInput, Mention } from 'react-mentions'
+ import { MentionsInput, Mention } from 'react-mentions-ts'
```

## Automated codemod

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

## Renamed props

| react-mentions                                           | react-mentions-ts                                                                                   | Notes                                                                                     |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `onChange(event, newValue, newPlainTextValue, mentions)` | `onMentionsChange({ trigger, value, plainTextValue, idValue, mentionId, mentions, previousValue })` | Receives a single object instead of positional arguments                                  |
| `onBlur(event, clickedSuggestion)`                       | `onMentionBlur(event, clickedSuggestion)`                                                           | Renamed to avoid shadowing the native `onBlur` (which is also available)                  |
| `allowSuggestionsAboveCursor`                            | `suggestionsPlacement="auto"`                                                                       | Use `'auto'`, `'above'`, or `'below'` instead of two separate booleans                    |
| `forceSuggestionsAboveCursor`                            | `suggestionsPlacement="above"`                                                                      |                                                                                           |
| `allowSpaceInQuery` (on `MentionsInput`)                 | `trigger={makeTriggerRegex('@', { allowSpaceInQuery: true })}` (on `Mention`)                       | Moved from a top-level boolean to a per-trigger option via the `makeTriggerRegex` utility |
| `onAdd(id, display, startPos, endPos)`                   | `onAdd({ id, display, startPos, endPos, serializerId })`                                            | Receives a single object; adds `serializerId`                                             |

## Replaced props

| react-mentions              | react-mentions-ts                        | Notes                                                                                                                                                                              |
| --------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `markup` (string) + `regex` | `markup` (string \| `MentionSerializer`) | The separate `regex` prop is removed. Pass a `MentionSerializer` for custom parsing, or use `createMarkupSerializer(template)` to convert a legacy template string |

## New features (no react-mentions equivalent)

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
| Uncontrolled mode & form integration       | `defaultValue`, `name`                                               |
| Rendering saved values                     | `MentionsText`, `parseMentionsMarkup`, `renderMentionsToReact`       |
| Tailwind v4 styling out of the box         | Built-in utility classes                                             |

## Styling

react-mentions shipped no CSS and relied entirely on inline styles or manual class names. react-mentions-ts ships with Tailwind utility classes baked in. If you were using inline `style` props, they still work. If you were using `className` / `classNames`, those work too. See [Styling](../styling/) for setup.

## Minimal migration example

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

:::tip
The default markup template `@[__display__](__id__)` is unchanged, so if you were using the default you can omit the `markup` prop entirely — no `createMarkupSerializer` call needed.
:::
