import { cn } from './utils/cn'

interface LoadingIndicatorProps {
  readonly className?: string
}

const containerStyles = 'flex justify-center py-2'
const spinnerStyles = 'flex items-center gap-1 text-muted-foreground'
const spinnerDotStyles = 'inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current'

const dotDelays = [0, 1, 2, 3, 4]

function LoadingIndicator({
  className,
}: LoadingIndicatorProps) {
  return (
    <div
      className={cn(containerStyles, className)}
      data-testid="loading-indicator"
      role="status"
      aria-live="polite"
      aria-label="Loading suggestions"
    >
      <div className={spinnerStyles}>
        {dotDelays.map((delay) => (
          <span
            key={delay}
            className={spinnerDotStyles}
            style={{ animationDelay: `${String(delay * 0.1)}s` }}
          />
        ))}
      </div>
    </div>
  )
}

export default LoadingIndicator
