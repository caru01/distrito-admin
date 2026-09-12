import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Edit3, Lock as LockKeyhole, Plus, Search, ShieldCheck, Trash2, Users, X,
  LayoutDashboard, ShoppingBag, MapPin, Building2, Package, List, Archive,
  DollarSign, FileSpreadsheet, Contact, BarChart3, Megaphone, Clock,
  Settings, User, CheckSquare, Square, Check, Filter
} from 'lucide-react';
import { API_URL } from '../config/api';

const MODULE_CATEGORIES = {
  'Dashboard': 'Operación y Ventas',
  'Pedidos': 'Operación y Ventas',
  'Domicilios': 'Logística y Domicilios',
  'Empresas Domicilios': 'Logística y Domicilios',
  'Productos': 'Menú y Carta',
  'Categorias': 'Menú y Carta',
  'Inventario': 'Inventario y Compras',
  'Gastos': 'Finanzas y Caja',
  'Cierre Contable': 'Finanzas y Caja',
  'Clientes': 'Clientes y CRM',
  'CRM': 'Clientes y CRM',
  'Anuncios': 'Clientes y CRM',
  'Reportes': 'Reportes y Auditoría',
  'Auditoria': 'Reportes y Auditoría',
  'Configuracion': 'Sistema y Seguridad',
  'Horarios': 'Sistema y Seguridad',
  'Usuarios': 'Sistema y Seguridad',
  'Roles': 'Sistema y Seguridad',
  'Perfil': 'Sistema y Seguridad',
  'Permisos': 'Sistema y Seguridad',
};

const CATEGORY_ICONS = {
  'Operación y Ventas': '🛎️',
  'Logística y Domicilios': '🛵',
  'Menú y Carta': '🍔',
  'Inventario y Compras': '📦',
  'Finanzas y Caja': '💰',
  'Clientes y CRM': '🤝',
  'Reportes y Auditoría': '📊',
  'Sistema y Seguridad': '⚙️',
};

const MODULE_ICONS = {
  'Dashboard': <LayoutDashboard size={17} />,
  'Pedidos': <ShoppingBag size={17} />,
  'Domicilios': <MapPin size={17} />,
  'Empresas Domicilios': <Building2 size={17} />,
  'Productos': <Package size={17} />,
  'Categorias': <List size={17} />,
  'Inventario': <Archive size={17} />,
  'Gastos': <DollarSign size={17} />,
  'Cierre Contable': <FileSpreadsheet size={17} />,
  'Clientes': <Users size={17} />,
  'CRM': <Contact size={17} />,
  'Anuncios': <Megaphone size={17} />,
  'Reportes': <BarChart3 size={17} />,
  'Auditoria': <ShieldCheck size={17} />,
  'Configuracion': <Settings size={17} />,
  'Horarios': <Clock size={17} />,
  'Usuarios': <Users size={17} />,
  'Roles': <Settings size={17} />,
  'Perfil': <User size={17} />,
  'Permisos': <ShieldCheck size={17} />,
};

const ACTION_LABELS = {
  'ver': 'Consultar / Ver',
  'crear': 'Crear / Registrar',
  'editar': 'Modificar / Editar',
  'eliminar': 'Eliminar / Anular',
  'imprimir': 'Imprimir tickets y comandas',
  'asignar': 'Asignar repartidores',
  'forzar_turno': 'Forzar fin de turno',
  'override_geocerca': 'Excepción de geocerca',
  'mensajeros': 'Gestionar mensajeros',
  'compras': 'Compras a proveedores',
  'ajustar_stock': 'Ajustes y mermas',
  'recetas': 'Recetas y costeo',
  'kardex': 'Historial Kardex',
  'rentabilidad': 'Rentabilidad de carta',
  'aprobar': 'Aprobar gastos',
  'cerrar_caja': 'Cierre y arqueo de caja',
  'exportar': 'Exportar datos',
  'contactos': 'Gestión de contactos',
  'conversaciones': 'Conversaciones',
  'responder': 'Responder chats',
  'campanas': 'Campañas promocionales',
  'campanas_crear': 'Diseñar campañas',
  'campanas_enviar': 'Lanzar campañas',
  'automatizaciones': 'Automatizaciones',
  'segmentos': 'Segmentos de clientes',
  'notas': 'Notas de clientes',
  'reportes': 'Reportes comerciales',
  'configurar': 'Configurar canal',
};

