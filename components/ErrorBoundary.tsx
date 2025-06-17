import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Game Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
          <div className="text-center space-y-6 max-w-md">
            <div className="space-y-2">
              <h1 className="text-4xl mb-2">🚨 System Error</h1>
              <h2 className="text-xl text-red-400">Stellar Drift Encountered an Error</h2>
              <p className="text-gray-400">
                The game encountered an unexpected error and needs to restart.
              </p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                  window.location.reload();
                }}
                className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔄 Restart Game
              </button>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="text-left text-xs bg-gray-800 p-4 rounded max-h-40 overflow-auto">
                  <div className="text-red-400 mb-2">Debug Info:</div>
                  <pre className="text-gray-300">{this.state.error.toString()}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}