import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
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
          <button type="button" className="ds-btn ds-btn-primary" onClick={() => window.location.reload()}>
            <RefreshCw size={18} aria-hidden="true" /> Recargar panel
          </button>
        </div>
      </main>
    );
  }
}
