import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cyber-bg flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="cyber-card p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-cyber-primary mb-2 font-mono">
                SYSTEM ERROR
              </h1>
              <p className="text-cyber-secondary mb-6 font-mono text-sm">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <button
                onClick={this.handleReset}
                className="cyber-button-primary px-6 py-3 inline-flex items-center gap-2"
                aria-label="Retry"
              >
                <RefreshCw className="w-4 h-4" />
                RESTART SYSTEM
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
