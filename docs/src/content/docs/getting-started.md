---
title: Getting Started
description: Install react-mentions-ts and render your first mentions input.
---

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

## Basic usage

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

## Reading mentions and mixing multiple triggers

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

See [Styling](../styling/) for the Tailwind setup (optional; the component also works with plain CSS, CSS modules, or inline styles).

## How it works

`MentionsInput` is the main component that renders the textarea control. It accepts one or multiple `Mention` components as children. Each `Mention` component represents a data source for a specific class of mentionable objects:

- **Users** — `@username` mentions
- **Tags** — `#hashtag` mentions
- **Templates** — `{{variable}}` mentions
- **Emojis** — `:emoji:` mentions
- **Custom** — any pattern you need

The [live demo](https://hbmartin.github.io/react-mentions-ts/) includes many ready-to-use patterns — multiple triggers, single-line inputs, async GitHub search, inline autocomplete, portals, and more. Each demo's source is in [`demo/src/examples/`](https://github.com/hbmartin/react-mentions-ts/tree/master/demo/src/examples).
