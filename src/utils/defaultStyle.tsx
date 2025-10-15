// @ts-nocheck
import React from 'react'
import useStyles from 'substyle'

function createDefaultStyle(
  defaultStyle: any,
  getModifiers?: (props: Record<string, unknown>) => unknown
) {
  return function enhance(ComponentToWrap: React.ComponentType<any>) {
    const displayName =
      ComponentToWrap.displayName || ComponentToWrap.name || 'Component'

    const Forwarded = React.forwardRef<any, any>((props, ref) => {
      const { style, className, classNames, ...rest } = props
      const modifiers = getModifiers ? getModifiers(rest) : undefined
      const styles = useStyles(
        defaultStyle,
        { style, className, classNames },
        modifiers
      )

      return <ComponentToWrap {...rest} style={styles} ref={ref} />
    })

    Forwarded.displayName = `defaultStyle(${displayName})`

    return Forwarded
  }
}

export default createDefaultStyle