export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [permissionsByRole, setPermissionsByRole] = useState({});
  const [editing, setEditing] = useState(undefined);
  const [form, setForm] = useState({ name: '', description: '', permissions: [] });
  const [query, setQuery] = useState('');
  const [permSearch, setPermSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const token = sessionStorage.getItem('distrito_admin_token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [rolesResponse, metaResponse] = await Promise.all([
        fetch(`${API_URL}/admin/roles`, { headers }),
        fetch(`${API_URL}/admin/roles-meta`, { headers }),
      ]);
      const rolesData = await rolesResponse.json();
      const metaData = await metaResponse.json();

      if (!rolesResponse.ok) throw new Error(rolesData.error || 'No fue posible cargar los roles');
      setRoles(rolesData.data || []);
      if (metaResponse.ok) setCatalog(metaData.data || []);

      const pairs = await Promise.all((rolesData.data || []).map(async (role) => {
        const response = await fetch(`${API_URL}/admin/roles/${role.id}/permissions`, { headers });
        const data = await response.json();
        return [role.id, response.ok ? data.data || [] : []];
      }));
      setPermissionsByRole(Object.fromEntries(pairs));
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  }, [headers]);

  useEffect(() => {
    load();
  }, [load]);

  // Agrupación por módulo y categoría
  const groupedByModule = useMemo(() => {
    return catalog.reduce((result, permission) => {
      (result[permission.module] ||= []).push(permission);
      return result;
    }, {});
  }, [catalog]);

  const categories = useMemo(() => {
    const cats = ['Todas'];
    Object.values(MODULE_CATEGORIES).forEach((cat) => {
      if (!cats.includes(cat)) cats.push(cat);
    });
    return cats;
  }, []);

  const openCreate = () => {
    setEditing(null);
    setPermSearch('');
    setSelectedCategory('Todas');
    setForm({ name: '', description: '', permissions: [] });
  };

  const openEdit = (role) => {
    setEditing(role);
    setPermSearch('');
    setSelectedCategory('Todas');
    setForm({
      name: role.name,
      description: role.description || '',
      permissions: permissionsByRole[role.id] || []
    });
  };

  const close = () => {
    setEditing(undefined);
    setPermSearch('');
  };

  const toggle = (permissionKey) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permissionKey)
        ? current.permissions.filter((item) => item !== permissionKey)
        : [...current.permissions, permissionKey]
    }));
  };

  const toggleModule = (permissions) => {
    const names = permissions.map((p) => `${p.module}:${p.action}`);
    const allSelected = names.every((name) => form.permissions.includes(name));
    setForm((current) => ({
      ...current,
      permissions: allSelected
        ? current.permissions.filter((name) => !names.includes(name))
        : [...new Set([...current.permissions, ...names])]
    }));
  };

  const selectAll = () => {
    const all = catalog.map((p) => `${p.module}:${p.action}`);
    setForm((cur) => ({ ...cur, permissions: all }));
  };

  const deselectAll = () => {
    setForm((cur) => ({ ...cur, permissions: [] }));
  };

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const roleResponse = await fetch(editing ? `${API_URL}/admin/roles/${editing.id}` : `${API_URL}/admin/roles`, {
        method: editing ? 'PUT' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, description: form.description }),
      });
      const roleData = await roleResponse.json();
      if (!roleResponse.ok) throw new Error(roleData.error || 'No fue posible guardar el rol');

      const roleId = editing?.id || roleData.data.id;
      const permissionResponse = await fetch(`${API_URL}/admin/roles/${roleId}/permissions`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: form.permissions }),
      });
      const permissionData = await permissionResponse.json();
      if (!permissionResponse.ok) throw new Error(permissionData.error || 'El rol se guardó, pero no sus permisos');

      setMessage({ type: 'success', text: `Rol "${form.name}" y matriz de permisos actualizados.` });
      close();
      await load();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (role) => {
    if (role.is_system_role || role.users_count > 0) {
      return setMessage({ type: 'error', text: 'Los roles del sistema o con usuarios activos no se pueden eliminar.' });
    }
    if (!confirm(`¿Eliminar el rol "${role.name}"?`)) return;
    const response = await fetch(`${API_URL}/admin/roles/${role.id}`, { method: 'DELETE', headers });
    const data = await response.json();
    if (!response.ok) return setMessage({ type: 'error', text: data.error || 'No fue posible eliminar' });
    setMessage({ type: 'success', text: 'Rol eliminado.' });
    load();
  };

  const filteredRoles = roles.filter((role) =>
    `${role.name} ${role.description || ''}`.toLowerCase().includes(query.toLowerCase())
  );

  // Módulos filtrados para el modal de edición
  const visibleModules = useMemo(() => {
    const searchLower = permSearch.toLowerCase();
    const result = {};

    Object.entries(groupedByModule).forEach(([moduleName, permissions]) => {
      const category = MODULE_CATEGORIES[moduleName] || 'Otros';
      if (selectedCategory !== 'Todas' && category !== selectedCategory) return;

      const matchingPermissions = permissions.filter((p) => {
        if (!searchLower) return true;
        const key = `${p.module}:${p.action}`.toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const label = (ACTION_LABELS[p.action] || p.action).toLowerCase();
        return key.includes(searchLower) || desc.includes(searchLower) || label.includes(searchLower) || moduleName.toLowerCase().includes(searchLower);
      });

      if (matchingPermissions.length > 0) {
        result[moduleName] = matchingPermissions;
      }
    });

    return result;
  }, [groupedByModule, permSearch, selectedCategory]);

  return (
    <div className="ds-page roles-page">
      <header className="ds-page-header">
        <div>
          <span className="ds-eyebrow">Control de acceso</span>
          <h1 className="ds-page-title">Roles y permisos</h1>
          <p className="ds-page-subtitle">
            Una matriz central define exactamente qué puede ver y modificar cada rol en todos los módulos de Distrito BG.
          </p>
        </div>
        <button className="ds-btn ds-btn-primary" onClick={openCreate} style={{ height: '42px', borderRadius: '10px' }}>
          <Plus size={18} /> Nuevo rol
        </button>
      </header>

      {message.text && (
        <div className={`ds-alert ds-alert-${message.type === 'error' ? 'danger' : 'success'}`} style={{ marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      <section className="ds-card">
        <div className="users-toolbar">
          <div className="ds-search" style={{ flex: 1, minWidth: '300px' }}>
            <Search size={20} className="ds-search-icon" />
            <input
              type="text"
              placeholder="Buscar rol por nombre o descripción..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ds-search-input ds-input"
            />
          </div>
          <span className="ds-badge ds-badge-info">{filteredRoles.length} roles configurados</span>
        </div>

        <div className="roles-grid">
          {filteredRoles.map((role) => {
            const rolePerms = permissionsByRole[role.id] || [];
            const isFull = rolePerms.length >= catalog.length && catalog.length > 0;

            // Determinar áreas habilitadas para el rol
            const activeModules = [...new Set(rolePerms.map((p) => p.split(':')[0]))];

            return (
              <article className="role-card" key={role.id}>
                <div className="role-card-icon">
                  <ShieldCheck size={26} />
                </div>
                <div className="role-card-content">
                  <div className="role-card-heading">
                    <h2 style={{ fontSize: '18px', fontWeight: '700' }}>{role.name}</h2>
                    {role.is_system_role && (
                      <span className="ds-badge ds-badge-warning" title="Rol protegido del sistema">
                        <LockKeyhole size={12} /> Sistema
                      </span>
                    )}
                    {isFull && (
                      <span className="ds-badge ds-badge-success" title="Acceso total a todos los módulos">
                        <Check size={12} /> Acceso Total
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', margin: '6px 0 10px 0' }}>
                    {role.description || 'Sin descripción asignada.'}
                  </p>

                  <div className="role-card-meta" style={{ gap: '14px', fontSize: '13px' }}>
                    <span>
                      <Users size={15} color="var(--ds-primary)" /> {role.users_count || 0} {role.users_count === 1 ? 'usuario activo' : 'usuarios activos'}
                    </span>
                    <span>
                      <CheckSquare size={15} color="#10B981" /> {rolePerms.length} de {catalog.length} permisos
                    </span>
                  </div>

                  {/* Resumen de áreas activas */}
                  <div className="role-summary-tags">
                    {activeModules.slice(0, 6).map((mod) => (
                      <span className="role-summary-tag active" key={mod}>
                        {mod}
                      </span>
                    ))}
                    {activeModules.length > 6 && (
                      <span className="role-summary-tag">
                        +{activeModules.length - 6} módulos más
                      </span>
                    )}
                    {activeModules.length === 0 && (
                      <span className="role-summary-tag" style={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.2)' }}>
                        ⚠️ Sin permisos asignados
                      </span>
                    )}
                  </div>
                </div>

                <div className="ds-actions" style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="ds-btn ds-btn-sm ds-btn-secondary"
                    onClick={() => openEdit(role)}
                    title="Configurar permisos del rol"
                    style={{ height: '36px', padding: '0 12px' }}
                  >
                    <Edit3 size={15} /> Permisos
                  </button>
                  <button
                    className="ds-icon-btn danger"
                    onClick={() => remove(role)}
                    title={role.is_system_role ? 'Los roles del sistema no se pueden eliminar' : 'Eliminar rol'}
                    disabled={role.is_system_role}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Modal de Matriz de Permisos */}
      {editing !== undefined && (
        <div className="ds-modal-overlay role-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div className="ds-modal ds-modal-lg role-modal" style={{ maxWidth: '960px', width: '95vw' }}>
            <div className="ds-modal-header">
              <div>
                <h2 className="ds-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={22} color="var(--ds-primary)" />
                  {editing ? `Editar Rol: ${editing.name}` : 'Crear Nuevo Rol'}
                </h2>
                <p className="ds-text-muted" style={{ fontSize: '13px', margin: 0 }}>
                  Selecciona exactamente qué módulos y acciones puede consultar o ejecutar este perfil.
                </p>
              </div>
              <button className="ds-icon-btn" onClick={close}>
                <X />
              </button>
            </div>

            <form onSubmit={save}>
              <div className="ds-modal-body ds-form-stack role-modal-scroll" style={{ padding: '20px' }}>
                <div className="user-form-grid" style={{ marginBottom: '16px' }}>
                  <label className="ds-form-group">
                    <span className="ds-form-label">Nombre del Rol *</span>
                    <input
                      className="ds-input"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      disabled={editing?.is_system_role}
                      placeholder="Ej: Supervisor de Turno"
                    />
                  </label>
                  <label className="ds-form-group">
                    <span className="ds-form-label">Descripción de Funciones</span>
                    <input
                      className="ds-input"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Ej: Encargado de cocina, comandas y stock de mermas"
                    />
                  </label>
                </div>

                {/* Barra de control y categorías pegajosa (Sticky) para que nunca se pierdan al hacer scroll */}
                <div className="role-modal-sticky-panel">
                  <div className="role-modal-toolbar" style={{ margin: 0, padding: '0 0 10px 0' }}>
                    <div className="ds-search" style={{ flex: 1, minWidth: '240px' }}>
                      <Search size={18} className="ds-search-icon" />
                      <input
                        type="text"
                        placeholder="Filtrar permiso o módulo (ej: compras, pedidos, exportar)..."
                        value={permSearch}
                        onChange={(e) => setPermSearch(e.target.value)}
                        className="ds-search-input ds-input"
                        style={{ height: '38px', fontSize: '13px' }}
                      />
                      {permSearch && (
                        <button
                          type="button"
                          onClick={() => setPermSearch('')}
                          style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--ds-text-muted)', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={selectAll}
                        className="ds-btn ds-btn-sm ds-btn-secondary"
                        style={{ height: '38px', fontSize: '12px' }}
                      >
                        <CheckSquare size={15} color="#10B981" /> Seleccionar Todo ({catalog.length})
                      </button>
                      <button
                        type="button"
                        onClick={deselectAll}
                        className="ds-btn ds-btn-sm ds-btn-ghost"
                        style={{ height: '38px', fontSize: '12px' }}
                      >
                        <Square size={15} /> Desmarcar Todo
                      </button>
                      <span className="ds-badge ds-badge-info" style={{ height: '38px', display: 'inline-flex', alignItems: 'center', fontWeight: 'bold' }}>
                        {form.permissions.length} activos
                      </span>
                    </div>
                  </div>

                  {/* Píldoras de categorías siempre visibles y envueltas */}
                  <div className="role-category-pills">
                    {categories.map((cat) => {
                      const catTotal = cat === 'Todas'
                        ? catalog.length
                        : catalog.filter((p) => (MODULE_CATEGORIES[p.module] || 'Otros') === cat).length;
                      const catActive = cat === 'Todas'
                        ? form.permissions.length
                        : catalog.filter((p) => (MODULE_CATEGORIES[p.module] || 'Otros') === cat && form.permissions.includes(`${p.module}:${p.action}`)).length;

                      return (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`role-category-pill ${selectedCategory === cat ? 'active' : ''}`}
                        >
                          <span>{CATEGORY_ICONS[cat] || '📁'}</span>
                          <span>{cat}</span>
                          <span className={`role-pill-badge ${catActive > 0 ? 'has-active' : ''}`}>
                            {catActive > 0 ? `${catActive}/${catTotal}` : catTotal}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Matriz de Permisos */}
                <div className="permission-matrix">
                  {Object.entries(visibleModules).map(([moduleName, permissions]) => {
                    const moduleKeys = permissions.map((p) => `${p.module}:${p.action}`);
                    const selectedCount = moduleKeys.filter((k) => form.permissions.includes(k)).length;
                    const allSelected = selectedCount === moduleKeys.length;
                    const isPartial = selectedCount > 0 && !allSelected;

                    return (
                      <section className="permission-module" key={moduleName}>
                        <div className="permission-module-header">
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={(el) => { if (el) el.indeterminate = isPartial; }}
                              onChange={() => toggleModule(permissions)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--ds-primary)' }}
                            />
                            <span style={{ color: 'var(--ds-primary)', display: 'flex', alignItems: 'center' }}>
                              {MODULE_ICONS[moduleName] || <Archive size={17} />}
                            </span>
                            <strong className="permission-module-title">{moduleName}</strong>
                          </label>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              className={`ds-badge ${allSelected ? 'ds-badge-success' : selectedCount > 0 ? 'ds-badge-warning' : 'ds-badge-neutral'}`}
                              style={{ fontSize: '11px', padding: '2px 6px' }}
                            >
                              {selectedCount}/{moduleKeys.length}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleModule(permissions)}
                              className="permission-module-quick-toggle"
                            >
                              {allSelected ? 'Quitar' : 'Todos'}
                            </button>
                          </div>
                        </div>

                        <div className="permission-actions">
                          {permissions.map((permission) => {
                            const key = `${permission.module}:${permission.action}`;
                            const isChecked = form.permissions.includes(key);
                            const label = ACTION_LABELS[permission.action] || permission.action;

                            return (
                              <label
                                key={permission.id}
                                className={`permission-action-chip ${isChecked ? 'active' : ''}`}
                                title={permission.description || key}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggle(key)}
                                  style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: 'var(--ds-primary)' }}
                                />
                                <span>{label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>

                {Object.keys(visibleModules).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ds-text-muted)' }}>
                    <Search size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                    <p>No se encontraron permisos que coincidan con la búsqueda "{permSearch}".</p>
                  </div>
                )}
              </div>

              <div className="ds-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--ds-text-muted)' }}>
                  <strong style={{ color: 'var(--ds-text-primary)' }}>{form.permissions.length}</strong> permisos autorizados para este rol.
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="ds-btn ds-btn-secondary" onClick={close}>
                    Cancelar
                  </button>
                  <button type="submit" className="ds-btn ds-btn-primary" disabled={busy} style={{ minWidth: '120px' }}>
                    {busy ? 'Guardando…' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
