/**
 * Error Boundary Component
 * Catches JavaScript errors in child component tree and displays fallback UI
 */
import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // TODO: Send to error reporting service (Sentry, LogRocket, etc.)
    // reportError({ error, errorInfo });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = "/";
  };

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
          <div className="max-w-md w-full text-center">
            {/* Error Icon */}
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-[var(--color-error)]" />
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
              Oops! Something went wrong
            </h1>
            <p className="text-[var(--color-text-muted)] mb-6">
              We're sorry, but something unexpected happened. Please try
              refreshing the page or go back to the home page.
            </p>

            {/* Error Details (Development Only) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left overflow-auto max-h-40">
                <p className="text-sm font-mono text-red-700">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="btn btn-primary flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="btn btn-secondary flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go to Home
              </button>
            </div>

            {/* Try Again Link */}
            <button
              onClick={this.handleReset}
              className="mt-4 text-sm text-[var(--color-primary)] hover:underline"
            >
              Try again without refreshing
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
