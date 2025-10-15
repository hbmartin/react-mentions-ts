// @ts-nocheck
import React from 'react'
import useStyles from 'substyle'
import type { MentionComponentProps } from './types'

export interface MentionProps extends MentionComponentProps {
  display?: string
  style?: any
  className?: string
  classNames?: unknown
}

export const DEFAULT_MENTION_PROPS = {
  trigger: '@',
  markup: '@[__display__](__id__)',
  onAdd: () => null,
  onRemove: () => null,
  displayTransform: (id: string, display?: string | null) => display || id,
  renderSuggestion: null,
  isLoading: false,
  appendSpaceOnAdd: false,
} satisfies Partial<MentionComponentProps> & {
  onAdd: NonNullable<MentionComponentProps['onAdd']>
  onRemove: NonNullable<MentionComponentProps['onRemove']>
  displayTransform: NonNullable<MentionComponentProps['displayTransform']>
  renderSuggestion: MentionComponentProps['renderSuggestion']
  isLoading: boolean
  appendSpaceOnAdd: boolean
}

const defaultStyle = {
  fontWeight: 'inherit',
}

export default function Mention({
  display,
  style,
  className,
  classNames,
}: MentionProps) {
  const styles = useStyles(defaultStyle, { style, className, classNames })

  return <strong {...styles}>{display}</strong>
}
