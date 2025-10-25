import { clsx } from 'clsx'
import type { MentionsInputClassNames } from '../../../src'

const baseSuggestions =
  'mt-3 w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 shadow-2xl shadow-slate-900/5 ring-1 ring-slate-900/5 backdrop-blur'
const baseSuggestionsList =
  'max-h-64 overflow-y-auto divide-y divide-slate-100 scroll-py-1 focus:outline-none'
const baseSuggestionItem =
  'flex gap-2 px-4 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-100/80'
const baseSuggestionItemFocused = 'bg-indigo-50/90 text-indigo-600'

const baseControl =
  'relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/90 px-0 py-0 shadow-inner shadow-slate-950/5'
const baseHighlighter =
  'pointer-events-none whitespace-pre-wrap break-words rounded-3xl border border-transparent px-4 py-3 text-transparent leading-relaxed'
const baseInput =
  'relative block w-full rounded-3xl border border-transparent bg-transparent px-4 py-3 text-sm leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:outline-none'

export const multilineMentionsClassNames: MentionsInputClassNames = {
  control: baseControl,
  highlighter: baseHighlighter,
  input: baseInput,
  inlineSuggestion: 'pointer-events-none text-slate-400',
  inlineSuggestionText: 'inline-flex text-sm font-medium text-slate-400',
  inlineSuggestionPrefix: 'sr-only',
  inlineSuggestionSuffix: 'whitespace-pre text-slate-400',
  suggestions: baseSuggestions,
  suggestionsList: baseSuggestionsList,
  suggestionItem: baseSuggestionItem,
  suggestionItemFocused: baseSuggestionItemFocused,
  suggestionDisplay: 'inline-flex items-center',
  suggestionHighlight: 'font-semibold text-indigo-600',
  loadingIndicator: 'py-4',
  loadingSpinner: 'text-indigo-500',
  loadingSpinnerElement: 'bg-current',
}

export const singleLineMentionsClassNames: MentionsInputClassNames = {
  ...multilineMentionsClassNames,
  control: clsx(multilineMentionsClassNames.control, 'inline-block min-w-[16rem]'),
  highlighter: clsx(multilineMentionsClassNames.highlighter, 'px-3 py-2'),
  input: clsx(multilineMentionsClassNames.input, 'px-3 py-2'),
  suggestions: baseSuggestions,
}

export const inlineMentionsClassNames: MentionsInputClassNames = {
  ...singleLineMentionsClassNames,
  inlineSuggestion: 'pointer-events-none text-slate-400',
  inlineSuggestionText: 'inline-flex items-baseline gap-1',
  inlineSuggestionSuffix: 'whitespace-pre text-slate-400',
}

export function mergeClassNames(
  base: MentionsInputClassNames,
  overrides?: Partial<MentionsInputClassNames>
): MentionsInputClassNames {
  if (!overrides) {
    return base
  }
  const merged: MentionsInputClassNames = { ...base }
  for (const key of Object.keys(overrides) as Array<keyof MentionsInputClassNames>) {
    const value = overrides[key]
    if (!value) {
      continue
    }
    merged[key] = clsx(base[key], value)
  }
  return merged
}

export const mentionPillClass = 'px-2 py-0.5 text-sm font-medium text-indigo-600'

export const mentionPillAccentClass =
  'rounded-sm bg-emerald-500/15 px-2 py-0.5 text-sm font-medium text-emerald-600'
