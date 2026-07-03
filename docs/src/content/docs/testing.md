---
title: Testing
description: How to test components that use react-mentions-ts.
---

Due to react-mentions-ts' internal cursor tracking, use [@testing-library/user-event](https://github.com/testing-library/user-event) for realistic event simulation:

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

The input is exposed with `role="combobox"`, open suggestions with `role="listbox"` / `role="option"`, so Testing Library role queries work naturally:

```tsx
await user.type(screen.getByRole('combobox'), '@wal')
await user.click(await screen.findByRole('option', { name: 'Walter White' }))
```
