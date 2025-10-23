import type { CSSProperties } from 'react'
import { cn } from './utils/cn'

export interface MentionProps {
  readonly display?: string
  readonly className?: string
  readonly style?: CSSProperties
}

const mentionBaseClass =
  'inline items-center rounded-md bg-indigo-500/20 p-0 [font-family:inherit] [font-size:inherit] [letter-spacing:inherit] [font-weight:inherit] text-transparent'

export default function Mention({ display, className, style }: MentionProps) {
  return (
    <strong className={cn(className, mentionBaseClass)} style={style}>
      {display}
    </strong>
  )
}
