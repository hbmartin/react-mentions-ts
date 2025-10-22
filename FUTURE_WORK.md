# Future Work

## Components API
- Consider introducing a single `components` or `slots` prop that wires up custom input, suggestion popover, and class overrides in one place, replacing the current mix of `customSuggestionsContainer`, `inputComponent`, `classNames`, and portal props.
- Investigate migration strategy and codemods so existing consumers can adopt the consolidated API without churn.
