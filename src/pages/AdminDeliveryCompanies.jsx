import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2, CheckCircle, Clock3, DollarSign, Edit3, Plus, Power, RefreshCw, Truck, X,
  Bike, Phone, Trash2, User, UserCheck, UserX, FileText, ChevronRight, MessageCircle,
  Eye, EyeOff, KeyRound, MapPin, Navigation, Send, AlertCircle, ShoppingBag, ExternalLink
} from 'lucide-react';
import { API_URL } from '../config/api';
import { formatCurrency } from '../utils/formatters';
import { readApiJson } from '../utils/http';

const EMPTY_COMPANY = {
  id: null, name: '', phone: '', status: 'Activa', observations: '', default_fee: 0,
  estimated_delivery_minutes: 45, integration_type: 'manual',
};

const EMPTY_DRIVER = {
  id: null, name: '', phone: '', vehicle_type: 'Moto', vehicle_plate: '',
  document_id: '', status: 'Activo', notes: '',
  enable_app_account: true, app_username: '', app_password: '',
};

const authHeaders = () => ({ Authorization: `Bearer ${sessionStorage.getItem('distrito_admin_token')}` });

export default function AdminDeliveryCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState(null);

  // Estados para modal de detalle de empresa (Mensajeros y Pedidos)
  const [activeModalCompany, setActiveModalCompany] = useState(null);
  const [modalTab, setModalTab] = useState('drivers'); // 'drivers' | 'orders'

  // Mensajeros
  const [driversList, setDriversList] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [driverForm, setDriverForm] = useState(null);
  const [savingDriver, setSavingDriver] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Pedidos de la empresa
  const [companyOrders, setCompanyOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderDriverFilter, setOrderDriverFilter] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/delivery-companies`, { headers: authHeaders() });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'No fue posible cargar los operadores.');
      setCompanies(data.companies || []);
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => companies.reduce((sum, company) => ({
    active: sum.active + (company.status === 'Activa' ? 1 : 0),
    drivers: sum.drivers + Number(company.drivers_count || 0),
    completed: sum.completed + Number(company.completed_count || 0),
    pending: sum.pending + Number(company.pending_count || 0),
    paid: sum.paid + Number(company.paid_total || 0),
  }), { active: 0, drivers: 0, completed: 0, pending: 0, paid: 0 }), [companies]);

  // Guardar empresa (Crear o Editar)
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setNotice(null);
    try {
      const response = await fetch(form.id ? `${API_URL}/admin/delivery-companies/${form.id}` : `${API_URL}/admin/delivery-companies`, {
        method: form.id ? 'PUT' : 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'No fue posible guardar el operador.');
      setForm(null); setNotice({ type: 'success', text: 'Empresa de domicilios guardada.' }); await load();
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
    finally { setSaving(false); }
  };

  // Activar / Desactivar empresa
  const toggle = async (company) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/admin/delivery-companies/${company.id}`, {
        method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...company, status: company.status === 'Activa' ? 'Inactiva' : 'Activa' }),
      });
      const data = await readApiJson(response); if (!response.ok) throw new Error(data.error); await load();
    } catch (error) { setNotice({ type: 'error', text: error.message || 'No fue posible cambiar el estado.' }); }
    finally { setSaving(false); }
  };

  // Cargar mensajeros de la empresa seleccionada
  const loadDrivers = useCallback(async (companyId) => {
    setLoadingDrivers(true);
    try {
      const response = await fetch(`${API_URL}/admin/delivery-companies/${companyId}/drivers`, { headers: authHeaders() });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'No fue posible cargar los mensajeros.');
      setDriversList(data.drivers || []);
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally { setLoadingDrivers(false); }
  }, []);

  // Cargar pedidos de la empresa seleccionada
  const loadCompanyOrders = useCallback(async (companyId, driverId = '', status = '') => {
    setLoadingOrders(true);
    try {
      const queryParams = new URLSearchParams();
      if (driverId) queryParams.set('driverId', driverId);
      if (status) queryParams.set('status', status);
      queryParams.set('limit', '80');

      const response = await fetch(`${API_URL}/admin/delivery-companies/${companyId}/orders?${queryParams.toString()}`, { headers: authHeaders() });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'No fue posible cargar los pedidos.');
      setCompanyOrders(data.orders || []);
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally { setLoadingOrders(false); }
  }, []);

  const openCompanyModal = (company, initialTab = 'drivers') => {
    setActiveModalCompany(company);
    setModalTab(initialTab);
    setDriverForm(null);
    setShowPassword(false);
    loadDrivers(company.id);
    loadCompanyOrders(company.id, orderDriverFilter, orderStatusFilter);
  };

  const handleTabChange = (newTab) => {
    setModalTab(newTab);
    if (newTab === 'orders' && activeModalCompany) {
      loadCompanyOrders(activeModalCompany.id, orderDriverFilter, orderStatusFilter);
    } else if (newTab === 'drivers' && activeModalCompany) {
      loadDrivers(activeModalCompany.id);
    }
  };

  // Abrir formulario para nuevo mensajero
  const handleNewDriver = () => {
    setDriverForm({
      ...EMPTY_DRIVER,
      app_password: Math.floor(100000 + Math.random() * 900000).toString(),
    });
    setShowPassword(true);
  };

  // Abrir formulario para editar mensajero
  const handleEditDriver = (driver) => {
    setDriverForm({
      ...driver,
      enable_app_account: Boolean(driver.has_app_account),
      app_username: driver.app_username || '',
      app_password: '',
    });
    setShowPassword(false);
  };

  // Guardar mensajero (Crear o Editar)
  const saveDriver = async (event) => {
    event.preventDefault(); setSavingDriver(true); setNotice(null);
    try {
      const url = driverForm.id
        ? `${API_URL}/admin/delivery-companies/${activeModalCompany.id}/drivers/${driverForm.id}`
        : `${API_URL}/admin/delivery-companies/${activeModalCompany.id}/drivers`;
      const response = await fetch(url, {
        method: driverForm.id ? 'PUT' : 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(driverForm),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'No fue posible guardar el mensajero.');
      setDriverForm(null);
      await loadDrivers(activeModalCompany.id);
      await load();
      setNotice({ type: 'success', text: 'Mensajero y credenciales guardados correctamente.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally { setSavingDriver(false); }
  };

  // Cambiar estado de mensajero (Activo / Inactivo)
  const toggleDriver = async (driver) => {
    try {
      const response = await fetch(`${API_URL}/admin/delivery-companies/${activeModalCompany.id}/drivers/${driver.id}`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...driver, status: driver.status === 'Activo' ? 'Inactivo' : 'Activo' }),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error);
      await loadDrivers(activeModalCompany.id);
      await load();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'No fue posible cambiar el estado del mensajero.' });
    }
  };

  // Eliminar mensajero
  const deleteDriver = async (driver) => {
    if (!window.confirm(`¿Seguro que deseas eliminar al mensajero ${driver.name}?`)) return;
    try {
      const response = await fetch(`${API_URL}/admin/delivery-companies/${activeModalCompany.id}/drivers/${driver.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error);
      await loadDrivers(activeModalCompany.id);
      await load();
      setNotice({ type: 'success', text: 'Mensajero eliminado.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'No fue posible eliminar el mensajero.' });
    }
  };

  // Generar link de WhatsApp para enviar acceso al mensajero
  const getWhatsAppAccessLink = (driver) => {
    const cleanPhone = String(driver.phone || '').replace(/\D/g, '');
    const username = driver.app_username || cleanPhone;
    const companyName = activeModalCompany?.name || 'la empresa de domicilios';

    const message = `¡Hola ${driver.name}! 👋\n` +
      `Te damos la bienvenida al equipo de entregas con *${companyName}* y *Distrito Burger Bar*.\n\n` +
      `📲 *Descarga / Abre la app de entregas:*\nhttps://delivery.distritobg.com\n\n` +
      `👤 *Tu Usuario:* ${username}\n` +
      `🔑 *Tu Clave:* (Ingresa la que te fue asignada)\n\n` +
      `💡 *Pasos para iniciar:*\n` +
      `1. Abre el enlace e inicia sesión.\n` +
      `2. Pulsa *"Iniciar Turno"* para activar tu GPS.\n` +
      `3. ¡Listo! Recibirás los pedidos asignados con navegación GPS en vivo.`;

    return `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="ds-page delivery-company-page">
      <header className="ds-page-header">
        <div>
          <span className="ds-page-kicker">Red logística & Aliados</span>
          <h1 className="ds-page-title">Empresas de Domicilios</h1>
          <p className="ds-page-subtitle">
            Administra operadores aliados, mensajeros con acceso a la app móvil, rastreo GPS en vivo y liquidación de pedidos.
          </p>
        </div>
        <div className="ds-page-actions">
          <button className="ds-btn ds-btn-secondary" onClick={load}>
            <RefreshCw size={18} /> Actualizar
          </button>
          <button className="ds-btn ds-btn-primary" onClick={() => setForm({ ...EMPTY_COMPANY })}>
            <Plus size={18} /> Nueva empresa
          </button>
        </div>
      </header>

      {notice && (
        <div className={`ds-inline-alert ds-inline-alert-${notice.type === 'success' ? 'success' : 'danger'}`}>
          {notice.text}
          <button onClick={() => setNotice(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>
      )}

      <section className="delivery-company-kpis">
        <article>
          <Building2 />
          <div>
            <strong>{totals.active}</strong>
            <span>Empresas activas</span>
          </div>
        </article>
        <article>
          <Bike />
          <div>
            <strong>{totals.drivers}</strong>
            <span>Mensajeros registrados</span>
          </div>
        </article>
        <article>
          <CheckCircle />
          <div>
            <strong>{totals.completed}</strong>
            <span>Entregas completadas</span>
          </div>
        </article>
        <article>
          <DollarSign />
          <div>
            <strong>{formatCurrency(totals.paid)}</strong>
            <span>Costos completados</span>
          </div>
        </article>
      </section>

      <section className="ds-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="ds-loader-container"><div className="ds-loader" /><p>Cargando operadores…</p></div>
        ) : companies.length ? (
          <div className="ds-table-container">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Mensajeros & App</th>
                  <th>Tarifa / ETA</th>
                  <th>Entregas</th>
                  <th>Dinero pagado</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td>
                      <div className="delivery-company-name">
                        <span><Truck size={18} /></span>
                        <div>
                          <strong>{company.name}</strong>
                          <small>{company.phone} · {company.integration_type === 'api' ? 'Preparada para API' : 'Operación manual'}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <button
                        className="ds-btn ds-btn-xs ds-btn-secondary"
                        onClick={() => openCompanyModal(company, 'drivers')}
                        title="Ver y gestionar mensajeros de esta empresa"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Bike size={14} color="var(--ds-primary)" />
                        <strong>{company.drivers_count || 0} mensajero{(company.drivers_count || 0) !== 1 ? 's' : ''}</strong>
                      </button>
                    </td>
                    <td>
                      <strong>{formatCurrency(company.default_fee)}</strong>
                      <small className="ds-block-muted">{company.estimated_delivery_minutes ? `${company.estimated_delivery_minutes} min estimados` : 'Sin ETA'}</small>
                    </td>
                    <td>
                      <button
                        className="ds-btn ds-btn-xs ds-btn-secondary"
                        onClick={() => openCompanyModal(company, 'orders')}
                        title="Ver pedidos asociados a esta empresa"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <ShoppingBag size={13} color="var(--ds-primary)" />
                        <span><strong>{company.completed_count || 0}</strong> completados ({company.pending_count || 0} pend.)</span>
                      </button>
                    </td>
                    <td>
                      <strong>{formatCurrency(company.paid_total)}</strong>
                    </td>
                    <td>
                      <span className={`ds-badge ds-badge-${company.status === 'Activa' ? 'success' : 'neutral'}`}>{company.status}</span>
                    </td>
                    <td>
                      <div className="delivery-company-actions" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          className="ds-btn ds-btn-xs ds-btn-secondary"
                          onClick={() => openCompanyModal(company, 'drivers')}
                          title="Gestionar domiciliarios / mensajeros y cuentas de app"
                        >
                          <Bike size={15} /> Mensajeros
                        </button>
                        <button
                          className="ds-btn ds-btn-xs ds-btn-secondary"
                          onClick={() => openCompanyModal(company, 'orders')}
                          title="Ver pedidos de esta empresa"
                        >
                          <ShoppingBag size={15} /> Pedidos
                        </button>
                        <button
                          className="ds-btn ds-btn-icon ds-btn-secondary ds-btn-sm"
                          onClick={() => setForm({ ...EMPTY_COMPANY, ...company })}
                          title="Editar empresa"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="ds-btn ds-btn-icon ds-btn-secondary ds-btn-sm"
                          onClick={() => toggle(company)}
                          disabled={saving}
                          title={company.status === 'Activa' ? 'Desactivar empresa' : 'Activar empresa'}
                        >
                          <Power size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ds-empty-state">
            <Building2 />
            <h3>Aún no hay empresas externas</h3>
            <p>Registra el primer operador para habilitarlo en “Asignar entrega”.</p>
            <button className="ds-btn ds-btn-primary" onClick={() => setForm({ ...EMPTY_COMPANY })}>Crear empresa</button>
          </div>
        )}
      </section>

      {/* MODAL: EDITAR / CREAR EMPRESA */}
      {form && (
        <div className="ds-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && !saving && setForm(null)}>
          <div className="ds-modal ds-modal-lg" role="dialog" aria-modal="true">
            <form onSubmit={save}>
              <div className="ds-modal-header">
                <div>
                  <span className="ds-page-kicker">{form.id ? `Operador #${form.id}` : 'Nuevo operador'}</span>
                  <h2 className="ds-modal-title">Datos de la empresa</h2>
                </div>
                <button type="button" className="ds-modal-close" onClick={() => setForm(null)}><X /></button>
              </div>
              <div className="ds-modal-body ds-form">
                <div className="ds-form-grid">
                  <label className="ds-form-group">
                    <span className="ds-form-label">Nombre *</span>
                    <input className="ds-input" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </label>
                  <label className="ds-form-group">
                    <span className="ds-form-label">Teléfono *</span>
                    <input className="ds-input" required inputMode="tel" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </label>
                  <label className="ds-form-group">
                    <span className="ds-form-label">Tarifa predeterminada</span>
                    <input className="ds-input" type="number" min="0" step="100" value={form.default_fee} onChange={(e) => setForm({ ...form, default_fee: Number(e.target.value) })} />
                  </label>
                  <label className="ds-form-group">
                    <span className="ds-form-label">Tiempo estimado (minutos)</span>
                    <input className="ds-input" type="number" min="1" max="1440" value={form.estimated_delivery_minutes || ''} onChange={(e) => setForm({ ...form, estimated_delivery_minutes: e.target.value ? Number(e.target.value) : null })} />
                  </label>
                  <label className="ds-form-group">
                    <span className="ds-form-label">Estado</span>
                    <select className="ds-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option>Activa</option>
                      <option>Inactiva</option>
                    </select>
                  </label>
                  <label className="ds-form-group">
                    <span className="ds-form-label">Tipo de integración</span>
                    <select className="ds-select" value={form.integration_type} onChange={(e) => setForm({ ...form, integration_type: e.target.value })}>
                      <option value="manual">Manual</option>
                      <option value="api">API futura</option>
                    </select>
                  </label>
                </div>
                <label className="ds-form-group">
                  <span className="ds-form-label">Observaciones</span>
                  <textarea className="ds-textarea" maxLength={3000} value={form.observations || ''} onChange={(e) => setForm({ ...form, observations: e.target.value })} placeholder="Cobertura, horarios, condiciones de pago o contactos alternos" />
                </label>
                <div className="ds-inline-alert ds-inline-alert-info">
                  La opción API solo prepara la clasificación del proveedor. No envía datos a terceros ni requiere credenciales hasta que se implemente una integración.
                </div>
              </div>
              <div className="ds-modal-footer">
                <button type="button" className="ds-btn ds-btn-secondary" onClick={() => setForm(null)}>Cancelar</button>
                <button className="ds-btn ds-btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar empresa'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLADO: GESTIÓN DE MENSAJEROS Y PEDIDOS DE LA EMPRESA */}
      {activeModalCompany && (
        <div className="ds-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && !savingDriver && setActiveModalCompany(null)}>
          <div className="ds-modal ds-modal-lg" style={{ maxWidth: '920px' }} role="dialog" aria-modal="true">
            <div className="ds-modal-header" style={{ paddingBottom: '12px' }}>
              <div>
                <span className="ds-page-kicker">{activeModalCompany.name}</span>
                <h2 className="ds-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={22} color="var(--ds-primary)" />
                  <span>{activeModalCompany.name}</span>
                </h2>
              </div>
              <button type="button" className="ds-modal-close" onClick={() => setActiveModalCompany(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Pestañas dentro del modal */}
            <div style={{ display: 'flex', gap: '8px', padding: '0 24px', borderBottom: '1px solid var(--ds-border)' }}>
              <button
                type="button"
                className={`ds-btn ds-btn-sm ${modalTab === 'drivers' ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
                style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
                onClick={() => handleTabChange('drivers')}
              >
                <Bike size={16} /> Mensajeros & Cuentas App ({driversList.length})
              </button>
              <button
                type="button"
                className={`ds-btn ds-btn-sm ${modalTab === 'orders' ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
                style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
                onClick={() => handleTabChange('orders')}
              >
                <ShoppingBag size={16} /> Pedidos de la Empresa ({companyOrders.length})
              </button>
            </div>

            <div className="ds-modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* ================= PESTAÑA 1: MENSAJEROS ================= */}
              {modalTab === 'drivers' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '14px', color: 'var(--ds-text-primary)', fontWeight: 600 }}>
                        Mensajeros vinculados ({driversList.length})
                      </span>
                      <small style={{ display: 'block', color: 'var(--ds-text-muted)', fontSize: '12px' }}>
                        Los mensajeros con cuenta podrán ingresar a la app móvil, ver pedidos y transmitir su GPS en vivo.
                      </small>
                    </div>
                    <button
                      type="button"
                      className="ds-btn ds-btn-sm ds-btn-primary"
                      onClick={handleNewDriver}
                    >
                      <Plus size={16} /> Nuevo Mensajero
                    </button>
                  </div>

                  {/* FORMULARIO CREAR / EDITAR MENSAJERO */}
                  {driverForm && (
                    <div style={{ padding: '18px', backgroundColor: 'var(--ds-bg-elevated)', border: '1px solid var(--ds-primary)', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <strong style={{ fontSize: '15px', color: 'var(--ds-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <User size={17} color="var(--ds-primary)" />
                          {driverForm.id ? `Editar Mensajero: ${driverForm.name}` : 'Registrar Nuevo Mensajero'}
                        </strong>
                        <button type="button" onClick={() => setDriverForm(null)} style={{ background: 'none', border: 'none', color: 'var(--ds-text-muted)', cursor: 'pointer' }}>
                          <X size={16} />
                        </button>
                      </div>

                      <form onSubmit={saveDriver}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                          <div className="ds-form-group">
                            <label className="ds-form-label">Nombre Completo *</label>
                            <input
                              type="text"
                              required
                              className="ds-input"
                              placeholder="Ej: Carlos Mario Pérez"
                              value={driverForm.name}
                              onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                            />
                          </div>
                          <div className="ds-form-group">
                            <label className="ds-form-label">Teléfono / Celular *</label>
                            <input
                              type="tel"
                              required
                              className="ds-input"
                              placeholder="Ej: 3001234567"
                              value={driverForm.phone}
                              onChange={(e) => {
                                const newPhone = e.target.value;
                                setDriverForm(cur => ({
                                  ...cur,
                                  phone: newPhone,
                                  // Si está creando y no ha puesto usuario personalizado, sugerir el teléfono limpio
                                  app_username: (!cur.id && (!cur.app_username || cur.app_username === cur.phone?.replace(/\D/g, '')))
                                    ? newPhone.replace(/\D/g, '')
                                    : cur.app_username
                                }));
                              }}
                            />
                          </div>
                          <div className="ds-form-group">
                            <label className="ds-form-label">Cédula / Documento</label>
                            <input
                              type="text"
                              className="ds-input"
                              placeholder="Ej: 1040123456"
                              value={driverForm.document_id || ''}
                              onChange={(e) => setDriverForm({ ...driverForm, document_id: e.target.value })}
                            />
                          </div>
                          <div className="ds-form-group">
                            <label className="ds-form-label">Tipo de Vehículo</label>
                            <select
                              className="ds-select"
                              value={driverForm.vehicle_type}
                              onChange={(e) => setDriverForm({ ...driverForm, vehicle_type: e.target.value })}
                            >
                              <option value="Moto">Moto</option>
                              <option value="Bicicleta">Bicicleta</option>
                              <option value="Carro">Carro</option>
                              <option value="A pie">A pie</option>
                              <option value="Otro">Otro</option>
                            </select>
                          </div>
                          <div className="ds-form-group">
                            <label className="ds-form-label">Placa de Vehículo</label>
                            <input
                              type="text"
                              className="ds-input"
                              placeholder="Ej: XYZ-12D"
                              value={driverForm.vehicle_plate || ''}
                              onChange={(e) => setDriverForm({ ...driverForm, vehicle_plate: e.target.value.toUpperCase() })}
                            />
                          </div>
                          <div className="ds-form-group">
                            <label className="ds-form-label">Estado</label>
                            <select
                              className="ds-select"
                              value={driverForm.status}
                              onChange={(e) => setDriverForm({ ...driverForm, status: e.target.value })}
                            >
                              <option value="Activo">Activo</option>
                              <option value="Inactivo">Inactivo</option>
                            </select>
                          </div>
                        </div>

                        {/* SECCIÓN GLOW: ACCESO A LA APP DISTRITO DELIVERY Y GPS */}
                        <div style={{
                          marginTop: '16px',
                          padding: '16px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(212, 160, 23, 0.05)',
                          border: '1px solid rgba(212, 160, 23, 0.3)',
                          boxShadow: '0 0 15px rgba(212, 160, 23, 0.08)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: 'var(--ds-primary)' }}>
                              <input
                                type="checkbox"
                                checked={Boolean(driverForm.enable_app_account)}
                                onChange={(e) => setDriverForm({ ...driverForm, enable_app_account: e.target.checked })}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--ds-primary)', cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Navigation size={16} /> Habilitar cuenta en la app móvil Distrito Delivery (Rastreo GPS en vivo)
                              </span>
                            </label>
                            {driverForm.enable_app_account && (
                              <button
                                type="button"
                                className="ds-btn ds-btn-xs ds-btn-secondary"
                                onClick={() => setDriverForm(cur => ({ ...cur, app_password: Math.floor(100000 + Math.random() * 900000).toString() }))}
                              >
                                <KeyRound size={13} /> Generar clave 6 dígitos
                              </button>
                            )}
                          </div>

                          {driverForm.enable_app_account && (
                            <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                              <div className="ds-form-group">
                                <label className="ds-form-label">Usuario para iniciar sesión *</label>
                                <input
                                  type="text"
                                  required={driverForm.enable_app_account}
                                  className="ds-input"
                                  placeholder="Ej: 3001234567"
                                  value={driverForm.app_username || ''}
                                  onChange={(e) => setDriverForm({ ...driverForm, app_username: e.target.value.trim() })}
                                />
                                <small className="ds-block-muted">Por defecto el número de teléfono</small>
                              </div>

                              <div className="ds-form-group">
                                <label className="ds-form-label">
                                  {driverForm.id && driverForm.has_app_account ? 'Cambiar Contraseña (dejar vacío para mantener)' : 'Contraseña temporal *'}
                                </label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                  <input
                                    type={showPassword ? 'text' : 'password'}
                                    required={!driverForm.id && driverForm.enable_app_account}
                                    className="ds-input"
                                    placeholder={driverForm.id ? 'Nueva clave si deseas cambiarla' : 'Mínimo 4 caracteres'}
                                    value={driverForm.app_password || ''}
                                    onChange={(e) => setDriverForm({ ...driverForm, app_password: e.target.value })}
                                    style={{ paddingRight: '40px' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                      position: 'absolute', right: '10px', background: 'none', border: 'none',
                                      color: 'var(--ds-text-muted)', cursor: 'pointer'
                                    }}
                                    title={showPassword ? 'Ocultar' : 'Ver clave'}
                                  >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                </div>
                                <small className="ds-block-muted">
                                  {driverForm.id && driverForm.has_app_account ? 'Escribe solo si deseas asignarle una nueva clave' : 'Clave con la que el mensajero entrará a la app'}
                                </small>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="ds-form-group" style={{ marginTop: '12px' }}>
                          <label className="ds-form-label">Notas u Observaciones (opcional)</label>
                          <input
                            type="text"
                            className="ds-input"
                            placeholder="Ej: Turno noche, zona norte, disponibilidad fines de semana"
                            value={driverForm.notes || ''}
                            onChange={(e) => setDriverForm({ ...driverForm, notes: e.target.value })}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                          <button type="button" className="ds-btn ds-btn-sm ds-btn-secondary" onClick={() => setDriverForm(null)}>
                            Cancelar
                          </button>
                          <button type="submit" className="ds-btn ds-btn-sm ds-btn-primary" disabled={savingDriver}>
                            {savingDriver ? 'Guardando…' : (driverForm.id ? 'Guardar Cambios' : 'Registrar Mensajero')}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* TABLA DE MENSAJEROS */}
                  {loadingDrivers ? (
                    <div className="ds-loader-container"><div className="ds-loader" /><p>Cargando mensajeros…</p></div>
                  ) : driversList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 20px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px dashed var(--ds-border-subtle)' }}>
                      <Bike size={32} style={{ opacity: 0.4, margin: '0 auto 10px' }} />
                      <strong style={{ display: 'block', fontSize: '15px', color: 'var(--ds-text-primary)' }}>
                        No hay mensajeros registrados para {activeModalCompany.name}
                      </strong>
                      <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', margin: '4px 0 14px 0' }}>
                        Registra los domiciliarios de esta empresa para permitirles usar la app Distrito Delivery y rastrear su GPS en vivo.
                      </p>
                      <button type="button" className="ds-btn ds-btn-sm ds-btn-primary" onClick={handleNewDriver}>
                        <Plus size={16} /> Agregar Primer Mensajero
                      </button>
                    </div>
                  ) : (
                    <div className="ds-table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                      <table className="ds-table" style={{ fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th>Mensajero</th>
                            <th>Estado App & GPS</th>
                            <th>Teléfono</th>
                            <th>Vehículo / Placa</th>
                            <th>Entregas</th>
                            <th>Acceso WhatsApp</th>
                            <th style={{ textAlign: 'right' }}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {driversList.map((driver) => (
                            <tr key={driver.id}>
                              <td>
                                <strong style={{ color: 'var(--ds-text-primary)' }}>{driver.name}</strong>
                                {driver.app_username && (
                                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--ds-primary)', fontWeight: 600 }}>
                                    @{driver.app_username}
                                  </span>
                                )}
                                {driver.notes && <small className="ds-block-muted">{driver.notes}</small>}
                              </td>
                              <td>
                                {driver.has_app_account ? (
                                  <div>
                                    {driver.live_status === 'Ocupado' && (
                                      <span className="ds-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                        ● En Turno (Ocupado)
                                      </span>
                                    )}
                                    {driver.live_status === 'Libre' && (
                                      <span className="ds-badge" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                        ● Conectado (Libre)
                                      </span>
                                    )}
                                    {driver.live_status === 'Desconectado' && (
                                      <span className="ds-badge ds-badge-neutral">
                                        ○ Desconectado
                                      </span>
                                    )}
                                    {driver.current_latitude && driver.current_longitude && (
                                      <small style={{ display: 'block', color: 'var(--ds-text-muted)', fontSize: '11px', marginTop: '2px' }}>
                                        GPS: {Number(driver.current_latitude).toFixed(4)}, {Number(driver.current_longitude).toFixed(4)}
                                      </small>
                                    )}
                                  </div>
                                ) : (
                                  <span className="ds-badge ds-badge-neutral" style={{ opacity: 0.7 }}>
                                    Sin cuenta de app
                                  </span>
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Phone size={13} color="var(--ds-text-muted)" />
                                  <span>{driver.phone}</span>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{driver.vehicle_type || 'Moto'}</span>
                                  {driver.vehicle_plate && (
                                    <span style={{ padding: '2px 6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}>
                                      {driver.vehicle_plate}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <strong style={{ color: 'var(--ds-text-primary)' }}>{driver.completed_deliveries || 0}</strong>
                                {Number(driver.active_deliveries || 0) > 0 && (
                                  <span className="ds-badge" style={{ display: 'inline-block', marginLeft: '4px', backgroundColor: 'rgba(212, 160, 23, 0.2)', color: 'var(--ds-primary)' }}>
                                    {driver.active_deliveries} en ruta
                                  </span>
                                )}
                              </td>
                              <td>
                                {driver.has_app_account ? (
                                  <a
                                    href={getWhatsAppAccessLink(driver)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ds-btn ds-btn-xs"
                                    style={{
                                      backgroundColor: 'rgba(34, 197, 94, 0.15)',
                                      color: '#22C55E',
                                      border: '1px solid rgba(34, 197, 94, 0.3)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px'
                                    }}
                                    title="Enviar mensaje de WhatsApp con enlace y datos de acceso a la app"
                                  >
                                    <MessageCircle size={13} /> Enviar Acceso
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    className="ds-btn ds-btn-xs ds-btn-secondary"
                                    onClick={() => handleEditDriver(driver)}
                                    title="Crear cuenta en la app para este mensajero"
                                  >
                                    <KeyRound size={12} /> Activar App
                                  </button>
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                  <button
                                    type="button"
                                    className="ds-btn ds-btn-icon ds-btn-secondary ds-btn-sm"
                                    onClick={() => handleEditDriver(driver)}
                                    title="Editar datos del mensajero"
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    className="ds-btn ds-btn-icon ds-btn-secondary ds-btn-sm"
                                    onClick={() => toggleDriver(driver)}
                                    title={driver.status === 'Activo' ? 'Desactivar mensajero' : 'Activar mensajero'}
                                  >
                                    <Power size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    className="ds-btn ds-btn-icon ds-btn-danger ds-btn-sm"
                                    onClick={() => deleteDriver(driver)}
                                    title="Eliminar mensajero"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* ================= PESTAÑA 2: HISTORIAL DE PEDIDOS DE LA EMPRESA ================= */}
              {modalTab === 'orders' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '14px', color: 'var(--ds-text-primary)', fontWeight: 600 }}>
                        Trazabilidad y Liquidación de Pedidos
                      </span>
                      <small style={{ display: 'block', color: 'var(--ds-text-muted)', fontSize: '12px' }}>
                        Consulta todos los pedidos despachados con {activeModalCompany.name} y el mensajero que los entregó.
                      </small>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <select
                        className="ds-select"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        value={orderDriverFilter}
                        onChange={(e) => {
                          setOrderDriverFilter(e.target.value);
                          loadCompanyOrders(activeModalCompany.id, e.target.value, orderStatusFilter);
                        }}
                      >
                        <option value="">Todos los mensajeros</option>
                        {driversList.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>

                      <select
                        className="ds-select"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        value={orderStatusFilter}
                        onChange={(e) => {
                          setOrderStatusFilter(e.target.value);
                          loadCompanyOrders(activeModalCompany.id, orderDriverFilter, e.target.value);
                        }}
                      >
                        <option value="">Todos los estados</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Asignado externo">Asignado</option>
                        <option value="En camino">En camino</option>
                        <option value="Entregado">Entregado</option>
                      </select>

                      <button
                        type="button"
                        className="ds-btn ds-btn-sm ds-btn-secondary"
                        onClick={() => loadCompanyOrders(activeModalCompany.id, orderDriverFilter, orderStatusFilter)}
                        title="Refrescar lista de pedidos"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>

                  {loadingOrders ? (
                    <div className="ds-loader-container"><div className="ds-loader" /><p>Cargando pedidos de la empresa…</p></div>
                  ) : companyOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 20px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px dashed var(--ds-border-subtle)' }}>
                      <ShoppingBag size={32} style={{ opacity: 0.4, margin: '0 auto 10px' }} />
                      <strong style={{ display: 'block', fontSize: '15px', color: 'var(--ds-text-primary)' }}>
                        No hay pedidos asignados a {activeModalCompany.name}
                      </strong>
                      <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', margin: '4px 0 0 0' }}>
                        Cuando asignes pedidos a esta empresa o a sus mensajeros desde la pantalla de Pedidos, se registrarán aquí automáticamente.
                      </p>
                    </div>
                  ) : (
                    <div className="ds-table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                      <table className="ds-table" style={{ fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th>Pedido</th>
                            <th>Cliente / Dirección</th>
                            <th>Mensajero Asignado</th>
                            <th>Costo Empresa</th>
                            <th>Margen Logístico</th>
                            <th>Estado</th>
                            <th>Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companyOrders.map((ord) => (
                            <tr key={ord.id}>
                              <td>
                                <strong style={{ color: 'var(--ds-primary)', fontSize: '14px' }}>#{ord.id}</strong>
                                <small style={{ display: 'block', color: 'var(--ds-text-muted)' }}>{formatCurrency(ord.total || 0)}</small>
                              </td>
                              <td>
                                <strong style={{ color: 'var(--ds-text-primary)' }}>{ord.customer_name || 'Cliente'}</strong>
                                <small style={{ display: 'block', color: 'var(--ds-text-muted)' }}>{ord.address || 'Sin dirección'}</small>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Bike size={13} color="var(--ds-primary)" />
                                  <span>{ord.registered_driver_name || ord.external_driver_name || 'Sin mensajero asignado'}</span>
                                </div>
                                {ord.registered_driver_phone && (
                                  <small style={{ display: 'block', color: 'var(--ds-text-muted)' }}>{ord.registered_driver_phone}</small>
                                )}
                              </td>
                              <td>
                                <strong>{formatCurrency(ord.external_delivery_cost || 0)}</strong>
                              </td>
                              <td>
                                <strong style={{ color: Number(ord.logistics_margin || 0) < 0 ? '#EF4444' : '#22C55E' }}>
                                  {formatCurrency(ord.logistics_margin || 0)}
                                </strong>
                              </td>
                              <td>
                                <span className={`ds-badge ds-badge-${
                                  ord.delivery_status === 'Entregado' ? 'success' :
                                  ord.delivery_status === 'En camino' ? 'warning' : 'neutral'
                                }`}>
                                  {ord.delivery_status || ord.status}
                                </span>
                              </td>
                              <td>
                                <small style={{ color: 'var(--ds-text-muted)' }}>
                                  {new Date(ord.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </small>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

            </div>

            <div className="ds-modal-footer">
              <button type="button" className="ds-btn ds-btn-secondary" onClick={() => setActiveModalCompany(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
