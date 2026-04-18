import type { MouseEventHandler } from 'react'
import { cn } from './utils'
import { useEventCallback } from './utils/useEventCallback'

interface LoadingIndicatorProps {
  readonly className?: string
  readonly spinnerClassName?: string
  readonly spinnerElementClassName?: string
  readonly onMouseDown?: MouseEventHandler<HTMLElement>
}

const containerStyles = 'flex justify-center py-4'
const spinnerStyles = 'flex items-center gap-2 text-primary'
const spinnerButtonStyles = 'appearance-none border-0 bg-transparent p-0'
const spinnerDotStyles =
  'inline-block h-1.5 w-1.5 animate-bounce motion-reduce:animate-none rounded-full bg-current'

const dotAnimationStyles = [0, 1, 2, 3, 4].map((delay) => ({
  delay,
  style: { animationDelay: `${String(delay * 0.1)}s` },
}))

function LoadingIndicator({
  className,
  spinnerClassName,
  spinnerElementClassName,
  onMouseDown,
}: LoadingIndicatorProps) {
  const handleMouseDown = useEventCallback<MouseEventHandler<HTMLButtonElement>>((event) => {
    event.preventDefault()
    onMouseDown?.(event)
  })

  return (
    <div className={cn(containerStyles, className)}>
      <span className="sr-only" role="status" aria-live="polite">
        Loading suggestions
      </span>
      <button
        type="button"
        data-testid="loading-indicator"
        className={cn(spinnerStyles, spinnerButtonStyles, spinnerClassName)}
        tabIndex={-1}
        aria-hidden="true"
        onMouseDown={handleMouseDown}
      >
        {dotAnimationStyles.map(({ delay, style }) => (
          <span
            key={delay}
            className={cn(spinnerDotStyles, spinnerElementClassName)}
            style={style}
            aria-hidden="true"
          />
        ))}
      </button>
    </div>
  )
}

export default LoadingIndicator
