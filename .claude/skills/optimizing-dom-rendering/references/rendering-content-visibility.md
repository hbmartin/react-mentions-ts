---
title: CSS content-visibility for Long Lists
impact: HIGH
impactDescription: faster initial render
tags: rendering, css, content-visibility, long-lists
---

## CSS content-visibility for Long Lists

Apply `content-visibility: auto` to defer off-screen rendering.

**CSS:**

```css
.message-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px;
}
```

**Example:**

```tsx
function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div className="overflow-y-auto h-screen">
      {messages.map((msg) => (
        <div key={msg.id} className="message-item">
          <Avatar user={msg.author} />
          <div>{msg.content}</div>
        </div>
      ))}
    </div>
  )
}
```

For 1000 messages, browser skips layout/paint for ~990 off-screen items (10× faster initial render).

Browser support: `content-visibility` is Baseline Newly available (September
2025). The property shipped in Chrome/Edge 85+, Firefox 125+, and Safari 18+,
but Safari hid `content-visibility: auto` content from find-in-page until
Safari 26. Unsupported browsers simply render everything, so it degrades
gracefully. `contain-intrinsic-size` (Baseline Widely available) reserves
space so the scrollbar doesn't jump as items render in.
