import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

/**
 * ErrorBoundary — catches React render errors and shows a dark-themed fallback UI.
 * 
 * Props:
 *   - children: React children to render
 *   - onReset: optional callback after "Tekrar Dene" button
 *   - showHome: optional boolean to show "Ana Sayfa" button (default false)
 *   - fallback: optional custom fallback render (overrides default)
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to error log system if available
    try {
      const { useStore } = require('../store');
      const store = useStore.getState?.();
      if (store?.addError) {
        store.addError(error?.message || 'Unknown error', {
          componentStack: errorInfo?.componentStack,
          name: error?.name,
        });
      }
    } catch {
      // Store not available — silent
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // Custom fallback override
    if (this.props.fallback) {
      return this.props.fallback({
        error: this.state.error,
        errorInfo: this.state.errorInfo,
        reset: this.handleReset,
      });
    }

    return (
      <div
        className="flex items-center justify-center h-full w-full"
        style={{
          backgroundColor: 'var(--color-bg-primary, #0f0f13)',
          color: 'var(--text-primary, #e8e8ed)',
        }}
      >
        <div className="text-center p-10 max-w-md">
          {/* Error icon */}
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
          >
            <AlertTriangle size={32} className="text-red-400" />
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold mb-2">Bir hata oluştu</h3>
          <p className="text-xs mb-2 opacity-50">An error occurred</p>

          {/* Error message */}
          <p
            className="text-sm mb-6 font-mono bg-black/20 rounded-xl p-3 text-left"
            style={{ color: 'var(--text-secondary, #999)', lineHeight: '1.6' }}
          >
            {this.state.error?.message || 'Bilinmeyen hata'}
          </p>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition hover:scale-105 active:scale-95"
              style={{ backgroundColor: 'var(--color-primary, #0f6cbd)' }}
            >
              <RotateCcw size={16} />
              Tekrar Dene
            </button>

            {this.props.showHome && (
              <button
                onClick={() => {
                  this.handleReset();
                  try {
                    const { useStore } = require('../store');
                    useStore.getState?.()?.setActiveTab?.('home');
                  } catch {}
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: 'var(--text-primary, #e8e8ed)',
                }}
              >
                <Home size={16} />
                Ana Sayfa
              </button>
            )}
          </div>

          {/* Dev info (collapsed) */}
          {this.state.errorInfo && (
            <details className="mt-6 text-left" style={{ color: 'var(--text-secondary, #666)' }}>
              <summary className="text-xs cursor-pointer hover:opacity-80">
                Teknik detay
              </summary>
              <pre className="text-[10px] mt-2 max-h-32 overflow-auto bg-black/20 rounded-lg p-2 leading-relaxed">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
