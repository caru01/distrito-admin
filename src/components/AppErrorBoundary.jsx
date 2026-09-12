import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Error no controlado en el panel administrativo', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="admin-fatal-error" role="alert">
        <div className="admin-fatal-error-card">
          <AlertTriangle size={40} aria-hidden="true" />
          <h1>No pudimos mostrar el panel</h1>
          <p>Tu sesión se conserva. Recarga la aplicación para continuar.</p>
          {this.state.error && (
            <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '12px', margin: '14px 0', maxWidth: '500px', wordBreak: 'break-word' }}>
              <strong>Error:</strong> {this.state.error.message || String(this.state.error)}
            </div>
          )}
          <button type="button" className="ds-btn ds-btn-primary" onClick={() => window.location.reload()}>
            <RefreshCw size={18} aria-hidden="true" /> Recargar panel
          </button>
        </div>
      </main>
    );
  }
}
