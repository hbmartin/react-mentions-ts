import type { MouseEventHandler } from 'react'
import { useEventCallback } from './utils/useEventCallback'
import type { LoadingIndicatorStyleConfig } from './styles/types'
import mergeStyles from './styles/mergeStyles'

export interface LoadingIndicatorProps {
  readonly className?: string
  readonly spinnerClassName?: string
  readonly spinnerElementClassName?: string
  readonly onMouseDown?: MouseEventHandler<HTMLElement>
  readonly styles: LoadingIndicatorStyleConfig
}

const dotAnimationStyles = [0, 1, 2, 3, 4].map((delay) => ({
  delay,
  style: { animationDelay: `${String(delay * 0.1)}s` },
}))

function LoadingIndicatorBase({
  className,
  spinnerClassName,
  spinnerElementClassName,
  onMouseDown,
  styles,
}: LoadingIndicatorProps) {
  const handleMouseDown = useEventCallback<MouseEventHandler<HTMLButtonElement>>((event) => {
    event.preventDefault()
    onMouseDown?.(event)
  })

  return (
    <div className={styles.mergeClassNames(styles.containerClassName, className)}>
      <span
        className={styles.screenReaderClassName}
        style={styles.screenReaderStyle}
        role="status"
        aria-live="polite"
      >
        Loading suggestions
      </span>
      <button
        type="button"
        data-testid="loading-indicator"
        className={styles.mergeClassNames(
          styles.spinnerClassName,
          styles.spinnerButtonClassName,
          spinnerClassName
        )}
        style={mergeStyles(styles.spinnerStyle, styles.spinnerButtonStyle)}
        tabIndex={-1}
        aria-hidden="true"
        onMouseDown={handleMouseDown}
      >
        {dotAnimationStyles.map(({ delay, style }) => (
          <span
            key={delay}
            className={styles.mergeClassNames(styles.spinnerDotClassName, spinnerElementClassName)}
            style={mergeStyles(styles.spinnerDotStyle, style)}
            aria-hidden="true"
          />
        ))}
      </button>
    </div>
  )
}

export default LoadingIndicatorBase
