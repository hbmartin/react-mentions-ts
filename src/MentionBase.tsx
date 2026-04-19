import type { CSSProperties } from 'react'
import type { MentionComponentProps } from './types'
import type { MentionStyleConfig } from './styles/types'
import mergeStyles from './styles/mergeStyles'

export interface MentionProps<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> extends MentionComponentProps<Extra> {
  readonly display?: string
  readonly className?: string
  readonly style?: CSSProperties
}

export interface MentionBaseProps<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> extends MentionProps<Extra> {
  readonly styles: MentionStyleConfig
}

export default function MentionBase<
  Extra extends Record<string, unknown> = Record<string, unknown>,
>({ display, className, style, selectionState, styles }: Readonly<MentionBaseProps<Extra>>) {
  return (
    <span
      className={styles.mergeClassNames(styles.className, className, styles.requiredClassName)}
      style={mergeStyles(styles.style, style)}
      data-mention-selection={selectionState ?? undefined}
    >
      {display}
    </span>
  )
}
