'use client'

import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4',
}

export function LoadingSpinner({ 
  size = 'md', 
  className,
  label 
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'border-blue-500 border-t-transparent rounded-full animate-spin',
          sizeClasses[size]
        )}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && (
        <span className="text-sm text-gray-500 animate-pulse">{label}</span>
      )}
    </div>
  )
}

// Variant for dark backgrounds
export function LoadingSpinnerDark({ 
  size = 'md', 
  className,
  label 
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'border-milo-green border-t-transparent rounded-full animate-spin',
          sizeClasses[size]
        )}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && (
        <span className="text-sm text-gray-400 animate-pulse">{label}</span>
      )}
    </div>
  )
}

export default LoadingSpinner
