import React, { ReactNode, useState, useEffect } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface ErrorInfo {
  componentStack: string;
}

const ErrorBoundary: React.FC<Props> = ({ children, fallback, onError }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = new Error(event.message);
      error.stack = event.error?.stack;

      // Check for mobile-specific memory errors
      const isMemoryError = error.message.includes('out of memory') ||
                           error.message.includes('Cannot allocate') ||
                           error.message.includes('Maximum call stack') ||
                           error.message.includes('Canvas') && error.message.includes('memory');

      setError(error);
      setHasError(true);

      // Log error for debugging
      console.error('Global error caught:', error, event.error);

      // Store error in localStorage for debugging
      if (typeof window !== 'undefined' && (window as any).localStorage) {
        try {
          const errorLog = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            isMemoryError,
            deviceMemory: (navigator as any).deviceMemory || 'unknown',
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
          };

          const existingErrors = JSON.parse((window as any).localStorage.getItem('app_errors') || '[]');
          existingErrors.push(errorLog);
          (window as any).localStorage.setItem('app_errors', JSON.stringify(existingErrors.slice(-5)));
        } catch (e) {
          console.warn('Failed to log error:', e);
        }
      }

      // Call custom error handler if provided
      onError?.(error, { componentStack: 'Global error handler' });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = new Error(`Unhandled promise rejection: ${event.reason}`);
      error.stack = event.reason?.stack;

      setError(error);
      setHasError(true);

      console.error('Unhandled promise rejection:', error, event.reason);

      onError?.(error, { componentStack: 'Promise rejection handler' });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [onError]);

  const resetError = () => {
    setHasError(false);
    setError(null);
  };

  if (hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[var(--background)]">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Oops! Something went wrong
          </h2>

          <p className="text-[var(--text-secondary)] mb-4 text-sm">
            {error?.message.includes('out of memory') || error?.message.includes('Cannot allocate') ?
              "The app ran out of memory. Try closing other apps, using smaller images, or restarting your device." :
              "The app encountered an unexpected error. This has been logged for debugging."
            }
          </p>

          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[var(--accent-primary)] hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 active:scale-[0.98]"
            >
              Reload App
            </button>

            <button
              onClick={resetError}
              className="w-full bg-[var(--control-bg)] hover:bg-[var(--control-bg)]/80 text-[var(--text-secondary)] font-bold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Try Again
            </button>

            {(error?.message.includes('out of memory') || error?.message.includes('Cannot allocate')) && (
              <button
                onClick={() => {
                  // Clear all cached data and reload
                  if ('caches' in window) {
                    caches.keys().then(names => {
                      names.forEach(name => caches.delete(name));
                    });
                  }
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Clear Cache & Reload
              </button>
            )}
          </div>

          {typeof process !== 'undefined' && (process as any).env?.NODE_ENV === 'development' && error && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-[var(--text-tertiary)]">
                Error Details (Dev Only)
              </summary>
              <pre className="mt-2 text-xs bg-[var(--control-bg)] p-2 rounded overflow-auto max-h-32">
                {error.toString()}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ErrorBoundary;