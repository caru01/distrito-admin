import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Bell, CalendarClock, CheckCircle, CopyPlus, Eye, Image as ImageIcon,
  Megaphone, MousePointerClick, RefreshCw, Save, Send, Sparkles, Smartphone, Monitor,
  ToggleLeft, ToggleRight, Trash2, Upload, Users, XCircle, Tag, Truck
} from 'lucide-react';
import { API_URL } from '../config/api';
import { readApiJson } from '../utils/http';
import districStar from '../assets/distric-star.png';

const EMPTY = {
  id: null,
  title: '',
  body: '',
  image_url: '',
  cta_label: 'Ver más',
  cta_url: '/',
  starts_at: '',
  ends_at: '',
  display_frequency: 'session',
  campaign_type: 'modal',
  audience: 'all',
  priority: 50,
  coupon_code: '',
  is_active: false,
  views_count: 0,
  clicks_count: 0,
};

const DEFAULT_PROMO = {
  day: 'MARTES',
  date: '13 DE OCTUBRE',
  headline: 'DOMICILIO',
  highlight: 'GRATIS',
  condition: 'En compras superiores a',
  price: '$ 30.000 COP',
  terms: '* Términos y condiciones aplican.',
};

const token = () => sessionStorage.getItem('distrito_admin_token');

function toInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replace(' ', 'T');
}

function toIso(value) {
  return value ? new Date(`${value}:00-05:00`).toISOString() : null;
}

function normalize(value = {}) {
  return {
    ...EMPTY,
    ...value,
    starts_at: toInput(value.starts_at),
    ends_at: toInput(value.ends_at),
    is_active: Boolean(value.is_active),
  };
}

function statusOf(campaign) {
  if (!campaign.is_active) return ['Desactivada', 'neutral'];
  if (campaign.starts_at && new Date(`${campaign.starts_at}:00-05:00`) > new Date()) return ['Programada', 'info'];
  if (campaign.ends_at && new Date(`${campaign.ends_at}:00-05:00`) < new Date()) return ['Finalizada', 'warning'];
  return ['Publicada', 'success'];
}

