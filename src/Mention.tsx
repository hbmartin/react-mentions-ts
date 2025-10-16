import useStyles from './utils/useStyles'
import type { ClassNamesProp, MentionComponentProps, StyleOverride } from './types'

export interface MentionProps extends MentionComponentProps {
  readonly display?: string
  readonly style?: StyleOverride
  readonly className?: string
  readonly classNames?: ClassNamesProp
}

const defaultStyle = {
  fontWeight: 'inherit',
}

export default function Mention({ display, style, className, classNames }: MentionProps) {
  const styles = useStyles(defaultStyle, { style, className, classNames })

  return <strong {...styles}>{display}</strong>
}
