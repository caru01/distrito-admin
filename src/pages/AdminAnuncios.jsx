import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Bell, CalendarClock, CheckCircle, CopyPlus, Eye, Image as ImageIcon,
  Megaphone, MousePointerClick, RefreshCw, Save, Send, Trash2, Upload, Users, XCircle,
} from 'lucide-react';
import { API_URL } from '../config/api';
import { readApiJson } from '../utils/http';

const EMPTY = { id: null, title: '', body: '', image_url: '', cta_label: 'Ver más', cta_url: '/', starts_at: '', ends_at: '', display_frequency: 'session', campaign_type: 'modal', audience: 'all', priority: 50, coupon_code: '', is_active: false, views_count: 0, clicks_count: 0 };
const token = () => sessionStorage.getItem('distrito_admin_token');

function toInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date).replace(' ', 'T');
}
function toIso(value) { return value ? new Date(`${value}:00-05:00`).toISOString() : null; }
function normalize(value = {}) { return { ...EMPTY, ...value, starts_at: toInput(value.starts_at), ends_at: toInput(value.ends_at), is_active: Boolean(value.is_active) }; }
function statusOf(campaign) {
  if (!campaign.is_active) return ['Borrador', 'neutral'];
  if (campaign.starts_at && new Date(`${campaign.starts_at}:00-05:00`) > new Date()) return ['Programada', 'info'];
  if (campaign.ends_at && new Date(`${campaign.ends_at}:00-05:00`) < new Date()) return ['Finalizada', 'warning'];
  return ['Publicada', 'success'];
}

