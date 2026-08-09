import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays, Download, Mail, MessageCircle, Phone, Plus, RefreshCw,
  ShieldAlert, ShoppingBag, Star, TrendingUp, User, Users, X,
} from 'lucide-react';
import ModernSearchField from '../components/ModernSearchField';
import { API_URL } from '../config/api';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { readApiJson } from '../utils/http';

const EMPTY = { name: '', phone: '', email: '', address: '', barrio: '', status: 'Activo', tags: [], notes: '', birthday: '', marketing_opt_in: false };
const authHeaders = () => ({ Authorization: `Bearer ${sessionStorage.getItem('distrito_admin_token')}` });

export default function AdminClientes() {
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, vip: 0, at_risk: 0, lifetime_value: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', segment: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [orders, setOrders] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page, limit: 25, ...filters });
      const response = await fetch(`${API_URL}/admin/customers?${query}`, { headers: authHeaders() });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'No fue posible cargar los clientes.');
      setCustomers(data.customers || []); setSummary(data.summary || {}); setPagination(data.pagination || { page: 1, pages: 1 });
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
    finally { setLoading(false); }
  }, [filters]);
  useEffect(() => { const timer = setTimeout(() => load(1), 250); return () => clearTimeout(timer); }, [load]);

  const openCustomer = async (customer) => {
    setSelected(customer); setForm({ ...EMPTY, ...customer, birthday: customer.birthday?.slice(0, 10) || '', tags: customer.tags || [] }); setOrders([]);
    try {
      const response = await fetch(`${API_URL}/admin/customers/${customer.id}`, { headers: authHeaders() });
      const data = await readApiJson(response); if (!response.ok) throw new Error(data.error);
      setSelected(data.customer); setForm({ ...EMPTY, ...data.customer, birthday: data.customer.birthday?.slice(0, 10) || '', tags: data.customer.tags || [] }); setOrders(data.orders || []);
    } catch (error) { setNotice({ type: 'error', text: error.message || 'No fue posible cargar el perfil.' }); }
  };
  const createCustomer = () => { setSelected({ id: null }); setForm(EMPTY); setOrders([]); };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setNotice(null);
    try {
      const response = await fetch(selected.id ? `${API_URL}/admin/customers/${selected.id}` : `${API_URL}/admin/customers`, {
        method: selected.id ? 'PUT' : 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const data = await readApiJson(response); if (!response.ok) throw new Error(data.error);
      setSelected(null); setNotice({ type: 'success', text: 'Perfil del cliente guardado.' }); await load(pagination.page);
    } catch (error) { setNotice({ type: 'error', text: error.message || 'No fue posible guardar.' }); }
    finally { setSaving(false); }
  };
  const contact = async (type) => {
    if (!selected?.id) return;
    fetch(`${API_URL}/admin/customers/${selected.id}/contact`, { method: 'POST', headers: authHeaders() }).catch(() => {});
    if (type === 'whatsapp') { const digits = String(form.phone).replace(/\D/g, ''); const destination = digits.startsWith('57') ? digits : `57${digits}`; window.open(`https://wa.me/${destination}`, '_blank', 'noopener,noreferrer'); }
    else window.location.href = `tel:${form.phone}`;
  };
  const exportCsv = () => {
    const rows = [['Nombre','Teléfono','Correo','Barrio','Segmento','Pedidos','Total comprado'], ...customers.map((item) => [item.name,item.phone,item.email || '',item.barrio || '',item.segment,item.orders_count,item.total_spent])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'clientes-distrito-bg.csv'; link.click(); URL.revokeObjectURL(url);
  };

  return <div className="ds-page customer-page">
    <header className="ds-page-header"><div><span className="ds-page-kicker">Relación con clientes</span><h1 className="ds-page-title">Clientes</h1><p className="ds-page-subtitle">Historial, segmentación y datos de contacto conectados directamente con los pedidos.</p></div><div className="ds-page-actions"><button className="ds-btn ds-btn-secondary" onClick={exportCsv} disabled={!customers.length}><Download size={18} /> Exportar</button><button className="ds-btn ds-btn-primary" onClick={createCustomer}><Plus size={18} /> Nuevo cliente</button></div></header>
    {notice && <div className={`ds-inline-alert ds-inline-alert-${notice.type === 'success' ? 'success' : 'danger'}`}>{notice.text}</div>}
    <section className="customer-kpis"><article><Users /><div><strong>{summary.total || 0}</strong><span>Clientes</span></div></article><article><User /><div><strong>{summary.active || 0}</strong><span>Activos</span></div></article><article><Star /><div><strong>{summary.vip || 0}</strong><span>VIP</span></div></article><article><ShieldAlert /><div><strong>{summary.at_risk || 0}</strong><span>En riesgo</span></div></article><article><TrendingUp /><div><strong>{formatCurrency(summary.lifetime_value)}</strong><span>Valor histórico</span></div></article></section>
    <section className="ds-card customer-directory"><div className="customer-toolbar"><ModernSearchField value={filters.search} onChange={(search) => setFilters((current) => ({ ...current, search }))} placeholder="Nombre, teléfono, correo o barrio" helper="Busca por nombre, teléfono, correo o barrio." loading={loading} resultCount={pagination.total} resultLabel="clientes" /><select className="ds-select" aria-label="Filtrar por segmento" value={filters.segment} onChange={(e) => setFilters({ ...filters, segment: e.target.value })}><option value="">Todos los segmentos</option><option>VIP</option><option>Frecuente</option><option>Nuevo</option><option>En riesgo</option><option>Sin pedidos</option></select><select className="ds-select" aria-label="Filtrar por estado" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Todos los estados</option><option>Activo</option><option>Inactivo</option><option>Bloqueado</option></select><button className="ds-btn ds-btn-ghost" title="Actualizar clientes" aria-label="Actualizar clientes" onClick={() => load(pagination.page)}><RefreshCw size={18} /></button></div>
      {loading ? <div className="ds-loader-container"><div className="ds-loader" /><p>Cargando clientes…</p></div> : customers.length ? <><div className="ds-table-container customer-table"><table className="ds-table"><thead><tr><th>Cliente</th><th>Segmento</th><th>Último pedido</th><th>Pedidos</th><th>Ticket promedio</th><th>Total comprado</th><th></th></tr></thead><tbody>{customers.map((item) => <tr key={item.id}><td><div className="customer-name"><span>{item.name?.[0]?.toUpperCase() || '?'}</span><div><strong>{item.name || 'Sin nombre'}</strong><small>{item.phone} · {item.barrio || 'Sin barrio'}</small></div></div></td><td><span className={`customer-segment segment-${String(item.segment).toLowerCase().replaceAll(' ', '-')}`}>{item.segment}</span></td><td>{formatDateTime(item.last_order_at)}</td><td>{item.orders_count}</td><td>{formatCurrency(item.average_ticket)}</td><td><strong>{formatCurrency(item.total_spent)}</strong></td><td><button className="ds-btn ds-btn-ghost ds-btn-sm" onClick={() => openCustomer(item)}>Ver perfil</button></td></tr>)}</tbody></table></div><div className="customer-mobile-list">{customers.map((item) => <button key={item.id} onClick={() => openCustomer(item)}><div className="customer-name"><span>{item.name?.[0]?.toUpperCase() || '?'}</span><div><strong>{item.name}</strong><small>{item.phone} · {item.barrio || 'Sin barrio'}</small></div></div><span className="customer-segment">{item.segment}</span><dl><div><dt>Pedidos</dt><dd>{item.orders_count}</dd></div><div><dt>Total</dt><dd>{formatCurrency(item.total_spent)}</dd></div></dl></button>)}</div><footer className="customer-pagination"><span>{pagination.total} clientes encontrados</span><div><button className="ds-btn ds-btn-secondary ds-btn-sm" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>Anterior</button><strong>{pagination.page} / {pagination.pages}</strong><button className="ds-btn ds-btn-secondary ds-btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1)}>Siguiente</button></div></footer></> : <div className="ds-empty-state"><Users /><h3>No hay clientes para estos filtros</h3><p>Los nuevos pedidos alimentarán este directorio automáticamente.</p></div>}
    </section>

    {selected && <div className="ds-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setSelected(null); }}><div className="ds-modal ds-modal-xl customer-modal" role="dialog" aria-modal="true"><form onSubmit={save}><div className="ds-modal-header"><div><span className="ds-page-kicker">{selected.id ? 'Perfil 360°' : 'Registro manual'}</span><h2 className="ds-modal-title">{form.name || 'Nuevo cliente'}</h2></div><button type="button" className="ds-modal-close" onClick={() => setSelected(null)}><X /></button></div><div className="ds-modal-body customer-profile-grid"><section className="ds-form customer-profile-form"><div className="ds-form-grid"><label className="ds-form-group"><span className="ds-form-label">Nombre</span><input className="ds-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="ds-form-group"><span className="ds-form-label">Teléfono</span><input className="ds-input" required inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label className="ds-form-group"><span className="ds-form-label">Correo</span><input className="ds-input" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label className="ds-form-group"><span className="ds-form-label">Fecha de cumpleaños</span><input className="ds-input" type="date" value={form.birthday || ''} onChange={(e) => setForm({ ...form, birthday: e.target.value })} /></label><label className="ds-form-group"><span className="ds-form-label">Barrio</span><input className="ds-input" value={form.barrio || ''} onChange={(e) => setForm({ ...form, barrio: e.target.value })} /></label><label className="ds-form-group"><span className="ds-form-label">Estado</span><select className="ds-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Activo</option><option>Inactivo</option><option>Bloqueado</option></select></label></div><label className="ds-form-group"><span className="ds-form-label">Dirección principal</span><input className="ds-input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label><label className="ds-form-group"><span className="ds-form-label">Etiquetas separadas por coma</span><input className="ds-input" value={(form.tags || []).join(', ')} onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })} placeholder="VIP, cumpleaños, empresa" /></label><label className="ds-form-group"><span className="ds-form-label">Notas internas</span><textarea className="ds-textarea" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label><label className="ds-checkbox"><input type="checkbox" checked={form.marketing_opt_in} onChange={(e) => setForm({ ...form, marketing_opt_in: e.target.checked })} /><span>Acepta comunicaciones comerciales</span></label></section><aside className="customer-profile-side">{selected.id && <><div className="customer-contact-actions"><button type="button" className="ds-btn ds-btn-success" onClick={() => contact('whatsapp')}><MessageCircle /> WhatsApp</button><button type="button" className="ds-btn ds-btn-secondary" onClick={() => contact('phone')}><Phone /> Llamar</button>{form.email && <a className="ds-btn ds-btn-secondary" href={`mailto:${form.email}`}><Mail /> Correo</a>}</div><div className="customer-profile-metrics"><article><ShoppingBag /><div><strong>{selected.orders_count || 0}</strong><span>Pedidos</span></div></article><article><TrendingUp /><div><strong>{formatCurrency(selected.total_spent)}</strong><span>Total comprado</span></div></article><article><Star /><div><strong>{formatCurrency(selected.average_ticket)}</strong><span>Ticket promedio</span></div></article><article><CalendarDays /><div><strong>{formatDateTime(selected.last_order_at)}</strong><span>Última compra</span></div></article></div><div className="customer-order-history"><h3>Últimos pedidos</h3>{orders.length ? orders.map((order) => <article key={order.id}><div><strong>#{order.id}</strong><span className="ds-badge ds-badge-neutral">{order.status}</span></div><p>{formatDateTime(order.created_at)} · {order.delivery_type}</p><b>{formatCurrency(order.total)}</b></article>) : <p className="ds-text-muted">Aún no registra pedidos.</p>}</div></>}</aside></div><div className="ds-modal-footer"><button type="button" className="ds-btn ds-btn-secondary" onClick={() => setSelected(null)}>Cancelar</button><button className="ds-btn ds-btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar perfil'}</button></div></form></div></div>}
  </div>;
}
