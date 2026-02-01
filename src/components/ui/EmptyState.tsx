'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

interface EmptyStateProps {
  icon?: ReactNode | string
  title: string
  description?: string
  action?: EmptyStateAction
  className?: string
  variant?: 'default' | 'compact' | 'dark'
}

export function EmptyState({ 
  icon = '📋',
  title,
  description,
  action,
  className,
  variant = 'default'
}: EmptyStateProps) {
  const iconElement = typeof icon === 'string' 
    ? <span className={variant === 'compact' ? 'text-3xl' : 'text-5xl'}>{icon}</span>
    : icon

  if (variant === 'compact') {
    return (
      <div className={cn('text-center py-8 px-4', className)}>
        <div className="mb-2">{iconElement}</div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        {description && (
          <p className="text-gray-400 text-xs mt-1">{description}</p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              'mt-3 text-sm px-3 py-1.5 rounded-md transition-all duration-200',
              action.variant === 'secondary'
                ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
            )}
          >
            {action.label}
          </button>
        )}
      </div>
    )
  }

  if (variant === 'dark') {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}>
        <div className="mb-4 opacity-80">{iconElement}</div>
        <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
        {description && (
          <p className="text-gray-500 max-w-md mb-4">{description}</p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              'px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
              action.variant === 'secondary'
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 focus:ring-gray-600'
                : 'bg-milo-green hover:bg-milo-green/90 text-white focus:ring-milo-green'
            )}
          >
            {action.label}
          </button>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 text-center',
      className
    )}>
      <div className="mb-4">{iconElement}</div>
      <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 max-w-md mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2',
            action.variant === 'secondary'
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-300'
              : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export default EmptyState
