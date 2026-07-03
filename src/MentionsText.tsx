import type { ReactElement } from 'react'
import type { RenderMentionsOptions } from './renderMentionsMarkup'
import { renderMentionsToReact } from './renderMentionsMarkup'
import { cn } from './utils'

export interface MentionsTextProps extends RenderMentionsOptions {
  /** The stored markup value produced by `MentionsInput` */
  value: string
  className?: string
}

/**
 * Displays a stored markup value with mentions highlighted — the read-only counterpart
 * to `MentionsInput` for rendering saved messages.
 */
const MentionsText = ({ value, className, ...options }: MentionsTextProps): ReactElement => (
  <span className={cn('whitespace-pre-wrap', className)}>
    {renderMentionsToReact(value, options)}
  </span>
)

export default MentionsText
