import type { CSSProperties } from 'react'
import { defaultClassNames } from './defaultClassNames'
import { mentionStructuralStyle } from './structuralStyles'
import type { ClassNameJoiner, MentionComponentProps } from './types'
import joinClassNames from './utils/joinClassNames'

export interface MentionProps<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> extends MentionComponentProps<Extra> {
  readonly display?: string
  readonly className?: string
  readonly style?: CSSProperties
  /**
   * Skip the default Tailwind chip class. Inherited from the surrounding
   * `MentionsInput` when rendered inside the highlighter, unless set here.
   */
  readonly unstyled?: boolean
  /** Class merger; inherited from the surrounding `MentionsInput` unless set here. */
  readonly mergeClassNames?: ClassNameJoiner
}

export default function Mention<Extra extends Record<string, unknown> = Record<string, unknown>>({
  display,
  className,
  style,
  selectionState,
  unstyled = false,
  mergeClassNames = joinClassNames,
}: Readonly<MentionProps<Extra>>) {
  return (
    <span
      className={mergeClassNames(unstyled ? undefined : defaultClassNames.mention, className)}
      // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop -- merged only when a style prop is present; Mention has no memo boundary below it.
      style={style === undefined ? mentionStructuralStyle : { ...mentionStructuralStyle, ...style }}
      data-slot="mention"
      data-mention-selection={selectionState ?? undefined}
    >
      {display}
    </span>
  )
}
