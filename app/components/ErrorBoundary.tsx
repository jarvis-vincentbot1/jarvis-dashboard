'use client'

import React, { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught:', error)
    console.error('Error info:', errorInfo)

    this.setState({
      error,
      errorInfo,
    })
  }

  handleRefresh = () => {
    // Clear error state and reload page
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-dvh bg-[#0f0f0f] text-gray-100">
          <div className="max-w-md mx-auto px-6 py-8 text-center">
            {/* Error icon */}
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-red-400"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            </div>

            {/* Error message */}
            <h1 className="text-2xl font-bold mb-2 text-red-400">Oops! Something went wrong</h1>
            <p className="text-gray-400 mb-6">
              An unexpected error occurred. We've logged the details to help us fix this issue.
            </p>

            {/* Error details (dev mode only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-[#1a1a1a] border border-red-500/20 rounded-lg text-left overflow-auto max-h-32">
                <p className="text-xs text-red-300 font-mono break-words">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <p className="text-xs text-gray-500 font-mono mt-2 break-words">
                    {this.state.errorInfo.componentStack}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRefresh}
                className="px-6 py-2 bg-[#00ff88] text-black font-semibold rounded-lg hover:bg-[#00dd77] transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="px-6 py-2 bg-[#1a1a1a] text-gray-300 font-semibold rounded-lg border border-[#2a2a2a] hover:bg-[#242424] transition-colors"
              >
                Go Home
              </button>
            </div>

            {/* Help text */}
            <p className="mt-6 text-xs text-gray-500">
              If this problem persists, please try clearing your browser cache or using a different browser.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
