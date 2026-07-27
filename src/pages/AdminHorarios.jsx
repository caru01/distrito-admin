import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Shield, Save, Trash2, Plus, CalendarX, Power, Info, AlertTriangle } from 'lucide-react';

export default function AdminHorarios() {
  const [horarios, setHorarios] = useState([]);
  const [config, setConfig] = useState({});
  const [exceptions, setExceptions] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [newException, setNewException] = useState({ exception_date: '', description: '', is_closed: true, open_time: '18:00', close_time: '22:00' });

  const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';
  const token = sessionStorage.getItem('distrito_admin_token');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/pedidos/admin/horarios`, {
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
      await fetch(`${API_URL}/api/pedidos/admin/horarios`, {
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
      await fetch(`${API_URL}/api/pedidos/admin/horarios/config`, {
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
      await fetch(`${API_URL}/api/pedidos/admin/horarios/exceptions`, {
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
      await fetch(`${API_URL}/api/pedidos/admin/horarios/exceptions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) { alert('Error eliminando'); }
  };

  if (loading) return <div style={{ padding: '40px', color: '#FFF' }}>Cargando Horarios...</div>;

  return (
    <div style={{ padding: '40px', fontFamily: "'Montserrat', 'Poppins', sans-serif", backgroundColor: '#0D0D0D', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div>
          <div style={{ color: '#BDBDBD', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
            Dashboard <span style={{ margin: '0 8px' }}>/</span> Configuración <span style={{ margin: '0 8px' }}>/</span> <span style={{ color: '#FFFFFF' }}>Horarios</span>
          </div>
          <h1 style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>Horarios de Atención</h1>
          <p style={{ color: '#BDBDBD', margin: 0, fontSize: '14px' }}>Administra los horarios de atención del restaurante y controla cuándo los clientes pueden realizar pedidos.</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div style={{ backgroundColor: '#111111', borderRadius: '20px', padding: '24px', border: '1px solid #222222', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ color: status?.isOpen ? '#22C55E' : '#EF4444' }}><Power size={32} /></div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: status?.isOpen ? '#22C55E' : '#EF4444' }}>{status?.isOpen ? 'Abierto' : 'Cerrado'}</div>
            <div style={{ color: '#BDBDBD', fontSize: '13px', marginTop: '4px' }}>{status?.statusText}</div>
          </div>
        </div>
        <div style={{ backgroundColor: '#111111', borderRadius: '20px', padding: '24px', border: '1px solid #222222', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ color: '#D4A017' }}><Clock size={32} /></div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF' }}>Horario de hoy</div>
            <div style={{ color: '#BDBDBD', fontSize: '13px', marginTop: '4px' }}>{status?.currentSchedule?.is_active ? `${status.currentSchedule.open_time} - ${status.currentSchedule.close_time}` : 'Cerrado hoy'}</div>
          </div>
        </div>
        <div style={{ backgroundColor: '#111111', borderRadius: '20px', padding: '24px', border: '1px solid #222222', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ color: '#8B5CF6' }}><Calendar size={32} /></div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF' }}>Días Activos</div>
            <div style={{ color: '#BDBDBD', fontSize: '13px', marginTop: '4px' }}>{horarios.filter(h => h.is_active).length} días de atención</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
        {/* Left Col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Horario Semanal */}
          <div style={{ backgroundColor: '#111111', borderRadius: '20px', padding: '24px', border: '1px solid #222222' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#FFFFFF', fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={20} color="#D4A017" /> Horario Semanal</h2>
              <button onClick={saveHorarios} disabled={isSaving} style={{ backgroundColor: '#D4A017', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Save size={18} /> {isSaving ? 'Guardando...' : 'Guardar Horarios'}
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {horarios.map((h, i) => (
                <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '120px 100px 1fr 1fr', alignItems: 'center', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid #222' }}>
                  <div style={{ color: '#FFF', fontWeight: '600' }}>{h.day_of_week}</div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: h.is_active ? '#22C55E' : '#6B7280', cursor: 'pointer' }}>
                      <input type="checkbox" checked={h.is_active} onChange={e => {
                        const newH = [...horarios];
                        newH[i].is_active = e.target.checked;
                        setHorarios(newH);
                      }} style={{ accentColor: '#D4A017' }} />
                      {h.is_active ? 'Activo' : 'Inactivo'}
                    </label>
                  </div>
                  <div>
                    <input type="time" value={h.open_time} disabled={!h.is_active} onChange={e => {
                        const newH = [...horarios];
                        newH[i].open_time = e.target.value;
                        setHorarios(newH);
                      }} style={{ width: '100%', backgroundColor: '#1A1A1A', border: '1px solid #333', color: '#FFF', padding: '10px', borderRadius: '8px', opacity: h.is_active ? 1 : 0.5, colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <input type="time" value={h.close_time} disabled={!h.is_active} onChange={e => {
                        const newH = [...horarios];
                        newH[i].close_time = e.target.value;
                        setHorarios(newH);
                      }} style={{ width: '100%', backgroundColor: '#1A1A1A', border: '1px solid #333', color: '#FFF', padding: '10px', borderRadius: '8px', opacity: h.is_active ? 1 : 0.5, colorScheme: 'dark' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exceptions */}
          <div style={{ backgroundColor: '#111111', borderRadius: '20px', padding: '24px', border: '1px solid #222222' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#FFFFFF', fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><CalendarX size={20} color="#EF4444" /> Excepciónes de Horario</h2>
              <button onClick={() => setShowExceptionModal(true)} style={{ backgroundColor: '#1A1A1A', color: '#FFF', border: '1px solid #333', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} /> Agregar Excepción
              </button>
            </div>
            
            {exceptions.length === 0 ? (
              <div style={{ color: '#6B7280', textAlign: 'center', padding: '20px' }}>No hay excepciónes programadas (festivos, eventos, etc.)</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#FFF' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #333', color: '#BDBDBD', fontSize: '13px' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Fecha</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Descripción</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Estado</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exceptions.map(e => (
                      <tr key={e.id} style={{ borderBottom: '1px solid #222' }}>
                        <td style={{ padding: '12px' }}>{new Date(e.exception_date).toLocaleDateString('es-CO')}</td>
                        <td style={{ padding: '12px' }}>{e.description}</td>
                        <td style={{ padding: '12px', color: e.is_closed ? '#EF4444' : '#22C55E' }}>{e.is_closed ? 'Cerrado' : `${e.open_time} - ${e.close_time}`}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button onClick={() => deleteException(e.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ backgroundColor: '#111111', borderRadius: '20px', padding: '24px', border: '1px solid #222222' }}>
            <h2 style={{ color: '#FFFFFF', fontSize: '18px', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={20} color="#D4A017" /> Reglas y Configuración</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', color: '#BDBDBD', fontSize: '13px', marginBottom: '8px' }}>
                  Permitir pedidos antes de abrir (minutos)
                </label>
                <input type="number" value={config.pre_open_minutes} onChange={e => setConfig({...config, pre_open_minutes: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#1A1A1A', border: '1px solid #333', color: '#FFF', padding: '12px', borderRadius: '8px' }} />
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>Los clientes podrán hacer pedidos {config.pre_open_minutes} minutos antes del horario de apertura.</div>
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', color: '#BDBDBD', fontSize: '13px', marginBottom: '8px' }}>
                  Cierre automático de pedidos (minutos antes)
                </label>
                <input type="number" value={config.auto_close_minutes} onChange={e => setConfig({...config, auto_close_minutes: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#1A1A1A', border: '1px solid #333', color: '#FFF', padding: '12px', borderRadius: '8px' }} />
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>La recepción de pedidos se bloqueará {config.auto_close_minutes} minutos antes del cierre.</div>
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', color: '#BDBDBD', fontSize: '13px', marginBottom: '8px' }}>
                  Tiempo máximo de preparación (minutos)
                </label>
                <select value={config.prep_time_minutes} onChange={e => setConfig({...config, prep_time_minutes: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#1A1A1A', border: '1px solid #333', color: '#FFF', padding: '12px', borderRadius: '8px' }}>
                  <option value="15">15 minutos</option>
                  <option value="20">20 minutos</option>
                  <option value="25">25 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="40">40 minutos</option>
                  <option value="45">45 minutos</option>
                  <option value="60">60 minutos</option>
                </select>
              </div>

              <button onClick={saveConfig} style={{ backgroundColor: '#333', color: '#FFF', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', marginTop: '10px' }}>
                Guardar Reglas
              </button>
            </div>
          </div>
        </div>
      </div>

      {showExceptionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#111111', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '400px', border: '1px solid #333' }}>
            <h2 style={{ color: '#FFFFFF', margin: '0 0 20px 0', fontSize: '20px' }}>Nueva Excepción</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ color: '#BDBDBD', fontSize: '13px', marginBottom: '8px', display: 'block' }}>Fecha</label>
                <input type="date" value={newException.exception_date} onChange={e => setNewException({...newException, exception_date: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#1A1A1A', border: '1px solid #333', color: '#FFF', padding: '12px', borderRadius: '8px', colorScheme: 'dark' }} />
              </div>
              <div>
                <label style={{ color: '#BDBDBD', fontSize: '13px', marginBottom: '8px', display: 'block' }}>Descripción (ej. Festivo, Evento)</label>
                <input type="text" value={newException.description} onChange={e => setNewException({...newException, description: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#1A1A1A', border: '1px solid #333', color: '#FFF', padding: '12px', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FFF', cursor: 'pointer', padding: '12px', backgroundColor: '#1A1A1A', borderRadius: '8px', border: '1px solid #333' }}>
                  <input type="checkbox" checked={newException.is_closed} onChange={e => setNewException({...newException, is_closed: e.target.checked})} style={{ accentColor: '#D4A017' }} />
                  Cerrado todo el día
                </label>
              </div>
              {!newException.is_closed && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ color: '#BDBDBD', fontSize: '13px', marginBottom: '8px', display: 'block' }}>Apertura</label>
                    <input type="time" value={newException.open_time} onChange={e => setNewException({...newException, open_time: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#1A1A1A', border: '1px solid #333', color: '#FFF', padding: '12px', borderRadius: '8px', colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label style={{ color: '#BDBDBD', fontSize: '13px', marginBottom: '8px', display: 'block' }}>Cierre</label>
                    <input type="time" value={newException.close_time} onChange={e => setNewException({...newException, close_time: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#1A1A1A', border: '1px solid #333', color: '#FFF', padding: '12px', borderRadius: '8px', colorScheme: 'dark' }} />
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
              <button onClick={() => setShowExceptionModal(false)} style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: '#BDBDBD', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={addException} style={{ flex: 1, padding: '12px', backgroundColor: '#D4A017', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
