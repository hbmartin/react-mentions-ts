import type { CSSProperties } from 'react'
import { cn } from './utils/cn'
import type { MentionComponentProps } from './types'

export interface MentionProps<Extra extends Record<string, unknown> = Record<string, unknown>>
  extends MentionComponentProps<Extra> {
  readonly display?: string
  readonly className?: string
  readonly style?: CSSProperties
}

const mentionBaseClass = 'items-center rounded-md bg-primary/20'

const mentionsRequiredClass =
  'inline [font-family:inherit] [font-size:inherit] [letter-spacing:inherit] [font-weight:inherit] text-transparent p-0'

export default function Mention<Extra extends Record<string, unknown> = Record<string, unknown>>({
  display,
  className,
  style,
}: MentionProps<Extra>) {
  return (
    <strong className={cn(mentionBaseClass, className, mentionsRequiredClass)} style={style}>
      {display}
    </strong>
  )
}
