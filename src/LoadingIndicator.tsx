import type { MouseEventHandler } from 'react'
import { defaultClassNames } from './defaultClassNames'
import { visuallyHiddenStyle } from './structuralStyles'
import type { ClassNameJoiner } from './types'
import joinClassNames from './utils/joinClassNames'
import { useEventCallback } from './utils/useEventCallback'

interface LoadingIndicatorProps {
  readonly className?: string
  readonly spinnerClassName?: string
  readonly spinnerElementClassName?: string
  readonly onMouseDown?: MouseEventHandler<HTMLElement>
  readonly unstyled?: boolean
  readonly mergeClassNames?: ClassNameJoiner
}

const dotAnimationStyles = [0, 1, 2, 3, 4].map((delay) => ({
  delay,
  style: { animationDelay: `${String(delay * 0.1)}s` },
}))

function LoadingIndicator({
  className,
  spinnerClassName,
  spinnerElementClassName,
  onMouseDown,
  unstyled = false,
  mergeClassNames = joinClassNames,
}: LoadingIndicatorProps) {
  const handleMouseDown = useEventCallback<MouseEventHandler<HTMLButtonElement>>((event) => {
    event.preventDefault()
    onMouseDown?.(event)
  })

  return (
    <div
      className={mergeClassNames(
        unstyled ? undefined : defaultClassNames.loadingIndicator,
        className
      )}
      data-slot="loading-indicator"
    >
      <span
        className={unstyled ? undefined : defaultClassNames.screenReaderOnly}
        style={visuallyHiddenStyle}
        role="status"
        aria-live="polite"
      >
        Loading suggestions
      </span>
      <button
        type="button"
        data-testid="loading-indicator"
        data-slot="loading-spinner"
        className={mergeClassNames(
          unstyled ? undefined : defaultClassNames.loadingSpinner,
          unstyled ? undefined : defaultClassNames.loadingSpinnerButton,
          spinnerClassName
        )}
        tabIndex={-1}
        aria-hidden="true"
        onMouseDown={handleMouseDown}
      >
        {dotAnimationStyles.map(({ delay, style }) => (
          <span
            key={delay}
            className={mergeClassNames(
              unstyled ? undefined : defaultClassNames.loadingSpinnerElement,
              spinnerElementClassName
            )}
            data-slot="loading-spinner-dot"
            style={style}
            aria-hidden="true"
          />
        ))}
      </button>
    </div>
  )
}

export default LoadingIndicator
