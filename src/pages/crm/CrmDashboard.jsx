import React, { useEffect, useState } from 'react';
import { Activity, Contact, Crown, MessageCircle, RefreshCw, Repeat2, Target, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { crmRequest, crmStatusLabel, crmStatusTone } from './crmApi';

export default function CrmDashboard({ revision, notify }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { setData(await crmRequest('/dashboard')); }
    catch (error) { notify('error', error.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [revision]);
  if (loading && !data) return <div className="ds-loader-container"><div className="ds-loader" /><p>Calculando indicadores comerciales…</p></div>;
  const summary = data?.summary || {};
  const maximum = Math.max(1, ...(data?.funnel || []).map((item) => Number(item.count)));
  return <div className="crm-dashboard-grid">
    <section className="crm-kpis">
      <article><Contact /><div><strong>{summary.prospects || 0}</strong><span>Prospectos</span></div></article>
      <article><Users /><div><strong>{summary.customers || 0}</strong><span>Clientes</span></div></article>
      <article><Repeat2 /><div><strong>{summary.recurring || 0}</strong><span>Recurrentes</span></div></article>
      <article><Crown /><div><strong>{summary.vip || 0}</strong><span>VIP</span></div></article>
      <article><MessageCircle /><div><strong>{summary.unanswered || 0}</strong><span>Sin responder</span></div></article>
      <article><Target /><div><strong>{summary.conversion_rate || 0}%</strong><span>WhatsApp → compra</span></div></article>
      <article><TrendingUp /><div><strong>{formatCurrency(summary.attributed_revenue)}</strong><span>Ventas atribuidas</span></div></article>
      <article><Activity /><div><strong>{summary.active_campaigns || 0}</strong><span>Campañas activas</span></div></article>
    </section>
    <section className="ds-card crm-panel">
      <header><div><span className="ds-page-kicker">Embudo vivo</span><h2>Estado de la base comercial</h2></div><button className="ds-btn ds-btn-ghost ds-btn-sm" onClick={load}><RefreshCw size={16} /> Actualizar</button></header>
      <div className="crm-funnel-list">{(data?.funnel || []).map((item) => <article key={item.status}><div><span className={`ds-badge ds-badge-${crmStatusTone(item.status)}`}>{crmStatusLabel(item.status)}</span><strong>{item.count}</strong></div><div className="crm-progress"><i style={{ width: `${Math.max(3, (Number(item.count) / maximum) * 100)}%` }} /></div></article>)}</div>
    </section>
    <section className="ds-card crm-panel crm-activity-panel">
      <header><div><span className="ds-page-kicker">Trazabilidad</span><h2>Actividad reciente</h2></div><Link className="ds-btn ds-btn-secondary ds-btn-sm" to="/admin/crm/contactos">Ver contactos</Link></header>
      <div className="crm-activity-list">{(data?.activity || []).length ? data.activity.map((item) => <article key={item.id}><span><Activity size={15} /></span><div><strong>{item.display_name || 'Actividad del sistema'}</strong><p>{item.summary}</p><small>{formatDateTime(item.occurred_at)}</small></div></article>) : <div className="ds-empty-state"><Activity /><h3>Aún no hay actividad CRM</h3><p>Los mensajes y pedidos aparecerán aquí automáticamente.</p></div>}</div>
    </section>
    <section className="ds-card crm-panel crm-source-panel">
      <header><div><span className="ds-page-kicker">Adquisición</span><h2>Fuentes de contacto</h2></div></header>
      <div className="crm-source-list">{(data?.sources || []).map((item) => <article key={item.source}><span>{item.source.replaceAll('_', ' ')}</span><strong>{item.count}</strong></article>)}</div>
    </section>
  </div>;
}
