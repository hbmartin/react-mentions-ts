import { isValidElement, type ReactElement } from 'react'
import type { MentionComponentProps } from '../types'
import Mention from '../Mention'

export const isMentionElement = <Extra extends Record<string, unknown>>(
  child: unknown
): child is ReactElement<MentionComponentProps<Extra>> =>
  isValidElement(child) &&
  child.type === Mention &&
  typeof child.props === 'object' &&
  child.props !== null &&
  'data' in child.props
