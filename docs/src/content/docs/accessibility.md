---
title: Accessibility
description: WAI-ARIA combobox semantics, expected screen-reader behavior, and the axe-core test suite.
---

`MentionsInput` implements the [WAI-ARIA editable combobox with list autocomplete pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/):

- The input has `role="combobox"` with `aria-autocomplete="list"` (or `"inline"` when `suggestionsDisplay="inline"`), `aria-haspopup="listbox"`, and `aria-expanded` reflecting whether suggestions are open.
- The open suggestions overlay is a `role="listbox"` (labeled via `a11ySuggestionsListLabel`) whose focused `role="option"` is referenced by `aria-activedescendant`, so focus never leaves the input while navigating with the arrow keys.
- Inline autocomplete announces the current completion through a visually hidden live region referenced by `aria-describedby`.
- Remember to give the input an accessible name — pass `aria-label` or associate a `<label>` yourself.

## Expected screen-reader behavior

Typing a trigger announces that a list is available; ArrowUp/ArrowDown announce each suggestion as it becomes active (via `aria-activedescendant`); Enter or Tab inserts the active suggestion; Escape closes the list.

## Known deviation

In multiline mode the ARIA-in-HTML spec disallows an explicit role on `<textarea>`, but the combobox role is required for the `aria-expanded`/`aria-controls`/`aria-activedescendant` wiring above and is well supported by screen readers (axe-core rates it minor). Single-line mode (`singleLine`) renders an `<input type="text">` and is fully conformant.

These invariants are enforced by the axe-core suite in [`tests/MentionsInputA11y.spec.tsx`](https://github.com/hbmartin/react-mentions-ts/blob/master/tests/MentionsInputA11y.spec.tsx), which validates the closed, open-overlay, inline-autocomplete, and form states.
