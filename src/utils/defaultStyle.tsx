import React from 'react'
import useStyles, { type Modifiers } from './useStyles'
import type { ClassNamesProp, StyleOverride, Substyle } from '../types'

interface StylingProps {
  style?: StyleOverride
  className?: string
  classNames?: ClassNamesProp
}

function createDefaultStyle(
  defaultStyle: Parameters<typeof useStyles>[0],
  getModifiers?: (props: Record<string, unknown>) => Modifiers
) {
  return function enhance<P extends { style: Substyle }, R>(
    ComponentToWrap: React.ComponentType<P>
  ): React.ForwardRefExoticComponent<
    React.PropsWithoutRef<Omit<P, 'style'> & StylingProps> & React.RefAttributes<R>
  > {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
    const displayName = ComponentToWrap.displayName || ComponentToWrap.name || 'Component'

    const Forwarded = React.forwardRef<R, Omit<P, 'style'> & StylingProps>((props, ref) => {
      const { style, className, classNames, ...rest } = props as StylingProps & Omit<P, 'style'>
      const modifiers = getModifiers
        ? getModifiers(rest as unknown as Record<string, unknown>)
        : undefined
      const styles = useStyles(defaultStyle, { style, className, classNames }, modifiers)

      return <ComponentToWrap {...({ ...rest, style: styles } as P)} ref={ref} />
    })

    Forwarded.displayName = `defaultStyle(${displayName})`

    return Forwarded
  }
}

export default createDefaultStyle