function parsePromoBody(body) {
  if (!body) return { ...DEFAULT_PROMO };
  try {
    const parsed = typeof body === 'string' ? JSON.parse(body) : body;
    if (parsed && typeof parsed === 'object') {
      return {
        day: parsed.day || DEFAULT_PROMO.day,
        date: parsed.date || DEFAULT_PROMO.date,
        headline: parsed.headline || DEFAULT_PROMO.headline,
        highlight: parsed.highlight || DEFAULT_PROMO.highlight,
        condition: parsed.condition || DEFAULT_PROMO.condition,
        price: parsed.price || DEFAULT_PROMO.price,
        terms: parsed.terms || DEFAULT_PROMO.terms,
      };
    }
  } catch {
    // fallback if body is plain text
  }
  return { ...DEFAULT_PROMO, headline: body };
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
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'

  const status = statusOf(campaign);
  const isPromoCard = campaign.campaign_type === 'promo_card';
  const promoData = useMemo(() => parsePromoBody(campaign.body), [campaign.body]);

  const metrics = useMemo(() => {
    const views = campaigns.reduce((sum, item) => sum + Number(item.views_count || 0), 0);
    const clicks = campaigns.reduce((sum, item) => sum + Number(item.clicks_count || 0), 0);
    return {
      active: campaigns.filter((item) => statusOf(normalize(item))[0] === 'Publicada').length,
      views,
      clicks,
      ctr: views ? (clicks / views) * 100 : 0,
    };
  }, [campaigns]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/announcements`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'No fue posible cargar las campañas.');
      const items = data.announcements || [];
      setCampaigns(items);
      setCampaign((current) =>
        current.id ? normalize(items.find((item) => item.id === current.id) || EMPTY) : current
      );
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    fetch(`${API_URL}/admin/push/subscriptions/count`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(readApiJson)
      .then((data) => setPushCount(data))
      .catch(() => {});
  }, [load]);

  const edit = (key, value) => setCampaign((current) => ({ ...current, [key]: value }));

  const updatePromoField = (field, value) => {
    setCampaign((current) => {
      const currentPromo = parsePromoBody(current.body);
      const updatedPromo = { ...currentPromo, [field]: value };
      const serialized = JSON.stringify(updatedPromo);
      const newTitle = `${updatedPromo.day} ${updatedPromo.date} — ${updatedPromo.headline} ${updatedPromo.highlight}`.trim();
      return {
        ...current,
        title: newTitle || current.title,
        body: serialized,
        cta_label: updatedPromo.price || current.cta_label,
      };
    });
  };

  const createPromoCard = () => {
    const serialized = JSON.stringify(DEFAULT_PROMO);
    setCampaign({
      ...EMPTY,
      title: 'MARTES 13 DE OCTUBRE — DOMICILIO GRATIS',
      campaign_type: 'promo_card',
      body: serialized,
      cta_label: '$ 30.000 COP',
      cta_url: '/',
      priority: 60,
      is_active: true,
    });
  };

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const endpoint = campaign.id
        ? `${API_URL}/admin/announcements/${campaign.id}`
        : `${API_URL}/admin/announcements`;
      const response = await fetch(endpoint, {
        method: campaign.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          ...campaign,
          starts_at: toIso(campaign.starts_at),
          ends_at: toIso(campaign.ends_at),
        }),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'No fue posible guardar la campaña.');
      setCampaign(normalize(data.announcement));
      setNotice({
        type: 'success',
        text: `Campaña ${data.announcement?.is_active ? 'guardada y publicada' : 'guardada (desactivada)'} en la tienda.`,
      });
      await load();
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const toggleCampaignStatus = async (itemToToggle, e) => {
    if (e) e.stopPropagation();
    if (!itemToToggle.id) {
      edit('is_active', !itemToToggle.is_active);
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`${API_URL}/admin/announcements/${itemToToggle.id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'No fue posible cambiar el estado.');
      const updated = normalize(data.announcement);
      setNotice({
        type: 'success',
        text: updated.is_active
          ? `Campaña "${updated.title}" ACTIVADA y visible en la tienda.`
          : `Campaña "${updated.title}" DESACTIVADA (oculta en la tienda).`,
      });
      if (campaign.id === updated.id) {
        setCampaign(updated);
      }
      await load();
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!campaign.id || !window.confirm('¿Eliminar esta campaña y sus métricas?')) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/admin/announcements/${campaign.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error);
      setCampaign(EMPTY);
      setNotice({ type: 'success', text: 'Campaña eliminada.' });
      await load();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'No fue posible eliminarla.' });
    } finally {
      setBusy(false);
    }
  };

  const upload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 4 * 1024 * 1024)
      return setNotice({ type: 'error', text: 'Usa JPG, PNG o WebP de máximo 4 MB.' });
    const reader = new FileReader();
    reader.onload = () => edit('image_url', reader.result);
    reader.readAsDataURL(file);
  };

  const sendPush = async (event) => {
    event.preventDefault();
    setPushBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`${API_URL}/admin/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(push),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error);
      setNotice({ type: 'success', text: `Notificación enviada a ${data.sent || 0} dispositivos.` });
      setPush({ title: '', message: '', url: '/' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'No fue posible enviar la notificación.' });
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="ds-page announcement-page">
      <header className="ds-page-header">
        <div>
          <span className="ds-page-kicker">Comunicación con clientes</span>
          <h1 className="ds-page-title">Anuncios y notificaciones</h1>
          <p className="ds-page-subtitle">
            Diseña, programa, segmenta y edita las promociones y tarjetas de la tienda virtual.
          </p>
        </div>
        <div className="ds-page-actions" style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="ds-btn ds-btn-secondary" onClick={load} disabled={busy}>
            <RefreshCw size={18} /> Actualizar
          </button>
          <button className="ds-btn ds-btn-secondary" onClick={createPromoCard} style={{ borderColor: '#B30401', color: '#B30401' }}>
            <Sparkles size={18} /> + Tarjeta Domicilio Gratis
          </button>
          <button className="ds-btn ds-btn-primary" onClick={() => setCampaign(EMPTY)}>
            <CopyPlus size={18} /> + Nueva campaña
          </button>
        </div>
      </header>

      {notice && (
        <div className={`ds-inline-alert ds-inline-alert-${notice.type === 'success' ? 'success' : 'danger'}`}>
          {notice.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          <span>{notice.text}</span>
        </div>
      )}

      <section className="campaign-kpis">
        <article>
          <Megaphone />
          <div>
            <strong>{campaigns.length}</strong>
            <span>Campañas</span>
          </div>
        </article>
        <article>
          <CheckCircle />
          <div>
            <strong>{metrics.active}</strong>
            <span>Publicadas</span>
          </div>
        </article>
        <article>
          <Eye />
          <div>
            <strong>{metrics.views}</strong>
            <span>Visualizaciones</span>
          </div>
        </article>
        <article>
          <MousePointerClick />
          <div>
            <strong>{metrics.ctr.toFixed(1)}%</strong>
            <span>Tasa de clic</span>
          </div>
        </article>
      </section>

      <div className="campaign-manager">
        {/* Columna 1: Lista de Campañas */}
        <aside className="ds-card campaign-list">
          <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="ds-card-title">Campañas ({campaigns.length})</h2>
          </div>
          <div className="campaign-list-body">
            {loading ? (
              <div className="ds-loader-container">
                <div className="ds-loader" />
              </div>
            ) : campaigns.length ? (
              campaigns.map((item) => {
                const normItem = normalize(item);
                const itemStatus = statusOf(normItem);
                const isItemPromo = normItem.campaign_type === 'promo_card';
                return (
                  <button
                    key={item.id}
                    className={campaign.id === item.id ? 'active' : ''}
                    onClick={() => setCampaign(normItem)}
                    style={{ position: 'relative', paddingRight: '3.2rem' }}
                  >
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`ds-badge ds-badge-${itemStatus[1]}`}>
                        {itemStatus[0]}
                      </span>
                      <span
                        className="ds-badge"
                        style={{
                          background: isItemPromo ? 'rgba(179, 4, 1, 0.12)' : 'rgba(255, 255, 255, 0.08)',
                          color: isItemPromo ? '#B30401' : 'inherit',
                          fontWeight: 700,
                        }}
                      >
                        {isItemPromo ? 'Tarjeta Catálogo' : item.campaign_type === 'banner' ? 'Banner' : 'Ventana'}
                      </span>
                    </div>

                    <strong style={{ marginTop: '0.2rem', display: 'block' }}>{item.title}</strong>
                    
                    <small>
                      {item.audience === 'all' ? 'Todos' : item.audience === 'new' ? 'Nuevos' : 'Recurrentes'}
                    </small>

                    <em>
                      <Eye size={13} /> {item.views_count || 0} <MousePointerClick size={13} /> {item.clicks_count || 0}
                    </em>

                    {/* Quick Toggle Button */}
                    <span
                      title={normItem.is_active ? 'Desactivar campaña' : 'Activar campaña'}
                      onClick={(e) => toggleCampaignStatus(normItem, e)}
                      style={{
                        position: 'absolute',
                        right: '0.8rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        cursor: 'pointer',
                        padding: '0.3rem',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {normItem.is_active ? (
                        <ToggleRight size={24} color="#22c55e" />
                      ) : (
                        <ToggleLeft size={24} color="#64748b" />
                      )}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="ds-empty-state">
                <Megaphone />
                <p>Crea tu primera campaña o tarjeta promocional.</p>
              </div>
            )}
          </div>
        </aside>

        {/* Columna 2: Editor de Campaña */}
        <form className="ds-card campaign-editor" onSubmit={save}>
          <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="ds-page-kicker">
                {campaign.id ? `Campaña #${campaign.id}` : 'Nueva campaña'}
              </span>
              <h2 className="ds-card-title">
                {isPromoCard ? 'Tarjeta Promocional (Catálogo)' : 'Contenido y publicación'}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className={`ds-badge ds-badge-${status[1]}`}>{status[0]}</span>
              {campaign.id && (
                <button
                  type="button"
                  className="ds-btn ds-btn-ghost"
                  onClick={(e) => toggleCampaignStatus(campaign, e)}
                  title={campaign.is_active ? 'Hacer clic para Desactivar' : 'Hacer clic para Activar'}
                  style={{
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.8rem',
                    color: campaign.is_active ? '#ef4444' : '#22c55e',
                  }}
                >
                  {campaign.is_active ? 'Pausar/Desactivar' : 'Publicar/Activar'}
                </button>
              )}
            </div>
          </div>

          <div className="ds-card-body ds-form">
            {/* Formato selector */}
            <div className="ds-form-grid" style={{ marginBottom: '1rem' }}>
              <label className="ds-form-group">
                <span className="ds-form-label">Formato de anuncio</span>
                <select
                  className="ds-select"
                  value={campaign.campaign_type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    if (newType === 'promo_card' && !campaign.body.startsWith('{')) {
                      setCampaign((curr) => ({
                        ...curr,
                        campaign_type: newType,
                        body: JSON.stringify(DEFAULT_PROMO),
                        title: curr.title || 'MARTES 13 DE OCTUBRE — DOMICILIO GRATIS',
                      }));
                    } else {
                      edit('campaign_type', newType);
                    }
                  }}
                >
                  <option value="promo_card">Tarjeta Promocional (Catálogo / Domicilio Gratis)</option>
                  <option value="modal">Ventana emergente (Modal)</option>
                  <option value="banner">Banner superior</option>
                </select>
              </label>

              <label className="ds-form-group">
                <span className="ds-form-label">Audiencia</span>
                <select className="ds-select" value={campaign.audience} onChange={(e) => edit('audience', e.target.value)}>
                  <option value="all">Todos los clientes</option>
                  <option value="new">Clientes nuevos</option>
                  <option value="returning">Clientes recurrentes</option>
                </select>
              </label>
            </div>

            {/* SECCIÓN ESPECÍFICA SEGÚN FORMATO */}
            {isPromoCard ? (
              <div
                style={{
                  background: 'rgba(179, 4, 1, 0.03)',
                  border: '1px solid rgba(179, 4, 1, 0.15)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#B30401',
                    fontWeight: '700',
                    marginBottom: '1rem',
                  }}
                >
                  <Truck size={20} />
                  <span>Configuración de la Tarjeta Promocional</span>
                </div>

                <div className="ds-form-grid">
                  <label className="ds-form-group">
                    <span className="ds-form-label">Día del evento / Subtítulo</span>
                    <input
                      className="ds-input"
                      placeholder="Ej. MARTES"
                      value={promoData.day}
                      onChange={(e) => updatePromoField('day', e.target.value)}
                    />
                  </label>

                  <label className="ds-form-group">
                    <span className="ds-form-label">Fecha destacada</span>
                    <input
                      className="ds-input"
                      placeholder="Ej. 13 DE OCTUBRE"
                      value={promoData.date}
                      onChange={(e) => updatePromoField('date', e.target.value)}
                    />
                  </label>
                </div>

                <div className="ds-form-grid" style={{ marginTop: '0.75rem' }}>
                  <label className="ds-form-group">
                    <span className="ds-form-label">Titular beneficio</span>
                    <input
                      className="ds-input"
                      placeholder="Ej. DOMICILIO"
                      value={promoData.headline}
                      onChange={(e) => updatePromoField('headline', e.target.value)}
                    />
                  </label>

                  <label className="ds-form-group">
                    <span className="ds-form-label">Palabra destacada en ROJO</span>
                    <input
                      className="ds-input"
                      placeholder="Ej. GRATIS"
                      value={promoData.highlight}
                      onChange={(e) => updatePromoField('highlight', e.target.value)}
                    />
                  </label>
                </div>

                <div className="ds-form-grid" style={{ marginTop: '0.75rem' }}>
                  <label className="ds-form-group">
                    <span className="ds-form-label">Condición de compra</span>
                    <input
                      className="ds-input"
                      placeholder="Ej. En compras superiores a"
                      value={promoData.condition}
                      onChange={(e) => updatePromoField('condition', e.target.value)}
                    />
                  </label>

                  <label className="ds-form-group">
                    <span className="ds-form-label">Monto mínimo / Precio</span>
                    <input
                      className="ds-input"
                      placeholder="Ej. $ 30.000 COP"
                      value={promoData.price}
                      onChange={(e) => updatePromoField('price', e.target.value)}
                    />
                  </label>
                </div>

                <label className="ds-form-group" style={{ marginTop: '0.75rem' }}>
                  <span className="ds-form-label">Términos y condiciones (pie de tarjeta)</span>
                  <input
                    className="ds-input"
                    placeholder="Ej. * Términos y condiciones aplican."
                    value={promoData.terms}
                    onChange={(e) => updatePromoField('terms', e.target.value)}
                  />
                </label>
              </div>
            ) : (
              <>
                <label className="ds-form-group">
                  <span className="ds-form-label">Título</span>
                  <input
                    className="ds-input"
                    required
                    maxLength={255}
                    value={campaign.title}
                    onChange={(e) => edit('title', e.target.value)}
                  />
                </label>

                <label className="ds-form-group">
                  <span className="ds-form-label">Mensaje</span>
                  <textarea
                    className="ds-textarea"
                    maxLength={2000}
                    value={campaign.body}
                    onChange={(e) => edit('body', e.target.value)}
                  />
                </label>

                <div className="announcement-section-heading">
                  <ImageIcon size={18} />
                  <div>
                    <strong>Imagen de campaña</strong>
                    <span>Máximo 4 MB (JPG, PNG o WebP).</span>
                  </div>
                </div>

                <div className="announcement-upload-actions">
                  <label className="announcement-upload">
                    <Upload size={18} /> Subir imagen
                    <input type="file" accept="image/*" onChange={upload} />
                  </label>
                  {campaign.image_url && (
                    <button
                      className="ds-btn ds-btn-ghost"
                      type="button"
                      onClick={() => edit('image_url', '')}
                    >
                      <Trash2 size={16} /> Quitar imagen
                    </button>
                  )}
                </div>

                <div className="ds-form-grid" style={{ marginTop: '1rem' }}>
                  <label className="ds-form-group">
                    <span className="ds-form-label">Texto del botón</span>
                    <input
                      className="ds-input"
                      value={campaign.cta_label}
                      onChange={(e) => edit('cta_label', e.target.value)}
                    />
                  </label>
                  <label className="ds-form-group">
                    <span className="ds-form-label">Enlace de destino</span>
                    <input
                      className="ds-input"
                      value={campaign.cta_url}
                      onChange={(e) => edit('cta_url', e.target.value)}
                    />
                  </label>
                  <label className="ds-form-group">
                    <span className="ds-form-label">Cupón opcional</span>
                    <input
                      className="ds-input"
                      maxLength={50}
                      value={campaign.coupon_code || ''}
                      onChange={(e) => edit('coupon_code', e.target.value.toUpperCase())}
                    />
                  </label>
                </div>
              </>
            )}

            {/* Configuración de Prioridad y Fechas */}
            <div className="ds-form-grid">
              <label className="ds-form-group">
                <span className="ds-form-label">Prioridad (0–100)</span>
                <input
                  className="ds-input"
                  type="number"
                  min="0"
                  max="100"
                  value={campaign.priority}
                  onChange={(e) => edit('priority', Number(e.target.value))}
                />
              </label>

              <label className="ds-form-group">
                <span className="ds-form-label">Frecuencia</span>
                <select
                  className="ds-select"
                  value={campaign.display_frequency}
                  onChange={(e) => edit('display_frequency', e.target.value)}
                >
                  <option value="session">Una vez por sesión</option>
                  <option value="daily">Una vez al día</option>
                  <option value="always">Siempre visible en cada visita</option>
                </select>
              </label>
            </div>

            <div className="announcement-section-heading">
              <CalendarClock size={18} />
              <div>
                <strong>Programación (Hora Colombia)</strong>
                <span>Opcional: Si dejas las fechas vacías, estará activa de inmediato sin límite.</span>
              </div>
            </div>

            <div className="ds-form-grid">
              <label className="ds-form-group">
                <span className="ds-form-label">Fecha de inicio</span>
                <input
                  className="ds-input"
                  type="datetime-local"
                  value={campaign.starts_at}
                  onChange={(e) => edit('starts_at', e.target.value)}
                />
              </label>
              <label className="ds-form-group">
                <span className="ds-form-label">Fecha de cierre</span>
                <input
                  className="ds-input"
                  type="datetime-local"
                  min={campaign.starts_at}
                  value={campaign.ends_at}
                  onChange={(e) => edit('ends_at', e.target.value)}
                />
              </label>
            </div>

            {/* SWITCH ACTIVAR / DESACTIVAR */}
            <div
              style={{
                marginTop: '1.25rem',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                background: campaign.is_active ? 'rgba(34, 197, 94, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                border: campaign.is_active ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(100, 116, 139, 0.2)',
              }}
            >
              <label className="announcement-publish-toggle" style={{ margin: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={campaign.is_active}
                  onChange={(e) => edit('is_active', e.target.checked)}
                />
                <span className="ds-switch"><i /></span>
                <div>
                  <strong>{campaign.is_active ? 'Campaña Activa en la Tienda' : 'Campaña Desactivada (Pausada)'}</strong>
                  <small style={{ display: 'block', color: 'var(--ds-text-muted)' }}>
                    {campaign.is_active
                      ? 'Los clientes la verán en la tienda según la audiencia y programación.'
                      : 'Oculta en la tienda virtual hasta que decidas activarla.'}
                  </small>
                </div>
              </label>
            </div>
          </div>

          <div className="ds-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {campaign.id ? (
              <button className="ds-btn ds-btn-danger" type="button" onClick={remove} disabled={busy}>
                <Trash2 size={17} /> Eliminar
              </button>
            ) : <div />}
            <button className="ds-btn ds-btn-primary" disabled={busy}>
              <Save size={18} /> {busy ? 'Guardando…' : 'Guardar campaña'}
            </button>
          </div>
        </form>

        {/* Columna 3: Vista Previa en Vivo */}
        <aside className="campaign-preview">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="ds-page-kicker">Vista previa en vivo</span>
            {isPromoCard && (
              <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--ds-bg-elevated)', padding: '0.2rem', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className="ds-btn ds-btn-ghost"
                  style={{
                    padding: '0.3rem 0.55rem',
                    fontSize: '0.75rem',
                    background: previewDevice === 'desktop' ? 'var(--ds-bg-surface)' : 'transparent',
                    color: previewDevice === 'desktop' ? 'var(--ds-text-primary)' : 'var(--ds-text-muted)',
                  }}
                  title="Vista Escritorio"
                >
                  <Monitor size={14} /> Escritorio
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className="ds-btn ds-btn-ghost"
                  style={{
                    padding: '0.3rem 0.55rem',
                    fontSize: '0.75rem',
                    background: previewDevice === 'mobile' ? 'var(--ds-bg-surface)' : 'transparent',
                    color: previewDevice === 'mobile' ? 'var(--ds-text-primary)' : 'var(--ds-text-muted)',
                  }}
                  title="Vista Móvil"
                >
                  <Smartphone size={14} /> Móvil
                </button>
              </div>
            )}
          </div>

          {/* VISTA PREVIA SI ES TARJETA PROMOCIONAL */}
          {isPromoCard ? (
            <div style={{ width: '100%' }}>
              {previewDevice === 'desktop' ? (
                /* ESCRITORIO: TARJETA LATERAL */
                <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}>
                  <div
                    style={{
                      background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF7F7 100%)',
                      border: '1.5px solid #F8D7DA',
                      borderRadius: '20px',
                      padding: '1.65rem 1.3rem',
                      boxShadow: '0 10px 25px rgba(179, 4, 1, 0.08), 0 2px 6px rgba(0, 0, 0, 0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      boxSizing: 'border-box',
                      color: '#1A1A1A',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', width: '100%', marginBottom: '1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B30401' }}>
                        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#B30401" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="5.5" cy="17.5" r="3.5" />
                          <circle cx="18.5" cy="17.5" r="3.5" />
                          <path d="M15 6h-3l-2.5 5H18l-1.5-5z" />
                          <path d="M9.5 11l-3 6.5" />
                          <path d="M14 17.5h-4.5" />
                          <path d="M18.5 14a3.5 3.5 0 0 0-3.5-3.5h-1" />
                        </svg>
                      </span>
                      <img src={districStar} alt="" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', marginBottom: '0.75rem' }}>
                      <span style={{
                        fontFamily: "'UNIFORMEXTRACONDENSED', 'Bebas Neue', 'Oswald', sans-serif",
                        fontSize: '1.7rem',
                        fontWeight: '900',
                        letterSpacing: '0.04em',
                        lineHeight: '1',
                        color: '#1A1A1A',
                      }}>
                        {promoData.day || 'MARTES'}
                      </span>
                      <span style={{
                        fontFamily: "'UNIFORMEXTRACONDENSED', 'Bebas Neue', 'Oswald', sans-serif",
                        fontSize: '1.4rem',
                        fontWeight: '900',
                        letterSpacing: '0.03em',
                        lineHeight: '1.05',
                        color: '#B30401',
                      }}>
                        {promoData.date || '13 DE OCTUBRE'}
                      </span>
                    </div>

                    <div style={{
                      fontFamily: "'UNIFORMEXTRACONDENSED', 'Bebas Neue', 'Oswald', sans-serif",
                      fontSize: '2.4rem',
                      fontWeight: '900',
                      letterSpacing: '0.03em',
                      lineHeight: '0.95',
                      color: '#1A1A1A',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      marginBottom: '1.15rem',
                    }}>
                      {promoData.headline || 'DOMICILIO'}
                      <span style={{ color: '#B30401', fontSize: '2.7rem', lineHeight: '0.92' }}>
                        {promoData.highlight || 'GRATIS'}
                      </span>
                    </div>

                    <div style={{ width: '42px', height: '2.5px', background: '#B30401', borderRadius: '2px', opacity: 0.85, margin: '0 auto 1.15rem' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', marginBottom: '1.1rem' }}>
                      <p style={{
                        margin: 0,
                        fontFamily: "'UNIFORMEXTRACONDENSED', 'Bebas Neue', 'Oswald', sans-serif",
                        fontSize: '1.05rem',
                        fontWeight: '600',
                        letterSpacing: '0.02em',
                        color: '#333333',
                        textTransform: 'uppercase',
                      }}>
                        {promoData.condition || 'En compras superiores a'}
                      </p>
                      <p style={{
                        margin: 0,
                        fontFamily: "'UNIFORMEXTRACONDENSED', 'Bebas Neue', 'Oswald', sans-serif",
                        fontSize: '1.8rem',
                        fontWeight: '900',
                        letterSpacing: '0.03em',
                        color: '#B30401',
                        lineHeight: '1.1',
                      }}>
                        {promoData.price || '$ 30.000 COP'}
                      </p>
                    </div>

                    <div style={{ paddingTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '500', color: '#777777', letterSpacing: '0.01em', fontStyle: 'italic' }}>
                        {promoData.terms || '* Términos y condiciones aplican.'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* MÓVIL: BANNER COMPACTO */
                <div style={{ width: '100%', maxWidth: '360px', margin: '0 auto' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF7F7 100%)',
                      border: '1.5px solid #F8D7DA',
                      borderRadius: '16px',
                      padding: '0.75rem 0.95rem',
                      boxShadow: '0 4px 14px rgba(179, 4, 1, 0.05)',
                      gap: '0.85rem',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#B30401',
                        color: '#FFFFFF',
                        borderRadius: '10px',
                        padding: '0.45rem 0.65rem',
                        minWidth: '78px',
                        flexShrink: 0,
                        textAlign: 'center',
                      }}
                    >
                      <span style={{
                        fontFamily: "'UNIFORMEXTRACONDENSED', 'Bebas Neue', 'Oswald', sans-serif",
                        fontSize: '1rem',
                        fontWeight: '900',
                        lineHeight: '1',
                        letterSpacing: '0.03em',
                      }}>
                        {promoData.day || 'MARTES'}
                      </span>
                      <span style={{
                        fontFamily: "'UNIFORMEXTRACONDENSED', 'Bebas Neue', 'Oswald', sans-serif",
                        fontSize: '0.78rem',
                        fontWeight: '900',
                        lineHeight: '1.1',
                        letterSpacing: '0.02em',
                        opacity: 0.95,
                      }}>
                        {promoData.date || '13 DE OCTUBRE'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: '0.15rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'nowrap' }}>
                        <span style={{ color: '#B30401', display: 'inline-flex' }}>
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="5.5" cy="17.5" r="3.5" />
                            <circle cx="18.5" cy="17.5" r="3.5" />
                            <path d="M15 6h-3l-2.5 5H18l-1.5-5z" />
                            <path d="M9.5 11l-3 6.5" />
                            <path d="M14 17.5h-4.5" />
                            <path d="M18.5 14a3.5 3.5 0 0 0-3.5-3.5h-1" />
                          </svg>
                        </span>
                        <strong style={{
                          fontFamily: "'UNIFORMEXTRACONDENSED', 'Bebas Neue', 'Oswald', sans-serif",
                          fontSize: '1.1rem',
                          fontWeight: '900',
                          letterSpacing: '0.03em',
                          color: '#1A1A1A',
                          whiteSpace: 'nowrap',
                        }}>
                          {promoData.headline || 'DOMICILIO'} <span style={{ color: '#B30401' }}>{promoData.highlight || 'GRATIS'}</span>
                        </strong>
                        <img src={districStar} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                      </div>

                      <div style={{
                        fontSize: '0.74rem',
                        color: '#444444',
                        fontFamily: "'UNIFORMEXTRACONDENSED', 'Bebas Neue', 'Oswald', sans-serif",
                        letterSpacing: '0.02em',
                      }}>
                        {promoData.condition || 'En compras superiores a'}{' '}
                        <strong style={{ color: '#B30401', fontSize: '0.88rem' }}>
                          {promoData.price || '$ 30.000 COP'}
                        </strong>
                      </div>

                      <span style={{ fontSize: '0.62rem', color: '#888888', fontStyle: 'italic' }}>
                        {promoData.terms || '* Términos y condiciones aplican.'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Indicador de Estado de Publicación */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  background: campaign.is_active ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: campaign.is_active ? '#16a34a' : '#ef4444',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  marginTop: '1rem',
                  border: campaign.is_active ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                }}
              >
                {campaign.is_active ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {campaign.is_active
                  ? 'ACTIVA: Visible en Tienda Web y Móvil'
                  : 'DESACTIVADA: Oculta en la Tienda'}
              </div>
            </div>
          ) : (
            /* VISTA PREVIA SI ES MODAL O BANNER */
            <article className={`announcement-preview-card preview-${campaign.campaign_type}`}>
              {campaign.image_url ? (
                <img src={campaign.image_url} alt="" />
              ) : (
                <div className="announcement-preview-empty">
                  <ImageIcon />
                  <span>Sin imagen</span>
                </div>
              )}
              <div>
                <small>
                  {campaign.audience === 'all'
                    ? 'Para todos'
                    : campaign.audience === 'new'
                    ? 'Clientes nuevos'
                    : 'Clientes recurrentes'}
                </small>
                <h3>{campaign.title || 'Título de campaña'}</h3>
                <p>{campaign.body || 'Escribe un mensaje claro y atractivo.'}</p>
                {campaign.coupon_code && <code>{campaign.coupon_code}</code>}
                <button type="button">{campaign.cta_label || 'Ver más'}</button>
              </div>
            </article>
          )}
        </aside>
      </div>

      {/* SECCIÓN NOTIFICACIÓN PUSH */}
      <section className="ds-card announcement-push-card" style={{ marginTop: '2rem' }}>
        <div className="ds-card-header">
          <div>
            <span className="ds-page-kicker">Canal inmediato</span>
            <h2 className="ds-card-title">
              <Bell size={19} /> Notificación push
            </h2>
          </div>
          <span className="ds-badge ds-badge-info">
            <Users size={14} /> {(pushCount.customers || 0) + (pushCount.drivers || 0)} dispositivos
          </span>
        </div>
        <form className="ds-card-body ds-form" onSubmit={sendPush}>
          <div className="announcement-push-grid">
            <label className="ds-form-group">
              <span className="ds-form-label">Título</span>
              <input
                className="ds-input"
                required
                maxLength={80}
                value={push.title}
                onChange={(e) => setPush({ ...push, title: e.target.value })}
              />
            </label>
            <label className="ds-form-group">
              <span className="ds-form-label">Destino</span>
              <input
                className="ds-input"
                value={push.url}
                onChange={(e) => setPush({ ...push, url: e.target.value })}
              />
            </label>
            <label className="ds-form-group announcement-push-message">
              <span className="ds-form-label">Mensaje</span>
              <textarea
                className="ds-textarea"
                required
                maxLength={180}
                value={push.message}
                onChange={(e) => setPush({ ...push, message: e.target.value })}
              />
            </label>
          </div>
          <div className="announcement-push-submit">
            <button className="ds-btn ds-btn-success" disabled={pushBusy}>
              <Send size={18} /> {pushBusy ? 'Enviando…' : 'Enviar ahora'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
