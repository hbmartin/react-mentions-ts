---
title: FAQ & Gotchas
description: Common issues and how to resolve them.
---

## My Tailwind classes aren't applying to the library's DOM

Tailwind v4 only generates utilities it finds in your source. Either import `react-mentions-ts/styles/tailwind.css` (which adds an `@source` pointing at the library's `dist`), or on Tailwind v3 add `./node_modules/react-mentions-ts/dist/**/*.{js,jsx,ts,tsx}` to your `content` array. See [Styling](../styling/).

## The caret or highlighted mentions look misaligned inside a scroll container

The overlay and textarea must share the same font metrics, padding, and line-height. If you wrap `MentionsInput` in a scrollable element, avoid changing font size or box-sizing on an intermediate wrapper; apply styling directly to `MentionsInput` via `className` or `style`. The "Scrollable Composer" demo shows a working setup.

## I'm getting a "document is not defined" error during SSR

In Next.js App Router, add `'use client'` to any file that imports `MentionsInput`. The component itself guards against missing browser globals, but the module must only execute on the client for event listeners to attach correctly.

## My custom `trigger` RegExp isn't matching

Three rules: (1) do not include the global `/g` flag — the internal clone shares `lastIndex` and will skip matches; (2) anchor with `$` so it only matches at the cursor position; (3) expose exactly two capture groups — the first for trigger + query (e.g. `@mention`), the second for the query alone (e.g. `mention`). If you just need spaces or accent-insensitivity, use [`makeTriggerRegex`](../advanced/#maketriggerregex) instead of rolling your own.

## Mention IDs containing `)` or `]` corrupt my markup

The default template `@[__display__](__id__)` uses `)` as a terminator. Either switch to a template that can't collide with your IDs, or implement a custom `MentionSerializer` that encodes reserved characters. See [Custom serializer for IDs containing `)`](../advanced/#custom-serializer-for-ids-containing-).

## Async requests aren't cancelling

You must forward the `signal` from `MentionSearchContext` into `fetch` (or your HTTP client's equivalent). Without it, stale responses will race and overwrite the active query's results.

## Does native undo (Ctrl+Z / Cmd+Z) work?

Partially — and this is a platform limitation of DOM inputs, not something the library can override. Undo works per keystroke for plain typing, but whenever the value is rewritten programmatically (selecting a suggestion, `insertText()`, or an external `value` change), the browser invalidates the textarea's undo stack, so Ctrl+Z right after inserting a mention is a no-op. What the library does guarantee — enforced by the browser test suite — is that undo/redo can never desynchronize the markup value from the visible text or leave a partially-deleted mention. If your app needs full undo/redo across mention insertions, keep a history of markup values in your own state and restore them via the `value` prop.

## What happens to mentions on copy & paste?

Copying or cutting a selection writes three clipboard flavors: `text/plain` (the visible text), `text/react-mentions` (the raw markup), and `text/html` (mentions as `<strong data-mention-id>` elements, with the raw markup carried on a wrapper attribute). Pasting into another `MentionsInput` restores full mention structure — via the custom type when available, or the HTML payload when an app strips custom clipboard types. Pasting into other applications gets the plain text or styled HTML.

## `onBlur` isn't firing with the expected signature

The native `onBlur` is unchanged. For the library-specific callback that also reports whether focus moved to a suggestion, use `onMentionBlur(event, clickedSuggestion)`.
