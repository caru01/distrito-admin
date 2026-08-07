import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell, CalendarClock, CheckCircle, ExternalLink, Image as ImageIcon,
  Megaphone, RefreshCw, Save, Send, Trash2, Upload, XCircle,
} from 'lucide-react';
import { API_URL } from '../config/api';
import { formatDateTime } from '../utils/formatters';

const EMPTY_ANNOUNCEMENT = {
  title: '', body: '', image_url: '', cta_label: 'Continuar', cta_url: '',
  starts_at: '', ends_at: '', display_frequency: 'session', is_active: false,
  updated_at: '', is_visible: false,
};

function toColombiaInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
  return parts.replace(' ', 'T');
}

function toColombiaIso(value) {
  return value ? new Date(`${value}:00-05:00`).toISOString() : null;
}

function normalizeAnnouncement(value = {}) {
  return {
    ...EMPTY_ANNOUNCEMENT,
    ...value,
    starts_at: toColombiaInput(value.starts_at),
    ends_at: toColombiaInput(value.ends_at),
    is_active: Boolean(value.is_active),
  };
}

function campaignStatus(announcement) {
  if (!announcement.is_active) return { label: 'Borrador', tone: 'neutral', description: 'No se muestra en la tienda.' };
  const now = Date.now();
  const starts = announcement.starts_at ? new Date(`${announcement.starts_at}:00-05:00`).getTime() : null;
  const ends = announcement.ends_at ? new Date(`${announcement.ends_at}:00-05:00`).getTime() : null;
  if (starts && starts > now) return { label: 'Programado', tone: 'info', description: 'Se publicará en la fecha indicada.' };
  if (ends && ends < now) return { label: 'Finalizado', tone: 'warning', description: 'La fecha de cierre ya pasó.' };
  return { label: 'Publicado', tone: 'success', description: 'Está visible para los clientes.' };
}

