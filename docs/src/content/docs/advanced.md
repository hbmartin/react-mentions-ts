---
title: Advanced Usage
description: Markup format, uncontrolled mode and forms, rendering saved values, custom serializers, and SSR.
---

## Markup format and controlled state

`MentionsInput` is typically used as a **controlled component** — provide a `value` prop and handle updates via `onMentionsChange`. (It can also manage its own state; see [Uncontrolled mode & forms](#uncontrolled-mode--forms).) The `value` string uses a markup format to encode mentions inline with plain text.

The default markup template is `@[__display__](__id__)`, so a value containing a mention looks like:

```
Hey @[Walter White](walter), are you there?
```

The `__display__` placeholder stores the visible text and `__id__` stores the mention identifier. When rendered, the user sees plain text (`Hey @Walter White, are you there?`) while the underlying value preserves the structured mention data.

You can customize the template via the `markup` prop on `Mention`, or pass a `MentionSerializer` for full control (see below).

## Uncontrolled mode & forms

When you omit the `value` prop, `MentionsInput` manages its own state. Pass `defaultValue` (in markup format) to set the initial content — `onMentionsChange` still fires on every edit if you want to observe changes:

```tsx
<MentionsInput defaultValue="Hi @[Walter White](walter)!">
  <Mention trigger="@" data={users} />
</MentionsInput>
```

Adding a `name` prop renders a hidden input carrying the **markup value**, so the component works with plain `<form>` submissions, React 19 form actions, and libraries like React Hook Form without a controlled wrapper:

```tsx
<form action={sendMessage}>
  <MentionsInput name="message">
    <Mention trigger="@" data={users} />
  </MentionsInput>
  <button type="submit">Send</button>
</form>

// in sendMessage(formData):
// formData.get('message') → 'Hi @[Walter White](walter)!'
```

Notes:

- The submitted value is the markup value (with mention metadata), not the visible plain text. Use [`MentionsText` or `parseMentionsMarkup`](#rendering-saved-values) to work with it later.
- In uncontrolled mode, a native form reset restores `defaultValue`.
- Providing `value` switches back to fully controlled behavior; `defaultValue` is then ignored (the hidden input still works with `name`).

## Rendering saved values

Once a markup value has been stored (in your database, a message feed, etc.), use `MentionsText` to display it with mentions highlighted — the read-only counterpart to `MentionsInput`:

```tsx
import { MentionsText } from 'react-mentions-ts'

// value: 'Hey @[Walter White](walter), are you there?'
;<MentionsText value={message.value} />
// renders: Hey <strong data-mention-id="walter">Walter White</strong>, are you there?
```

`MentionsText` accepts the same `markup` (a template string, a `MentionSerializer`, or an array of either for multi-trigger values) and `displayTransform` you used when creating the value, plus a `renderMention` callback for custom mention elements:

```tsx
<MentionsText
  value={message.value}
  markup={['@[__display__](__id__)', '#[__display__](__id__)']}
  mentionClassName="text-primary font-medium"
  renderMention={(mention) => <a href={`/users/${mention.id}`}>@{mention.display}</a>}
/>
```

For non-React targets (HTML emails, notifications) or custom rendering pipelines, the lower-level helpers are also exported:

```ts
import { parseMentionsMarkup, renderMentionsToReact } from 'react-mentions-ts'

parseMentionsMarkup('Hey @[Walter White](walter)!')
// [
//   { type: 'text', text: 'Hey ', index: 0, plainTextIndex: 0 },
//   { type: 'mention', id: 'walter', display: 'Walter White', markup: '@[Walter White](walter)', ... },
//   { type: 'text', text: '!', ... },
// ]

renderMentionsToReact(value, { mentionClassName: 'mention' })
// ReactNode[] — the array MentionsText renders internally
```

## `makeTriggerRegex`

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

## `createMarkupSerializer`

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

## `MentionSerializer` interface

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

## SSR and Next.js

The component is SSR-compatible out of the box. It guards against missing browser globals (`document`) during server rendering, so it works with Next.js, Remix, and other SSR frameworks without extra configuration.

In Next.js App Router, add the `'use client'` directive to any file that renders `MentionsInput`:

```tsx
'use client'

import { MentionsInput, Mention } from 'react-mentions-ts'
```

No dynamic imports or `next/dynamic` wrappers are needed.

## Package & tree shaking

The package is published as side-effect free, and the release evidence is repeatable:

```bash
pnpm tree-shake:report
```

The report command rebuilds `dist`, runs `npx publint --pack npm`, requires `"sideEffects": false`, inspects `npm pack --dry-run --json`, and bundles small Vite consumer fixtures against `dist/index.js`.

Current verified behavior:

- A fixture that imports only `Mention` and `getSubstringIndex` must not retain `LoadingIndicator`, `SuggestionsOverlay`, or inline-suggestion markers.
- A fixture that imports `MentionsInput` currently retains overlay, loading, and inline-suggestion markers because those branches are statically imported by the orchestration shell.
- The npm pack check prints the tarball filename, packed size, unpacked size, and file count so publish contents stay visible.
