import { isValidElement, type ReactElement } from 'react'
import { isDataSource, type MentionComponentProps } from '../types'

export const isMentionElement = <Extra extends Record<string, unknown>>(
  child: unknown
): child is ReactElement<MentionComponentProps<Extra>> =>
  isValidElement(child) &&
  typeof child.props === 'object' &&
  child.props !== null &&
  'data' in child.props &&
  isDataSource(child.props.data)
