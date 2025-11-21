import type { ReactNode } from "react"
import { cn } from "@/utils/utils"

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full';
  title?: string;
  description?: string;
  headerAction?: ReactNode;
}

export function PageContainer({ 
  children, 
  className,
  maxWidth = '7xl',
  title,
  description,
  headerAction
}: PageContainerProps) {
  const maxWidthClasses = {
    'sm': 'max-w-sm',
    'md': 'max-w-md', 
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    'full': 'max-w-full'
  }

  return (
    <div className={cn(
      "min-h-full",
      "w-full",
      "mx-auto",
      "px-4 sm:px-6 lg:px-8",
      "py-6 md:py-8",
      "flex flex-col",
      maxWidthClasses[maxWidth],
      className
    )}>
      {/* Page Header */}
      {(title || description || headerAction) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 flex-shrink-0">
          <div className="flex-1 min-w-0">
            {title && (
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-gray-600 text-sm md:text-base">
                {description}
              </p>
            )}
          </div>
          {headerAction && (
            <div className="flex-shrink-0">
              {headerAction}
            </div>
          )}
        </div>
      )}
      
      {/* Page Content */}
      <div className="flex-1 flex flex-col space-y-6 min-h-0">
        {children}
      </div>
    </div>
  )
}
