import type { CSSProperties } from 'react'
import { cn } from './utils/cn'
import type { MentionComponentProps } from './types'

export interface MentionProps extends MentionComponentProps {
  readonly display?: string
  readonly className?: string
  readonly style?: CSSProperties
}

const mentionBaseClass = 'font-[inherit]'

export default function Mention({ display, className, style }: MentionProps) {
  return (
    <strong className={cn(mentionBaseClass, className)} style={style}>
      {display}
    </strong>
  )
}
