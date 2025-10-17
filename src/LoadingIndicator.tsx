import { cn } from './utils/cn'

interface LoadingIndicatorProps {
  readonly className?: string
  readonly spinnerClassName?: string
  readonly spinnerElementClassName?: string
}

const containerStyles = 'flex justify-center py-2'
const spinnerStyles = 'flex items-center gap-1 text-muted-foreground'
const spinnerDotStyles = 'inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current'

const dotDelays = [0, 0.1, 0.2, 0.3, 0.4]

function LoadingIndicator({
  className,
  spinnerClassName,
  spinnerElementClassName,
}: LoadingIndicatorProps) {
  return (
    <div className={cn(containerStyles, className)} data-testid="loading-indicator">
      <div className={cn(spinnerStyles, spinnerClassName)}>
        {dotDelays.map((delay) => (
          <span
            key={delay}
            className={cn(spinnerDotStyles, spinnerElementClassName)}
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
    </div>
  )
}

export default LoadingIndicator
