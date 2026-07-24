/**
 * Default Tailwind utility classes for every styleable slot. These are plain
 * strings — shipping them requires no styling dependencies; they only become
 * CSS when compiled by the consumer's Tailwind build. Passing `unstyled` on
 * `MentionsInput` (or importing from `react-mentions-ts/core`) skips them
 * entirely. Structural behavior never lives here: see structuralStyles.ts.
 */

const inputBase =
  'relative block w-full m-0 box-border bg-transparent text-foreground transition placeholder:text-muted-foreground [font-family:inherit] [font-size:inherit] [letter-spacing:inherit]'
const inputMultiline = 'h-full overflow-hidden resize-none whitespace-pre-wrap break-words'

const highlighterBase =
  'box-border w-full overflow-hidden text-start text-transparent pointer-events-none [font-family:inherit] [font-size:inherit] [line-height:inherit]'
// Note: singleLine intentionally overrides whitespace/break behavior
const highlighterSingleLine = 'whitespace-pre break-normal'
const highlighterMultiline = 'whitespace-pre-wrap break-words'

const statusBase = 'px-4 py-2.5 text-left text-sm leading-relaxed'
const statusByType = {
  empty: 'text-muted-foreground',
  error: 'text-destructive',
} as const

export const defaultClassNames = {
  root: 'relative overflow-y-visible',
  control: 'relative border border-border bg-card',
  input: (singleLine: boolean): string =>
    singleLine ? inputBase : `${inputBase} ${inputMultiline}`,
  highlighter: (singleLine: boolean): string =>
    `${highlighterBase} ${singleLine ? highlighterSingleLine : highlighterMultiline}`,
  highlighterSubstring: 'text-transparent inline [white-space:inherit]',
  highlighterCaret: 'relative inline-block h-0 w-0 align-baseline',
  mention: 'rounded-md bg-primary/20',
  inlineSuggestion:
    'absolute inline-block pointer-events-none [color:inherit] opacity-80 whitespace-pre z-[2] [font-family:inherit] [font-size:inherit] [letter-spacing:inherit]',
  inlineSuggestionText: 'relative inline-block items-baseline text-muted-foreground',
  inlineSuggestionPrefix: 'sr-only',
  inlineSuggestionSuffix: 'whitespace-pre text-muted-foreground',
  suggestions:
    'z-[100] w-full min-w-[16rem] border border-border bg-popover backdrop-blur supports-[backdrop-filter]:bg-popover/95',
  suggestionsList:
    'm-0 max-h-64 list-none divide-y divide-border overflow-y-auto scroll-py-1 p-0 focus:outline-none',
  suggestionsStatus: (type: 'empty' | 'error'): string => `${statusBase} ${statusByType[type]}`,
  suggestionItem:
    'cursor-pointer select-none text-sm text-muted-foreground transition-colors hover:bg-muted data-[focused=true]:bg-primary/10 data-[focused=true]:text-primary',
  suggestionDisplay: 'inline-block',
  suggestionHighlight: 'font-semibold text-primary',
  loadingIndicator: 'flex justify-center py-4',
  loadingSpinner: 'flex items-center gap-2 text-primary',
  loadingSpinnerButton: 'appearance-none border-0 bg-transparent p-0',
  loadingSpinnerElement:
    'inline-block h-1.5 w-1.5 animate-bounce motion-reduce:animate-none rounded-full bg-current',
  screenReaderOnly: 'sr-only',
} as const
