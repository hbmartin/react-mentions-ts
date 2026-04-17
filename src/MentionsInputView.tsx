import type React from 'react'
import type { CSSProperties } from 'react'

export interface MentionsInputViewProps {
  readonly rootRef: (element: HTMLDivElement | null) => void
  readonly rootClassName: string
  readonly style?: CSSProperties
  readonly singleLine: boolean
  readonly controlClassName: string
  readonly highlighter: React.ReactNode
  readonly input: React.ReactNode
  readonly inlineSuggestion: React.ReactNode
  readonly inlineSuggestionLiveRegion: React.ReactNode
  readonly suggestionsOverlay: React.ReactNode
  readonly measurementBridge: React.ReactNode
}

const MentionsInputView = ({
  rootRef,
  rootClassName,
  style,
  singleLine,
  controlClassName,
  highlighter,
  input,
  inlineSuggestion,
  inlineSuggestionLiveRegion,
  suggestionsOverlay,
  measurementBridge,
}: MentionsInputViewProps) => (
  <div
    ref={rootRef}
    className={rootClassName}
    style={style}
    data-single-line={singleLine ? 'true' : undefined}
    data-multi-line={singleLine ? undefined : 'true'}
  >
    <div className={controlClassName} data-slot="control">
      {highlighter}
      {input}
      {inlineSuggestion}
      {inlineSuggestionLiveRegion}
    </div>
    {suggestionsOverlay}
    {measurementBridge}
  </div>
)

export default MentionsInputView
