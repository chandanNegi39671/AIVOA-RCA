import React from 'react';
import { AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';

/**
 * Safe Error Boundary for workspace and page render errors.
 * Preserves error details for transparency without crashing the entire app shell.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught rendering error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      return (
        <div className="page-content" style={{ padding: '32px 24px', maxWidth: 840, margin: '0 auto' }}>
          <div
            className="panel"
            style={{
              padding: 28,
              border: '1px solid #e8bcab',
              background: '#fffcfb',
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: '#fdeee8',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--terracotta-dark)',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 17, color: 'var(--ink)' }}>
                  {this.props.title || 'Workspace rendering error'}
                </h3>
                <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {this.props.description || 'An unexpected rendering error occurred in this view. Your session state and saved database records are preserved.'}
                </p>

                {this.state.error && (
                  <pre
                    style={{
                      padding: '10px 14px',
                      background: '#f8f4f2',
                      border: '1px solid #eed6cc',
                      borderRadius: 8,
                      fontSize: 12.5,
                      color: 'var(--terracotta-dark)',
                      overflowX: 'auto',
                      margin: '0 0 16px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'monospace',
                    }}
                  >
                    {this.state.error.toString()}
                  </pre>
                )}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" className="btn-primary small" onClick={this.handleReset}>
                    <RotateCcw size={14} /> Try again
                  </button>
                  {this.props.onNavigateHome && (
                    <button type="button" className="btn-secondary small" onClick={this.props.onNavigateHome}>
                      Return to workspace <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