export default function AdminAnuncios() {
  const [campaigns, setCampaigns] = useState([]);
  const [campaign, setCampaign] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [push, setPush] = useState({ title: '', message: '', url: '/' });
  const [pushCount, setPushCount] = useState({ customers: 0, drivers: 0 });
  const [pushBusy, setPushBusy] = useState(false);
  const status = statusOf(campaign);

  const metrics = useMemo(() => {
    const views = campaigns.reduce((sum, item) => sum + Number(item.views_count || 0), 0);
    const clicks = campaigns.reduce((sum, item) => sum + Number(item.clicks_count || 0), 0);
    return { active: campaigns.filter((item) => statusOf(normalize(item))[0] === 'Publicada').length, views, clicks, ctr: views ? (clicks / views) * 100 : 0 };
  }, [campaigns]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/announcements`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'No fue posible cargar las campañas.');
      setCampaigns(data.announcements || []);
      setCampaign((current) => current.id ? normalize((data.announcements || []).find((item) => item.id === current.id) || EMPTY) : current);
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    fetch(`${API_URL}/admin/push/subscriptions/count`, { headers: { Authorization: `Bearer ${token()}` } }).then(readApiJson).then((data) => setPushCount(data)).catch(() => {});
  }, [load]);

  const edit = (key, value) => setCampaign((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setNotice(null);
    try {
      const endpoint = campaign.id ? `${API_URL}/admin/announcements/${campaign.id}` : `${API_URL}/admin/announcements`;
      const response = await fetch(endpoint, { method: campaign.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ ...campaign, starts_at: toIso(campaign.starts_at), ends_at: toIso(campaign.ends_at) }) });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'No fue posible guardar la campaña.');
      setCampaign(normalize(data.announcement));
      setNotice({ type: 'success', text: 'Campaña guardada y sincronizada con la tienda.' });
      await load();
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!campaign.id || !window.confirm('¿Eliminar esta campaña y sus métricas?')) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/admin/announcements/${campaign.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      const data = await readApiJson(response); if (!response.ok) throw new Error(data.error);
      setCampaign(EMPTY); setNotice({ type: 'success', text: 'Campaña eliminada.' }); await load();
    } catch (error) { setNotice({ type: 'error', text: error.message || 'No fue posible eliminarla.' }); }
    finally { setBusy(false); }
  };
  const upload = (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 4 * 1024 * 1024) return setNotice({ type: 'error', text: 'Usa JPG, PNG o WebP de máximo 4 MB.' });
    const reader = new FileReader(); reader.onload = () => edit('image_url', reader.result); reader.readAsDataURL(file);
  };
  const sendPush = async (event) => {
    event.preventDefault(); setPushBusy(true); setNotice(null);
    try {
      const response = await fetch(`${API_URL}/admin/push/send`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify(push) });
      const data = await readApiJson(response); if (!response.ok) throw new Error(data.error);
      setNotice({ type: 'success', text: `Notificación enviada a ${data.sent || 0} dispositivos.` }); setPush({ title: '', message: '', url: '/' });
    } catch (error) { setNotice({ type: 'error', text: error.message || 'No fue posible enviar la notificación.' }); }
    finally { setPushBusy(false); }
  };

  return <div className="ds-page announcement-page">
    <header className="ds-page-header"><div><span className="ds-page-kicker">Comunicación con clientes</span><h1 className="ds-page-title">Anuncios y notificaciones</h1><p className="ds-page-subtitle">Diseña, programa, segmenta y mide las campañas de la tienda virtual.</p></div><div className="ds-page-actions"><button className="ds-btn ds-btn-secondary" onClick={load}><RefreshCw size={18} /> Actualizar</button><button className="ds-btn ds-btn-primary" onClick={() => setCampaign(EMPTY)}><CopyPlus size={18} /> Nueva campaña</button></div></header>
    {notice && <div className={`ds-inline-alert ds-inline-alert-${notice.type === 'success' ? 'success' : 'danger'}`}>{notice.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}<span>{notice.text}</span></div>}

    <section className="campaign-kpis">
      <article><Megaphone /><div><strong>{campaigns.length}</strong><span>Campañas</span></div></article>
      <article><CheckCircle /><div><strong>{metrics.active}</strong><span>Publicadas</span></div></article>
      <article><Eye /><div><strong>{metrics.views}</strong><span>Visualizaciones</span></div></article>
      <article><MousePointerClick /><div><strong>{metrics.ctr.toFixed(1)}%</strong><span>Tasa de clic</span></div></article>
    </section>

    <div className="campaign-manager">
      <aside className="ds-card campaign-list"><div className="ds-card-header"><h2 className="ds-card-title">Campañas</h2></div><div className="campaign-list-body">{loading ? <div className="ds-loader-container"><div className="ds-loader" /></div> : campaigns.length ? campaigns.map((item) => { const itemStatus = statusOf(normalize(item)); return <button key={item.id} className={campaign.id === item.id ? 'active' : ''} onClick={() => setCampaign(normalize(item))}><span className={`ds-badge ds-badge-${itemStatus[1]}`}>{itemStatus[0]}</span><strong>{item.title}</strong><small>{item.campaign_type === 'banner' ? 'Banner' : 'Ventana'} · {item.audience === 'all' ? 'Todos' : item.audience === 'new' ? 'Nuevos' : 'Recurrentes'}</small><em><Eye size={13} /> {item.views_count || 0} <MousePointerClick size={13} /> {item.clicks_count || 0}</em></button>; }) : <div className="ds-empty-state"><Megaphone /><p>Crea tu primera campaña.</p></div>}</div></aside>

      <form className="ds-card campaign-editor" onSubmit={save}>
        <div className="ds-card-header"><div><span className="ds-page-kicker">{campaign.id ? `Campaña #${campaign.id}` : 'Nueva campaña'}</span><h2 className="ds-card-title">Contenido y publicación</h2></div><span className={`ds-badge ds-badge-${status[1]}`}>{status[0]}</span></div>
        <div className="ds-card-body ds-form">
          <label className="ds-form-group"><span className="ds-form-label">Título</span><input className="ds-input" required maxLength={255} value={campaign.title} onChange={(e) => edit('title', e.target.value)} /></label>
          <label className="ds-form-group"><span className="ds-form-label">Mensaje</span><textarea className="ds-textarea" maxLength={1000} value={campaign.body} onChange={(e) => edit('body', e.target.value)} /></label>
          <div className="ds-form-grid"><label className="ds-form-group"><span className="ds-form-label">Formato</span><select className="ds-select" value={campaign.campaign_type} onChange={(e) => edit('campaign_type', e.target.value)}><option value="modal">Ventana destacada</option><option value="banner">Banner superior</option></select></label><label className="ds-form-group"><span className="ds-form-label">Audiencia</span><select className="ds-select" value={campaign.audience} onChange={(e) => edit('audience', e.target.value)}><option value="all">Todos</option><option value="new">Clientes nuevos</option><option value="returning">Clientes recurrentes</option></select></label><label className="ds-form-group"><span className="ds-form-label">Prioridad (0–100)</span><input className="ds-input" type="number" min="0" max="100" value={campaign.priority} onChange={(e) => edit('priority', Number(e.target.value))} /></label><label className="ds-form-group"><span className="ds-form-label">Frecuencia</span><select className="ds-select" value={campaign.display_frequency} onChange={(e) => edit('display_frequency', e.target.value)}><option value="session">Una vez por sesión</option><option value="daily">Una vez al día</option><option value="always">Cada visita</option></select></label></div>
          <div className="announcement-section-heading"><ImageIcon size={18} /><div><strong>Imagen de campaña</strong><span>Máximo 4 MB.</span></div></div><div className="announcement-upload-actions"><label className="announcement-upload"><Upload size={18} /> Subir imagen<input type="file" accept="image/*" onChange={upload} /></label>{campaign.image_url && <button className="ds-btn ds-btn-ghost" type="button" onClick={() => edit('image_url', '')}><Trash2 size={16} /> Quitar</button>}</div>
          <div className="ds-form-grid"><label className="ds-form-group"><span className="ds-form-label">Texto del botón</span><input className="ds-input" value={campaign.cta_label} onChange={(e) => edit('cta_label', e.target.value)} /></label><label className="ds-form-group"><span className="ds-form-label">Destino</span><input className="ds-input" value={campaign.cta_url} onChange={(e) => edit('cta_url', e.target.value)} /></label><label className="ds-form-group"><span className="ds-form-label">Cupón opcional</span><input className="ds-input" maxLength={50} value={campaign.coupon_code || ''} onChange={(e) => edit('coupon_code', e.target.value.toUpperCase())} /></label></div>
          <div className="announcement-section-heading"><CalendarClock size={18} /><div><strong>Programación Colombia</strong><span>Sin fechas, se publica inmediatamente.</span></div></div><div className="ds-form-grid"><label className="ds-form-group"><span className="ds-form-label">Inicio</span><input className="ds-input" type="datetime-local" value={campaign.starts_at} onChange={(e) => edit('starts_at', e.target.value)} /></label><label className="ds-form-group"><span className="ds-form-label">Fin</span><input className="ds-input" type="datetime-local" min={campaign.starts_at} value={campaign.ends_at} onChange={(e) => edit('ends_at', e.target.value)} /></label></div>
          <label className="announcement-publish-toggle"><input type="checkbox" checked={campaign.is_active} onChange={(e) => edit('is_active', e.target.checked)} /><span className="ds-switch"><i /></span><span><strong>Publicar campaña</strong><small>Se respetan programación, prioridad y audiencia.</small></span></label>
        </div><div className="ds-card-footer">{campaign.id && <button className="ds-btn ds-btn-danger" type="button" onClick={remove} disabled={busy}><Trash2 size={17} /> Eliminar</button>}<button className="ds-btn ds-btn-primary" disabled={busy}><Save size={18} /> {busy ? 'Guardando…' : 'Guardar campaña'}</button></div>
      </form>

      <aside className="campaign-preview"><span className="ds-page-kicker">Vista previa</span><article className={`announcement-preview-card preview-${campaign.campaign_type}`}>{campaign.image_url ? <img src={campaign.image_url} alt="" /> : <div className="announcement-preview-empty"><ImageIcon /><span>Sin imagen</span></div>}<div><small>{campaign.audience === 'all' ? 'Para todos' : campaign.audience === 'new' ? 'Clientes nuevos' : 'Clientes recurrentes'}</small><h3>{campaign.title || 'Título de campaña'}</h3><p>{campaign.body || 'Escribe un mensaje claro y atractivo.'}</p>{campaign.coupon_code && <code>{campaign.coupon_code}</code>}<button type="button">{campaign.cta_label || 'Ver más'}</button></div></article></aside>
    </div>

    <section className="ds-card announcement-push-card"><div className="ds-card-header"><div><span className="ds-page-kicker">Canal inmediato</span><h2 className="ds-card-title"><Bell size={19} /> Notificación push</h2></div><span className="ds-badge ds-badge-info"><Users size={14} /> {(pushCount.customers || 0) + (pushCount.drivers || 0)} dispositivos</span></div><form className="ds-card-body ds-form" onSubmit={sendPush}><div className="announcement-push-grid"><label className="ds-form-group"><span className="ds-form-label">Título</span><input className="ds-input" required maxLength={80} value={push.title} onChange={(e) => setPush({ ...push, title: e.target.value })} /></label><label className="ds-form-group"><span className="ds-form-label">Destino</span><input className="ds-input" value={push.url} onChange={(e) => setPush({ ...push, url: e.target.value })} /></label><label className="ds-form-group announcement-push-message"><span className="ds-form-label">Mensaje</span><textarea className="ds-textarea" required maxLength={180} value={push.message} onChange={(e) => setPush({ ...push, message: e.target.value })} /></label></div><div className="announcement-push-submit"><button className="ds-btn ds-btn-success" disabled={pushBusy}><Send size={18} /> {pushBusy ? 'Enviando…' : 'Enviar ahora'}</button></div></form></section>
  </div>;
}
