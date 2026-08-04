import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { API_URL } from '../config/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Enlace inválido o sin token de seguridad.');
    }
  }, [token]);

  const handleReset = async (e) => {
    e.preventDefault();
    if (!token) return;
    setError('');

    if (password !== confirmPassword) {
      return setError('Las contraseñas no coinciden');
    }
    if (password.length < 10) {
      return setError('La contraseña debe tener al menos 10 caracteres');
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/admin/login');
        }, 5000);
      } else {
        setError(data.error || 'Error al restablecer la contraseña');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    }
    setLoading(false);
  };

  return (
    <div className="reset-layout">
      <div className="ds-card reset-card">
        <div className="reset-header">
          <h2 className="reset-title">Restablecer Contraseña</h2>
          <p className="reset-desc">Ingresa tu nueva contraseña para acceder.</p>
        </div>

        {error && (
          <div className="alert-message alert-danger">
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        {success ? (
          <div className="fade-in success-container">
            <div className="alert-message alert-success-box">
              <CheckCircle size={40} />
              <h3>¡Contraseña Actualizada!</h3>
              <p>Serás redirigido al inicio de sesión...</p>
            </div>
            <button 
              onClick={() => navigate('/admin/login')}
              className="ds-btn ds-btn-secondary ds-btn-full"
            >
              Ir a Iniciar Sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="fade-in">
            <div className="ds-form-group">
              <label className="ds-form-label">Nueva Contraseña</label>
              <div className="ds-input-group">
                <span className="ds-input-group-icon">
                  <Lock size={18} />
                </span>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="ds-input"
                  required
                  disabled={!token}
                />
                <div 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
              </div>
            </div>

            <div className="ds-form-group">
              <label className="ds-form-label">Confirmar Contraseña</label>
              <div className="ds-input-group">
                <span className="ds-input-group-icon">
                  <Lock size={18} />
                </span>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="ds-input"
                  required
                  disabled={!token}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || !token}
              className="ds-btn ds-btn-primary ds-btn-full"
            >
              {loading ? 'Guardando...' : 'Cambiar Contraseña'}
            </button>
          </form>
        )}
      </div>
      <style>{`
        .reset-layout {
          display: flex;
          height: 100vh;
          background-color: var(--ds-bg-base, #0D0D0D);
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .reset-card {
          width: 100%;
          max-width: 420px;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          z-index: 10;
        }
        .reset-header {
          text-align: center;
          margin-bottom: 30px;
        }
        .reset-title {
          color: #fff;
          margin: 0 0 5px 0;
          font-size: 20px;
        }
        .reset-desc {
          color: var(--ds-text-muted, #888);
          margin: 0;
          font-size: 13px;
        }
        .alert-message {
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .alert-danger {
          background-color: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .alert-success-box {
          background-color: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
          flex-direction: column;
          text-align: center;
          padding: 20px;
        }
        .alert-success-box h3 { margin: 0; font-size: 18px; }
        .alert-success-box p { margin: 0; font-size: 14px; }
        .success-container {
          text-align: center;
        }
        .fade-in {
          animation: fadeIn 0.5s ease-in;
        }
        .password-toggle {
          position: absolute;
          right: 14px;
          top: 14px;
          color: #666;
          cursor: pointer;
        }
        @keyframes fadeIn { 
          from { opacity: 0; transform: translateY(10px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
      `}</style>
    </div>
  );
}
