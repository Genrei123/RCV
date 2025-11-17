import { useEffect, useState } from 'react';
import { loadingManager } from '@/utils/loadingManager';

/**
 * Global Loading Indicator
 * 
 * Shows a fixed loading bar at the top of the screen when API requests are pending.
 * Automatically tracks all axios requests via interceptors.
 */
export function GlobalLoadingIndicator() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Subscribe to loading state changes
    const unsubscribe = loadingManager.subscribe((loading) => {
      setIsLoading(loading);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999]">
      {/* Animated Progress Bar */}
      <div className="h-1 bg-gradient-to-r from-teal-500 via-teal-400 to-teal-500 overflow-hidden">
        <div className="h-full bg-teal-600 animate-loading-shimmer" />
      </div>

      <style>{`
        @keyframes loading-shimmer {
          0% {
            transform: translateX(-100%);
            width: 30%;
          }
          50% {
            width: 60%;
          }
          100% {
            transform: translateX(400%);
            width: 30%;
          }
        }

        .animate-loading-shimmer {
          animation: loading-shimmer 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          box-shadow: 0 0 10px rgba(20, 184, 166, 0.5);
        }
      `}</style>
    </div>
  );
}
