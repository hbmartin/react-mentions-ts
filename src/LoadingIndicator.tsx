import React from 'react'
import useStyles from 'substyle'
import type { ClassNamesProp, StyleOverride, Substyle } from './types'

interface LoadingIndicatorProps {
  style?: StyleOverride
  className?: string
  classNames?: ClassNamesProp
}

const defaultStyle: Parameters<typeof useStyles>[0] = {}

function LoadingIndicator({ style, className, classNames }: LoadingIndicatorProps) {
  const styles: Substyle = useStyles(defaultStyle, { style, className, classNames })
  const spinnerStyles = styles('spinner')
  return (
    <div {...styles} data-testid="loading-indicator">
      <div {...spinnerStyles}>
        <div {...spinnerStyles(['element', 'element1'])} />
        <div {...spinnerStyles(['element', 'element2'])} />
        <div {...spinnerStyles(['element', 'element3'])} />
        <div {...spinnerStyles(['element', 'element4'])} />
        <div {...spinnerStyles(['element', 'element5'])} />
      </div>
    </div>
  )
}

export default LoadingIndicator
