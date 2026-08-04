import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit3, KeyRound, Plus, Search, Shield, Smartphone, UserCircle as UserRound, UserX, X } from 'lucide-react';
import { API_URL } from '../config/api';

const EMPTY = { username: '', password: '', name: '', last_name: '', document: '', email: '', phone: '', role_id: '', status: 'Activo', max_active_orders: 5 };
const DELIVERY_ROLES = new Set(['Domiciliario', 'Repartidor']);

export default function AdminUsuarios() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(undefined);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const token = sessionStorage.getItem('distrito_admin_token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        fetch(`${API_URL}/admin/users`, { headers }), fetch(`${API_URL}/admin/roles`, { headers }),
      ]);
      const usersData = await usersResponse.json(); const rolesData = await rolesResponse.json();
      if (!usersResponse.ok) throw new Error(usersData.error || 'No fue posible cargar los usuarios');
      setUsers(usersData.data || []); if (rolesResponse.ok) setRoles(rolesData.data || []);
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setLoading(false); }
  }, [headers]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); };
  const openEdit = (user) => { setEditing(user); setForm({ ...EMPTY, ...user, password: '', role_id: user.role_id || '' }); };
  const close = () => { setEditing(undefined); setForm(EMPTY); };

  const save = async (event) => {
    event.preventDefault(); setSaving(true); setMessage({ type: '', text: '' });
    try {
      const response = await fetch(editing ? `${API_URL}/admin/users/${editing.id}` : `${API_URL}/admin/users`, {
        method: editing ? 'PUT' : 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible guardar el usuario');
      setMessage({ type: 'success', text: editing ? 'Usuario actualizado.' : 'Usuario creado con cambio obligatorio de contraseña.' });
      close(); await load();
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setSaving(false); }
  };

  const deactivate = async (user) => {
    if (!confirm(`¿Desactivar a ${user.username} y cerrar sus sesiones?`)) return;
    const response = await fetch(`${API_URL}/admin/users/${user.id}`, { method: 'DELETE', headers });
    const data = await response.json();
    if (!response.ok) return setMessage({ type: 'error', text: data.error || 'No fue posible desactivar' });
    setMessage({ type: 'success', text: 'Usuario desactivado y sesiones cerradas.' }); load();
  };

  const filtered = users.filter((user) => `${user.name || ''} ${user.last_name || ''} ${user.username} ${user.email || ''} ${user.role_name || ''}`.toLowerCase().includes(query.toLowerCase()));
  const showModal = editing !== undefined;
  const selectedRole = roles.find((role) => Number(role.id) === Number(form.role_id));
  const isDeliveryUser = DELIVERY_ROLES.has(selectedRole?.name);

  return <div className="ds-page users-page">
    <header className="ds-page-header"><div><span className="ds-eyebrow">Seguridad</span><h1 className="ds-page-title">Usuarios</h1><p className="ds-page-subtitle">Cuentas reales, roles, estado y sesiones activas.</p></div><button className="ds-btn ds-btn-primary" onClick={openCreate}><Plus size={17} /> Nuevo usuario</button></header>
    {message.text && <div className={`ds-alert ds-alert-${message.type === 'error' ? 'danger' : 'success'}`}>{message.text}</div>}
    <section className="ds-card"><div className="users-toolbar"><div className="ds-search"><Search size={17} /><input placeholder="Buscar por nombre, usuario, rol o correo" value={query} onChange={(e) => setQuery(e.target.value)} /></div><span className="ds-badge ds-badge-info">{filtered.length} usuarios</span></div>
      <div className="ds-table-container"><table className="ds-table"><thead><tr><th>Usuario</th><th>Rol</th><th>Contacto</th><th>Sesiones</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        {filtered.map((user) => <tr key={user.id}><td><div className="user-cell"><span className="user-avatar"><UserRound size={18} /></span><div><strong>{[user.name, user.last_name].filter(Boolean).join(' ') || user.username}</strong><small>@{user.username}{user.document ? ` · ${user.document}` : ''}</small></div></div></td><td><span className="ds-badge ds-badge-warning"><Shield size={13} /> {user.role_name || 'Sin rol'}</span>{DELIVERY_ROLES.has(user.role_name) && <small className="delivery-capacity-copy">{user.active_delivery_orders || 0}/{user.max_active_orders || 5} pedidos activos</small>}</td><td><div>{user.email || 'Sin correo'}</div><small>{user.phone || 'Sin teléfono'}</small></td><td><span className="user-sessions"><Smartphone size={15} /> {user.active_sessions || 0}/3</span></td><td><span className={`ds-badge ${user.status === 'Activo' ? 'ds-badge-success' : 'ds-badge-neutral'}`}>{user.status}</span></td><td><div className="ds-actions"><button className="ds-icon-btn" onClick={() => openEdit(user)} title="Editar"><Edit3 size={16} /></button><button className="ds-icon-btn danger" onClick={() => deactivate(user)} title="Desactivar"><UserX size={16} /></button></div></td></tr>)}
        {!loading && !filtered.length && <tr><td colSpan="6"><div className="ds-empty-state">No hay usuarios que coincidan.</div></td></tr>}
      </tbody></table></div>
    </section>

    {showModal && <div className="ds-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}><div className="ds-modal ds-modal-lg"><div className="ds-modal-header"><div><h2 className="ds-modal-title">{editing ? 'Editar usuario' : 'Crear usuario'}</h2><p className="ds-text-muted">{editing ? 'Deja la contraseña vacía para conservarla.' : 'La contraseña será temporal y deberá cambiarse.'}</p></div><button className="ds-icon-btn" onClick={close}><X /></button></div><form onSubmit={save}><div className="ds-modal-body user-form-grid">
      <label className="ds-form-group"><span className="ds-form-label">Nombres</span><input className="ds-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <label className="ds-form-group"><span className="ds-form-label">Apellidos</span><input className="ds-input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></label>
      <label className="ds-form-group"><span className="ds-form-label">Usuario *</span><input className="ds-input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></label>
      <label className="ds-form-group"><span className="ds-form-label">Documento</span><input className="ds-input" value={form.document || ''} onChange={(e) => setForm({ ...form, document: e.target.value })} /></label>
      <label className="ds-form-group"><span className="ds-form-label">Correo</span><input className="ds-input" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label className="ds-form-group"><span className="ds-form-label">Teléfono</span><input className="ds-input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
      <label className="ds-form-group"><span className="ds-form-label"><KeyRound size={14} /> {editing ? 'Nueva contraseña' : 'Contraseña temporal *'}</span><input className="ds-input" type="password" minLength={10} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} /></label>
      <label className="ds-form-group"><span className="ds-form-label">Rol *</span><select className="ds-select" value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} required><option value="">Seleccionar</option>{roles.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select></label>
      {isDeliveryUser && <label className="ds-form-group delivery-capacity-field"><span className="ds-form-label">Pedidos simultáneos</span><select className="ds-select" value={form.max_active_orders} onChange={(e) => setForm({ ...form, max_active_orders: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map((capacity) => <option value={capacity} key={capacity}>{capacity} pedido{capacity === 1 ? '' : 's'}</option>)}</select><small>Máximo que puede aceptar y llevar al mismo tiempo.</small></label>}
      <label className="ds-form-group"><span className="ds-form-label">Estado</span><select className="ds-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Activo</option><option>Inactivo</option></select></label>
    </div><div className="ds-modal-footer"><button type="button" className="ds-btn ds-btn-secondary" onClick={close}>Cancelar</button><button className="ds-btn ds-btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar usuario'}</button></div></form></div></div>}
  </div>;
}
