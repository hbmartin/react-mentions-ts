import type { MouseEventHandler } from 'react'
import { cn } from './utils'

interface LoadingIndicatorProps {
  readonly className?: string
  readonly spinnerClassName?: string
  readonly spinnerElementClassName?: string
  readonly onMouseDown?: MouseEventHandler<HTMLDivElement>
}

const containerStyles = 'flex justify-center py-4'
const spinnerStyles = 'flex items-center gap-2 text-primary'
const spinnerDotStyles = 'inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current'

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
  return (
    <div
      className={cn(containerStyles, className)}
      data-testid="loading-indicator"
      role="status"
      aria-live="polite"
      aria-label="Loading suggestions"
      onMouseDown={onMouseDown}
    >
      <div className={cn(spinnerStyles, spinnerClassName)}>
        {dotAnimationStyles.map(({ delay, style }) => (
          <span
            key={delay}
            className={cn(spinnerDotStyles, spinnerElementClassName)}
            style={style}
          />
        ))}
      </div>
    </div>
  )
}

export default LoadingIndicator
