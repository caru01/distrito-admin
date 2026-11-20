import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config/api';
import {
  Smartphone, Save, RefreshCw, AlertCircle, CheckCircle, Upload, Eye,
  Sliders, Palette, ShoppingBag, Download, QrCode, ExternalLink, Sparkles,
  Phone, ShieldCheck, ShieldAlert, Store, Clock, DollarSign, Wallet, Banknote,
  RotateCcw, Megaphone, Check, Copy, Flame
} from 'lucide-react';

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [metrics, setMetrics] = useState({ total_orders: 0, total_revenue: 0, total_customers: 0 });
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewMode, setPreviewMode] = useState('home'); // 'home' | 'maintenance'

  // Settings state
  const [settings, setSettings] = useState({
    // App specific
    app_name: 'Distric House',
    app_page_title: 'Distric House App',
    app_hero_title: 'Tus hamburguesas favoritas a un toque',
    app_hero_subtitle: 'Pide en segundos con entrega rápida y seguimiento en vivo.',
    app_logo: '',
    app_primary_color: '#B30401',
    app_background_color: '#0D0D0F',
    app_surface_color: '#1C1C22',
    app_text_color: '#FFFFFF',
    app_font_family: 'modern',
    app_card_style: 'rounded',
    app_is_active: true,
    app_maintenance_message: 'Estamos realizando mejoras en nuestra app. Vuelve a intentar en unos minutos.',
    app_min_order: 0,
    app_delivery_cost: '',
    app_min_version: '1.0.0',
    app_current_version: '1.0.0',
    app_download_url: '',
    app_support_phone: '',
    app_show_chef_3d: true,
    app_welcome_discount_enabled: false,
    app_welcome_discount_text: '',
    app_allow_cash: true,
    app_allow_nequi: true,
    app_allow_transfer: true,

    // Shared / fallback settings
    logo: '',
    restaurant_name: 'Distric House',
    delivery_cost: 6000,
    whatsapp_number: '',
    nequi_number: '',
    bancolombia_number: ''
  });

  const fileInputRef = useRef(null);

  // 1. Cargar configuración y métricas
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const token = sessionStorage.getItem('distrito_admin_token');
    try {
      // Configuración general y de la app
      const resSettings = await fetch(`${API_URL}/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataSettings = await resSettings.json();
      if (dataSettings.status === 'ok') {
        setSettings(prev => ({
          ...prev,
          ...dataSettings.settings,
          app_name: dataSettings.settings.app_name || 'Distric House',
          app_primary_color: dataSettings.settings.app_primary_color || '#B30401',
          app_background_color: dataSettings.settings.app_background_color || '#0D0D0F',
          app_surface_color: dataSettings.settings.app_surface_color || '#1C1C22',
          app_text_color: dataSettings.settings.app_text_color || '#FFFFFF',
        }));
      }

      // Métricas de uso de la App
      const resMetrics = await fetch(`${API_URL}/admin/app/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataMetrics = await resMetrics.json();
      if (dataMetrics.status === 'ok' && dataMetrics.metrics) {
        setMetrics(dataMetrics.metrics);
      }
    } catch (err) {
      console.error('Error cargando configuración de la app:', err);
      setStatusMessage({ text: 'Error al conectar con el servidor', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setStatusMessage({ text: 'El logo no debe superar los 2 MB', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      handleChange('app_logo', reader.result);
      setStatusMessage({ text: 'Logo cargado temporalmente. Haz clic en Guardar para aplicar.', type: 'info' });
    };
    reader.readAsDataURL(file);
  };

  const handleResetColors = () => {
    setSettings(prev => ({
      ...prev,
      app_primary_color: '#B30401',
      app_background_color: '#0D0D0F',
      app_surface_color: '#1C1C22',
      app_text_color: '#FFFFFF'
    }));
    setStatusMessage({ text: 'Colores oficiales de la marca restaurados. Recuerda guardar.', type: 'info' });
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setStatusMessage({ text: '', type: '' });
    const token = sessionStorage.getItem('distrito_admin_token');

    try {
      const payload = { ...settings };
      delete payload.id;
      delete payload.updated_at;

      // Normalizar enteros
      if (payload.app_min_order !== '') payload.app_min_order = parseInt(payload.app_min_order || 0, 10);
      if (payload.app_delivery_cost !== '' && payload.app_delivery_cost != null) {
        payload.app_delivery_cost = parseInt(payload.app_delivery_cost, 10);
      } else {
        payload.app_delivery_cost = null;
      }

      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.status === 'ok') {
        setStatusMessage({ text: '¡Configuración de la APP guardada exitosamente!', type: 'success' });
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      } else {
        setStatusMessage({ text: data.error || 'Error al guardar la configuración', type: 'error' });
      }
    } catch (err) {
      setStatusMessage({ text: `Error de conexión: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    const url = settings.app_download_url || `${window.location.origin.replace(':3000', ':5173')}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Keyboard shortcut Ctrl + S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings]);

  if (loading) {
    return (
      <div className="ds-loader-container">
        <div className="ds-loader" />
        <p style={{ marginTop: '16px', color: 'var(--ds-text-secondary)', fontWeight: 600 }}>Cargando configuración de la APP…</p>
      </div>
    );
  }

  const appLogoUrl = settings.app_logo || settings.logo || '';
  const qrTargetUrl = settings.app_download_url || window.location.origin;

  return (
    <div className="ds-page" style={{ paddingBottom: '60px' }}>
      {/* Header del Módulo */}
      <div className="ds-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="ds-badge" style={{ backgroundColor: 'rgba(37, 99, 235, 0.15)', color: '#2563EB', fontWeight: 700 }}>
              📱 App Móvil & PWA
            </span>
            <span className={`ds-badge ${settings.app_is_active ? 'ds-badge-success' : 'ds-badge-danger'}`}>
              {settings.app_is_active ? '🟢 Servicio Activo' : '🔴 En Mantenimiento'}
            </span>
          </div>
          <h1 className="ds-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Smartphone size={28} color="#2563EB" /> Configuración de la APP
          </h1>
          <p className="ds-page-subtitle">
            Controla la marca, apariencia visual, promociones, reglas de pedido y distribución de la aplicación para clientes.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="ds-btn ds-btn-secondary"
            onClick={fetchData}
            title="Recargar datos desde el servidor"
          >
            <RefreshCw size={16} /> Recargar
          </button>
          <button
            type="button"
            className="ds-btn ds-btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ minWidth: '160px' }}
          >
            {saving ? <div className="ds-loader-sm" /> : <Save size={16} />}
            <span>{saving ? 'Guardando…' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      {/* Banner de Feedback */}
      {statusMessage.text && (
        <div
          className={`ds-banner ${statusMessage.type === 'success' ? 'ds-banner-success' : statusMessage.type === 'error' ? 'ds-banner-danger' : 'ds-banner-info'}`}
          style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px' }}
        >
          {statusMessage.type === 'success' ? <CheckCircle size={20} /> : statusMessage.type === 'error' ? <AlertCircle size={20} /> : <Sparkles size={20} />}
          <span style={{ fontWeight: 600 }}>{statusMessage.text}</span>
        </div>
      )}

      {/* Métricas en Vivo de la APP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="ds-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(37, 99, 235, 0.12)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', fontWeight: 600 }}>Pedidos por la APP</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ds-text-primary)' }}>{metrics.total_orders || 0}</div>
          </div>
        </div>

        <div className="ds-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', fontWeight: 600 }}>Ventas Totales APP</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981' }}>
              ${Number(metrics.total_revenue || 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="ds-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Phone size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', fontWeight: 600 }}>Clientes Móviles</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ds-text-primary)' }}>{metrics.total_customers || 0}</div>
          </div>
        </div>

        <div className="ds-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Download size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', fontWeight: 600 }}>Versión de la App</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ds-text-primary)' }}>v{settings.app_current_version || '1.0.0'}</div>
          </div>
        </div>
      </div>

      {/* Contenedor Principal: Tabs de Configuración + Simulador de Celular */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '24px', alignItems: 'start' }}>
        
        {/* Columna Izquierda: Pestañas y Formularios */}
        <div>
          {/* Navegación por Pestañas */}
          <div className="ds-tabs" style={{ marginBottom: '20px' }}>
            {[
              { id: 'general', label: 'General & Estado', icon: <Sliders size={16} /> },
              { id: 'apariencia', label: 'Marca & Apariencia', icon: <Palette size={16} /> },
              { id: 'pedidos', label: 'Pedidos & Pagos', icon: <ShoppingBag size={16} /> },
              { id: 'distribucion', label: 'Descarga & APK', icon: <Download size={16} /> },
              { id: 'banners', label: 'Banners en App', icon: <Megaphone size={16} /> },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`ds-tab ${activeTab === tab.id ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: GENERAL & ESTADO */}
          {activeTab === 'general' && (
            <div className="ds-card" style={{ padding: '24px' }}>
              <div className="ds-card-header" style={{ marginBottom: '20px' }}>
                <div>
                  <h2 className="ds-card-title">Estado y Disponibilidad de la APP</h2>
                  <p className="ds-card-subtitle">Define si la aplicación está operativa para recibir pedidos o en modo pausa / mantenimiento.</p>
                </div>
              </div>

              {/* Switch de Mantenimiento */}
              <div style={{
                backgroundColor: settings.app_is_active ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${settings.app_is_active ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {settings.app_is_active ? (
                    <ShieldCheck size={32} color="#10B981" />
                  ) : (
                    <ShieldAlert size={32} color="#EF4444" />
                  )}
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: settings.app_is_active ? '#10B981' : '#EF4444' }}>
                      {settings.app_is_active ? 'La APP está ACTIVA y recibiendo pedidos' : 'La APP está en MANTENIMIENTO'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', marginTop: '2px' }}>
                      {settings.app_is_active
                        ? 'Los clientes pueden abrir la app, agregar hamburguesas al carrito y confirmar pedidos.'
                        : 'Los clientes verán una pantalla amigable indicando que la app volverá a estar disponible pronto.'}
                    </div>
                  </div>
                </div>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.app_is_active}
                    onChange={e => handleChange('app_is_active', e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#10B981' }}
                  />
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>{settings.app_is_active ? 'Desactivar App' : 'Activar App'}</span>
                </label>
              </div>

              {!settings.app_is_active && (
                <div className="ds-form-group" style={{ marginBottom: '20px' }}>
                  <label className="ds-form-label">Mensaje de Mantenimiento para Clientes</label>
                  <textarea
                    className="ds-textarea"
                    rows={3}
                    value={settings.app_maintenance_message || ''}
                    onChange={e => handleChange('app_maintenance_message', e.target.value)}
                    placeholder="Ej: Estamos preparando nuevos sabores para ti. Volvemos en unos minutos."
                  />
                  <span className="ds-form-help">Este mensaje se mostrará a pantalla completa cuando un cliente intente usar la app.</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="ds-form-group">
                  <label className="ds-form-label">Nombre Comercial de la App</label>
                  <input
                    type="text"
                    className="ds-input"
                    value={settings.app_name || ''}
                    onChange={e => handleChange('app_name', e.target.value)}
                    placeholder="Distric House"
                  />
                  <span className="ds-form-help">Nombre mostrado en la cabecera y notificaciones móviles.</span>
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label">Título en Barra Superior (PWA/Browser)</label>
                  <input
                    type="text"
                    className="ds-input"
                    value={settings.app_page_title || ''}
                    onChange={e => handleChange('app_page_title', e.target.value)}
                    placeholder="Distric House App"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="ds-form-group">
                  <label className="ds-form-label">WhatsApp / Teléfono de Soporte en App</label>
                  <input
                    type="text"
                    className="ds-input"
                    value={settings.app_support_phone || ''}
                    onChange={e => handleChange('app_support_phone', e.target.value)}
                    placeholder="Ej: 573228236926"
                  />
                  <span className="ds-form-help">Número al que los clientes escribirán desde el botón de ayuda en su perfil y seguimiento.</span>
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label">Animación Interactiva de Chef 3D</label>
                  <div style={{ display: 'flex', alignItems: 'center', height: '42px', gap: '10px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.app_show_chef_3d}
                        onChange={e => handleChange('app_show_chef_3d', e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: '#2563EB', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>Mostrar Chef animado interactivo</span>
                    </label>
                  </div>
                  <span className="ds-form-help">Elemento tridimensional llamativo en la cabecera móvil.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MARCA & APARIENCIA */}
          {activeTab === 'apariencia' && (
            <div className="ds-card" style={{ padding: '24px' }}>
              <div className="ds-card-header" style={{ marginBottom: '20px' }}>
                <div>
                  <h2 className="ds-card-title">Identidad Visual y Colores de la APP</h2>
                  <p className="ds-card-subtitle">Personaliza la experiencia estética de tus clientes en sus teléfonos.</p>
                </div>
                <button
                  type="button"
                  className="ds-btn ds-btn-secondary ds-btn-sm"
                  onClick={handleResetColors}
                  title="Restablecer colores corporativos"
                >
                  <RotateCcw size={14} /> Restaurar Oficiales
                </button>
              </div>

              {/* Logo de la App */}
              <div style={{
                border: '1px dashed var(--ds-border)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
                backgroundColor: 'var(--ds-bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '16px',
                  backgroundColor: '#0D0D0F',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {appLogoUrl ? (
                    <img src={appLogoUrl} alt="Logo App" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Smartphone size={36} color="#A0A0A8" />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ds-text-primary)' }}>Logotipo exclusivo para la App Móvil</div>
                  <div style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', margin: '4px 0 12px 0' }}>
                    Recomendado: Imagen PNG transparente o SVG de 512x512 px. Si no se sube uno, la app usará el logo general.
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="ds-btn ds-btn-secondary ds-btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={14} /> Subir Logo
                    </button>
                    {settings.app_logo && (
                      <button
                        type="button"
                        className="ds-btn ds-btn-ghost ds-btn-sm"
                        onClick={() => handleChange('app_logo', '')}
                      >
                        Usar Logo General
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      style={{ display: 'none' }}
                      onChange={handleLogoUpload}
                    />
                  </div>
                </div>
              </div>

              {/* Títulos del Hero */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="ds-form-group">
                  <label className="ds-form-label">Título de Bienvenida (Hero)</label>
                  <input
                    type="text"
                    className="ds-input"
                    value={settings.app_hero_title || ''}
                    onChange={e => handleChange('app_hero_title', e.target.value)}
                    placeholder="Tus hamburguesas favoritas a un toque"
                  />
                </div>
                <div className="ds-form-group">
                  <label className="ds-form-label">Subtítulo Descriptivo</label>
                  <input
                    type="text"
                    className="ds-input"
                    value={settings.app_hero_subtitle || ''}
                    onChange={e => handleChange('app_hero_subtitle', e.target.value)}
                    placeholder="Pide en segundos con entrega rápida y seguimiento en vivo."
                  />
                </div>
              </div>

              {/* Paleta de Colores */}
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: 'var(--ds-text-primary)' }}>
                Paleta de Colores Móviles
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {/* Color Primario */}
                <div style={{ border: '1px solid var(--ds-border)', borderRadius: '10px', padding: '12px' }}>
                  <label className="ds-form-label" style={{ fontSize: '13px' }}>Color Primario (Botones/Acentos)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                    <input
                      type="color"
                      value={settings.app_primary_color || '#B30401'}
                      onChange={e => handleChange('app_primary_color', e.target.value)}
                      style={{ width: '38px', height: '38px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      className="ds-input"
                      value={settings.app_primary_color || '#B30401'}
                      onChange={e => handleChange('app_primary_color', e.target.value)}
                      style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                    />
                  </div>
                </div>

                {/* Color de Fondo */}
                <div style={{ border: '1px solid var(--ds-border)', borderRadius: '10px', padding: '12px' }}>
                  <label className="ds-form-label" style={{ fontSize: '13px' }}>Color de Fondo (Tema Oscuro)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                    <input
                      type="color"
                      value={settings.app_background_color || '#0D0D0F'}
                      onChange={e => handleChange('app_background_color', e.target.value)}
                      style={{ width: '38px', height: '38px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      className="ds-input"
                      value={settings.app_background_color || '#0D0D0F'}
                      onChange={e => handleChange('app_background_color', e.target.value)}
                      style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                    />
                  </div>
                </div>

                {/* Color Superficies */}
                <div style={{ border: '1px solid var(--ds-border)', borderRadius: '10px', padding: '12px' }}>
                  <label className="ds-form-label" style={{ fontSize: '13px' }}>Color de Tarjetas</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                    <input
                      type="color"
                      value={settings.app_surface_color || '#1C1C22'}
                      onChange={e => handleChange('app_surface_color', e.target.value)}
                      style={{ width: '38px', height: '38px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      className="ds-input"
                      value={settings.app_surface_color || '#1C1C22'}
                      onChange={e => handleChange('app_surface_color', e.target.value)}
                      style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                    />
                  </div>
                </div>

                {/* Color de Texto */}
                <div style={{ border: '1px solid var(--ds-border)', borderRadius: '10px', padding: '12px' }}>
                  <label className="ds-form-label" style={{ fontSize: '13px' }}>Color de Textos</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                    <input
                      type="color"
                      value={settings.app_text_color || '#FFFFFF'}
                      onChange={e => handleChange('app_text_color', e.target.value)}
                      style={{ width: '38px', height: '38px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      className="ds-input"
                      value={settings.app_text_color || '#FFFFFF'}
                      onChange={e => handleChange('app_text_color', e.target.value)}
                      style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                    />
                  </div>
                </div>
              </div>

              {/* Tipografía y Estilo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="ds-form-group">
                  <label className="ds-form-label">Estilo de Tarjetas Móviles</label>
                  <select
                    className="ds-select"
                    value={settings.app_card_style || 'rounded'}
                    onChange={e => handleChange('app_card_style', e.target.value)}
                  >
                    <option value="rounded">Redondeadas (Modernas 18px)</option>
                    <option value="compact">Compactas (Bordes sutiles)</option>
                    <option value="outlined">Con Borde Destacado</option>
                  </select>
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label">Familia Tipográfica</label>
                  <select
                    className="ds-select"
                    value={settings.app_font_family || 'modern'}
                    onChange={e => handleChange('app_font_family', e.target.value)}
                  >
                    <option value="modern">Moderna (Montserrat + Inter)</option>
                    <option value="friendly">Amigable (Rounded Sans)</option>
                    <option value="system">Nativa del Sistema Operativo</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PEDIDOS & PAGOS */}
          {activeTab === 'pedidos' && (
            <div className="ds-card" style={{ padding: '24px' }}>
              <div className="ds-card-header" style={{ marginBottom: '20px' }}>
                <div>
                  <h2 className="ds-card-title">Reglas de Checkout y Métodos de Pago en la APP</h2>
                  <p className="ds-card-subtitle">Controla los costos, montos mínimos y medios de pago exclusivos para los clientes de la aplicación.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div className="ds-form-group">
                  <label className="ds-form-label">Costo de Domicilio en la App ($ COP)</label>
                  <input
                    type="number"
                    className="ds-input"
                    value={settings.app_delivery_cost !== '' && settings.app_delivery_cost != null ? settings.app_delivery_cost : ''}
                    onChange={e => handleChange('app_delivery_cost', e.target.value)}
                    placeholder={`Heredado de tienda: $${Number(settings.delivery_cost || 6000).toLocaleString()}`}
                  />
                  <span className="ds-form-help">Si lo dejas vacío, usará el costo de domicilio general (${Number(settings.delivery_cost || 6000).toLocaleString()}).</span>
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label">Pedido Mínimo en la App ($ COP)</label>
                  <input
                    type="number"
                    className="ds-input"
                    value={settings.app_min_order || 0}
                    onChange={e => handleChange('app_min_order', e.target.value)}
                    placeholder="0"
                  />
                  <span className="ds-form-help">Monto mínimo en carrito para poder procesar la orden desde la app.</span>
                </div>
              </div>

              {/* Métodos de Pago Habilitados */}
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: 'var(--ds-text-primary)' }}>
                Métodos de Pago Aceptados en la App
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <label style={{
                  border: `1px solid ${settings.app_allow_cash ? '#10B981' : 'var(--ds-border)'}`,
                  backgroundColor: settings.app_allow_cash ? 'rgba(16, 185, 129, 0.08)' : 'var(--ds-bg-elevated)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={settings.app_allow_cash}
                    onChange={e => handleChange('app_allow_cash', e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#10B981' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>💵 Efectivo contra entrega</div>
                    <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)' }}>El cliente paga al recibir</div>
                  </div>
                </label>

                <label style={{
                  border: `1px solid ${settings.app_allow_nequi ? '#8B5CF6' : 'var(--ds-border)'}`,
                  backgroundColor: settings.app_allow_nequi ? 'rgba(139, 92, 246, 0.08)' : 'var(--ds-bg-elevated)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={settings.app_allow_nequi}
                    onChange={e => handleChange('app_allow_nequi', e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#8B5CF6' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>📱 Nequi</div>
                    <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)' }}>
                      {settings.nequi_number ? `Cuenta: ${settings.nequi_number}` : 'Sin número configurado'}
                    </div>
                  </div>
                </label>

                <label style={{
                  border: `1px solid ${settings.app_allow_transfer ? '#3B82F6' : 'var(--ds-border)'}`,
                  backgroundColor: settings.app_allow_transfer ? 'rgba(59, 130, 246, 0.08)' : 'var(--ds-bg-elevated)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={settings.app_allow_transfer}
                    onChange={e => handleChange('app_allow_transfer', e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#3B82F6' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>🏦 Bancolombia</div>
                    <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)' }}>
                      {settings.bancolombia_number ? `Cuenta: ${settings.bancolombia_number}` : 'Sin número configurado'}
                    </div>
                  </div>
                </label>
              </div>

              {/* Beneficio o Descuento de Bienvenida */}
              <div style={{
                border: '1px solid rgba(245, 158, 11, 0.3)',
                backgroundColor: 'rgba(245, 158, 11, 0.05)',
                borderRadius: '12px',
                padding: '18px',
                marginTop: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#B45309' }}>
                    <Flame size={18} color="#D97706" /> Incentivo / Promoción de Bienvenida
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.app_welcome_discount_enabled}
                      onChange={e => handleChange('app_welcome_discount_enabled', e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#D97706' }}
                    />
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>Activar promoción</span>
                  </label>
                </div>

                {settings.app_welcome_discount_enabled && (
                  <div className="ds-form-group" style={{ margin: 0 }}>
                    <label className="ds-form-label">Texto promocional en la App</label>
                    <input
                      type="text"
                      className="ds-input"
                      value={settings.app_welcome_discount_text || ''}
                      onChange={e => handleChange('app_welcome_discount_text', e.target.value)}
                      placeholder="Ej: ¡Usa la App y obtén envío gratis en tu primer pedido!"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: DESCARGA & APK */}
          {activeTab === 'distribucion' && (
            <div className="ds-card" style={{ padding: '24px' }}>
              <div className="ds-card-header" style={{ marginBottom: '20px' }}>
                <div>
                  <h2 className="ds-card-title">Distribución, Código QR y Versiones</h2>
                  <p className="ds-card-subtitle">Administra los enlaces de descarga para tus clientes e imprime el código QR para colocar en las mesas o el mostrador.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '24px', alignItems: 'start', marginBottom: '24px' }}>
                <div>
                  <div className="ds-form-group" style={{ marginBottom: '16px' }}>
                    <label className="ds-form-label">Enlace de Descarga de la APP (APK o Play Store)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        className="ds-input"
                        value={settings.app_download_url || ''}
                        onChange={e => handleChange('app_download_url', e.target.value)}
                        placeholder="https://tudominio.com/app.apk o link de tienda"
                      />
                      <button
                        type="button"
                        className="ds-btn ds-btn-secondary"
                        onClick={handleCopyLink}
                        title="Copiar enlace"
                      >
                        {copiedLink ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
                      </button>
                    </div>
                    <span className="ds-form-help">Los clientes que escaneen el código QR o abran este link podrán descargar la aplicación directamente.</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="ds-form-group">
                      <label className="ds-form-label">Versión Actual de la App</label>
                      <input
                        type="text"
                        className="ds-input"
                        value={settings.app_current_version || '1.0.0'}
                        onChange={e => handleChange('app_current_version', e.target.value)}
                        placeholder="1.0.0"
                      />
                    </div>

                    <div className="ds-form-group">
                      <label className="ds-form-label">Versión Mínima Requerida</label>
                      <input
                        type="text"
                        className="ds-input"
                        value={settings.app_min_version || '1.0.0'}
                        onChange={e => handleChange('app_min_version', e.target.value)}
                        placeholder="1.0.0"
                      />
                      <span className="ds-form-help">Si un cliente tiene una versión inferior, la app le pedirá actualizar.</span>
                    </div>
                  </div>
                </div>

                {/* Código QR Listo para Mostrar/Imprimir */}
                <div style={{
                  border: '1px solid var(--ds-border)',
                  borderRadius: '16px',
                  padding: '16px',
                  textAlign: 'center',
                  backgroundColor: 'var(--ds-bg-elevated)'
                }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>Código QR para Clientes</div>
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    padding: '8px',
                    borderRadius: '12px',
                    display: 'inline-block',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrTargetUrl)}`}
                      alt="Código QR App"
                      style={{ width: '150px', height: '150px', display: 'block' }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ds-text-secondary)', marginTop: '8px' }}>
                    Escanea para abrir la app
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BANNERS EN APP */}
          {activeTab === 'banners' && (
            <div className="ds-card" style={{ padding: '24px' }}>
              <div className="ds-card-header" style={{ marginBottom: '20px' }}>
                <div>
                  <h2 className="ds-card-title">Promociones y Tarjetas de la APP</h2>
                  <p className="ds-card-subtitle">Los banners configurados como tipo "Tarjeta Promocional" aparecen en la sección destacada de la app móvil.</p>
                </div>
                <a
                  href="/admin/anuncios"
                  className="ds-btn ds-btn-secondary ds-btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  <ExternalLink size={14} /> Administrador de Anuncios
                </a>
              </div>

              <div style={{
                border: '1px solid rgba(37, 99, 235, 0.2)',
                backgroundColor: 'rgba(37, 99, 235, 0.05)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <Megaphone size={28} color="#2563EB" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#2563EB' }}>Campañas activas dirigidas a la APP</div>
                    <div style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', marginTop: '2px' }}>
                      Crea anuncios con imagen, botón de acción directa o código de descuento que se mostrarán en la pantalla principal de la aplicación.
                    </div>
                  </div>
                </div>

                <a
                  href="/admin/anuncios"
                  className="ds-btn ds-btn-primary ds-btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  Crear Promoción en App
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Columna Derecha: Simulador de Celular en Vivo (Live Phone Mockup) */}
        <div>
          <div style={{ position: 'sticky', top: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text-secondary)' }}>
                Vista Previa en Vivo
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setPreviewMode('home')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: previewMode === 'home' ? '#2563EB' : 'var(--ds-bg-elevated)',
                    color: previewMode === 'home' ? '#fff' : 'var(--ds-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Menú
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('maintenance')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: previewMode === 'maintenance' ? '#2563EB' : 'var(--ds-bg-elevated)',
                    color: previewMode === 'maintenance' ? '#fff' : 'var(--ds-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Pausa
                </button>
              </div>
            </div>

            {/* Chasis de Teléfono Móvil */}
            <div style={{
              width: '320px',
              height: '620px',
              backgroundColor: '#000000',
              borderRadius: '42px',
              padding: '12px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45), 0 0 0 3px #27272A',
              margin: '0 auto',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Notch / Dynamic Island */}
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100px',
                height: '24px',
                backgroundColor: '#000000',
                borderRadius: '12px',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1A1A1A' }} />
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#002B49' }} />
              </div>

              {/* Pantalla del Teléfono */}
              <div style={{
                width: '100%',
                height: '100%',
                backgroundColor: settings.app_background_color || '#0D0D0F',
                borderRadius: '32px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                color: settings.app_text_color || '#FFFFFF',
                fontFamily: 'sans-serif'
              }}>
                {/* Status bar */}
                <div style={{
                  padding: '12px 20px 6px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  opacity: 0.8
                }}>
                  <span>7:30</span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span>5G</span>
                    <span>100%</span>
                  </div>
                </div>

                {previewMode === 'maintenance' || !settings.app_is_active ? (
                  /* Vista en Mantenimiento */
                  <div style={{ flex: 1, padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px'
                    }}>
                      <ShieldAlert size={32} color="#EF4444" />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '18px', marginBottom: '8px' }}>Volvemos Pronto</div>
                    <div style={{ fontSize: '13px', opacity: 0.75, lineHeight: 1.4 }}>
                      {settings.app_maintenance_message || 'Estamos realizando mejoras en nuestra app.'}
                    </div>
                  </div>
                ) : (
                  /* Vista Principal de la App */
                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
                    {/* Header Móvil */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {appLogoUrl ? (
                          <img src={appLogoUrl} alt="Logo" style={{ height: '24px', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '-0.5px' }}>{settings.app_name || 'DISTRID'}</span>
                        )}
                      </div>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: 'rgba(34, 197, 94, 0.2)',
                        color: '#22C55E',
                        padding: '2px 8px',
                        borderRadius: '12px'
                      }}>
                        ABIERTO
                      </span>
                    </div>

                    {/* Banner de Bienvenida / Hero */}
                    <div style={{
                      backgroundColor: settings.app_surface_color || '#1C1C22',
                      borderRadius: '16px',
                      padding: '14px',
                      marginBottom: '12px',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}>
                      {settings.app_welcome_discount_enabled && settings.app_welcome_discount_text && (
                        <div style={{
                          backgroundColor: settings.app_primary_color || '#B30401',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          display: 'inline-block',
                          marginBottom: '6px'
                        }}>
                          {settings.app_welcome_discount_text}
                        </div>
                      )}
                      <div style={{ fontWeight: 800, fontSize: '14px', lineHeight: 1.2, marginBottom: '4px' }}>
                        {settings.app_hero_title || 'Tus hamburguesas favoritas'}
                      </div>
                      <div style={{ fontSize: '11px', opacity: 0.7, lineHeight: 1.3 }}>
                        {settings.app_hero_subtitle || 'Pide en segundos con entrega rápida.'}
                      </div>
                    </div>

                    {/* Chips de Categorías */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'hidden' }}>
                      {['Todos', 'Burgers', 'Salchipapas'].map((cat, i) => (
                        <span
                          key={cat}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: i === 0 ? (settings.app_primary_color || '#B30401') : 'rgba(255,255,255,0.08)',
                            color: '#FFFFFF'
                          }}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    {/* Card de Producto de Ejemplo */}
                    <div style={{
                      backgroundColor: settings.app_surface_color || '#1C1C22',
                      borderRadius: '16px',
                      padding: '12px',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center',
                      border: '1px solid rgba(255,255,255,0.06)',
                      marginBottom: '10px'
                    }}>
                      <div style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '10px',
                        backgroundColor: '#27272A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px'
                      }}>
                        🍔
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '12px' }}>Distrito Doble Carne</div>
                        <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>Carne artesanal, queso y tocineta</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '13px', color: '#10B981' }}>$24.000</span>
                          <button
                            type="button"
                            style={{
                              backgroundColor: settings.app_primary_color || '#B30401',
                              border: 'none',
                              color: '#fff',
                              borderRadius: '8px',
                              padding: '3px 8px',
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            + Agregar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Bar Simulada */}
                <div style={{
                  height: '46px',
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  fontSize: '9px',
                  opacity: 0.8
                }}>
                  <div style={{ textAlign: 'center', color: settings.app_primary_color || '#B30401', fontWeight: 700 }}>Menú</div>
                  <div style={{ textAlign: 'center' }}>Buscar</div>
                  <div style={{ textAlign: 'center' }}>Pedidos</div>
                  <div style={{ textAlign: 'center' }}>Perfil</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
