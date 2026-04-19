import { cva } from 'class-variance-authority'

import tailwindMergeClassNames from './tailwindMergeClassNames'
import type { MentionsInputStyleConfig } from './types'

const highlighterStyles = cva(
  'box-border w-full overflow-hidden text-start text-transparent pointer-events-none [font-family:inherit] [font-size:inherit] [line-height:inherit]',
  {
    variants: {
      singleLine: {
        true: 'whitespace-pre break-normal',
        false: 'whitespace-pre-wrap break-words',
      },
    },
  }
)

const inputStyles = cva(
  'relative block w-full m-0 box-border bg-transparent text-foreground transition placeholder:text-muted-foreground [font-family:inherit] [font-size:inherit] [letter-spacing:inherit]',
  {
    variants: {
      singleLine: {
        true: '',
        false: 'h-full overflow-hidden resize-none whitespace-pre-wrap break-words',
      },
    },
  }
)

const statusStyles = cva('px-4 py-2.5 text-left text-sm leading-relaxed', {
  variants: {
    type: {
      empty: 'text-muted-foreground',
      error: 'text-destructive',
    },
  },
  defaultVariants: {
    type: 'empty',
  },
})

const styledStyles: MentionsInputStyleConfig = {
  mergeClassNames: tailwindMergeClassNames,
  rootClassName: 'relative overflow-y-visible',
  controlClassName: 'relative border border-border bg-card',
  inputClassName: ({ singleLine }) => inputStyles({ singleLine }),
  inlineSuggestionClassName:
    'absolute inline-block pointer-events-none [color:inherit] opacity-80 whitespace-pre z-[2] [font-family:inherit] [font-size:inherit] [letter-spacing:inherit]',
  inlineSuggestionTextClassName: 'relative inline-block items-baseline text-muted-foreground',
  inlineSuggestionPrefixClassName: 'sr-only',
  inlineSuggestionSuffixClassName: 'whitespace-pre text-muted-foreground',
  mention: {
    mergeClassNames: tailwindMergeClassNames,
    className: 'rounded-md bg-primary/20',
    requiredClassName:
      'inline [font-family:inherit] [font-size:inherit] [letter-spacing:inherit] [font-weight:inherit] text-transparent p-0',
  },
  highlighter: {
    mergeClassNames: tailwindMergeClassNames,
    rootClassName: ({ singleLine }) => highlighterStyles({ singleLine }),
    substringClassName: 'text-transparent inline [white-space:inherit]',
    caretClassName: 'relative inline-block h-0 w-0 align-baseline',
  },
  suggestionsOverlay: {
    mergeClassNames: tailwindMergeClassNames,
    overlayClassName:
      'z-[100] w-full min-w-[16rem] border border-border bg-popover backdrop-blur supports-[backdrop-filter]:bg-popover/95',
    listClassName:
      'm-0 max-h-64 list-none divide-y divide-border overflow-y-auto scroll-py-1 p-0 focus:outline-none',
    statusClassName: ({ type }) => statusStyles({ type }),
    suggestion: {
      mergeClassNames: tailwindMergeClassNames,
      itemClassName:
        'cursor-pointer select-none text-sm text-muted-foreground transition-colors hover:bg-muted data-[focused=true]:bg-primary/10 data-[focused=true]:text-primary',
      displayClassName: 'inline-block',
      highlightClassName: 'font-semibold text-primary',
    },
    loadingIndicator: {
      mergeClassNames: tailwindMergeClassNames,
      containerClassName: 'flex justify-center py-4',
      screenReaderClassName: 'sr-only',
      spinnerClassName: 'flex items-center gap-2 text-primary',
      spinnerButtonClassName: 'appearance-none border-0 bg-transparent p-0',
      spinnerDotClassName:
        'inline-block h-1.5 w-1.5 animate-bounce motion-reduce:animate-none rounded-full bg-current',
    },
  },
}

export default styledStyles
