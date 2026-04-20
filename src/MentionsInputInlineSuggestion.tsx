import type { CSSProperties, ReactNode } from 'react'
import { cva } from 'class-variance-authority'
import type { InlineSuggestionDetails } from './MentionsInputSelectors'
import type { MentionsInputClassNames } from './types'
import { cn } from './utils'

const inlineSuggestionStyles = cva(
  'absolute inline-block pointer-events-none [color:inherit] opacity-80 whitespace-pre z-[2] [font-family:inherit] [font-size:inherit] [letter-spacing:inherit]'
)
const inlineSuggestionTextStyles = 'relative inline-block items-baseline text-muted-foreground'
const inlineSuggestionPrefixStyles = 'sr-only'
const inlineSuggestionSuffixStyles = 'whitespace-pre text-muted-foreground'

const visuallyHiddenStyles: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  border: 0,
  margin: -1,
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
}

interface MentionsInputInlineSuggestionProps<Extra extends Record<string, unknown>> {
  readonly inlineSuggestion: InlineSuggestionDetails<Extra> | null
  readonly inlineSuggestionPosition: CSSProperties | null
  readonly classNames?: MentionsInputClassNames
}

interface MentionsInputInlineLiveRegionProps {
  readonly id?: string
  readonly announcement: ReactNode
}

const getSlotClassName = (
  classNames: MentionsInputClassNames | undefined,
  slot: keyof MentionsInputClassNames,
  baseClass: string
): string => cn(baseClass, classNames?.[slot])

export const MentionsInputInlineSuggestion = <Extra extends Record<string, unknown>>({
  inlineSuggestion,
  inlineSuggestionPosition,
  classNames,
}: MentionsInputInlineSuggestionProps<Extra>) => {
  if (!inlineSuggestion || !inlineSuggestionPosition) {
    return null
  }

  const wrapperClassName = getSlotClassName(
    classNames,
    'inlineSuggestion',
    inlineSuggestionStyles()
  )
  const textWrapperClassName = getSlotClassName(
    classNames,
    'inlineSuggestionText',
    inlineSuggestionTextStyles
  )
  const prefixClassName = getSlotClassName(
    classNames,
    'inlineSuggestionPrefix',
    inlineSuggestionPrefixStyles
  )
  const suffixClassName = getSlotClassName(
    classNames,
    'inlineSuggestionSuffix',
    inlineSuggestionSuffixStyles
  )

  return (
    <div
      aria-hidden="true"
      className={wrapperClassName}
      data-slot="inline-suggestion"
      style={inlineSuggestionPosition}
    >
      <span className={textWrapperClassName}>
        {inlineSuggestion.hiddenPrefix ? (
          <span className={prefixClassName} aria-hidden="true">
            {inlineSuggestion.hiddenPrefix}
          </span>
        ) : null}
        <span className={suffixClassName}>{inlineSuggestion.visibleText}</span>
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
    style={visuallyHiddenStyles}
    data-slot="inline-suggestion-live-region"
  >
    {announcement}
  </div>
)
