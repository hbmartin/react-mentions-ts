import type { CSSProperties, ReactElement } from 'react'
import type { RenderMentionsOptions } from './renderMentionsMarkup'
import { renderMentionsToReact } from './renderMentionsMarkup'

export interface MentionsTextProps extends RenderMentionsOptions {
  /** The stored markup value produced by `MentionsInput` */
  value: string
  className?: string
}

// Stored values encode line breaks as plain newlines, so pre-wrap is structural.
const mentionsTextStructuralStyle: CSSProperties = { whiteSpace: 'pre-wrap' }

/**
 * Displays a stored markup value with mentions highlighted — the read-only counterpart
 * to `MentionsInput` for rendering saved messages.
 */
const MentionsText = ({ value, className, ...options }: MentionsTextProps): ReactElement => (
  <span className={className} style={mentionsTextStructuralStyle} data-slot="mentions-text">
    {renderMentionsToReact(value, options)}
  </span>
)

export default MentionsText
