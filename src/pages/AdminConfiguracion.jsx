import { API_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import DeliveryAddressPicker from '../components/DeliveryAddressPicker.jsx';
import { 
  Settings, Building2, CreditCard, Bike,
  Upload, Save, Clock, Phone,
  Mail, MapPin, Globe, Check, Palette, LocateFixed
} from 'lucide-react';


export default function AdminConfiguración() {
  const [activeTab, setActiveTab] = useState('Apariencia');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locatingStore, setLocatingStore] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  const [settings, setSettings] = useState({
    restaurant_name: '', description: '', phone: '', email: '', address: '', schedule: '', logo: '',
    kitchen_address: '', kitchen_place_id: '',
    store_latitude: 10.4631, store_longitude: -73.2532,
    prep_time: '', min_order: 0, delivery_cost: 0, max_distance: '', delivery_schedule: '', default_order_type: 'Domicilio',
    delivery_completion_radius_meters: 150,
    payment_efectivo: true, payment_nequi: true, payment_daviplata: true, payment_tarjeta: true, payment_transferencia: false, payment_pse: false,
    instagram: '', facebook: '', tiktok: '', whatsapp_number: '',
    welcome_message: '',
    currency: 'COP', timezone: 'America/Bogota', language: 'es', date_format: 'DD/MM/YYYY', time_format: '12h',
    nequi_number: '', bancolombia_number: '',
    web_primary_color: '#D4A017', web_background_color: '#0D0D0D', web_surface_color: '#171717', web_text_color: '#FFFFFF',
    admin_primary_color: '#D4A017', admin_background_color: '#0D0D0D', admin_surface_color: '#151515', admin_text_color: '#FFFFFF'
  });
  const [kitchenLocationConfirmed, setKitchenLocationConfirmed] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const res = await fetch(`${API_URL}/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setSettings(prev => ({ ...prev, ...data.settings }));
        setKitchenLocationConfirmed(data.settings?.store_latitude != null && data.settings?.store_longitude != null);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const latitude = Number(settings.store_latitude);
    const longitude = Number(settings.store_longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !kitchenLocationConfirmed) {
      setSaveMessage('❌ Confirma el punto exacto de la cocina antes de guardar');
      setActiveTab('Domicilios');
      return;
    }
    setSaving(true);
    setSaveMessage('');
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok) {
        setSettings(prev => ({ ...prev, ...data.settings }));
        window.dispatchEvent(new CustomEvent('distrito:settings-updated'));
        setSaveMessage('✅ Configuración guardada y publicada');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage(`❌ ${data.error || 'Error al guardar'}`);
      }
    } catch (err) {
      console.error(err);
      setSaveMessage('❌ Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const updateKitchenLocation = (updates) => {
    setSettings((current) => ({
      ...current,
      kitchen_address: updates.address !== undefined ? updates.address : current.kitchen_address,
      kitchen_place_id: updates.placeId !== undefined ? updates.placeId : current.kitchen_place_id,
      store_latitude: updates.latitude !== undefined ? updates.latitude : current.store_latitude,
      store_longitude: updates.longitude !== undefined ? updates.longitude : current.store_longitude,
    }));
    if (updates.locationConfirmed !== undefined) setKitchenLocationConfirmed(Boolean(updates.locationConfirmed));
  };

  const captureStoreLocation = () => {
    if (!navigator.geolocation) {
      setSaveMessage('❌ Este dispositivo no permite obtener ubicación');
      return;
    }
    setLocatingStore(true);
    setSaveMessage('');
    navigator.geolocation.getCurrentPosition((position) => {
      setSettings((current) => ({
        ...current,
        store_latitude: Number(position.coords.latitude.toFixed(7)),
        store_longitude: Number(position.coords.longitude.toFixed(7)),
      }));
      setKitchenLocationConfirmed(true);
      setLocatingStore(false);
      setSaveMessage('✅ Punto de la cocina capturado; guarda los cambios');
    }, (error) => {
      setLocatingStore(false);
      setSaveMessage(`❌ ${error.message || 'No fue posible obtener la ubicación'}`);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  const tabs = [
    { id: 'General', icon: <Settings size={18} /> },
    { id: 'Empresa', icon: <Building2 size={18} /> },
    { id: 'Apariencia', icon: <Palette size={18} /> },
    { id: 'Pagos', icon: <CreditCard size={18} /> },
    { id: 'Domicilios', icon: <Bike size={18} /> }
  ];

  if (loading) return (
    <div className="ds-page configuration-page">
      <div className="ds-loader-container">
        <div className="ds-loader"></div>
        <p>Cargando configuraciones...</p>
      </div>
    </div>
  );

  return (
    <div className="ds-page">
      {/* Header */}
      <div className="ds-page-header">
        <div>
          <div style={{ color: '#BDBDBD', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
            Dashboard <span style={{ margin: '0 8px' }}>/</span> <span style={{ color: '#FFFFFF' }}>Configuración</span>
          </div>
          <h1 className="ds-page-title">Configuración</h1>
          <p style={{ color: '#BDBDBD', fontSize: '16px', margin: 0 }}>Administra todas las configuraciones generales del restaurante de forma centralizada.</p>
        </div>
        <div className="ds-page-actions">
          {saveMessage && <span style={{ color: saveMessage.includes('✅') ? '#22C55E' : '#EF4444', fontWeight: '600' }}>{saveMessage}</span>}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="ds-btn ds-btn-primary"
          >
            <Save size={20} /> {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <div className="configuration-source-banner">
        <div><Palette size={24} /><div><strong>Configuración central de la tienda</strong><p>Los datos y colores guardados aquí se publican en la web y en el panel administrativo.</p></div></div>
        <button className="ds-btn ds-btn-secondary ds-btn-sm" onClick={() => setActiveTab('Apariencia')}>Editar apariencia</button>
      </div>

      {/* Tabs */}
      <div className="ds-tabs configuration-tabs" aria-label="Secciones de configuración">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`ds-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.icon} {tab.id}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="configuration-content">
        
        {/* TAB EMPRESA */}
        {activeTab === 'Empresa' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Tarjeta 1 */}
            <div className="ds-card">
              <div className="ds-card-header">
                <h2 className="ds-card-title">
                  <Building2 size={24} color="#D4A017" /> Información del Restaurante
                </h2>
              </div>
              
              <div className="ds-card-body ds-form">
                <div className="ds-form-grid">
                  <div className="ds-form-group">
                    <label className="ds-form-label">Nombre del Restaurante</label>
                    <input type="text" className="ds-input" value={settings.restaurant_name} onChange={e => handleChange('restaurant_name', e.target.value)} />
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Teléfono de Contacto</label>
                    <div className="ds-input-group">
                      <span className="ds-input-group-icon"><Phone size={18} /></span>
                      <input type="text" className="ds-input" value={settings.phone} onChange={e => handleChange('phone', e.target.value)} style={{ paddingLeft: '40px' }} />
                    </div>
                  </div>
                  <div className="ds-form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="ds-form-label">Descripción Breve</label>
                    <input type="text" className="ds-input" value={settings.description} onChange={e => handleChange('description', e.target.value)} />
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Correo Electrónico</label>
                    <div className="ds-input-group">
                      <span className="ds-input-group-icon"><Mail size={18} /></span>
                      <input type="text" className="ds-input" value={settings.email} onChange={e => handleChange('email', e.target.value)} style={{ paddingLeft: '40px' }} />
                    </div>
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Horario de Atención</label>
                    <div className="ds-input-group">
                      <span className="ds-input-group-icon"><Clock size={18} /></span>
                      <input type="text" className="ds-input" value={settings.schedule} onChange={e => handleChange('schedule', e.target.value)} placeholder="Ej. Lunes a Viernes 11:00 AM - 10:00 PM" style={{ paddingLeft: '40px' }} />
                    </div>
                  </div>
                  <p className="ds-text-muted" style={{ gridColumn: '1 / -1' }}>El bloqueo real de pedidos se administra en el módulo Horarios. Este texto es únicamente informativo.</p>
                  <div className="ds-form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="ds-form-label">Dirección Principal</label>
                    <div className="ds-input-group">
                      <span className="ds-input-group-icon"><MapPin size={18} /></span>
                      <input type="text" className="ds-input" value={settings.address} onChange={e => handleChange('address', e.target.value)} style={{ paddingLeft: '40px' }} />
                    </div>
                  </div>
                </div>

                <div className="ds-divider" style={{ margin: '24px 0' }}></div>
                
                <div className="ds-form-group">
                  <label className="ds-form-label">Logotipo del Restaurante</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                    {settings.logo ? (
                      <img src={settings.logo} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '12px', border: '1px solid #2A2A2A', backgroundColor: '#000' }} />
                    ) : (
                      <div style={{ width: '80px', height: '80px', backgroundColor: '#1A1A1A', borderRadius: '12px', border: '1px dashed #333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building2 color="#666" />
                      </div>
                    )}
                    <div className="admin-settings-logo-upload" style={{ flex: 1, minWidth: '250px', border: '1px dashed #333333', borderRadius: '12px', padding: '24px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      <Upload size={24} color="#D4A017" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: '600' }}>Subir nuevo logo</div>
                      <div style={{ fontSize: '13px', color: '#BDBDBD', marginTop: '4px' }}>Sube una imagen o usa una URL</div>
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="ds-input" style={{ marginTop: '12px' }} onChange={e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        if (file.size > 2 * 1024 * 1024) return setSaveMessage('❌ El logo no debe superar 2 MB');
                        const reader = new FileReader(); reader.onload = () => handleChange('logo', reader.result); reader.readAsDataURL(file);
                      }} />
                      <input type="text" className="ds-input" value={settings.logo} onChange={e => handleChange('logo', e.target.value)} placeholder="URL del logotipo (https://...)" style={{ marginTop: '16px' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tarjeta 4 - Redes Sociales */}
            <div className="ds-card">
              <div className="ds-card-header">
                <h2 className="ds-card-title">
                  <Globe size={24} color="#D4A017" /> Redes Sociales y Enlaces
                </h2>
              </div>
              <div className="ds-card-body ds-form">
                <div className="ds-form-grid">
                  <div className="ds-form-group">
                    <label className="ds-form-label">WhatsApp (Número con indicativo ej. 57300...)</label>
                    <input type="text" className="ds-input" value={settings.whatsapp_number} onChange={e => handleChange('whatsapp_number', e.target.value)} />
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Instagram (URL)</label>
                    <input type="text" className="ds-input" value={settings.instagram} onChange={e => handleChange('instagram', e.target.value)} />
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Facebook (URL)</label>
                    <input type="text" className="ds-input" value={settings.facebook} onChange={e => handleChange('facebook', e.target.value)} />
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">TikTok (URL)</label>
                    <input type="text" className="ds-input" value={settings.tiktok} onChange={e => handleChange('tiktok', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Apariencia' && (
          <div className="settings-theme-grid">
            <ThemeCard title="Tienda web / app" prefix="web" settings={settings} onChange={handleChange} />
            <ThemeCard title="Panel administrativo" prefix="admin" settings={settings} onChange={handleChange} />
            <div className="ds-card settings-theme-preview" style={{ '--preview-primary': settings[`${activeTab === 'Apariencia' ? 'web' : 'admin'}_primary_color`] }}>
              <div className="ds-card-header"><h2 className="ds-card-title"><Palette size={22} /> Vista previa</h2></div>
              <div className="ds-card-body"><div className="theme-preview" style={{ background: settings.web_background_color, color: settings.web_text_color }}><div style={{ background: settings.web_surface_color }}><strong>{settings.restaurant_name || 'Tu restaurante'}</strong><p>Los cambios publicados se aplican a todos los usuarios.</p><button style={{ background: settings.web_primary_color }}>Hacer pedido</button></div></div></div>
            </div>
          </div>
        )}

        {/* TAB DOMICILIOS Y PEDIDOS */}
        {activeTab === 'Domicilios' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="ds-card kitchen-location-card">
              <div className="ds-card-header">
                <h2 className="ds-card-title"><MapPin size={24} color="#D4A017" /> Ubicación de la cocina</h2>
              </div>
              <div className="ds-card-body ds-form">
                <p className="ds-text-muted">Este es el único punto de salida usado por el seguimiento del cliente y Mapa de Domicilios.</p>
                <DeliveryAddressPicker
                  value={{
                    address: settings.kitchen_address || settings.address || '',
                    latitude: settings.store_latitude,
                    longitude: settings.store_longitude,
                    placeId: settings.kitchen_place_id || '',
                    locationConfirmed: kitchenLocationConfirmed,
                  }}
                  onChange={updateKitchenLocation}
                  apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
                  mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'}
                  inputClassName="ds-input"
                  compact
                  labels={{
                    title: 'Dirección de la cocina',
                    readyHelp: 'Busca la sede desde donde salen los pedidos y confirma el marcador.',
                    manualHelp: 'Escribe la dirección de la cocina.',
                    placeholder: 'Ej. Cra 19 #15-34, Valledupar',
                    inputAriaLabel: 'Dirección de la cocina',
                    mapAriaLabel: 'Mapa para confirmar la ubicación de la cocina',
                    markerTitle: 'Punto exacto de salida de la cocina',
                    confirmed: 'Cocina confirmada',
                    confirm: 'Confirmar punto de la cocina',
                  }}
                />
                <div className="ds-form-grid kitchen-coordinate-grid">
                  <label className="ds-form-group"><span className="ds-form-label">Latitud</span><input type="number" step="0.0000001" min="-90" max="90" className="ds-input" value={settings.store_latitude ?? ''} onChange={e => { handleChange('store_latitude', e.target.value); setKitchenLocationConfirmed(false); }} /></label>
                  <label className="ds-form-group"><span className="ds-form-label">Longitud</span><input type="number" step="0.0000001" min="-180" max="180" className="ds-input" value={settings.store_longitude ?? ''} onChange={e => { handleChange('store_longitude', e.target.value); setKitchenLocationConfirmed(false); }} /></label>
                </div>
                <button type="button" className="ds-btn ds-btn-secondary" disabled={locatingStore} onClick={captureStoreLocation}>
                  <LocateFixed size={18} /> {locatingStore ? 'Obteniendo ubicación…' : 'Usar mi ubicación actual como cocina'}
                </button>
              </div>
            </div>
            <div className="ds-card">
              <div className="ds-card-header">
                <h2 className="ds-card-title">
                  <Bike size={24} color="#D4A017" /> Configuración Operativa
                </h2>
              </div>
              <div className="ds-card-body ds-form">
                <div className="ds-form-grid">
                  <div className="ds-form-group">
                    <label className="ds-form-label">Tiempo estimado de preparación</label>
                    <input type="text" className="ds-input" value={settings.prep_time} onChange={e => handleChange('prep_time', e.target.value)} placeholder="Ej. 20-30 min" />
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Costo del domicilio ($)</label>
                    <input type="number" className="ds-input" value={settings.delivery_cost} onChange={e => handleChange('delivery_cost', parseInt(e.target.value)||0)} />
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Pedido Mínimo ($)</label>
                    <input type="number" className="ds-input" value={settings.min_order} onChange={e => handleChange('min_order', parseInt(e.target.value)||0)} />
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Distancia Máxima</label>
                    <input type="text" className="ds-input" value={settings.max_distance} onChange={e => handleChange('max_distance', e.target.value)} placeholder="Ej. 5 km" />
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Radio para finalizar la entrega</label>
                    <input type="number" min="50" max="500" step="10" className="ds-input" value={settings.delivery_completion_radius_meters} onChange={e => handleChange('delivery_completion_radius_meters', parseInt(e.target.value, 10) || 150)} />
                    <small className="ds-text-muted">El botón Finalizar se habilita cuando el GPS del domiciliario está dentro de este radio (50 a 500 metros).</small>
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Tipo de pedido predeterminado</label>
                    <select className="ds-select" value={settings.default_order_type} onChange={e => handleChange('default_order_type', e.target.value)}>
                      <option value="Domicilio">Domicilio</option>
                      <option value="Para Llevar">Para Llevar</option>
                      <option value="Local">Consumir en el Local</option>
                    </select>
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Horario de Domicilios</label>
                    <input type="text" className="ds-input" value={settings.delivery_schedule} onChange={e => handleChange('delivery_schedule', e.target.value)} placeholder="Ej. 11:30 AM a 9:30 PM" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB PAGOS */}
        {activeTab === 'Pagos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="ds-card">
              <div className="ds-card-header">
                <h2 className="ds-card-title">
                  <CreditCard size={24} color="#D4A017" /> Métodos de Pago Activos
                </h2>
              </div>
              <div className="ds-card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <PaymentRow name="Efectivo" field="payment_efectivo" settings={settings} onChange={handleChange} />
                  <PaymentRow name="Nequi" field="payment_nequi" settings={settings} onChange={handleChange} />
                  <PaymentRow name="Daviplata" field="payment_daviplata" settings={settings} onChange={handleChange} />
                  <PaymentRow name="Tarjeta Crédito / Débito (Datáfono)" field="payment_tarjeta" settings={settings} onChange={handleChange} />
                  <PaymentRow name="Transferencia Bancaria" field="payment_transferencia" settings={settings} onChange={handleChange} />
                  <PaymentRow name="PSE" field="payment_pse" settings={settings} onChange={handleChange} />
                </div>
                <div className="ds-form-grid" style={{ marginTop: '20px' }}>
                  <label className="ds-form-group"><span className="ds-form-label">Número Nequi</span><input className="ds-input" value={settings.nequi_number || ''} onChange={e => handleChange('nequi_number', e.target.value)} /></label>
                  <label className="ds-form-group"><span className="ds-form-label">Llave / cuenta Bancolombia</span><input className="ds-input" value={settings.bancolombia_number || ''} onChange={e => handleChange('bancolombia_number', e.target.value)} /></label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB GENERAL */}
        {activeTab === 'General' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="ds-card">
              <div className="ds-card-header">
                <h2 className="ds-card-title">
                  <Settings size={24} color="#D4A017" /> Mensaje de Bienvenida
                </h2>
              </div>
              <div className="ds-card-body ds-form">
                <textarea 
                  className="ds-input ds-textarea"
                  value={settings.welcome_message} 
                  onChange={e => handleChange('welcome_message', e.target.value)}
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  placeholder="Bienvenido a Distrito BG. Disfruta nuestras hamburguesas..."
                />
              </div>
            </div>
            
            <div className="ds-card">
              <div className="ds-card-header">
                <h2 className="ds-card-title">
                  <Settings size={24} color="#D4A017" /> Configuración del Sistema
                </h2>
              </div>
              <div className="ds-card-body ds-form">
                <div className="ds-form-grid">
                  <div className="ds-form-group">
                    <label className="ds-form-label">Moneda Principal</label>
                    <select className="ds-select" value={settings.currency} onChange={e => handleChange('currency', e.target.value)}>
                      <option value="COP">COP ($) - Pesos Colombianos</option>
                      <option value="USD">USD ($) - Dólares</option>
                      <option value="EUR">EUR (€) - Euros</option>
                    </select>
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Idioma</label>
                    <select className="ds-select" value={settings.language} onChange={e => handleChange('language', e.target.value)}>
                      <option value="es">Español</option>
                      <option value="en">Inglés</option>
                    </select>
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Zona Horaria</label>
                    <select className="ds-select" value={settings.timezone} onChange={e => handleChange('timezone', e.target.value)}>
                      <option value="America/Bogota">America/Bogota (UTC -5)</option>
                      <option value="America/Mexico_City">America/Mexico_City</option>
                    </select>
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Formato de Hora</label>
                    <select className="ds-select" value={settings.time_format} onChange={e => handleChange('time_format', e.target.value)}>
                      <option value="12h">12 Horas (AM/PM)</option>
                      <option value="24h">24 Horas</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Componentes Auxiliares

const PaymentRow = ({ name, field, settings, onChange }) => {
  const isActive = settings[field];
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', padding: '16px 20px', borderRadius: '12px', border: '1px solid #2A2A2A' }}>
      <div style={{ color: '#FFF', fontWeight: '500', fontSize: '15px' }}>{name}</div>
      <button 
        onClick={() => onChange(field, !isActive)}
        style={{ 
          width: '50px', height: '28px', borderRadius: '999px', border: 'none', cursor: 'pointer', position: 'relative',
          backgroundColor: isActive ? '#D4A017' : '#333333', transition: 'background-color 0.2s'
        }}
      >
        <div style={{ 
          position: 'absolute', top: '4px', left: isActive ? '26px' : '4px', 
          width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#FFF',
          transition: 'left 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {isActive && <Check size={12} color="#000" />}
        </div>
      </button>
    </div>
  );
};

const ThemeCard = ({ title, prefix, settings, onChange }) => {
  const fields = [
    ['primary_color', 'Color principal'], ['background_color', 'Fondo'],
    ['surface_color', 'Tarjetas y superficies'], ['text_color', 'Texto principal'],
  ];
  return <div className="ds-card"><div className="ds-card-header"><h2 className="ds-card-title"><Palette size={22} /> {title}</h2></div><div className="ds-card-body settings-color-list">{fields.map(([field, label]) => { const key = `${prefix}_${field}`; return <label className="settings-color-field" key={key}><span>{label}</span><input type="color" value={settings[key]} onChange={e => onChange(key, e.target.value.toUpperCase())} /><input className="ds-input" value={settings[key]} pattern="#[0-9A-Fa-f]{6}" onChange={e => onChange(key, e.target.value)} /></label>; })}</div></div>;
};
