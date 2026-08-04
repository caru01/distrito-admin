import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit3, Lock as LockKeyhole, Plus, Search, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import { API_URL } from '../config/api';

export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [permissionsByRole, setPermissionsByRole] = useState({});
  const [editing, setEditing] = useState(undefined);
  const [form, setForm] = useState({ name: '', description: '', permissions: [] });
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const token = sessionStorage.getItem('distrito_admin_token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [rolesResponse, metaResponse] = await Promise.all([
        fetch(`${API_URL}/admin/roles`, { headers }), fetch(`${API_URL}/admin/roles-meta`, { headers }),
      ]);
      const rolesData = await rolesResponse.json(); const metaData = await metaResponse.json();
      if (!rolesResponse.ok) throw new Error(rolesData.error || 'No fue posible cargar los roles');
      setRoles(rolesData.data || []); if (metaResponse.ok) setCatalog(metaData.data || []);
      const pairs = await Promise.all((rolesData.data || []).map(async (role) => {
        const response = await fetch(`${API_URL}/admin/roles/${role.id}/permissions`, { headers });
        const data = await response.json(); return [role.id, response.ok ? data.data || [] : []];
      }));
      setPermissionsByRole(Object.fromEntries(pairs));
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  }, [headers]);
  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => catalog.reduce((result, permission) => {
    (result[permission.module] ||= []).push(permission); return result;
  }, {}), [catalog]);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', permissions: [] }); };
  const openEdit = (role) => { setEditing(role); setForm({ name: role.name, description: role.description || '', permissions: permissionsByRole[role.id] || [] }); };
  const close = () => setEditing(undefined);
  const toggle = (permission) => setForm((current) => ({ ...current, permissions: current.permissions.includes(permission) ? current.permissions.filter((item) => item !== permission) : [...current.permissions, permission] }));
  const toggleModule = (permissions) => {
    const names = permissions.map((permission) => `${permission.module}:${permission.action}`);
    const all = names.every((name) => form.permissions.includes(name));
    setForm((current) => ({ ...current, permissions: all ? current.permissions.filter((name) => !names.includes(name)) : [...new Set([...current.permissions, ...names])] }));
  };

  const save = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      const roleResponse = await fetch(editing ? `${API_URL}/admin/roles/${editing.id}` : `${API_URL}/admin/roles`, {
        method: editing ? 'PUT' : 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, description: form.description }),
      });
      const roleData = await roleResponse.json();
      if (!roleResponse.ok) throw new Error(roleData.error || 'No fue posible guardar el rol');
      const roleId = editing?.id || roleData.data.id;
      const permissionResponse = await fetch(`${API_URL}/admin/roles/${roleId}/permissions`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ permissions: form.permissions }),
      });
      const permissionData = await permissionResponse.json();
      if (!permissionResponse.ok) throw new Error(permissionData.error || 'El rol se guardó, pero no sus permisos');
      setMessage({ type: 'success', text: 'Rol y permisos actualizados.' }); close(); await load();
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };

  const remove = async (role) => {
    if (role.is_system_role || role.users_count > 0) return setMessage({ type: 'error', text: 'Los roles del sistema o con usuarios activos no se pueden eliminar.' });
    if (!confirm(`¿Eliminar el rol ${role.name}?`)) return;
    const response = await fetch(`${API_URL}/admin/roles/${role.id}`, { method: 'DELETE', headers });
    const data = await response.json();
    if (!response.ok) return setMessage({ type: 'error', text: data.error || 'No fue posible eliminar' });
    setMessage({ type: 'success', text: 'Rol eliminado.' }); load();
  };

  const filtered = roles.filter((role) => `${role.name} ${role.description || ''}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="ds-page roles-page">
    <header className="ds-page-header"><div><span className="ds-eyebrow">Control de acceso</span><h1 className="ds-page-title">Roles y permisos</h1><p className="ds-page-subtitle">Una matriz central define exactamente qué puede ver y modificar cada rol.</p></div><button className="ds-btn ds-btn-primary" onClick={openCreate}><Plus size={17} /> Nuevo rol</button></header>
    {message.text && <div className={`ds-alert ds-alert-${message.type === 'error' ? 'danger' : 'success'}`}>{message.text}</div>}
    <section className="ds-card"><div className="users-toolbar"><div className="ds-search"><Search size={17} /><input placeholder="Buscar rol" value={query} onChange={(e) => setQuery(e.target.value)} /></div><span className="ds-badge ds-badge-info">{filtered.length} roles</span></div>
      <div className="roles-grid">{filtered.map((role) => <article className="role-card" key={role.id}><div className="role-card-icon"><ShieldCheck size={24} /></div><div className="role-card-content"><div className="role-card-heading"><h2>{role.name}</h2>{role.is_system_role && <span className="ds-badge ds-badge-warning"><LockKeyhole size={12} /> Sistema</span>}</div><p>{role.description || 'Sin descripción'}</p><div className="role-card-meta"><span><Users size={15} /> {role.users_count || 0} usuarios</span><span>{(permissionsByRole[role.id] || []).length} permisos</span></div></div><div className="ds-actions"><button className="ds-icon-btn" onClick={() => openEdit(role)} title="Editar"><Edit3 size={16} /></button><button className="ds-icon-btn danger" onClick={() => remove(role)} title="Eliminar" disabled={role.is_system_role}><Trash2 size={16} /></button></div></article>)}</div>
    </section>
    {editing !== undefined && <div className="ds-modal-overlay role-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}><div className="ds-modal ds-modal-lg role-modal"><div className="ds-modal-header"><div><h2 className="ds-modal-title">{editing ? `Editar ${editing.name}` : 'Crear rol'}</h2><p className="ds-text-muted">Desplázate dentro de la matriz para revisar todos los módulos.</p></div><button className="ds-icon-btn" onClick={close}><X /></button></div><form onSubmit={save}><div className="ds-modal-body ds-form-stack role-modal-scroll">
      <div className="user-form-grid"><label className="ds-form-group"><span className="ds-form-label">Nombre *</span><input className="ds-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required disabled={editing?.is_system_role} /></label><label className="ds-form-group"><span className="ds-form-label">Descripción</span><input className="ds-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label></div>
      <div className="permission-matrix">{Object.entries(grouped).map(([module, permissions]) => { const names = permissions.map((permission) => `${permission.module}:${permission.action}`); const all = names.every((name) => form.permissions.includes(name)); return <section className="permission-module" key={module}><label className="permission-module-header"><input type="checkbox" checked={all} onChange={() => toggleModule(permissions)} /><strong>{module}</strong><span>{names.filter((name) => form.permissions.includes(name)).length}/{names.length}</span></label><div className="permission-actions">{permissions.map((permission) => { const name = `${permission.module}:${permission.action}`; return <label key={permission.id}><input type="checkbox" checked={form.permissions.includes(name)} onChange={() => toggle(name)} /><span>{permission.action}</span></label>; })}</div></section>; })}</div>
    </div><div className="ds-modal-footer"><button type="button" className="ds-btn ds-btn-secondary" onClick={close}>Cancelar</button><button className="ds-btn ds-btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar rol'}</button></div></form></div></div>}
  </div>;
}
