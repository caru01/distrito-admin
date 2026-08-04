import React, { useState, useEffect } from 'react';
import { API_URL } from '../config/api';
import { Shield, Activity, Monitor, Clock, Globe, Laptop, Key, Search, XCircle, User, CheckCircle } from 'lucide-react';

export default function AdminAuditoria() {
  const [logs, setLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('sessions');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const [logsRes, sessionsRes] = await Promise.all([
        fetch(`${API_URL}/admin/audit`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/sessions`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const logsData = await logsRes.json();
      const sessionsData = await sessionsRes.json();
      
      if (logsData.status === 'ok') setLogs(logsData.data);
      if (sessionsData.status === 'ok') setSessions(sessionsData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const forceCloseSession = async (id) => {
    if (!window.confirm('¿Seguro que quieres cerrar esta sesión remotamente?')) return;
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      await fetch(`${API_URL}/admin/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Activa') return 'success';
    if (status.includes('Cerrada')) return 'danger';
    return 'neutral';
  };

  return (
    <div className="ds-page">
      <div className="ds-page-header">
        <div>
          <h2 className="ds-page-title" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Shield size={32} color="#D4A017" />
            Auditoría y Seguridad
          </h2>
        </div>
      </div>

      <div className="ds-tabs" style={{ marginBottom: '30px' }}>
        <button 
          onClick={() => setTab('sessions')}
          className={`ds-tab ${tab === 'sessions' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Monitor size={18} /> Sesiones Activas e Historial
        </button>
        <button 
          onClick={() => setTab('logs')}
          className={`ds-tab ${tab === 'logs' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Activity size={18} /> Registro de Eventos (Logs)
        </button>
      </div>

      {loading ? (
        <div className="ds-loader-container">
          <div className="ds-loader"></div>
          <p>Cargando datos de seguridad...</p>
        </div>
      ) : (
        <div className="ds-card">
          {tab === 'sessions' && (
            <>
              <div className="ds-table-container hide-on-mobile">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Dispositivo / OS</th>
                      <th>Ubicación / IP</th>
                      <th>Estado</th>
                      <th>Última Actividad</th>
                      <th style={{ textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s.id}>
                        <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="ds-avatar" style={{ width: '30px', height: '30px', backgroundColor: '#333', color: '#aaa', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <User size={16} />
                          </div>
                          {s.username}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Laptop size={14} color="#888" /> {s.os}
                          </div>
                          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{s.browser}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Globe size={14} color="#888" /> {s.location || 'Desconocido'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{s.ip}</div>
                        </td>
                        <td>
                          <span className={`ds-badge ds-badge-${getStatusColor(s.status)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }}></div>
                            {s.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} /> {new Date(s.last_active).toLocaleString()}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {s.status === 'Activa' && (
                            <button 
                              onClick={() => forceCloseSession(s.id)}
                              className="ds-btn ds-btn-danger ds-btn-sm"
                            >
                              Forzar Cierre
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="ds-table-cards show-on-mobile">
                {sessions.map(s => (
                  <div key={s.id} className="ds-table-card">
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">Usuario</span>
                      <span className="ds-table-card-value" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="ds-avatar" style={{ width: '24px', height: '24px', backgroundColor: '#333', color: '#aaa', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <User size={12} />
                        </div>
                        {s.username}
                      </span>
                    </div>
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">Dispositivo / OS</span>
                      <span className="ds-table-card-value">
                        {s.os}
                        <span style={{ display: 'block', fontSize: '12px', color: '#888' }}>{s.browser}</span>
                      </span>
                    </div>
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">Ubicación / IP</span>
                      <span className="ds-table-card-value">
                        {s.location || 'Desconocido'}
                        <span style={{ display: 'block', fontSize: '12px', color: '#888' }}>{s.ip}</span>
                      </span>
                    </div>
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">Estado</span>
                      <span className="ds-table-card-value">
                        <span className={`ds-badge ds-badge-${getStatusColor(s.status)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }}></div>
                          {s.status}
                        </span>
                      </span>
                    </div>
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">Última Actividad</span>
                      <span className="ds-table-card-value">{new Date(s.last_active).toLocaleString()}</span>
                    </div>
                    {s.status === 'Activa' && (
                      <div className="ds-table-card-actions">
                        <button 
                          onClick={() => forceCloseSession(s.id)}
                          className="ds-btn ds-btn-danger ds-btn-sm ds-btn-full"
                        >
                          Forzar Cierre
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'logs' && (
            <>
              <div className="ds-table-container hide-on-mobile">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Fecha y Hora</th>
                      <th>Acción</th>
                      <th>Usuario</th>
                      <th>IP / Dispositivo</th>
                      <th>Detalles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id}>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                        <td>
                          <span style={{ 
                            color: log.action.includes('Fallido') ? '#ef4444' : log.action.includes('Cierre') ? '#f59e0b' : '#10b981',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            {log.action.includes('Fallido') ? <XCircle size={14} /> : log.action.includes('Cierre') ? <Clock size={14} /> : <CheckCircle size={14} />}
                            {log.action}
                          </span>
                        </td>
                        <td>{log.username || log.username_attempted || 'N/A'}</td>
                        <td style={{ fontSize: '13px', color: '#888' }}>
                          <div>{log.ip}</div>
                          <div>{log.os} - {log.browser}</div>
                        </td>
                        <td style={{ fontSize: '13px', color: '#888' }}>{log.details || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="ds-table-cards show-on-mobile">
                {logs.map(log => (
                  <div key={log.id} className="ds-table-card">
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">Fecha y Hora</span>
                      <span className="ds-table-card-value">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">Acción</span>
                      <span className="ds-table-card-value" style={{ 
                        color: log.action.includes('Fallido') ? '#ef4444' : log.action.includes('Cierre') ? '#f59e0b' : '#10b981',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        justifyContent: 'flex-end'
                      }}>
                        {log.action.includes('Fallido') ? <XCircle size={14} /> : log.action.includes('Cierre') ? <Clock size={14} /> : <CheckCircle size={14} />}
                        {log.action}
                      </span>
                    </div>
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">Usuario</span>
                      <span className="ds-table-card-value">{log.username || log.username_attempted || 'N/A'}</span>
                    </div>
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">IP / Dispositivo</span>
                      <span className="ds-table-card-value">
                        {log.ip}
                        <span style={{ display: 'block', fontSize: '12px', color: '#888' }}>{log.os} - {log.browser}</span>
                      </span>
                    </div>
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">Detalles</span>
                      <span className="ds-table-card-value">{log.details || '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      
      <style>{`
        @media (max-width: 768px) {
          .hide-on-mobile { display: none !important; }
          .show-on-mobile { display: flex !important; flex-direction: column; gap: 16px; padding: 16px; }
        }
        @media (min-width: 769px) {
          .show-on-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
