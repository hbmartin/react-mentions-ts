# React Mentions TS

[![npm version](https://badge.fury.io/js/react-mentions-ts.svg)](https://www.npmjs.com/package/react-mentions-ts)
[![CI](https://github.com/hbmartin/react-mentions-ts/workflows/CI/badge.svg)](https://github.com/hbmartin/react-mentions-ts/actions)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/react-mentions-ts)](https://bundlephobia.com/package/react-mentions-ts)
[![NPM License](https://img.shields.io/npm/l/react-mentions-ts?color=blue)](https://github.com/hbmartin/react-mentions-ts/blob/master/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://reactjs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/hbmartin/react-mentions-ts/pulls)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/hbmartin/react-mentions-ts)

**A React component that enables Facebook/Twitter-style @mentions and tagging in textarea inputs with full TypeScript support.**

### [Try out the live demos now!](https://hbmartin.github.io/react-mentions-ts/)

---

## 🎯 Features

- ✅ **Flexible Triggers** - Use any character or pattern to trigger mentions (@, #, :, or custom)
- 🎨 **Fully Customizable** - Style with CSS, CSS modules, or inline styles
- 📝 **Multiple Mention Types** - Support users, tags, emojis, or any custom data source
- ⚡ **Async Data Loading** - Load suggestions dynamically from APIs
- 🔍 **Smart Suggestions** - Real-time filtering and matching
- ♿ **Accessible** - Built with ARIA labels and keyboard navigation
- 📦 **Lightweight** - Zero dependencies (`React` and `clsx` are peerDeps)
- 🎯 **TypeScript First** - Written in TypeScript with complete type definitions
- 🧪 **Well Tested** - Comprehensive test suite with Testing Library
- 🌐 **SSR Compatible** - Works with Next.js and other SSR frameworks
- 📱 **Mobile Friendly** - Touch-optimized for mobile devices

Used in production at [Signavio](https://signavio.com), [State](https://state.com), [Snips](https://snips.ai), [Swat.io](https://swat.io), [GotDone](https://www.gotdone.me), [Volinspire](https://volinspire.com), [Marvin](https://amazingmarvin.com), [Timely](https://timelyapp.com), [GuideFitter](https://www.guidefitter.com/), [Evite](https://www.evite.com/), [Publer](https://publer.me/), [Kontentino](https://www.kontentino.com/), [Wix.com](https://wix.com), [Highlight](https://highlight.run/) and [you?](https://github.com/hbmartin/react-mentions-ts/edit/master/README.md)

## 📦 Installation

```bash
# npm
npm install react-mentions-ts --save

# yarn
yarn add react-mentions-ts

# pnpm
pnpm add react-mentions-ts
```

## 🚀 Quick Start

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

### 💡 How It Works

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
| allowSpaceInQuery           | boolean                                                 | false          | Keep suggestions open even if the user separates keywords with spaces.                 |
| suggestionsPortalHost       | DOM Element                                             | undefined      | Render suggestions into the DOM in the supplied host element.                          |
| inputRef                    | React ref                                               | undefined      | Accepts a React ref to forward to the underlying input element                         |
| allowSuggestionsAboveCursor | boolean                                                 | false          | Renders the SuggestionList above the cursor if there is not enough space below         |
| forceSuggestionsAboveCursor | boolean                                                 | false          | Forces the SuggestionList to be rendered above the cursor                              |
| a11ySuggestionsListLabel    | string                                                  | `''`           | This label would be exposed to screen readers when suggestion popup appears            |
| customSuggestionsContainer  | function(children)                                      | empty function | Allows customizing the container of the suggestions                                    |
| inputComponent              | React component                                         | undefined      | Allows the use of a custom input component                                             |

### Mention Props

Each data source is configured using a `Mention` component, which has the following props:

| Prop name        | Type                                                         | Default value                               | Description                                                                                                                                            |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| trigger          | RegExp or string                                             | `'@'`                                       | Defines the char sequence upon which to trigger querying the data source                                                                               |
| data             | array or function (search, callback)                         | `null`                                      | An array of the mentionable data entries (objects with `id` & `display` keys, or a filtering function that returns an array based on a query parameter |
| renderSuggestion | function (entry, search, highlightedDisplay, index, focused) | `null`                                      | Allows customizing how mention suggestions are rendered (optional)                                                                                     |
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

React Mentions supports **CSS**, **CSS Modules**, and **inline styles**. The package ships with only essential inline styles, giving you complete control over the appearance.

### Inline Styles

```tsx
<MentionsInput style={customStyle}>
  <Mention style={mentionStyle} />
</MentionsInput>
```

See [demo/src/examples/defaultStyle.ts](https://github.com/hbmartin/react-mentions-ts/blob/master/demo/src/examples/defaultStyle.ts) for examples.

### CSS

Simply assign a `className` prop to `MentionsInput`. All DOM nodes will receive derived class names:

```tsx
<MentionsInput className="mentions">
  <Mention className="mentions__mention" />
</MentionsInput>
```

### CSS Modules

Provide automatically generated class names as `classNames` to `MentionsInput`. See [demo/src/examples/CssModules.tsx](https://github.com/hbmartin/react-mentions-ts/blob/master/demo/src/examples/CssModules.tsx) for a complete example.

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

Contributions are welcome! If you want to contribute, first of all: **thank you!** ❤️

Please check out our [Contributing Guide](/CONTRIBUTING.md) for guidelines about how to proceed.

### Development

```bash
# Install dependencies
yarn install

# Start the demo app
yarn dev

# Run tests
yarn test

# Build the library
yarn build

# Run linter
yarn lint
```

## 📄 License

React Mentions is licensed under the [BSD-3-Clause License](LICENSE).

## 🙏 Acknowledgments

This project is a TypeScript rewrite and modernization of the original [react-mentions](https://github.com/signavio/react-mentions) library.

Rebuilt with ❤️ by [Harold Martin](https://www.linkedin.com/in/harold-martin-98526971/) and [contributors](https://github.com/hbmartin/react-mentions-ts/graphs/contributors)
