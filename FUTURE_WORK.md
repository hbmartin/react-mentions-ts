# Future Work

## Components API
- Consider introducing a single `components` or `slots` prop that wires up custom input, suggestion popover, and class overrides in one place, replacing the current mix of `customSuggestionsContainer`, `inputComponent`, `classNames`, and portal props.
- Investigate migration strategy and codemods so existing consumers can adopt the consolidated API without churn.

## Mention Props Docs
- Surface the existing `onRemove`, `isLoading`, `allowSpaceInQuery`, and `ignoreAccents` props on `Mention` in official docs or pare them back into a smaller configuration story; today they work but are invisible in the README.
