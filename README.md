# React Mentions TS

[![npm version](https://badge.fury.io/js/react-mentions-ts.svg)](https://www.npmjs.com/package/react-mentions-ts)
[![CI](https://github.com/hbmartin/react-mentions-ts/workflows/CI/badge.svg)](https://github.com/hbmartin/react-mentions-ts/actions)
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
    <MentionsInput value={value} onChange={(e) => setValue(e.target.value)}>
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

| Prop name                   | Type                                                    | Default value  | Description                                                                            |
| --------------------------- | ------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------- |
| value                       | string                                                  | `''`           | The value containing markup for mentions                                               |
| onChange                    | function (event, newValue, newPlainTextValue, mentions) | empty function | A callback that is invoked when the user changes the value in the mentions input       |
| onKeyDown                   | function (event)                                        | empty function | A callback that is invoked when the user presses a key in the mentions input           |
| singleLine                  | boolean                                                 | `false`        | Renders a single line text input instead of a textarea, if set to `true`               |
| onBlur                      | function (event, clickedSuggestion)                     | empty function | Passes `true` as second argument if the blur was caused by a mousedown on a suggestion |
| suggestionsPortalHost       | DOM Element                                             | undefined      | Render suggestions into the DOM in the supplied host element.                          |
| inputRef                    | React ref                                               | undefined      | Accepts a React ref to forward to the underlying input element                         |
| suggestionsPlacement        | `'auto' \| 'above' \| 'below'`                          | `'below'`      | Controls where the suggestion list renders relative to the caret (`'auto'` flips when space is limited) |
| a11ySuggestionsListLabel    | string                                                  | `''`           | This label would be exposed to screen readers when suggestion popup appears            |
| customSuggestionsContainer  | function(children)                                      | empty function | Allows customizing the container of the suggestions                                    |
| inputComponent              | React component                                         | undefined      | Allows the use of a custom input component                                             |
| suggestionsDisplay          | `'overlay' \| 'inline'`                                 | `'overlay'`    | Choose between the traditional suggestions overlay and inline autocomplete hints       |
| inlineSuggestionDisplay     | `'remaining' \| 'full'`                                 | `'remaining'`  | In inline mode, show only the remaining characters after the query or the full match   |
| ignoreAccents               | boolean                                                 | `false`        | Ignores any accents on letters during search if set to `true`                          |
| onSelect                    | function (event)                                        | empty function | A callback that is invoked when the user selects a portion of the text in the input    |

### Mention Props

Each data source is configured using a `Mention` component, which has the following props:

| Prop name        | Type                                                         | Default value                               | Description                                                                                                                                            |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| trigger          | RegExp or string                                             | `'@'`                                       | Defines the char sequence upon which to trigger querying the data source                                                                               |
| data             | array or function (search, callback)                         | `null`                                      | An array of the mentionable data entries (objects with `id` & `display` keys, or a filtering function that returns an array based on a query parameter |
| renderSuggestion | function (entry, search, highlightedDisplay, index, focused) | `null`                                      | Allows customizing how mention suggestions are rendered (optional)                                                                                     |
| allowSpaceInQuery | boolean                                                      | `false`                                     | Permit spaces within the search query portion after the trigger (useful for multi-word names)                                                          |
| markup           | string                                                       | `'@[__display__](__id__)'`                  | A template string for the markup to use for mentions                                                                                                   |
| displayTransform | function (id, display)                                       | returns `display`                           | Accepts a function for customizing the string that is displayed for a mention                                                                          |
| regex            | RegExp                                                       | automatically derived from `markup` pattern | Allows providing a custom regular expression for parsing your markup and extracting the placeholder interpolations (optional)                          |
| onAdd            | function (id, display, startPos, endPos)                     | empty function                              | Callback invoked when a suggestion has been added (optional)                                                                                           |
| appendSpaceOnAdd | boolean                                                      | `false`                                     | Append a space when a suggestion has been added (optional)                                                                                             |

### 🔄 Async Data Loading

If a function is passed as the `data` prop, that function will be called with the current search query as first, and a callback function as second argument. The callback can be used to provide results asynchronously, e.g., after fetch requests. (It can even be called multiple times to update the list of suggestions.)

```tsx
const fetchUsers = async (query: string, callback: (data: User[]) => void) => {
  const response = await fetch(`/api/users?search=${query}`)
  const users = await response.json()
  callback(users)
}

<Mention trigger="@" data={fetchUsers} />
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
@import "tailwindcss";
@import "react-mentions-ts/styles/tailwind.css";
```

The optional helper `react-mentions-ts/styles/tailwind.css` only declares an `@source "../dist";` directive so Tailwind v4 can detect the library's utility classes inside `node_modules/react-mentions-ts/dist`. Including it keeps your Tailwind config clean and avoids adding explicit `content` globs for the package.

If you are still on Tailwind v3, add `./node_modules/react-mentions-ts/dist/**/*.{js,jsx,ts,tsx}` to the `content` array instead of importing the helper file.

### Inline Styles

```tsx
<MentionsInput style={customStyle}>
  <Mention style={mentionStyle} />
</MentionsInput>
```

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

## 🤝 Contributing

- Contributions are welcome! If you want to contribute, first of all: **thank you!** ❤️
- Please check out our [Contributing Guide](/CONTRIBUTING.md) for guidelines about how to proceed.
- React Mentions is licensed under the [BSD-3-Clause License](LICENSE).

## 🙏 Acknowledgments

This project is a TypeScript rewrite and modernization of the original [react-mentions](https://github.com/signavio/react-mentions) library.

<a href="https://github.com/hbmartin/react-mentions-ts/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=hbmartin/react-mentions-ts" alt="Contributors to react-mentions-ts" />
</a>

Made with [contrib.rocks](https://contrib.rocks).
