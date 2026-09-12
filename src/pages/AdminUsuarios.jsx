import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bike, Building2, CheckCircle, Edit3, KeyRound, Mail, Phone, Plus, RefreshCw,
  Search, Shield, Smartphone, UserCheck, Users, UserX, X
} from 'lucide-react';
import { API_URL } from '../config/api';

const EMPTY = {
  username: '',
  password: '',
  name: '',
  last_name: '',
  document: '',
  email: '',
  phone: '',
  role_id: '',
  status: 'Activo',
  max_active_orders: 5,
};

const DELIVERY_ROLES = new Set(['Domiciliario', 'Repartidor']);

export default function AdminUsuarios() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [query, setQuery] = useState('');
  const [filterTab, setFilterTab] = useState('todos'); // 'todos' | 'activos' | 'inactivos' | 'domiciliarios' | 'externos'
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
        fetch(`${API_URL}/admin/users`, { headers }),
        fetch(`${API_URL}/admin/roles`, { headers }),
      ]);
      const usersData = await usersResponse.json();
      const rolesData = await rolesResponse.json();
      if (!usersResponse.ok) throw new Error(usersData.error || 'No fue posible cargar los usuarios');
      setUsers(usersData.data || []);
      if (rolesResponse.ok) setRoles(rolesData.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({ ...EMPTY, ...user, password: '', role_id: user.role_id || '' });
  };

  const close = () => {
    setEditing(undefined);
    setForm(EMPTY);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(editing ? `${API_URL}/admin/users/${editing.id}` : `${API_URL}/admin/users`, {
        method: editing ? 'PUT' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible guardar el usuario');
      setMessage({
        type: 'success',
        text: editing ? 'Usuario actualizado correctamente.' : 'Usuario creado con éxito (se requerirá cambio de contraseña en su primer inicio).',
      });
      close();
      await load();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (user) => {
    if (!confirm(`¿Desactivar a ${user.username} y cerrar sus sesiones activas?`)) return;
    try {
      const response = await fetch(`${API_URL}/admin/users/${user.id}`, { method: 'DELETE', headers });
      const data = await response.json();
      if (!response.ok) return setMessage({ type: 'error', text: data.error || 'No fue posible desactivar el usuario' });
      setMessage({ type: 'success', text: `Usuario @${user.username} desactivado y sesiones cerradas.` });
      load();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // Métricas para tarjetas KPI
  const stats = useMemo(() => {
    const total = users.length;
    const activos = users.filter((u) => u.status === 'Activo').length;
    const inactivos = total - activos;
    const domiciliarios = users.filter((u) => DELIVERY_ROLES.has(u.role_name)).length;
    const externos = users.filter((u) => Boolean(u.external_company_name)).length;
    return { total, activos, inactivos, domiciliarios, externos };
  }, [users]);

  // Filtrado combinado: Pills + Barra de búsqueda
  const filtered = useMemo(() => {
    return users.filter((user) => {
      if (filterTab === 'activos' && user.status !== 'Activo') return false;
      if (filterTab === 'inactivos' && user.status === 'Activo') return false;
      if (filterTab === 'domiciliarios' && !DELIVERY_ROLES.has(user.role_name)) return false;
      if (filterTab === 'externos' && !user.external_company_name) return false;

      if (!query.trim()) return true;
      const q = query.toLowerCase();
      const searchable = `${user.name || ''} ${user.last_name || ''} ${user.username} ${user.email || ''} ${user.phone || ''} ${user.role_name || ''} ${user.external_company_name || ''}`.toLowerCase();
      return searchable.includes(q);
    });
  }, [users, filterTab, query]);

  const showModal = editing !== undefined;
  const selectedRole = roles.find((role) => Number(role.id) === Number(form.role_id));
  const isDeliveryUser = DELIVERY_ROLES.has(selectedRole?.name);

  return (
    <div className="ds-page users-page">
      {/* ENCABEZADO MODERNO */}
      <header className="ds-page-header">
        <div>
          <span className="ds-page-kicker">Seguridad & Accesos</span>
          <h1 className="ds-page-title">Control de Usuarios</h1>
          <p className="ds-page-subtitle">
            Cuentas del personal, roles de acceso, estado y control de sesiones activas en tiempo real.
          </p>
        </div>
        <div className="ds-page-actions" style={{ display: 'flex', gap: '10px' }}>
          <button className="ds-btn ds-btn-secondary" onClick={load} title="Recargar usuarios">
            <RefreshCw size={17} className={loading ? 'spin' : ''} /> Actualizar
          </button>
          <button className="ds-btn ds-btn-primary" onClick={openCreate}>
            <Plus size={18} /> Nuevo usuario
          </button>
        </div>
      </header>

      {/* MENSAJES DE ALERTA */}
      {message.text && (
        <div className={`ds-inline-alert ds-inline-alert-${message.type === 'error' ? 'danger' : 'success'}`} style={{ marginBottom: '18px' }}>
          <span>{message.text}</span>
          <button
            onClick={() => setMessage({ type: '', text: '' })}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* TARJETAS KPI MODERNAS CON GLOW */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <article
          className="report-modern-card"
          style={{ '--card-glow': 'rgba(212, 160, 23, 0.25)', cursor: 'pointer' }}
          onClick={() => setFilterTab('todos')}
          title="Ver todos los usuarios"
        >
          <div className="report-card-top">
            <div
              className="report-card-icon-wrap"
              style={{
                '--icon-bg': 'rgba(212, 160, 23, 0.12)',
                '--icon-color': 'var(--ds-primary)',
              }}
            >
              <Users size={20} />
            </div>
            <span className="report-card-badge ds-badge-primary">Sistema</span>
          </div>
          <div className="report-card-body">
            <span className="report-card-label">Total Usuarios</span>
            <span className="report-card-value">{stats.total}</span>
          </div>
          <div className="report-card-footer">
            <span>Cuentas registradas en la plataforma</span>
          </div>
        </article>

        <article
          className="report-modern-card"
          style={{ '--card-glow': 'rgba(16, 185, 129, 0.25)', cursor: 'pointer' }}
          onClick={() => setFilterTab('activos')}
          title="Ver usuarios activos"
        >
          <div className="report-card-top">
            <div
              className="report-card-icon-wrap"
              style={{
                '--icon-bg': 'rgba(16, 185, 129, 0.12)',
                '--icon-color': '#10b981',
              }}
            >
              <CheckCircle size={20} />
            </div>
            <span className="report-card-badge ds-badge-success">Activos</span>
          </div>
          <div className="report-card-body">
            <span className="report-card-label">Cuentas Habilitadas</span>
            <span className="report-card-value" style={{ color: '#10b981' }}>
              {stats.activos}
            </span>
          </div>
          <div className="report-card-footer">
            <span>{stats.inactivos} cuenta(s) en pausa o desactivada(s)</span>
          </div>
        </article>

        <article
          className="report-modern-card"
          style={{ '--card-glow': 'rgba(59, 130, 246, 0.25)', cursor: 'pointer' }}
          onClick={() => setFilterTab('domiciliarios')}
          title="Ver domiciliarios"
        >
          <div className="report-card-top">
            <div
              className="report-card-icon-wrap"
              style={{
                '--icon-bg': 'rgba(59, 130, 246, 0.12)',
                '--icon-color': '#3b82f6',
              }}
            >
              <Bike size={20} />
            </div>
            <span className="report-card-badge ds-badge-info">Logística</span>
          </div>
          <div className="report-card-body">
            <span className="report-card-label">Domiciliarios</span>
            <span className="report-card-value" style={{ color: '#3b82f6' }}>
              {stats.domiciliarios}
            </span>
          </div>
          <div className="report-card-footer">
            <span>Repartidores propios y de empresas</span>
          </div>
        </article>

        <article
          className="report-modern-card"
          style={{ '--card-glow': 'rgba(168, 85, 247, 0.25)', cursor: 'pointer' }}
          onClick={() => setFilterTab('externos')}
          title="Ver mensajeros de empresas aliadas"
        >
          <div className="report-card-top">
            <div
              className="report-card-icon-wrap"
              style={{
                '--icon-bg': 'rgba(168, 85, 247, 0.12)',
                '--icon-color': '#a855f7',
              }}
            >
              <Building2 size={20} />
            </div>
            <span className="report-card-badge ds-badge-warning" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>Aliados</span>
          </div>
          <div className="report-card-body">
            <span className="report-card-label">Empresas de Envíos</span>
            <span className="report-card-value" style={{ color: '#c084fc' }}>
              {stats.externos}
            </span>
          </div>
          <div className="report-card-footer">
            <span>Mensajeros con empresa asignada</span>
          </div>
        </article>
      </div>

      {/* BARRA DE BOTONES PILLS INTERACTIVOS Y BÚSQUEDA */}
      <div className="report-pills-bar">
        <div className="report-pills-group">
          <button
            type="button"
            className={`report-pill-btn ${filterTab === 'todos' ? 'active' : ''}`}
            onClick={() => setFilterTab('todos')}
          >
            <Users size={14} /> Todos
            <span className="report-pill-badge">{stats.total}</span>
          </button>
          <button
            type="button"
            className={`report-pill-btn ${filterTab === 'activos' ? 'active' : ''}`}
            onClick={() => setFilterTab('activos')}
          >
            <UserCheck size={14} /> Activos
            <span className="report-pill-badge">{stats.activos}</span>
          </button>
          <button
            type="button"
            className={`report-pill-btn ${filterTab === 'inactivos' ? 'active' : ''}`}
            onClick={() => setFilterTab('inactivos')}
          >
            <UserX size={14} /> Inactivos
            <span className="report-pill-badge">{stats.inactivos}</span>
          </button>
          <button
            type="button"
            className={`report-pill-btn ${filterTab === 'domiciliarios' ? 'active' : ''}`}
            onClick={() => setFilterTab('domiciliarios')}
          >
            <Bike size={14} /> Domiciliarios
            <span className="report-pill-badge">{stats.domiciliarios}</span>
          </button>
          <button
            type="button"
            className={`report-pill-btn ${filterTab === 'externos' ? 'active' : ''}`}
            onClick={() => setFilterTab('externos')}
          >
            <Building2 size={14} /> Aliados Externos
            <span className="report-pill-badge">{stats.externos}</span>
          </button>
        </div>

        <div className="ds-search" style={{ minWidth: '260px', flex: '1 1 300px', maxWidth: '460px', position: 'relative' }}>
          <Search size={16} className="ds-search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, @usuario, rol o empresa..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ds-search-input ds-input"
            style={{ height: '36px', fontSize: '12.5px', paddingRight: query ? '32px' : '12px' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--ds-text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'grid',
                placeItems: 'center',
              }}
              title="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* TABLA PRINCIPAL DE USUARIOS */}
      <section className="ds-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--ds-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ds-text-secondary)' }}>
            Listado de Cuentas
          </span>
          <span className="ds-badge ds-badge-info" style={{ fontWeight: 'bold' }}>
            {filtered.length} {filtered.length === 1 ? 'usuario' : 'usuarios'}
          </span>
        </div>

        <div className="ds-table-container">
          <table className="ds-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol de Acceso</th>
                <th>Contacto</th>
                <th>Sesiones</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const fullName = [user.name, user.last_name].filter(Boolean).join(' ') || user.username;
                const initial = (user.name?.[0] || user.username?.[0] || 'U').toUpperCase();
                const isActive = user.status === 'Activo';

                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          className="user-avatar"
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(212, 160, 23, 0.2) 0%, rgba(26, 26, 26, 0.9) 100%)',
                            border: '1px solid rgba(212, 160, 23, 0.35)',
                            display: 'grid',
                            placeItems: 'center',
                            color: 'var(--ds-primary)',
                            fontWeight: '700',
                            fontSize: '14px',
                            flexShrink: 0,
                          }}
                        >
                          {initial}
                        </span>
                        <div>
                          <strong style={{ fontSize: '13.5px', color: 'var(--ds-text-primary)', display: 'block' }}>
                            {fullName}
                          </strong>
                          <small style={{ color: 'var(--ds-text-muted)', fontSize: '12px' }}>
                            @{user.username}
                            {user.document ? ` · Doc: ${user.document}` : ''}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
                        <span className="ds-badge ds-badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', padding: '2px 8px' }}>
                          <Shield size={12} /> {user.role_name || 'Sin rol'}
                        </span>
                        {user.external_company_name && (
                          <span
                            className="ds-badge"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: 'rgba(212, 160, 23, 0.15)',
                              color: 'var(--ds-primary)',
                              border: '1px solid rgba(212, 160, 23, 0.3)',
                              fontSize: '11px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                            title={`Empresa de domicilios: ${user.external_company_name}`}
                          >
                            <Building2 size={11} /> {user.external_company_name}
                          </span>
                        )}
                        {DELIVERY_ROLES.has(user.role_name) && (
                          <small className="delivery-capacity-copy" style={{ fontSize: '11px', color: 'var(--ds-text-muted)' }}>
                            {user.active_delivery_orders || 0}/{user.max_active_orders || 5} pedidos simultáneos
                          </small>
                        )}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12.5px' }}>
                        {user.email ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--ds-text-secondary)' }}>
                            <Mail size={12} style={{ color: 'var(--ds-text-muted)' }} /> {user.email}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ds-text-muted)', fontSize: '11.5px' }}>Sin correo</span>
                        )}
                        {user.phone ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--ds-text-secondary)' }}>
                            <Phone size={12} style={{ color: 'var(--ds-text-muted)' }} /> {user.phone}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ds-text-muted)', fontSize: '11.5px' }}>Sin teléfono</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span
                        className="user-sessions"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: (user.active_sessions || 0) > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                          color: (user.active_sessions || 0) > 0 ? '#10b981' : 'var(--ds-text-muted)',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        <Smartphone size={14} /> {user.active_sessions || 0}/3
                      </span>
                    </td>

                    <td>
                      <span
                        className={`ds-badge ${isActive ? 'ds-badge-success' : 'ds-badge-neutral'}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontWeight: '600',
                          padding: '3px 9px',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: isActive ? '#10b981' : '#888',
                            boxShadow: isActive ? '0 0 6px #10b981' : 'none',
                          }}
                        />
                        {user.status}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div className="ds-actions" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          className="ds-btn ds-btn-secondary ds-btn-sm"
                          onClick={() => openEdit(user)}
                          title="Editar cuenta"
                          style={{ padding: '5px 9px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <Edit3 size={14} />
                          <span style={{ fontSize: '12px' }}>Editar</span>
                        </button>
                        <button
                          className="ds-btn ds-btn-sm"
                          onClick={() => deactivate(user)}
                          title={isActive ? 'Desactivar usuario' : 'Gestionar usuario'}
                          style={{
                            padding: '5px 9px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                          }}
                        >
                          <UserX size={14} />
                          <span style={{ fontSize: '12px' }}>Desactivar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && !filtered.length && (
                <tr>
                  <td colSpan="6">
                    <div className="ds-empty-state" style={{ padding: '36px 20px', textAlign: 'center' }}>
                      <Users size={32} style={{ color: 'var(--ds-text-muted)', marginBottom: '8px' }} />
                      <p style={{ margin: 0, color: 'var(--ds-text-secondary)' }}>
                        No se encontraron usuarios con el filtro o búsqueda seleccionada.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL CREAR / EDITAR USUARIO */}
      {showModal && (
        <div className="ds-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div className="ds-modal ds-modal-lg" style={{ maxWidth: '640px' }}>
            <div className="ds-modal-header" style={{ borderBottom: '1px solid var(--ds-border)' }}>
              <div>
                <h2 className="ds-modal-title">{editing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h2>
                <p className="ds-text-muted" style={{ fontSize: '12px', margin: 0 }}>
                  {editing
                    ? 'Actualiza los datos del usuario. Deja la contraseña vacía si deseas conservarla.'
                    : 'Configura las credenciales y el rol. Se solicitará cambio obligatorio de contraseña en el primer acceso.'}
                </p>
              </div>
              <button className="ds-icon-btn" onClick={close} title="Cerrar modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={save}>
              <div className="ds-modal-body user-form-grid" style={{ padding: '20px' }}>
                <label className="ds-form-group">
                  <span className="ds-form-label">Nombres</span>
                  <input
                    className="ds-input"
                    placeholder="Ej. Juan Carlos"
                    value={form.name || ''}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>

                <label className="ds-form-group">
                  <span className="ds-form-label">Apellidos</span>
                  <input
                    className="ds-input"
                    placeholder="Ej. Gómez"
                    value={form.last_name || ''}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  />
                </label>

                <label className="ds-form-group">
                  <span className="ds-form-label">Usuario *</span>
                  <input
                    className="ds-input"
                    placeholder="Ej. jgomez"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    required
                  />
                </label>

                <label className="ds-form-group">
                  <span className="ds-form-label">Documento / Cédula</span>
                  <input
                    className="ds-input"
                    placeholder="Ej. 1098765432"
                    value={form.document || ''}
                    onChange={(e) => setForm({ ...form, document: e.target.value })}
                  />
                </label>

                <label className="ds-form-group">
                  <span className="ds-form-label">Correo Electrónico</span>
                  <input
                    className="ds-input"
                    type="email"
                    placeholder="ejemplo@distritobg.com"
                    value={form.email || ''}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </label>

                <label className="ds-form-group">
                  <span className="ds-form-label">Teléfono Móvil</span>
                  <input
                    className="ds-input"
                    placeholder="Ej. 3001234567"
                    value={form.phone || ''}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </label>

                <label className="ds-form-group">
                  <span className="ds-form-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <KeyRound size={14} style={{ color: 'var(--ds-primary)' }} />{' '}
                    {editing ? 'Nueva contraseña (opcional)' : 'Contraseña temporal *'}
                  </span>
                  <input
                    className="ds-input"
                    type="password"
                    minLength={10}
                    placeholder={editing ? 'Dejar en blanco para mantener la actual' : 'Mínimo 10 caracteres'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required={!editing}
                  />
                </label>

                <label className="ds-form-group">
                  <span className="ds-form-label">Rol del Sistema *</span>
                  <select
                    className="ds-select"
                    value={form.role_id}
                    onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar rol...</option>
                    {roles.map((role) => (
                      <option value={role.id} key={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>

                {isDeliveryUser && (
                  <label className="ds-form-group delivery-capacity-field">
                    <span className="ds-form-label">Pedidos Simultáneos (Cupo)</span>
                    <select
                      className="ds-select"
                      value={form.max_active_orders}
                      onChange={(e) => setForm({ ...form, max_active_orders: Number(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5].map((capacity) => (
                        <option value={capacity} key={capacity}>
                          {capacity} pedido{capacity === 1 ? '' : 's'}
                        </option>
                      ))}
                    </select>
                    <small style={{ color: 'var(--ds-text-muted)', fontSize: '11px', marginTop: '3px' }}>
                      Límite máximo de pedidos activos que el repartidor puede tomar a la vez.
                    </small>
                  </label>
                )}

                <label className="ds-form-group">
                  <span className="ds-form-label">Estado de la Cuenta</span>
                  <select
                    className="ds-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </label>
              </div>

              <div className="ds-modal-footer" style={{ borderTop: '1px solid var(--ds-border)', padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="ds-btn ds-btn-secondary" onClick={close}>
                  Cancelar
                </button>
                <button className="ds-btn ds-btn-primary" disabled={saving}>
                  {saving ? 'Guardando cambios…' : editing ? 'Actualizar usuario' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
