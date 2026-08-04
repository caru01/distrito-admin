import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Clock, KeyRound, Laptop, LogOut, Mail, MonitorSmartphone, Phone, RefreshCw, ShieldCheck, Smartphone, UserCircle as UserRound } from 'lucide-react';
import { API_URL } from '../config/api';
import { AuthContext } from '../context/AuthContext';

const formatDate = (value) => value ? new Date(value).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin registro';

export default function Perfil() {
  const { logout, user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [info, setInfo] = useState({ email: '', phone: '', photo_url: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const mustChange = new URLSearchParams(location.search).get('force_password_change') === 'true' || sessionStorage.getItem('must_change_password') === 'true';

  const headers = useMemo(() => ({ Authorization: `Bearer ${sessionStorage.getItem('distrito_admin_token')}` }), []);
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [profileResponse, sessionsResponse] = await Promise.all([
        fetch(`${API_URL}/admin/profile`, { headers }),
        fetch(`${API_URL}/admin/profile/sessions`, { headers }),
      ]);
      const profileData = await profileResponse.json();
      const sessionData = await sessionsResponse.json();
      if (!profileResponse.ok) throw new Error(profileData.error || 'No fue posible cargar el perfil');
      setProfile(profileData.data);
      setInfo({ email: profileData.data.email || '', phone: profileData.data.phone || '', photo_url: profileData.data.photo_url || '' });
      if (sessionsResponse.ok) setSessions(sessionData.data || []);
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  }, [headers]);

  useEffect(() => { load(); }, [load]);

  const saveInfo = async (event) => {
    event.preventDefault(); setBusy(true); setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${API_URL}/admin/profile/info`, {
        method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(info),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible guardar');
      setMessage({ type: 'success', text: 'Información de perfil actualizada.' });
      await load();
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwords.newPassword.length < 10) return setMessage({ type: 'error', text: 'La nueva contraseña debe tener mínimo 10 caracteres.' });
    if (passwords.newPassword !== passwords.confirmPassword) return setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden.' });
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/admin/profile/password`, {
        method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible cambiar la contraseña');
      sessionStorage.removeItem('must_change_password');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' });
      history.replaceState({}, '', '/admin/perfil');
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };

  const closeSession = async (session) => {
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/admin/profile/sessions/${session.id}`, { method: 'DELETE', headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible cerrar la sesión');
      if (data.was_current) { logout(); location.assign('/admin/login'); return; }
      setMessage({ type: 'success', text: 'La sesión seleccionada fue cerrada.' });
      await load();
    } catch (error) { setMessage({ type: 'error', text: error.message }); setBusy(false); }
  };

  if (!profile) return <div className="ds-page"><div className="ds-loader-container"><div className="ds-loader" /><p>Cargando perfil…</p></div></div>;
  const activeCount = sessions.filter((session) => session.status === 'Activa').length;

  return (
    <div className="ds-page profile-page">
      <header className="ds-page-header">
        <div><span className="ds-eyebrow">Cuenta y seguridad</span><h1 className="ds-page-title">Mi perfil</h1><p className="ds-page-subtitle">Administra tus datos y hasta tres dispositivos simultáneos.</p></div>
        <button className="ds-btn ds-btn-secondary" onClick={load} disabled={busy}><RefreshCw size={17} /> Actualizar</button>
      </header>
      {mustChange && <div className="ds-alert ds-alert-warning"><KeyRound size={18} /><span>Debes cambiar la contraseña temporal antes de continuar.</span></div>}
      {message.text && <div className={`ds-alert ds-alert-${message.type === 'error' ? 'danger' : 'success'}`}>{message.text}</div>}

      <section className="profile-summary-grid">
        <article className="ds-card profile-identity-card"><div className="profile-avatar"><UserRound size={34} /></div><div><h2>{profile.name || user?.name || profile.username}</h2><p>@{profile.username}</p><span className="ds-badge ds-badge-warning">{profile.role_name || 'Sin rol'}</span></div></article>
        <article className="ds-card profile-security-card"><ShieldCheck size={26} /><div><strong>{activeCount} de 3 dispositivos activos</strong><p>Caducidad tras {user?.session_idle_minutes || 60} minutos sin actividad.</p></div></article>
      </section>

      <div className="profile-content-grid">
        <section className="ds-card"><div className="ds-card-header"><h2>Información de contacto</h2></div><form className="ds-card-body ds-form-stack" onSubmit={saveInfo}>
          <label className="ds-form-group"><span className="ds-form-label"><Mail size={15} /> Correo</span><input className="ds-input" type="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} /></label>
          <label className="ds-form-group"><span className="ds-form-label"><Phone size={15} /> Teléfono</span><input className="ds-input" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} /></label>
          <button className="ds-btn ds-btn-primary" disabled={busy}>Guardar información</button>
        </form></section>
        <section className="ds-card"><div className="ds-card-header"><h2>Cambiar contraseña</h2></div><form className="ds-card-body ds-form-stack" onSubmit={changePassword}>
          <input className="ds-input" type="password" placeholder="Contraseña actual" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
          <input className="ds-input" type="password" placeholder="Nueva contraseña (mínimo 10 caracteres)" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required />
          <input className="ds-input" type="password" placeholder="Confirmar nueva contraseña" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} required />
          <button className="ds-btn ds-btn-primary" disabled={busy}>Actualizar contraseña</button>
        </form></section>
      </div>

      <section className="ds-card profile-sessions"><div className="ds-card-header profile-sessions-header"><div><h2><MonitorSmartphone size={20} /> Dispositivos y sesiones</h2><p>Un dispositivo reemplaza su propia sesión al volver a ingresar.</p></div><span className="ds-badge ds-badge-info">Máximo 3</span></div>
        <div className="profile-session-list">{sessions.map((session) => <article className={`profile-session ${session.status === 'Activa' ? 'active' : ''}`} key={session.id}>
          <div className="profile-session-icon">{/Android|iPhone/i.test(session.os || '') ? <Smartphone size={21} /> : <Laptop size={21} />}</div>
          <div className="profile-session-main"><div><strong>{session.device_name || `${session.browser || 'Navegador'} · ${session.os || 'Dispositivo'}`}</strong>{session.is_current && <span className="ds-badge ds-badge-success">Este dispositivo</span>}</div><p><Clock size={14} /> Última actividad: {formatDate(session.last_active)} · {session.status}</p></div>
          {session.status === 'Activa' && <button className="ds-btn ds-btn-danger ds-btn-sm" onClick={() => closeSession(session)} disabled={busy}><LogOut size={15} /> Cerrar</button>}
        </article>)}</div>
      </section>
    </div>
  );
}
