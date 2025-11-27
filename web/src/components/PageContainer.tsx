import type { ReactNode } from "react";
import { cn } from "@/utils/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl" | "7xl" | "full";
  title?: string;
  description?: string;
  headerAction?: ReactNode;
}

export function PageContainer({
  children,
  className,
  maxWidth = "7xl",
  title,
  description,
  headerAction,
}: PageContainerProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
    full: "max-w-full",
  };

  return (
    // Outer wrapper ensures page is at least viewport height so footer is pushed below
    <div className={cn("min-h-screen flex flex-col w-full", className)}>
      {/* Centered content wrapper for header (keeps header width constrained) */}
      <div
        className={cn(
          "w-full mx-auto px-4 sm:px-6z  lg:px-8",
          maxWidthClasses[maxWidth]
        )}
      >
        {(title || description || headerAction) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-1 py-4 md:py-6">
            <div className="flex-1 min-w-0">
              {title && (
                <h1 className="text-2xl md:text-3xl font-bold app-text mb-1">
                  {title}
                </h1>
              )}
              {description && (
                <p className="app-text-subtle text-sm md:text-base">
                  {description}
                </p>
              )}
            </div>
            {headerAction && (
              <div className="flex-shrink-0">{headerAction}</div>
            )}
          </div>
        )}
      </div>

      {/* Main content grows to fill remaining space, ensuring footer is pushed below viewport until scrolled */}
      <main
        className={cn(
          "flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8",
          maxWidthClasses[maxWidth]
        )}
      >
        <div className="py-4 md:py-6 space-y-4">{children}</div>
      </main>
    </div>
  );
}
