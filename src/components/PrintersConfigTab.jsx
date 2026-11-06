import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config/api';
import {
  Printer, CheckCircle2, AlertTriangle, RefreshCw, Copy, Check,
  Laptop, ShieldCheck, Zap, Trash2, Clock, AlertCircle, FileText
} from 'lucide-react';

export default function PrintersConfigTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  const [settings, setSettings] = useState({
    printer_mode: 'browser',
    printer_primary_name: '',
    printer_secondary_name: '',
    printer_paper_width: 58,
    print_agent_id: null,
    print_job_expiry_minutes: 15,
  });

  const [agent, setAgent] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [testingRole, setTestingRole] = useState(null); // 'primary' | 'secondary'

  // Modal para vincular nuevo agente
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [generatedToken, setGeneratedToken] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);

  const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('distrito_admin_token') : '';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/print-config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
        setAgent(data.agent || null);
      }

      // Cargar trabajos recientes
      const jobsRes = await fetch(`${API_URL}/admin/print-jobs?limit=15`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setRecentJobs(jobsData.jobs || []);
      }
    } catch (err) {
      console.error('Error cargando configuración de impresoras:', err);
      setMessage({ type: 'error', text: 'No fue posible cargar la configuración de impresoras' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/admin/print-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Error al guardar configuración' });
      } else {
        setMessage({ type: 'success', text: '✓ Configuración de impresoras guardada correctamente' });
        setSettings(data.settings);
        setAgent(data.agent);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de red al guardar: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAgent = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/print-agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: 'Caja Mostrador Distric House' })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedToken(data.token);
        setShowTokenModal(true);
        fetchData();
      } else {
        const err = await res.json();
        alert('Error: ' + (err.error || 'No fue posible crear agente'));
      }
    } catch (err) {
      alert('Error de red: ' + err.message);
    }
  };

  const handleRevokeAgent = async (agentId) => {
    if (!window.confirm('¿Seguro que deseas desvincular este Print Agent? El modo de impresión volverá al navegador.')) return;
    try {
      const res = await fetch(`${API_URL}/admin/print-agents/${agentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
        setMessage({ type: 'success', text: 'Agente desvinculado. Modo cambiado a navegador.' });
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleTestPrint = async (role, printerName) => {
    if (!printerName) {
      alert('Selecciona primero una impresora para probar');
      return;
    }
    setTestingRole(role);
    try {
      const res = await fetch(`${API_URL}/admin/print-jobs/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          idempotency_key: `test:${role}:${Date.now()}`,
          role,
          printer_name: printerName,
          paper_width: settings.printer_paper_width || 58,
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✓ Prueba enviada a "${printerName}". La comanda debe imprimirse en unos segundos.`);
        fetchData();
      } else {
        alert('Error: ' + (data.error || 'No se pudo enviar la prueba'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setTestingRole(null);
    }
  };

  if (loading) {
    return (
      <div className="ds-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--ds-text-secondary)' }}>
        <RefreshCw size={24} className="dashboard-spin" style={{ marginBottom: '12px' }} />
        <p>Cargando configuración de impresoras…</p>
      </div>
    );
  }

  const agentPrinters = agent?.printers || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Alerta de mensajes */}
      {message && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
          color: message.type === 'error' ? '#EF4444' : '#10B981',
          border: `1px solid ${message.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          fontWeight: 600
        }}>
          {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. MODO DE IMPRESIÓN */}
      <div className="ds-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: 'rgba(179, 4, 1, 0.12)', color: 'var(--ds-primary)', padding: '10px', borderRadius: '10px' }}>
            <Printer size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Modo de Impresión de Comandas</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--ds-text-secondary)' }}>
              Elige cómo deben imprimirse los pedidos de Distric House al dar clic en "Enviar a Cocina" o "Preparar"
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginTop: '16px' }}>
          {/* Opción 1: Navegador */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', borderRadius: '12px',
            border: `2px solid ${settings.printer_mode === 'browser' ? 'var(--ds-primary)' : 'var(--ds-border)'}`,
            backgroundColor: settings.printer_mode === 'browser' ? 'rgba(179, 4, 1, 0.05)' : 'var(--ds-bg-surface)',
            cursor: 'pointer', transition: 'all 0.2s'
          }}>
            <input
              type="radio"
              name="printer_mode"
              value="browser"
              checked={settings.printer_mode === 'browser'}
              onChange={(e) => setSettings({ ...settings, printer_mode: e.target.value })}
              style={{ marginTop: '3px' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>🌐 Impresión por Navegador</div>
              <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)', marginTop: '4px' }}>
                Imprime como hasta ahora a la impresora predeterminada de Windows mediante el navegador.
              </div>
            </div>
          </label>

          {/* Opción 2: 1 Sola Impresora USB */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', borderRadius: '12px',
            border: `2px solid ${settings.printer_mode === 'agent_single' ? 'var(--ds-primary)' : 'var(--ds-border)'}`,
            backgroundColor: settings.printer_mode === 'agent_single' ? 'rgba(179, 4, 1, 0.05)' : 'var(--ds-bg-surface)',
            cursor: 'pointer', transition: 'all 0.2s'
          }}>
            <input
              type="radio"
              name="printer_mode"
              value="agent_single"
              checked={settings.printer_mode === 'agent_single'}
              onChange={(e) => setSettings({ ...settings, printer_mode: e.target.value })}
              style={{ marginTop: '3px' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>🖨️ 1 Sola Impresora (Print Agent)</div>
              <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)', marginTop: '4px' }}>
                Impresión silenciosa directa a una Xprinter USB sin cuadros de diálogo molestos.
              </div>
            </div>
          </label>

          {/* Opción 3: 2 Impresoras al mismo tiempo */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', borderRadius: '12px',
            border: `2px solid ${settings.printer_mode === 'agent_dual' ? 'var(--ds-primary)' : 'var(--ds-border)'}`,
            backgroundColor: settings.printer_mode === 'agent_dual' ? 'rgba(179, 4, 1, 0.05)' : 'var(--ds-bg-surface)',
            cursor: 'pointer', transition: 'all 0.2s'
          }}>
            <input
              type="radio"
              name="printer_mode"
              value="agent_dual"
              checked={settings.printer_mode === 'agent_dual'}
              onChange={(e) => setSettings({ ...settings, printer_mode: e.target.value })}
              style={{ marginTop: '3px' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ds-primary)' }}>⚡ 2 Impresoras Simultáneas</div>
              <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)', marginTop: '4px' }}>
                Al enviar a cocina, el mismo ticket sale al mismo tiempo en Caja y Cocina.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* 2. ESTADO DEL PRINT AGENT */}
      <div className="ds-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Distric House Print Agent (Windows)</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--ds-text-secondary)' }}>
              Computador del restaurante donde están conectadas físicamente las impresoras USB
            </p>
          </div>
          <div>
            {!agent ? (
              <button onClick={handleCreateAgent} className="ds-btn ds-btn-primary">
                <Laptop size={17} /> Vincular Nuevo Computador
              </button>
            ) : (
              <button onClick={() => handleRevokeAgent(agent.id)} className="ds-btn ds-btn-danger ds-btn-sm" title="Desvincular">
                <Trash2 size={15} /> Desvincular
              </button>
            )}
          </div>
        </div>

        {agent ? (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px',
            backgroundColor: 'var(--ds-bg-elevated)', padding: '16px', borderRadius: '12px', border: '1px solid var(--ds-border)'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)' }}>Estado de Conexión</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  backgroundColor: agent.online ? '#10B981' : '#F59E0B',
                  boxShadow: agent.online ? '0 0 8px #10B981' : 'none'
                }} />
                <span style={{ fontWeight: 700, color: agent.online ? '#10B981' : '#F59E0B', fontSize: '14px' }}>
                  {agent.online ? 'En línea' : 'Desconectado'}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)' }}>Equipo</div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '4px' }}>
                {agent.hostname || agent.name}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)' }}>Último contacto</div>
              <div style={{ fontSize: '13px', marginTop: '4px', color: 'var(--ds-text-primary)' }}>
                {agent.last_seen_at ? new Date(agent.last_seen_at).toLocaleTimeString('es-CO') : 'Nunca'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)' }}>Versión</div>
              <div style={{ fontSize: '13px', marginTop: '4px', color: 'var(--ds-text-primary)' }}>
                v{agent.agent_version || '1.0.0'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            padding: '24px', textAlign: 'center', borderRadius: '12px',
            backgroundColor: 'var(--ds-bg-elevated)', border: '1px dashed var(--ds-border)', color: 'var(--ds-text-secondary)'
          }}>
            <Laptop size={32} style={{ marginBottom: '8px', opacity: 0.6 }} />
            <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--ds-text-primary)' }}>
              No hay ningún computador vinculado actualmente
            </p>
            <p style={{ margin: 0, fontSize: '13px' }}>
              Para usar la impresión directa o dual en Xprinter, pulsa <b>"Vincular Nuevo Computador"</b> y pega el token en el Print Agent.
            </p>
          </div>
        )}
      </div>

      {/* 3. ASIGNACIÓN DE IMPRESORAS */}
      {settings.printer_mode !== 'browser' && (
        <div className="ds-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700 }}>Asignación de Impresoras Xprinter</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Impresora 1 (Caja / Principal) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text-primary)' }}>
                🖨️ Impresora 1 (Caja / Facturación)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={settings.printer_primary_name || ''}
                  onChange={(e) => setSettings({ ...settings, printer_primary_name: e.target.value })}
                  className="ds-input"
                  style={{ flex: 1 }}
                >
                  <option value="">-- Selecciona impresora de Windows --</option>
                  {agentPrinters.map((p) => (
                    <option key={p.name} value={p.name} disabled={!p.available}>
                      {p.name} ({p.port || 'USB'}) {!p.available ? `[${p.reason}]` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!settings.printer_primary_name || testingRole === 'primary'}
                  onClick={() => handleTestPrint('primary', settings.printer_primary_name)}
                  className="ds-btn ds-btn-secondary"
                  title="Enviar ticket de prueba"
                >
                  {testingRole === 'primary' ? 'Probando…' : 'Probar'}
                </button>
              </div>
            </div>

            {/* Impresora 2 (Cocina / Solo en modo Dual) */}
            {settings.printer_mode === 'agent_dual' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-primary)' }}>
                  🍳 Impresora 2 (Cocina / Despacho)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={settings.printer_secondary_name || ''}
                    onChange={(e) => setSettings({ ...settings, printer_secondary_name: e.target.value })}
                    className="ds-input"
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Selecciona segunda impresora --</option>
                    {agentPrinters.map((p) => (
                      <option key={p.name} value={p.name} disabled={!p.available}>
                        {p.name} ({p.port || 'USB'}) {!p.available ? `[${p.reason}]` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!settings.printer_secondary_name || testingRole === 'secondary'}
                    onClick={() => handleTestPrint('secondary', settings.printer_secondary_name)}
                    className="ds-btn ds-btn-secondary"
                    title="Enviar ticket de prueba"
                  >
                    {testingRole === 'secondary' ? 'Probando…' : 'Probar'}
                  </button>
                </div>
              </div>
            )}

            {/* Ancho de papel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text-primary)' }}>
                Ancho de Papel Térmico
              </label>
              <select
                value={settings.printer_paper_width || 58}
                onChange={(e) => setSettings({ ...settings, printer_paper_width: Number(e.target.value) })}
                className="ds-input"
              >
                <option value={58}>58 mm (Estándar Xprinter XP-58)</option>
                <option value={80}>80 mm (Xprinter XP-80)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Botón Guardar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button onClick={handleSave} disabled={saving} className="ds-btn ds-btn-primary" style={{ minWidth: '160px' }}>
          {saving ? 'Guardando…' : 'Guardar Configuración'}
        </button>
      </div>

      {/* 4. HISTORIAL DE TRABAJOS DE IMPRESIÓN */}
      <div className="ds-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Registro de Impresión Reciente</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--ds-text-secondary)' }}>
              Últimas comandas y pruebas enviadas con su estado por impresora
            </p>
          </div>
          <button onClick={fetchData} className="ds-btn ds-btn-ghost ds-btn-sm">
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>

        {recentJobs.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ds-text-secondary)', fontSize: '13px' }}>
            Aún no se han enviado comandas a través del sistema.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ds-table" style={{ width: '100%', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Pedido</th>
                  <th>Tipo</th>
                  <th>Modo</th>
                  <th>Resultados por Impresora</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => (
                  <tr key={job.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(job.created_at).toLocaleTimeString('es-CO')}
                    </td>
                    <td>
                      {job.order_id ? <b>#{String(job.order_id).padStart(4, '0')}</b> : <span style={{ color: 'var(--ds-text-secondary)' }}>Prueba</span>}
                    </td>
                    <td>
                      <span className="ds-badge" style={{ textTransform: 'capitalize' }}>
                        {job.kind}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--ds-text-secondary)' }}>
                        {job.delivery_mode === 'agent' ? 'Print Agent' : 'Navegador'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(job.targets || []).map((t, idx) => {
                          const isOk = t.status === 'completed_by_driver' || t.status === 'handled_by_browser' || t.status === 'spooled';
                          const isFail = t.status === 'failed' || t.status === 'expired';
                          return (
                            <span
                              key={idx}
                              className="ds-badge"
                              style={{
                                backgroundColor: isOk ? 'rgba(16, 185, 129, 0.15)' : isFail ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: isOk ? '#10B981' : isFail ? '#EF4444' : '#F59E0B',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}
                              title={t.error_message || t.status}
                            >
                              {t.printer_role === 'secondary' ? 'Cocina' : 'Caja'}: {t.status === 'completed_by_driver' ? 'Impreso' : t.status === 'handled_by_browser' ? 'Navegador' : t.status === 'spooled' ? 'En cola' : t.status === 'failed' ? 'Error' : t.status}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL PARA MOSTRAR TOKEN GENERADO (UNA SOLA VEZ) */}
      {showTokenModal && (
        <div className="ds-modal-backdrop" style={{
          position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)'
        }}>
          <div className="ds-modal" style={{ maxWidth: '520px', width: '90%', padding: '24px', borderRadius: '16px', background: 'var(--ds-bg-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', color: 'var(--ds-primary)' }}>
              <ShieldCheck size={28} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Token de Vinculación del Print Agent</h3>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', lineHeight: 1.5 }}>
              Copia este token y pégalo en la aplicación <b>Distric House Print Agent</b> instalada en el computador de las impresoras.
            </p>

            <div style={{
              margin: '16px 0', padding: '12px 14px', borderRadius: '10px',
              backgroundColor: 'var(--ds-bg-elevated)', border: '1px solid var(--ds-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px'
            }}>
              <code style={{ fontSize: '13px', wordBreak: 'break-all', color: 'var(--ds-primary)', fontWeight: 700 }}>
                {generatedToken}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedToken);
                  setCopiedToken(true);
                  setTimeout(() => setCopiedToken(false), 2000);
                }}
                className="ds-btn ds-btn-secondary ds-btn-sm"
                style={{ flexShrink: 0 }}
              >
                {copiedToken ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
                <span>{copiedToken ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            <div style={{ fontSize: '12px', color: '#F59E0B', marginBottom: '16px' }}>
              ⚠️ Este token se muestra solo una vez por seguridad.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowTokenModal(false);
                  setGeneratedToken('');
                }}
                className="ds-btn ds-btn-primary"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