export default function AdminAnuncios() {
  const [announcement, setAnnouncement] = useState(EMPTY_ANNOUNCEMENT);
  const [pushData, setPushData] = useState({ title: '', message: '', url: '/' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingPush, setSendingPush] = useState(false);
  const [notice, setNotice] = useState(null);
  const [pushNotice, setPushNotice] = useState(null);
  const [pushCount, setPushCount] = useState({ total: 0, customers: 0, drivers: 0 });

  const status = useMemo(() => campaignStatus(announcement), [announcement]);

  const fetchAnnouncement = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const response = await fetch(`${API_URL}/admin/announcement`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok || data.status !== 'ok') throw new Error(data.error || 'No fue posible cargar el anuncio.');
      setAnnouncement(normalizeAnnouncement(data.announcement || EMPTY_ANNOUNCEMENT));
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'No fue posible cargar el anuncio.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncement(); }, [fetchAnnouncement]);

  useEffect(() => {
    const token = sessionStorage.getItem('distrito_admin_token');
    fetch(`${API_URL}/admin/push/subscriptions/count`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data.status === 'ok') setPushCount(data); })
      .catch(console.error);
  }, []);

  const update = (field, value) => setAnnouncement((current) => ({ ...current, [field]: value }));

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice({ type: 'error', text: 'Selecciona un archivo de imagen válido.' });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'La imagen supera el máximo permitido de 4 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update('image_url', reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setNotice(null);
    if (!announcement.title.trim()) {
      setNotice({ type: 'error', text: 'Escribe un título para la campaña.' });
      return;
    }
    if (announcement.starts_at && announcement.ends_at && announcement.ends_at <= announcement.starts_at) {
      setNotice({ type: 'error', text: 'La fecha de cierre debe ser posterior al inicio.' });
      return;
    }
    setSaving(true);
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const response = await fetch(`${API_URL}/admin/announcement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...announcement,
          title: announcement.title.trim(),
          body: announcement.body.trim(),
          cta_label: announcement.cta_label.trim() || 'Continuar',
          cta_url: announcement.cta_url.trim(),
          starts_at: toColombiaIso(announcement.starts_at),
          ends_at: toColombiaIso(announcement.ends_at),
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'ok') throw new Error(data.error || 'No fue posible guardar la campaña.');
      setAnnouncement(normalizeAnnouncement(data.announcement));
      setNotice({ type: 'success', text: 'Campaña guardada y sincronizada con la tienda.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'No fue posible guardar la campaña.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendPush = async (event) => {
    event.preventDefault();
    setPushNotice(null);
    if (!pushData.title.trim() || !pushData.message.trim()) {
      setPushNotice({ type: 'error', text: 'El título y el mensaje son obligatorios.' });
      return;
    }
    setSendingPush(true);
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const response = await fetch(`${API_URL}/admin/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: pushData.title.trim(), message: pushData.message.trim(), url: pushData.url.trim() || '/' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible enviar la notificación.');
      setPushNotice({ type: 'success', text: `Notificación enviada a ${data.sent || 0} dispositivos.` });
      setPushData({ title: '', message: '', url: '/' });
    } catch (error) {
      setPushNotice({ type: 'error', text: error.message || 'No fue posible enviar la notificación.' });
    } finally {
      setSendingPush(false);
    }
  };

  if (loading) return <div className="ds-loader-container"><div className="ds-loader" /><p>Cargando campañas…</p></div>;

  return (
    <div className="ds-page announcement-page">
      <header className="ds-page-header">
        <div>
          <span className="ds-page-kicker">Comunicación con clientes</span>
          <h1 className="ds-page-title">Anuncios y notificaciones</h1>
          <p className="ds-page-subtitle">Diseña, programa y publica la campaña que aparece en la tienda virtual.</p>
        </div>
        <div className="ds-page-actions">
          <span className={`ds-badge ds-badge-${status.tone}`}><Megaphone size={14} /> {status.label}</span>
          <button className="ds-btn ds-btn-secondary" onClick={fetchAnnouncement}><RefreshCw size={18} /> Recargar</button>
        </div>
      </header>

      {notice && <div className={`ds-inline-alert ds-inline-alert-${notice.type === 'success' ? 'success' : 'danger'}`} role="alert">{notice.type === 'success' ? <CheckCircle size={19} /> : <XCircle size={19} />}<span>{notice.text}</span></div>}

      <form className="announcement-workspace" onSubmit={handleSave}>
        <section className="ds-card announcement-editor">
          <div className="ds-card-header"><div><span className="ds-page-kicker">Contenido</span><h2 className="ds-card-title">Campaña de la tienda</h2></div><small>{status.description}</small></div>
          <div className="ds-card-body ds-form">
            <div className="ds-form-group">
              <label className="ds-form-label" htmlFor="announcement-title">Título</label>
              <input id="announcement-title" className="ds-input" maxLength={255} required value={announcement.title} onChange={(event) => update('title', event.target.value)} placeholder="Ej. Envío gratis este fin de semana" />
              <span className="ds-form-help announcement-counter">Mensaje principal de la campaña <strong>{announcement.title.length}/255</strong></span>
            </div>
            <div className="ds-form-group">
              <label className="ds-form-label" htmlFor="announcement-body">Descripción</label>
              <textarea id="announcement-body" className="ds-textarea" maxLength={1000} value={announcement.body} onChange={(event) => update('body', event.target.value)} placeholder="Explica brevemente la promoción o novedad." />
              <span className="ds-form-help announcement-counter">Texto opcional bajo el título <strong>{announcement.body.length}/1000</strong></span>
            </div>

            <div className="announcement-section-heading"><ImageIcon size={18} /><div><strong>Imagen</strong><span>Recomendado: 1080 × 1080 px, JPG o PNG.</span></div></div>
            <div className="ds-form-group">
              <label className="ds-form-label" htmlFor="announcement-image-url">URL de imagen</label>
              <input id="announcement-image-url" className="ds-input" value={announcement.image_url?.startsWith('data:') ? '' : announcement.image_url} onChange={(event) => update('image_url', event.target.value)} placeholder="https://…" />
            </div>
            <div className="announcement-upload-actions">
              <label className="announcement-upload"><Upload size={18} /><span>Subir desde el equipo</span><input type="file" accept="image/*" onChange={handleImageUpload} /></label>
              {announcement.image_url && <button type="button" className="ds-btn ds-btn-ghost" onClick={() => update('image_url', '')}><Trash2 size={17} /> Quitar imagen</button>}
            </div>

            <div className="announcement-section-heading"><ExternalLink size={18} /><div><strong>Llamado a la acción</strong><span>Define qué hará el cliente al pulsar el botón.</span></div></div>
            <div className="ds-form-grid">
              <div className="ds-form-group"><label className="ds-form-label" htmlFor="announcement-cta">Texto del botón</label><input id="announcement-cta" className="ds-input" maxLength={80} value={announcement.cta_label} onChange={(event) => update('cta_label', event.target.value)} /></div>
              <div className="ds-form-group"><label className="ds-form-label" htmlFor="announcement-link">Destino</label><input id="announcement-link" className="ds-input" value={announcement.cta_url} onChange={(event) => update('cta_url', event.target.value)} placeholder="/ o https://…" /></div>
            </div>

            <div className="announcement-section-heading"><CalendarClock size={18} /><div><strong>Publicación</strong><span>Las horas se interpretan en Colombia.</span></div></div>
            <label className="announcement-publish-toggle">
              <input type="checkbox" checked={announcement.is_active} onChange={(event) => update('is_active', event.target.checked)} />
              <span className="ds-switch" aria-hidden="true"><i /></span>
              <span><strong>Campaña activa</strong><small>{announcement.is_active ? 'Se publicará según la programación.' : 'Permanece como borrador.'}</small></span>
            </label>
            <div className="ds-form-grid">
              <div className="ds-form-group"><label className="ds-form-label" htmlFor="announcement-start">Inicia</label><input id="announcement-start" type="datetime-local" className="ds-input" value={announcement.starts_at} onChange={(event) => update('starts_at', event.target.value)} /></div>
              <div className="ds-form-group"><label className="ds-form-label" htmlFor="announcement-end">Finaliza</label><input id="announcement-end" type="datetime-local" className="ds-input" min={announcement.starts_at} value={announcement.ends_at} onChange={(event) => update('ends_at', event.target.value)} /></div>
            </div>
            <div className="ds-form-group"><label className="ds-form-label" htmlFor="announcement-frequency">Frecuencia por cliente</label><select id="announcement-frequency" className="ds-select" value={announcement.display_frequency} onChange={(event) => update('display_frequency', event.target.value)}><option value="session">Una vez por sesión</option><option value="daily">Una vez al día</option><option value="always">En cada visita</option></select></div>
          </div>
          <div className="ds-card-footer"><span className="announcement-last-update">{announcement.updated_at ? `Último cambio: ${formatDateTime(announcement.updated_at)}` : 'Aún no se ha guardado'}</span><button className="ds-btn ds-btn-primary" type="submit" disabled={saving}><Save size={18} /> {saving ? 'Guardando…' : 'Guardar campaña'}</button></div>
        </section>

        <aside className="announcement-preview-column">
          <div className="announcement-preview-heading"><div><span className="ds-page-kicker">Vista previa</span><h2>Así lo verá el cliente</h2></div><span className={`ds-badge ds-badge-${status.tone}`}>{status.label}</span></div>
          <div className="announcement-preview-stage">
            <article className="announcement-preview-card">
              {announcement.image_url ? <img key={announcement.image_url} src={announcement.image_url} alt="Vista previa de la campaña" /> : <div className="announcement-preview-empty"><ImageIcon size={42} /><span>Agrega una imagen para completar la campaña</span></div>}
              <div><h3>{announcement.title || 'Título de la campaña'}</h3>{announcement.body && <p>{announcement.body}</p>}<button type="button">{announcement.cta_label || 'Continuar'}</button></div>
            </article>
          </div>
        </aside>
      </form>

      <section className="ds-card announcement-push-card">
        <div className="ds-card-header"><div><span className="ds-page-kicker">Canal inmediato</span><h2 className="ds-card-title"><Bell size={19} /> Notificación push</h2></div><span className="ds-badge ds-badge-info">Todos los suscriptores</span></div>
        <form className="ds-card-body ds-form" onSubmit={handleSendPush}>
          <p className="ds-form-help">Envía un mensaje único a los clientes que aceptaron notificaciones. Este envío no modifica la campaña de la tienda.</p>
          <div className="announcement-push-grid">
            <div className="ds-form-group"><label className="ds-form-label" htmlFor="push-title">Título</label><input id="push-title" className="ds-input" maxLength={80} required value={pushData.title} onChange={(event) => setPushData({ ...pushData, title: event.target.value })} placeholder="Ej. Tu pedido favorito tiene descuento" /></div>
            <div className="ds-form-group"><label className="ds-form-label" htmlFor="push-url">Destino</label><input id="push-url" className="ds-input" value={pushData.url} onChange={(event) => setPushData({ ...pushData, url: event.target.value })} placeholder="/" /></div>
            <div className="ds-form-group announcement-push-message"><label className="ds-form-label" htmlFor="push-message">Mensaje</label><textarea id="push-message" className="ds-textarea" maxLength={180} required value={pushData.message} onChange={(event) => setPushData({ ...pushData, message: event.target.value })} placeholder="Escribe un mensaje breve y accionable." /><span className="ds-form-help announcement-counter"><span>Máximo 180 caracteres</span><strong>{pushData.message.length}/180</strong></span></div>
          </div>
          {pushNotice && <div className={`ds-inline-alert ds-inline-alert-${pushNotice.type === 'success' ? 'success' : 'danger'}`}>{pushNotice.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}<span>{pushNotice.text}</span></div>}
          
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'var(--ds-bg-secondary)', borderRadius: '12px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>Vista previa en el celular:</h3>
            <div style={{ backgroundColor: '#fff', color: '#333', padding: '12px 16px', borderRadius: '16px', display: 'flex', gap: '12px', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#e21b1b', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <img src="/pwa-192x192.png" alt="Icon" style={{ width: '24px', height: '24px' }} onError={(e) => e.target.style.display = 'none'} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>{pushData.title || 'Título de notificación'}</strong>
                <span style={{ fontSize: '13px', opacity: 0.8 }}>{pushData.message || 'Mensaje de la notificación que llegará al cliente.'}</span>
              </div>
            </div>
            <p style={{ marginTop: '15px', fontSize: '13px', color: 'var(--ds-text-secondary)' }}>
              Esta notificación llegará a <strong>{pushCount.customers}</strong> clientes y <strong>{pushCount.drivers}</strong> domiciliarios con la App instalada.
            </p>
          </div>

          <div className="announcement-push-submit"><button className="ds-btn ds-btn-success" disabled={sendingPush}><Send size={18} /> {sendingPush ? 'Enviando…' : 'Enviar notificación'}</button></div>
        </form>
      </section>
    </div>
  );
}
