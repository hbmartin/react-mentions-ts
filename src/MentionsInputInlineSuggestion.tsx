import type { CSSProperties, ReactNode } from 'react'
import { defaultClassNames } from './defaultClassNames'
import type { InlineSuggestionDetails } from './MentionsInputSelectors'
import {
  inlineSuggestionStructuralStyle,
  inlineSuggestionSuffixStructuralStyle,
  inlineSuggestionTextStructuralStyle,
  visuallyHiddenStyle,
} from './structuralStyles'
import type { ClassNameJoiner, MentionsInputClassNames } from './types'
import joinClassNames from './utils/joinClassNames'

interface MentionsInputInlineSuggestionProps<Extra extends Record<string, unknown>> {
  readonly inlineSuggestion: InlineSuggestionDetails<Extra> | null
  readonly inlineSuggestionPosition: CSSProperties | null
  readonly classNames?: MentionsInputClassNames
  readonly unstyled?: boolean
  readonly mergeClassNames?: ClassNameJoiner
}

interface MentionsInputInlineLiveRegionProps {
  readonly id?: string
  readonly announcement: ReactNode
}

export const MentionsInputInlineSuggestion = <Extra extends Record<string, unknown>>({
  inlineSuggestion,
  inlineSuggestionPosition,
  classNames,
  unstyled = false,
  mergeClassNames = joinClassNames,
}: MentionsInputInlineSuggestionProps<Extra>) => {
  if (!inlineSuggestion || !inlineSuggestionPosition) {
    return null
  }

  const getSlotClassName = (slot: keyof MentionsInputClassNames, baseClass: string): string =>
    mergeClassNames(unstyled ? undefined : baseClass, classNames?.[slot])

  const wrapperClassName = getSlotClassName('inlineSuggestion', defaultClassNames.inlineSuggestion)
  const textWrapperClassName = getSlotClassName(
    'inlineSuggestionText',
    defaultClassNames.inlineSuggestionText
  )
  const prefixClassName = getSlotClassName(
    'inlineSuggestionPrefix',
    defaultClassNames.inlineSuggestionPrefix
  )
  const suffixClassName = getSlotClassName(
    'inlineSuggestionSuffix',
    defaultClassNames.inlineSuggestionSuffix
  )

  return (
    <div
      aria-hidden="true"
      className={wrapperClassName}
      data-slot="inline-suggestion"
      // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop -- position changes with the caret; the wrapper re-renders alongside it anyway.
      style={{ ...inlineSuggestionStructuralStyle, ...inlineSuggestionPosition }}
    >
      <span className={textWrapperClassName} style={inlineSuggestionTextStructuralStyle}>
        {inlineSuggestion.hiddenPrefix ? (
          <span className={prefixClassName} style={visuallyHiddenStyle} aria-hidden="true">
            {inlineSuggestion.hiddenPrefix}
          </span>
        ) : null}
        <span className={suffixClassName} style={inlineSuggestionSuffixStructuralStyle}>
          {inlineSuggestion.visibleText}
        </span>
      </span>
    </div>
  )
}

export const MentionsInputInlineLiveRegion = ({
  id,
  announcement,
}: MentionsInputInlineLiveRegionProps) => (
  <div
    id={id}
    role="status"
    aria-live="polite"
    aria-atomic="true"
    style={visuallyHiddenStyle}
    data-slot="inline-suggestion-live-region"
  >
    {announcement}
  </div>
)
