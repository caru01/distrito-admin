import { API_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Shield, Save, Trash2, Plus, CalendarX, Power, Info, AlertTriangle, X } from 'lucide-react';

export default function AdminHorarios() {
  const [horarios, setHorarios] = useState([]);
  const [config, setConfig] = useState({});
  const [exceptions, setExceptions] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [newException, setNewException] = useState({ exception_date: '', description: '', is_closed: true, open_time: '18:00', close_time: '22:00' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const token = sessionStorage.getItem('distrito_admin_token');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    fetchData();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/horarios`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setHorarios(data.horarios || []);
        setConfig(data.config || {});
        setExceptions(data.exceptions || []);
        setStatus(data.currentStatus || null);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveHorarios = async () => {
    setIsSaving(true);
    try {
      await fetch(`${API_URL}/admin/horarios`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ horarios })
      });
      alert('Horarios guardados correctamente');
      fetchData();
    } catch (err) { alert('Error guardando horarios'); }
    setIsSaving(false);
  };

  const saveConfig = async () => {
    try {
      await fetch(`${API_URL}/admin/horarios/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(config)
      });
      alert('Configuración guardada correctamente');
      fetchData();
    } catch (err) { alert('Error guardando config'); }
  };

  const addException = async () => {
    if (!newException.exception_date) return alert('Fecha requerida');
    try {
      await fetch(`${API_URL}/admin/horarios/exceptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newException)
      });
      setShowExceptionModal(false);
      setNewException({ exception_date: '', description: '', is_closed: true, open_time: '18:00', close_time: '22:00' });
      fetchData();
    } catch (err) { alert('Error agregando excepción'); }
  };

  const deleteException = async (id) => {
    if (!window.confirm('¿Eliminar excepción?')) return;
    try {
      await fetch(`${API_URL}/admin/horarios/exceptions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) { alert('Error eliminando'); }
  };

  if (loading) return (
    <div className="ds-page">
      <div className="ds-loader-container">
        <div className="ds-loader"></div>
        <p>Cargando Horarios...</p>
      </div>
    </div>
  );

  return (
    <div className="ds-page">
      <div className="ds-page-header">
        <div>
          <div style={{ color: '#BDBDBD', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
            Dashboard <span style={{ margin: '0 8px' }}>/</span> Configuración <span style={{ margin: '0 8px' }}>/</span> <span style={{ color: '#FFFFFF' }}>Horarios</span>
          </div>
          <h1 className="ds-page-title">Horarios de Atención</h1>
          <p style={{ color: '#BDBDBD', margin: 0, fontSize: '14px' }}>Administra los horarios de atención del restaurante y controla cuándo los clientes pueden realizar pedidos.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="ds-cards-grid" style={{ marginBottom: '40px' }}>
        <div className="ds-stat-card">
          <div style={{ color: status?.isOpen ? '#22C55E' : '#EF4444' }}><Power size={32} /></div>
          <div>
            <div className="ds-stat-value" style={{ color: status?.isOpen ? '#22C55E' : '#EF4444' }}>{status?.isOpen ? 'Abierto' : 'Cerrado'}</div>
            <div className="ds-stat-label">{status?.statusText}</div>
          </div>
        </div>
        <div className="ds-stat-card">
          <div style={{ color: '#D4A017' }}><Clock size={32} /></div>
          <div>
            <div className="ds-stat-value">Horario de hoy</div>
            <div className="ds-stat-label">{status?.currentSchedule?.is_active ? `${status.currentSchedule.open_time} - ${status.currentSchedule.close_time}` : 'Cerrado hoy'}</div>
          </div>
        </div>
        <div className="ds-stat-card">
          <div style={{ color: '#8B5CF6' }}><Calendar size={32} /></div>
          <div>
            <div className="ds-stat-value">Días Activos</div>
            <div className="ds-stat-label">{horarios.filter(h => h.is_active).length} días de atención</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="ds-form-grid" style={{ alignItems: 'start' }}>
        {/* Left Col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Horario Semanal */}
          <div className="ds-card">
            <div className="ds-card-header">
              <h2 className="ds-card-title"><Calendar size={20} color="#D4A017" /> Horario Semanal</h2>
              <button onClick={saveHorarios} disabled={isSaving} className="ds-btn ds-btn-primary ds-btn-sm">
                <Save size={18} /> {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
            
            <div className="ds-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {horarios.map((h, i) => (
                <div key={h.id} className="admin-schedule-row" style={{ display: 'grid', gridTemplateColumns: '100px 90px 1fr 1fr', alignItems: 'center', gap: '8px', paddingBottom: '16px', borderBottom: '1px solid #222' }}>
                  <div style={{ color: '#FFF', fontWeight: '600' }}>{h.day_of_week}</div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: h.is_active ? '#22C55E' : '#6B7280', cursor: 'pointer', fontSize: '13px' }}>
                      <input type="checkbox" checked={h.is_active} onChange={e => {
                        const newH = [...horarios];
                        newH[i].is_active = e.target.checked;
                        setHorarios(newH);
                      }} style={{ accentColor: '#D4A017' }} />
                      {h.is_active ? 'Activo' : 'Inactivo'}
                    </label>
                  </div>
                  <div>
                    <input type="time" className="ds-input" value={h.open_time} disabled={!h.is_active} onChange={e => {
                        const newH = [...horarios];
                        newH[i].open_time = e.target.value;
                        setHorarios(newH);
                      }} style={{ padding: '8px', opacity: h.is_active ? 1 : 0.5, colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <input type="time" className="ds-input" value={h.close_time} disabled={!h.is_active} onChange={e => {
                        const newH = [...horarios];
                        newH[i].close_time = e.target.value;
                        setHorarios(newH);
                      }} style={{ padding: '8px', opacity: h.is_active ? 1 : 0.5, colorScheme: 'dark' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exceptions */}
          <div className="ds-card">
            <div className="ds-card-header">
              <h2 className="ds-card-title"><CalendarX size={20} color="#EF4444" /> Excepciones</h2>
              <button onClick={() => setShowExceptionModal(true)} className="ds-btn ds-btn-secondary ds-btn-sm">
                <Plus size={18} /> Agregar
              </button>
            </div>
            
            <div className="ds-card-body" style={{ padding: 0 }}>
              {exceptions.length === 0 ? (
                <div className="ds-empty-state">No hay excepciones programadas (festivos, eventos, etc.)</div>
              ) : (
                isMobile ? (
                  <div className="ds-table-cards" style={{ padding: '16px' }}>
                    {exceptions.map(e => (
                      <div key={e.id} className="ds-table-card">
                        <div className="ds-table-card-row">
                          <span className="ds-table-card-label">Fecha</span>
                          <span className="ds-table-card-value">{new Date(e.exception_date).toLocaleDateString('es-CO')}</span>
                        </div>
                        <div className="ds-table-card-row">
                          <span className="ds-table-card-label">Descripción</span>
                          <span className="ds-table-card-value">{e.description}</span>
                        </div>
                        <div className="ds-table-card-row">
                          <span className="ds-table-card-label">Estado</span>
                          <span className="ds-table-card-value" style={{ color: e.is_closed ? '#EF4444' : '#22C55E' }}>
                            {e.is_closed ? 'Cerrado' : `${e.open_time} - ${e.close_time}`}
                          </span>
                        </div>
                        <div className="ds-table-card-actions">
                          <button onClick={() => deleteException(e.id)} className="ds-btn ds-btn-icon ds-btn-danger ds-btn-sm">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ds-table-container">
                    <table className="ds-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Descripción</th>
                          <th>Estado</th>
                          <th style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exceptions.map(e => (
                          <tr key={e.id}>
                            <td>{new Date(e.exception_date).toLocaleDateString('es-CO')}</td>
                            <td>{e.description}</td>
                            <td style={{ color: e.is_closed ? '#EF4444' : '#22C55E' }}>{e.is_closed ? 'Cerrado' : `${e.open_time} - ${e.close_time}`}</td>
                            <td style={{ textAlign: 'center' }}>
                              <button onClick={() => deleteException(e.id)} className="ds-btn ds-btn-icon ds-btn-ghost ds-btn-sm" style={{ color: '#EF4444' }}>
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="ds-card">
            <div className="ds-card-header">
              <h2 className="ds-card-title"><Shield size={20} color="#D4A017" /> Reglas y Configuración</h2>
            </div>
            
            <div className="ds-card-body ds-form">
              <div className="ds-form-group">
                <label className="ds-form-label">
                  Permitir pedidos antes de abrir (minutos)
                </label>
                <input type="number" className="ds-input" value={config.pre_open_minutes} onChange={e => setConfig({...config, pre_open_minutes: e.target.value})} />
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>Los clientes podrán hacer pedidos {config.pre_open_minutes} minutos antes del horario de apertura.</div>
              </div>

              <div className="ds-form-group">
                <label className="ds-form-label">
                  Cierre automático de pedidos (minutos antes)
                </label>
                <input type="number" className="ds-input" value={config.auto_close_minutes} onChange={e => setConfig({...config, auto_close_minutes: e.target.value})} />
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>La recepción de pedidos se bloqueará {config.auto_close_minutes} minutos antes del cierre.</div>
              </div>

              <div className="ds-form-group">
                <label className="ds-form-label">
                  Tiempo máximo de preparación (minutos)
                </label>
                <select className="ds-select" value={config.prep_time_minutes} onChange={e => setConfig({...config, prep_time_minutes: e.target.value})}>
                  <option value="15">15 minutos</option>
                  <option value="20">20 minutos</option>
                  <option value="25">25 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="40">40 minutos</option>
                  <option value="45">45 minutos</option>
                  <option value="60">60 minutos</option>
                </select>
              </div>

              <button onClick={saveConfig} className="ds-btn ds-btn-secondary" style={{ marginTop: '10px' }}>
                Guardar Reglas
              </button>
            </div>
          </div>
        </div>
      </div>

      {showExceptionModal && (
        <div className="ds-modal-overlay">
          <div className="ds-modal">
            <div className="ds-modal-header">
              <h2 className="ds-modal-title">Nueva Excepción</h2>
              <button className="ds-modal-close" onClick={() => setShowExceptionModal(false)}><X size={20} /></button>
            </div>
            <div className="ds-modal-body ds-form">
              <div className="ds-form-group">
                <label className="ds-form-label">Fecha</label>
                <input type="date" className="ds-input" value={newException.exception_date} onChange={e => setNewException({...newException, exception_date: e.target.value})} style={{ colorScheme: 'dark' }} />
              </div>
              <div className="ds-form-group">
                <label className="ds-form-label">Descripción (ej. Festivo, Evento)</label>
                <input type="text" className="ds-input" value={newException.description} onChange={e => setNewException({...newException, description: e.target.value})} />
              </div>
              <div className="ds-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FFF', cursor: 'pointer', padding: '12px', backgroundColor: '#1A1A1A', borderRadius: '8px', border: '1px solid #333' }}>
                  <input type="checkbox" checked={newException.is_closed} onChange={e => setNewException({...newException, is_closed: e.target.checked})} style={{ accentColor: '#D4A017' }} />
                  Cerrado todo el día
                </label>
              </div>
              {!newException.is_closed && (
                <div className="ds-form-grid">
                  <div className="ds-form-group">
                    <label className="ds-form-label">Apertura</label>
                    <input type="time" className="ds-input" value={newException.open_time} onChange={e => setNewException({...newException, open_time: e.target.value})} style={{ colorScheme: 'dark' }} />
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Cierre</label>
                    <input type="time" className="ds-input" value={newException.close_time} onChange={e => setNewException({...newException, close_time: e.target.value})} style={{ colorScheme: 'dark' }} />
                  </div>
                </div>
              )}
            </div>
            <div className="ds-modal-footer">
              <button onClick={() => setShowExceptionModal(false)} className="ds-btn ds-btn-ghost">Cancelar</button>
              <button onClick={addException} className="ds-btn ds-btn-primary">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
