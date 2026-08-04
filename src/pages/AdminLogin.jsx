import { API_URL } from '../config/api';
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { AuthContext, getDeviceIdentity } from '../context/AuthContext';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(() => {
    const notice = sessionStorage.getItem('distrito_session_notice') || '';
    sessionStorage.removeItem('distrito_session_notice');
    return notice;
  });
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  
  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, ...getDeviceIdentity() })
      });
      const data = await res.json();

      if (res.ok && data.token) {
        if (data.must_change_password) {
           // We will handle this in Perfil or a dedicated modal, for now let's set a flag in storage
           sessionStorage.setItem('must_change_password', 'true');
        } else {
           sessionStorage.removeItem('must_change_password');
        }

        login(data.token, { ...data.user, permissions: data.permissions }, data.refreshToken, rememberMe);
        
        if (data.must_change_password) {
           navigate('/admin/perfil?force_password_change=true');
        } else {
           navigate('/admin');
        }
      } else {
        setError(data.error || 'Credenciales inválidas');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    setForgotLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/admin/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setForgotMessage(data.message || 'Si el correo existe, recibirás un enlace.');
        setForgotEmail('');
      } else {
        setForgotError(data.error || 'Error al solicitar recuperación');
      }
    } catch (err) {
      setForgotError('Error de conexión');
    }
    setForgotLoading(false);
  };

  return (
    <div className="login-layout">
      
      {/* Mitad Izquierda - Imagen (Split Screen) */}
      <div className="login-image">
        <div className="login-image-overlay"></div>
      </div>

      {/* Mitad Derecha - Formulario */}
      <div className="login-content">
        <div className="ds-card login-card">
          
          <div className="login-header">
            <p className="login-subtitle">Bienvenido de nuevo</p>
            <h2 className="login-title">Inicia sesión</h2>
            <p className="login-desc">para continuar con tu panel administrativo</p>
          </div>

          {error && (
            <div className="alert-message alert-danger">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="fade-in">
              <div className="ds-form-group">
                <label className="ds-form-label">
                  Usuario o Correo
                </label>
                <div className="ds-input-group">
                  <span className="ds-input-group-icon">
                    <User size={18} />
                  </span>
                  <input 
                    type="text" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="ds-input"
                    placeholder="ej. juan.perez"
                    required
                  />
                </div>
              </div>
              
              <div className="ds-form-group">
                <label className="ds-form-label">
                  Contraseña
                </label>
                <div className="ds-input-group">
                  <span className="ds-input-group-icon">
                    <Lock size={18} />
                  </span>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="ds-input"
                    placeholder="••••••••"
                    required
                  />
                  <div 
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </div>
                </div>
              </div>

              <div className="login-options">
                <label className="remember-me">
                  <input 
                    type="checkbox" 
                    checked={rememberMe} 
                    onChange={(e) => setRememberMe(e.target.checked)} 
                  />
                  Recordarme
                </label>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setShowForgotModal(true); }}
                  className="forgot-link"
                >
                  ¿Olvidaste la contraseña?
                </a>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="ds-btn ds-btn-primary ds-btn-full"
              >
                {loading ? 'Ingresando...' : 'Iniciar Sesión'}
              </button>

              <div className="login-footer">
                <p className="secure-badge">
                  <Lock size={12} /> Conexión segura y protegida
                </p>
                <p className="copyright">
                  © 2026 <span>Distrito BG.</span> Todos los derechos reservados
                </p>
              </div>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="ds-modal-overlay">
          <div className="ds-modal">
            <div className="ds-modal-header">
              <h3 className="ds-modal-title">Recuperar Contraseña</h3>
              <button 
                onClick={() => { setShowForgotModal(false); setForgotError(''); setForgotMessage(''); }}
                className="ds-modal-close"
              >
                ✕
              </button>
            </div>
            <div className="ds-modal-body">
              <p className="modal-text">
                Ingresa el correo electrónico asociado a tu cuenta. Te enviaremos un enlace para restablecer tu contraseña.
              </p>
              
              {forgotMessage && <div className="alert-message alert-success">{forgotMessage}</div>}
              {forgotError && <div className="alert-message alert-danger">{forgotError}</div>}
              
              <form onSubmit={handleForgotPassword}>
                <div className="ds-form-group">
                  <input 
                    type="email" 
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    required
                    className="ds-input"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={forgotLoading}
                  className="ds-btn ds-btn-primary ds-btn-full"
                >
                  {forgotLoading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .login-layout {
          display: flex;
          height: 100vh;
          background-color: var(--ds-bg-base, #0D0D0D);
        }
        .login-image {
          flex: 1;
          background-image: url("https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80");
          background-size: cover;
          background-position: center;
          position: relative;
        }
        .login-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, rgba(0,0,0,0.3) 0%, rgba(13,13,13,1) 100%);
        }
        @media (max-width: 767px) {
          .login-image {
            display: none;
          }
        }
        .login-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px;
          position: relative;
          z-index: 10;
          background-color: var(--ds-bg-base, #0D0D0D);
        }
        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }
        .login-subtitle {
          color: var(--ds-primary, #fbbf24);
          margin: 0 0 5px 0;
          font-size: 14px;
          font-weight: bold;
        }
        .login-title {
          color: #fff;
          margin: 0 0 8px 0;
          font-size: 26px;
          font-weight: 800;
        }
        .login-desc {
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
        .alert-warning {
          background-color: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.3);
          flex-direction: column;
          text-align: center;
        }
        .alert-warning h3 { margin: 0; font-size: 16px; color: #fff; }
        .alert-warning p { margin: 0; font-size: 14px; }
        .alert-success {
          background-color: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .conflict-container {
          text-align: center;
          animation: fadeIn 0.3s ease-in;
        }
        .conflict-actions {
          display: flex;
          gap: 10px;
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
        .login-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }
        .remember-me {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #aaa;
          font-size: 14px;
          cursor: pointer;
        }
        .remember-me input {
          accent-color: var(--ds-primary, #fbbf24);
          width: 16px;
          height: 16px;
        }
        .forgot-link {
          color: var(--ds-primary, #fbbf24);
          font-size: 13px;
          text-decoration: none;
        }
        .login-footer {
          text-align: center;
          margin-top: 30px;
        }
        .secure-badge {
          color: #10b981;
          margin: 0 0 5px 0;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }
        .copyright {
          color: #555;
          margin: 0;
          font-size: 11px;
        }
        .copyright span {
          color: var(--ds-primary, #fbbf24);
        }
        .modal-text {
          color: var(--ds-text-muted, #aaa);
          font-size: 14px;
          margin-bottom: 20px;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
