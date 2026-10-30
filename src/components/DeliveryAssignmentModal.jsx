import React, { useEffect, useMemo, useState } from 'react';
import { Bike, Building2, CheckCircle, Loader2, Truck, X } from 'lucide-react';
import { API_URL } from '../config/api';
import { readApiJson } from '../utils/http';

const authHeaders = () => ({ Authorization: `Bearer ${sessionStorage.getItem('distrito_admin_token')}` });

export default function DeliveryAssignmentModal({ order, onClose, onSuccess }) {
  const [mode, setMode] = useState('own');
  const [drivers, setDrivers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [driverId, setDriverId] = useState('');
  const [form, setForm] = useState({ companyId: '', driverName: '', driverPhone: '', vehicleId: '', externalCost: 0, etaMinutes: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${API_URL}/admin/delivery/overview`, { headers: authHeaders() }).then(readApiJson),
      fetch(`${API_URL}/admin/delivery-companies`, { headers: authHeaders() }).then(readApiJson),
    ]).then(([overview, companyData]) => {
      if (cancelled) return;
      setDrivers(overview.drivers || []);
      setCompanies((companyData.companies || []).filter((item) => item.status === 'Activa'));
    }).catch((requestError) => setError(requestError.message)).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const ownDrivers = useMemo(() => drivers.filter((driver) => !driver.external_company_id), [drivers]);
  // Domiciliarios propios de Distric House (sin exigir app delivery ni GPS en vivo)
  const eligibleDrivers = useMemo(() => ownDrivers.filter((driver) => driver.status !== 'Inactivo'), [ownDrivers]);

  useEffect(() => {
    if (!driverId && eligibleDrivers.length > 0) {
      setDriverId(String(eligibleDrivers[0].id));
    }
  }, [eligibleDrivers, driverId]);

  const selectedCompany = useMemo(() => {
    return companies.find((item) => Number(item.id) === Number(form.companyId));
  }, [companies, form.companyId]);

  const selectCompany = (companyId) => {
    const company = companies.find((item) => Number(item.id) === Number(companyId));
    setForm((current) => ({
      ...current,
      companyId,
      externalCost: Number(company?.default_fee || 0),
      etaMinutes: company?.estimated_delivery_minutes || '',
      externalDriverId: '',
      driverName: '',
      driverPhone: '',
      vehicleId: ''
    }));
  };

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const isOwn = mode === 'own';
      if (isOwn && !driverId) throw new Error('Selecciona un domiciliario de Distric House.');
      if (!isOwn && !form.companyId) throw new Error('Selecciona una empresa activa.');
      const response = await fetch(
        isOwn ? `${API_URL}/admin/delivery/orders/${order.id}/assign` : `${API_URL}/admin/delivery/orders/${order.id}/assign-external`,
        {
          method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(isOwn ? { userId: Number(driverId) } : { ...form, companyId: Number(form.companyId), externalDriverId: form.externalDriverId || null }),
        },
      );
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'No fue posible asignar la entrega.');
      onSuccess?.(data.order, isOwn ? 'Mensaje enviado al domiciliario' : null); onClose();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };

  return <div className="ds-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}><div className="ds-modal ds-modal-lg delivery-assignment-modal" role="dialog" aria-modal="true"><form onSubmit={submit}><div className="ds-modal-header"><div><span className="ds-page-kicker">Pedido #{String(order?.id || '').padStart(4, '0')}</span><h2 className="ds-modal-title">Asignar entrega</h2></div><button type="button" className="ds-modal-close" onClick={onClose}><X/></button></div><div className="ds-modal-body ds-form">
    {loading ? <div className="ds-loader-container"><div className="ds-loader"/><p>Consultando capacidad logística…</p></div> : <>
      <div className="delivery-assignment-summary">
        <span><CheckCircle size={16}/>{eligibleDrivers.length} domiciliario(s) propio(s) activo(s)</span>
        <span><Building2 size={16}/>{companies.length} empresas activas</span>
      </div>
      <div className="delivery-assignment-types">
        <button type="button" className={mode === 'own' ? 'active' : ''} onClick={() => setMode('own')}>
          <Bike/><strong>Domiciliario Distric House</strong>
          <small>Asignación directa a domiciliario interno sin necesidad de app ni GPS.</small>
        </button>
        <button type="button" className={mode === 'external' ? 'active' : ''} onClick={() => setMode('external')}>
          <Building2/><strong>Empresa externa</strong>
          <small>Seguimiento por estados logísticos y aliado externo.</small>
        </button>
      </div>
      {mode === 'own' ? <label className="ds-form-group">
        <span className="ds-form-label">Domiciliario de Distric House</span>
        <select className="ds-select" required value={driverId} onChange={(e) => setDriverId(e.target.value)}>
          <option value="">Seleccionar domiciliario…</option>
          {eligibleDrivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name || driver.username} {driver.phone ? `· Cel: ${driver.phone}` : ''} {driver.plate ? `· Moto: ${driver.plate}` : ''}
            </option>
          ))}
        </select>
        {!eligibleDrivers.length && <small className="delivery-assignment-warning">No hay domiciliarios registrados o activos con rol Domiciliario. Puedes registrarlos en el menú de Usuarios o usar una empresa externa.</small>}
      </label> : <div className="ds-form"><div className="ds-form-grid"><label className="ds-form-group"><span className="ds-form-label">Empresa</span><select className="ds-select" required value={form.companyId} onChange={(e) => selectCompany(e.target.value)}><option value="">Seleccionar…</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name} · ${Number(company.default_fee || 0).toLocaleString('es-CO')}</option>)}</select></label><label className="ds-form-group"><span className="ds-form-label">Costo externo</span><input className="ds-input" required type="number" min="0" step="100" value={form.externalCost} onChange={(e) => setForm({ ...form, externalCost: Number(e.target.value) })}/></label>
      {selectedCompany && (selectedCompany.active_drivers || []).length > 0 && (
        <label className="ds-form-group" style={{ gridColumn: '1 / -1' }}>
          <span className="ds-form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Bike size={14} color="var(--ds-primary)"/> Mensajero registrado de {selectedCompany.name} (auto-rellenar)
          </span>
          <select
            className="ds-select"
            value={form.externalDriverId || ''}
            onChange={(e) => {
              const selectedId = Number(e.target.value);
              const drv = (selectedCompany.active_drivers || []).find((d) => Number(d.id) === selectedId);
              if (drv) {
                setForm(cur => ({
                  ...cur,
                  externalDriverId: drv.id,
                  driverName: drv.name,
                  driverPhone: drv.phone,
                  vehicleId: drv.vehicle_plate || ''
                }));
              } else {
                setForm(cur => ({
                  ...cur,
                  externalDriverId: '',
                  driverName: '',
                  driverPhone: '',
                  vehicleId: ''
                }));
              }
            }}
          >
            <option value="">Seleccionar mensajero de la lista o ingresar manual abajo…</option>
            {(selectedCompany.active_drivers || []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.has_app_account ? '· 📱 App Activa (GPS en vivo)' : ''} · {d.vehicle_type} {d.vehicle_plate ? `(${d.vehicle_plate})` : ''} · Cel: {d.phone}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="ds-form-group"><span className="ds-form-label">Nombre del Domiciliario</span><input className="ds-input" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} placeholder="Nombre si está disponible"/></label><label className="ds-form-group"><span className="ds-form-label">Teléfono</span><input className="ds-input" inputMode="tel" value={form.driverPhone} onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}/></label><label className="ds-form-group"><span className="ds-form-label">Placa / identificación</span><input className="ds-input" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}/></label><label className="ds-form-group"><span className="ds-form-label">ETA (minutos)</span><input className="ds-input" type="number" min="1" max="1440" value={form.etaMinutes} onChange={(e) => setForm({ ...form, etaMinutes: e.target.value ? Number(e.target.value) : '' })}/></label></div><label className="ds-form-group"><span className="ds-form-label">Observaciones logísticas</span><textarea className="ds-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></label><div className="delivery-cost-preview"><span>Domicilio cobrado al cliente <strong>${Number(order.delivery_fee || 0).toLocaleString('es-CO')}</strong></span><span>Costo empresa <strong>${Number(form.externalCost || 0).toLocaleString('es-CO')}</strong></span><span>Margen logístico <strong className={Number(order.delivery_fee || 0) - Number(form.externalCost || 0) < 0 ? 'negative' : ''}>${(Number(order.delivery_fee || 0) - Number(form.externalCost || 0)).toLocaleString('es-CO')}</strong></span></div></div>}
    </>}
    {error && <div className="ds-inline-alert ds-inline-alert-danger">{error}</div>}
  </div><div className="ds-modal-footer"><button type="button" className="ds-btn ds-btn-secondary" onClick={onClose}>Cancelar</button><button className="ds-btn ds-btn-primary" disabled={loading || saving || (mode === 'own' ? !eligibleDrivers.length : !companies.length)}>{saving ? <><Loader2 size={17}/> Asignando…</> : 'Confirmar asignación'}</button></div></form></div></div>;
}
