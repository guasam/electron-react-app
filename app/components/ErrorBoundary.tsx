import { Component, ErrorInfo, ReactNode } from 'react'
import { ScrollArea, ScrollBar } from './ui/scroll-area'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Error is already captured in state and displayed to user
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-lg w-full space-y-6">
              {/* Error Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-destructive"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
              </div>

              {/* Error Content */}
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    An unexpected error occurred in the application
                  </p>
                </div>

                {/* Stack Trace */}
                {this.state.error?.stack && (
                  <ScrollArea className="mt-3 h-32 p-4 rounded-lg border border-border/50 bg-muted/50">
                    <pre className="text-sm text-foreground select-text text-left">{this.state.error.stack}</pre>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                )}
              </div>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
