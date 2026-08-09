import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle, Clock3, DollarSign, Edit3, Plus, Power, RefreshCw, Truck, X } from 'lucide-react';
import { API_URL } from '../config/api';
import { formatCurrency } from '../utils/formatters';
import { readApiJson } from '../utils/http';

const EMPTY = {
  id: null, name: '', phone: '', status: 'Activa', observations: '', default_fee: 0,
  estimated_delivery_minutes: 45, integration_type: 'manual',
};
const authHeaders = () => ({ Authorization: `Bearer ${sessionStorage.getItem('distrito_admin_token')}` });

export default function AdminDeliveryCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState(null);

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
    completed: sum.completed + Number(company.completed_count || 0),
    pending: sum.pending + Number(company.pending_count || 0),
    paid: sum.paid + Number(company.paid_total || 0),
  }), { active: 0, completed: 0, pending: 0, paid: 0 }), [companies]);

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

  return <div className="ds-page delivery-company-page">
    <header className="ds-page-header"><div><span className="ds-page-kicker">Red logística</span><h1 className="ds-page-title">Empresas de Domicilios</h1><p className="ds-page-subtitle">Administra operadores aliados, tarifas, tiempos y resultados sin mezclar sus costos con lo cobrado al cliente.</p></div><div className="ds-page-actions"><button className="ds-btn ds-btn-secondary" onClick={load}><RefreshCw size={18}/> Actualizar</button><button className="ds-btn ds-btn-primary" onClick={() => setForm({ ...EMPTY })}><Plus size={18}/> Nueva empresa</button></div></header>
    {notice && <div className={`ds-inline-alert ds-inline-alert-${notice.type === 'success' ? 'success' : 'danger'}`}>{notice.text}</div>}
    <section className="delivery-company-kpis">
      <article><Building2/><div><strong>{totals.active}</strong><span>Empresas activas</span></div></article>
      <article><CheckCircle/><div><strong>{totals.completed}</strong><span>Entregas completadas</span></div></article>
      <article><Clock3/><div><strong>{totals.pending}</strong><span>Entregas pendientes</span></div></article>
      <article><DollarSign/><div><strong>{formatCurrency(totals.paid)}</strong><span>Costos completados</span></div></article>
    </section>
    <section className="ds-card">
      {loading ? <div className="ds-loader-container"><div className="ds-loader"/><p>Cargando operadores…</p></div> : companies.length ? <div className="ds-table-container"><table className="ds-table"><thead><tr><th>Empresa</th><th>Tarifa / ETA</th><th>Entregas</th><th>Dinero pagado</th><th>Estado</th><th></th></tr></thead><tbody>{companies.map((company) => <tr key={company.id}><td><div className="delivery-company-name"><span><Truck size={18}/></span><div><strong>{company.name}</strong><small>{company.phone} · {company.integration_type === 'api' ? 'Preparada para API' : 'Operación manual'}</small></div></div></td><td><strong>{formatCurrency(company.default_fee)}</strong><small className="ds-block-muted">{company.estimated_delivery_minutes ? `${company.estimated_delivery_minutes} min estimados` : 'Sin ETA'}</small></td><td><strong>{company.completed_count || 0} entregadas</strong><small className="ds-block-muted">{company.pending_count || 0} pendientes · {company.deliveries_count || 0} total</small></td><td><strong>{formatCurrency(company.paid_total)}</strong></td><td><span className={`ds-badge ds-badge-${company.status === 'Activa' ? 'success' : 'neutral'}`}>{company.status}</span></td><td><div className="delivery-company-actions"><button className="ds-btn ds-btn-icon ds-btn-secondary ds-btn-sm" onClick={() => setForm({ ...EMPTY, ...company })} title="Editar"><Edit3 size={16}/></button><button className="ds-btn ds-btn-icon ds-btn-secondary ds-btn-sm" onClick={() => toggle(company)} disabled={saving} title={company.status === 'Activa' ? 'Desactivar' : 'Activar'}><Power size={16}/></button></div></td></tr>)}</tbody></table></div> : <div className="ds-empty-state"><Building2/><h3>Aún no hay empresas externas</h3><p>Registra el primer operador para habilitarlo en “Asignar entrega”.</p><button className="ds-btn ds-btn-primary" onClick={() => setForm({ ...EMPTY })}>Crear empresa</button></div>}
    </section>
    {form && <div className="ds-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && !saving && setForm(null)}><div className="ds-modal ds-modal-lg" role="dialog" aria-modal="true"><form onSubmit={save}><div className="ds-modal-header"><div><span className="ds-page-kicker">{form.id ? `Operador #${form.id}` : 'Nuevo operador'}</span><h2 className="ds-modal-title">Datos de la empresa</h2></div><button type="button" className="ds-modal-close" onClick={() => setForm(null)}><X/></button></div><div className="ds-modal-body ds-form"><div className="ds-form-grid"><label className="ds-form-group"><span className="ds-form-label">Nombre</span><input className="ds-input" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label><label className="ds-form-group"><span className="ds-form-label">Teléfono</span><input className="ds-input" required inputMode="tel" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}/></label><label className="ds-form-group"><span className="ds-form-label">Tarifa predeterminada</span><input className="ds-input" type="number" min="0" step="100" value={form.default_fee} onChange={(e) => setForm({ ...form, default_fee: Number(e.target.value) })}/></label><label className="ds-form-group"><span className="ds-form-label">Tiempo estimado (minutos)</span><input className="ds-input" type="number" min="1" max="1440" value={form.estimated_delivery_minutes || ''} onChange={(e) => setForm({ ...form, estimated_delivery_minutes: e.target.value ? Number(e.target.value) : null })}/></label><label className="ds-form-group"><span className="ds-form-label">Estado</span><select className="ds-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Activa</option><option>Inactiva</option></select></label><label className="ds-form-group"><span className="ds-form-label">Tipo de integración</span><select className="ds-select" value={form.integration_type} onChange={(e) => setForm({ ...form, integration_type: e.target.value })}><option value="manual">Manual</option><option value="api">API futura</option></select></label></div><label className="ds-form-group"><span className="ds-form-label">Observaciones</span><textarea className="ds-textarea" maxLength={3000} value={form.observations || ''} onChange={(e) => setForm({ ...form, observations: e.target.value })} placeholder="Cobertura, horarios, condiciones de pago o contactos alternos"/></label><div className="ds-inline-alert ds-inline-alert-info">La opción API solo prepara la clasificación del proveedor. No envía datos a terceros ni requiere credenciales hasta que se implemente una integración.</div></div><div className="ds-modal-footer"><button type="button" className="ds-btn ds-btn-secondary" onClick={() => setForm(null)}>Cancelar</button><button className="ds-btn ds-btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar empresa'}</button></div></form></div></div>}
  </div>;
}
