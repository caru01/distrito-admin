import React, { useState } from 'react';
import { 
  Zap, Copy, Check, RefreshCw, Play, ShieldCheck, 
  AlertCircle, ExternalLink, Activity, ShoppingBag, 
  Clock, CheckCircle2, Lock, Eye, EyeOff, Save, Store
} from 'lucide-react';

export default function RappiConfigTab({
  config,
  setConfig,
  stats,
  logs,
  loading,
  saving,
  testing,
  simulating,
  message,
  onSave,
  onTestConnection,
  onSimulateOrder,
  onRefreshLogs
}) {
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(Number(val) || 0);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ds-text-secondary)' }}>
        <RefreshCw size={24} className="spin" style={{ marginBottom: '12px', animation: 'spin 1s linear infinite' }} />
        <p>Cargando configuración de Rappi...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Banner Superior de Estado de Integración */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 68, 31, 0.12) 0%, rgba(20, 20, 20, 0.95) 100%)',
        border: '1px solid rgba(255, 68, 31, 0.35)',
        borderRadius: '14px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '12px',
            backgroundColor: '#FF441F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: '900',
            fontSize: '26px',
            boxShadow: '0 4px 16px rgba(255, 68, 31, 0.35)'
          }}>
            🛵
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#FFFFFF' }}>
                Integración con Rappi Orders API
              </h2>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: config.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: config.is_active ? '#22C55E' : '#EF4444',
                border: `1px solid ${config.is_active ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
              }}>
                {config.is_active ? '● Activa' : '○ Inactiva'}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: '600',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: config.environment === 'production' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: config.environment === 'production' ? '#60A5FA' : '#F59E0B',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                {config.environment === 'production' ? 'Producción' : 'Sandbox (Pruebas)'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', color: 'var(--ds-text-secondary)', fontSize: '14px' }}>
              Recibe automáticamente los pedidos de clientes de Rappi en tiempo real con alerta sonora y descuento de inventario.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="ds-btn ds-btn-secondary"
            onClick={onTestConnection}
            disabled={testing || saving}
            style={{ borderColor: 'rgba(255, 68, 31, 0.4)' }}
          >
            <Activity size={16} color="#FF441F" />
            {testing ? 'Verificando...' : 'Probar Conexión'}
          </button>
          <button
            type="button"
            className="ds-btn"
            style={{ backgroundColor: '#FF441F', color: '#FFFFFF', fontWeight: '600' }}
            onClick={onSimulateOrder}
            disabled={simulating || saving}
          >
            <Play size={16} />
            {simulating ? 'Enviando prueba...' : '🧪 Simular Pedido Rappi'}
          </button>
        </div>
      </div>

      {/* Alerta de Mensajes de Operación */}
      {message && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '10px',
          backgroundColor: message.includes('✅') || message.includes('🎉') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${message.includes('✅') || message.includes('🎉') ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: message.includes('✅') || message.includes('🎉') ? '#22C55E' : '#EF4444',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {message.includes('✅') || message.includes('🎉') ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message}</span>
        </div>
      )}

      {/* Métricas y Estadísticas de Rappi */}
      <div className="ds-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="ds-card" style={{ padding: '16px' }}>
          <div style={{ color: 'var(--ds-text-secondary)', fontSize: '13px', fontWeight: '500' }}>Pedidos Rappi Hoy</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#FF441F', marginTop: '6px' }}>
            {stats?.today_rappi_orders || 0}
          </div>
        </div>
        <div className="ds-card" style={{ padding: '16px' }}>
          <div style={{ color: 'var(--ds-text-secondary)', fontSize: '13px', fontWeight: '500' }}>Total Pedidos Rappi</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--ds-text-primary)', marginTop: '6px' }}>
            {stats?.total_rappi_orders || 0}
          </div>
        </div>
        <div className="ds-card" style={{ padding: '16px' }}>
          <div style={{ color: 'var(--ds-text-secondary)', fontSize: '13px', fontWeight: '500' }}>Ventas Totales Rappi</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#10B981', marginTop: '6px' }}>
            {formatCurrency(stats?.total_rappi_sales || 0)}
          </div>
        </div>
        <div className="ds-card" style={{ padding: '16px' }}>
          <div style={{ color: 'var(--ds-text-secondary)', fontSize: '13px', fontWeight: '500' }}>Último Webhook Recibido</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: config.last_webhook_at ? '#60A5FA' : 'var(--ds-text-muted)', marginTop: '10px' }}>
            {config.last_webhook_at ? new Date(config.last_webhook_at).toLocaleString('es-CO') : 'Sin registros aún'}
          </div>
        </div>
      </div>

      {/* Grid de 2 Columnas: Credenciales vs Webhook Setup */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px' }}>
        
        {/* TARJETA 1: CREDENCIALES DE CONEXIÓN */}
        <div className="ds-card">
          <div className="ds-card-header" style={{ borderBottom: '1px solid var(--ds-border)', paddingBottom: '14px' }}>
            <h2 className="ds-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={20} color="#FF441F" /> Credenciales de Conexión Rappi
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ds-text-secondary)' }}>
              Proporcionadas por Rappi Partner / Developer Portal.
            </p>
          </div>

          <div className="ds-card-body ds-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
            
            {/* Switch: Activar Integración */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--ds-bg-elevated)',
              padding: '14px 18px',
              borderRadius: '10px',
              border: '1px solid var(--ds-border)'
            }}>
              <div>
                <strong style={{ color: 'var(--ds-text-primary)', fontSize: '14px' }}>Habilitar Recepción de Pedidos</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--ds-text-muted)' }}>
                  Permite que el sistema procese pedidos entrantes de Rappi
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, is_active: !config.is_active })}
                style={{
                  width: '48px',
                  height: '26px',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  backgroundColor: config.is_active ? '#FF441F' : '#333333',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: config.is_active ? '24px' : '3px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  transition: 'left 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {config.is_active && <Check size={12} color="#FF441F" />}
                </div>
              </button>
            </div>

            {/* Entorno: Sandbox vs Producción */}
            <div className="ds-form-group">
              <label className="ds-form-label">Entorno de Operación</label>
              <select
                className="ds-select"
                value={config.environment || 'sandbox'}
                onChange={(e) => setConfig({ ...config, environment: e.target.value })}
              >
                <option value="sandbox">Sandbox (Ambiente de Pruebas y Desarrollo)</option>
                <option value="production">Producción (Restaurante en Vivo)</option>
              </select>
            </div>

            {/* Client ID */}
            <div className="ds-form-group">
              <label className="ds-form-label">Client ID / Partner ID *</label>
              <input
                type="text"
                className="ds-input"
                value={config.client_id || ''}
                onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
                placeholder="Ej: d8b2c4e1-7a6f-43c2-89f1..."
                required
              />
            </div>

            {/* Client Secret */}
            <div className="ds-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="ds-form-label" style={{ margin: 0 }}>Client Secret / API Key *</label>
                {config.has_secret && (
                  <span style={{ fontSize: '11px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={13} /> Clave guardada previamente
                  </span>
                )}
              </div>
              <div className="ds-input-group" style={{ position: 'relative' }}>
                <input
                  type={showSecret ? 'text' : 'password'}
                  className="ds-input"
                  value={config.client_secret || ''}
                  onChange={(e) => setConfig({ ...config, client_secret: e.target.value })}
                  placeholder={config.has_secret ? 'Ingresa una nueva clave solo para cambiarla' : 'Ingresa tu Client Secret de Rappi'}
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ds-text-secondary)',
                    cursor: 'pointer'
                  }}
                  title={showSecret ? 'Ocultar' : 'Mostrar'}
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Store ID */}
            <div className="ds-form-group">
              <label className="ds-form-label">Store ID (ID de Sucursal en Rappi) *</label>
              <input
                type="text"
                className="ds-input"
                value={config.store_id || ''}
                onChange={(e) => setConfig({ ...config, store_id: e.target.value })}
                placeholder="Ej: 900142857 o STORE-VALLEDUPAR-01"
                required
              />
            </div>

            {/* Webhook Secret */}
            <div className="ds-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="ds-form-label" style={{ margin: 0 }}>Webhook Secret (Firma HMAC - Opcional)</label>
                {config.has_webhook_secret && (
                  <span style={{ fontSize: '11px', color: '#10B981' }}>Configurado</span>
                )}
              </div>
              <input
                type="password"
                className="ds-input"
                value={config.webhook_secret || ''}
                onChange={(e) => setConfig({ ...config, webhook_secret: e.target.value })}
                placeholder={config.has_webhook_secret ? 'Dejar en blanco para mantener actual' : 'Secreto para verificar autenticidad de peticiones'}
              />
            </div>

            {/* Auto Accept Switch */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--ds-bg-elevated)',
              padding: '14px 18px',
              borderRadius: '10px',
              border: '1px solid var(--ds-border)'
            }}>
              <div>
                <strong style={{ color: 'var(--ds-text-primary)', fontSize: '14px' }}>Confirmación Automática</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--ds-text-muted)' }}>
                  Acepta y confirma los pedidos automáticamente a Rappi al recibirlos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, auto_accept: !config.auto_accept })}
                style={{
                  width: '48px',
                  height: '26px',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  backgroundColor: config.auto_accept ? '#10B981' : '#333333',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: config.auto_accept ? '24px' : '3px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  transition: 'left 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {config.auto_accept && <Check size={12} color="#10B981" />}
                </div>
              </button>
            </div>

            {/* Botón de Guardar */}
            <button
              type="button"
              className="ds-btn ds-btn-primary"
              onClick={onSave}
              disabled={saving}
              style={{ marginTop: '8px' }}
            >
              <Save size={18} /> {saving ? 'Guardando credenciales...' : 'Guardar Credenciales de Rappi'}
            </button>
          </div>
        </div>

        {/* TARJETA 2: WEBHOOK URL E INSTRUCCIONES */}
        <div className="ds-card">
          <div className="ds-card-header" style={{ borderBottom: '1px solid var(--ds-border)', paddingBottom: '14px' }}>
            <h2 className="ds-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color="var(--ds-primary)" /> Configuración del Webhook en Rappi
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ds-text-secondary)' }}>
              Registra esta dirección en tu portal de Rappi para recibir notificaciones instantáneas (0ms).
            </p>
          </div>

          <div className="ds-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingTop: '16px' }}>
            
            {/* Input URL del Webhook con botón de copia */}
            <div>
              <label className="ds-form-label" style={{ fontWeight: '700' }}>URL Pública del Webhook de Distrito BG</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <input
                  type="text"
                  readOnly
                  className="ds-input"
                  value={config.webhook_url || `${window.location.origin}/api/pedidos/integrations/rappi/webhook`}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    backgroundColor: '#111111',
                    color: '#60A5FA',
                    borderColor: 'rgba(96, 165, 250, 0.3)'
                  }}
                />
                <button
                  type="button"
                  className="ds-btn ds-btn-secondary"
                  onClick={() => copyToClipboard(config.webhook_url || `${window.location.origin}/api/pedidos/integrations/rappi/webhook`)}
                  style={{ minWidth: '120px' }}
                >
                  {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
                  {copied ? '¡Copiado!' : 'Copiar URL'}
                </button>
              </div>
            </div>

            {/* Pasos de Configuración en Rappi */}
            <div style={{
              backgroundColor: 'var(--ds-bg-elevated)',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid var(--ds-border)',
              fontSize: '13px',
              lineHeight: '1.6'
            }}>
              <strong style={{ color: 'var(--ds-text-primary)', display: 'block', marginBottom: '8px' }}>
                📌 Pasos para conectar con Rappi Partners:
              </strong>
              <ol style={{ margin: 0, paddingLeft: '20px', color: 'var(--ds-text-secondary)' }}>
                <li>Ingresa al portal <strong>Rappi Partners / Developer Portal</strong> con tu cuenta de restaurante.</li>
                <li>Dirígete a la sección <strong>Integraciones &gt; Webhooks / API Orders</strong>.</li>
                <li>Pega la <strong>URL Pública del Webhook</strong> copiada arriba en el campo de Callback URL.</li>
                <li>Selecciona los eventos: <code>ORDER_CREATED</code>, <code>ORDER_STATUS_UPDATE</code>.</li>
                <li>Copia tu <code>Client ID</code> y <code>Client Secret</code> y pégalos en la tarjeta de credenciales a la izquierda.</li>
                <li>¡Haz clic en el botón <strong>"🧪 Simular Pedido Rappi"</strong> para comprobar que los pedidos caen en vivo en el módulo de pedidos!</li>
              </ol>
            </div>

            {/* Botón de Simulación Destacado */}
            <div style={{
              backgroundColor: 'rgba(255, 68, 31, 0.08)',
              border: '1px solid rgba(255, 68, 31, 0.25)',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px'
            }}>
              <div>
                <strong style={{ color: '#FFFFFF', fontSize: '14px', display: 'block' }}>
                  ¿Quieres probar cómo se ve y cómo suena?
                </strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--ds-text-muted)' }}>
                  Genera un pedido ficticio con hamburguesas y papas que se procesará en tiempo real en tu pantalla de pedidos.
                </p>
              </div>
              <button
                type="button"
                className="ds-btn"
                style={{ backgroundColor: '#FF441F', color: '#FFFFFF', whiteSpace: 'nowrap', fontWeight: '700' }}
                onClick={onSimulateOrder}
                disabled={simulating}
              >
                {simulating ? 'Simulando...' : '🧪 Probar Ahora'}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* TARJETA 3: REGISTRO DE AUDITORÍA Y LOGS EN VIVO */}
      <div className="ds-card">
        <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="ds-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="var(--ds-primary)" /> Registro en Vivo de Eventos Rappi (Auditoría)
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ds-text-secondary)' }}>
              Últimos eventos recibidos por el webhook de Rappi en el servidor.
            </p>
          </div>
          <button
            type="button"
            className="ds-btn ds-btn-secondary ds-btn-sm"
            onClick={onRefreshLogs}
          >
            <RefreshCw size={14} /> Refrescar Registro
          </button>
        </div>

        <div className="ds-table-container">
          <table className="ds-table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Evento</th>
                <th>ID Orden Rappi</th>
                <th>Estado HTTP</th>
                <th>ID Pedido Interno</th>
                <th>Detalles / Error</th>
              </tr>
            </thead>
            <tbody>
              {logs && logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--ds-text-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString('es-CO')}
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: 'rgba(255, 68, 31, 0.15)',
                        color: '#FF441F',
                        border: '1px solid rgba(255, 68, 31, 0.3)'
                      }}>
                        {log.event_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--ds-text-primary)' }}>
                      #{log.rappi_order_id || 'N/A'}
                    </td>
                    <td>
                      <span style={{
                        fontWeight: '700',
                        color: log.response_status?.includes('200') ? '#10B981' : '#EF4444'
                      }}>
                        {log.response_status || '200 OK'}
                      </span>
                    </td>
                    <td>
                      {log.order_id ? (
                        <span style={{ color: 'var(--ds-primary)', fontWeight: '700' }}>
                          Pedido #{String(log.order_id).padStart(4, '0')}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--ds-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: log.error_message ? '#EF4444' : 'var(--ds-text-muted)' }}>
                      {log.error_message || 'Procesado exitosamente'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--ds-text-muted)' }}>
                    No se han registrado llamadas de webhook de Rappi aún. Utiliza el botón "Simular Pedido Rappi" para probar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
