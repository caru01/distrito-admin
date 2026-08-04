import { API_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Calendar, TrendingUp, TrendingDown, DollarSign, ShoppingBag, PieChart, FileText, Download, Printer } from 'lucide-react';

export default function AdminCierreContable() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [previewData, setPreviewData] = useState(null);
  const [history, setHistory] = useState([]);
  const [isClosed, setIsClosed] = useState(false);
  const [closedInfo, setClosedInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0
  });

  const fetchHistory = async () => {
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const res = await fetch(`${API_URL}/admin/closures`, { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      if (json.status === 'ok') setHistory(json.data);
    } catch (err) { console.error(err); }
  };

  const fetchPreview = async (start, end) => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const res = await fetch(`${API_URL}/admin/closures/preview?startDate=${start}&endDate=${end}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      if (json.status === 'ok') {
        setPreviewData(json.data);
        
        // Check if this exact period is closed in history
        const closedPeriod = history.find(h => 
          h.start_date.split('T')[0] === start && 
          h.end_date.split('T')[0] === end && 
          h.status === 'Cerrado'
        );
        if (closedPeriod) {
          setIsClosed(true);
          setClosedInfo(closedPeriod);
          // Overwrite preview with locked snapshot
          setPreviewData(closedPeriod.summary_json);
        } else {
          setIsClosed(false);
          setClosedInfo(null);
        }
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    fetchHistory();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchPreview(startDate, endDate);
    }
  }, [startDate, endDate, history]);

  const setDateRange = (type) => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(today - tzOffset)).toISOString().slice(0, -1);
    const todayStr = localISOTime.split('T')[0];

    if (type === 'hoy') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'mes') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const localFirst = (new Date(firstDay - tzOffset)).toISOString().slice(0, -1).split('T')[0];
      setStartDate(localFirst);
      setEndDate(todayStr);
    }
  };

  const handleCierre = async () => {
    if(!window.confirm(`¿Desea cerrar el período del ${startDate} al ${endDate}?\nUna vez cerrado no podrán modificarse los pedidos ni movimientos de este período sin autorización.`)) return;
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const res = await fetch(`${API_URL}/admin/closures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          startDate, endDate, summary: previewData, closedBy: 'Administrador'
        })
      });
      const json = await res.json();
      if (json.status === 'ok') {
        alert('Período Cerrado Exitosamente');
        fetchHistory();
      }
    } catch(err) { console.error(err); }
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="ds-page print-container">
      
      {/* ENCABEZADO */}
      <div className="ds-page-header">
        <div>
          <div style={{ color: '#BDBDBD', fontSize: '12px', marginBottom: '8px' }}>Dashboard &gt; Cierre Contable</div>
          <h1 className="ds-page-title" style={{ color: '#D4A017' }}>Cierre Contable</h1>
          <p style={{ margin: 0, color: '#BDBDBD' }}>Consolida las ventas, costos, gastos y utilidades de un período para generar el cierre financiero del restaurante.</p>
        </div>
      </div>

      {/* BARRA SUPERIOR NO IMPRIMIBLE */}
      <div className="ds-card no-print" style={{ marginBottom: '24px' }}>
        <div className="ds-card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Calendar size={18} color="#D4A017" />
              <input type="date" className="ds-input" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ colorScheme: 'dark' }} />
              <span style={{ color: '#888' }}>-</span>
              <input type="date" className="ds-input" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ colorScheme: 'dark' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setDateRange('hoy')} className="ds-btn ds-btn-secondary ds-btn-sm">Hoy</button>
              <button onClick={() => setDateRange('mes')} className="ds-btn ds-btn-secondary ds-btn-sm">Este mes</button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {isClosed ? (
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#EF4444', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '18px' }}><Lock size={18} /> PERÍODO CERRADO</div>
                <div style={{ color: '#888', fontSize: '12px' }}>{new Date(closedInfo.closed_at).toLocaleString()}</div>
              </div>
            ) : (
              <div style={{ color: '#22C55E', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '18px' }}><Unlock size={18} /> PERÍODO ABIERTO</div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleImprimir} className="ds-btn ds-btn-secondary">
                <Printer size={18} /> Imprimir / PDF
              </button>
              {!isClosed && previewData && (
                <button onClick={handleCierre} className="ds-btn ds-btn-primary">
                  <Lock size={18} /> Realizar Cierre
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="ds-loader-container">
          <div className="ds-loader"></div>
          <p>Cargando cálculos financieros...</p>
        </div>
      )}

      {previewData && (
        <>
          {/* TARJETAS KPI */}
          <div className="ds-cards-grid" style={{ marginBottom: '24px' }}>
            
            <div className="ds-stat-card">
              <div className="ds-stat-label"><DollarSign size={16} color="#D4A017"/> Ventas Totales</div>
              <div className="ds-stat-value">{formatter.format(previewData.totalVentas)}</div>
            </div>

            <div className="ds-stat-card">
              <div className="ds-stat-label"><ShoppingBag size={16} color="#3B82F6"/> Pedidos</div>
              <div className="ds-stat-value">{previewData.totalPedidos}</div>
            </div>

            <div className="ds-stat-card">
              <div className="ds-stat-label"><TrendingDown size={16} color="#EF4444"/> Costo Producción</div>
              <div className="ds-stat-value">{formatter.format(previewData.totalCostoProduccion)}</div>
            </div>

            <div className="ds-stat-card">
              <div className="ds-stat-label"><FileText size={16} color="#F59E0B"/> Gastos Operativos</div>
              <div className="ds-stat-value">{formatter.format(previewData.totalGastos)}</div>
            </div>

            <div className="ds-stat-card" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
              <div className="ds-stat-label" style={{ color: '#22C55E', fontWeight: '600' }}><TrendingUp size={16}/> Utilidad Neta</div>
              <div className="ds-stat-value" style={{ color: '#22C55E' }}>{formatter.format(previewData.utilidadNeta)}</div>
            </div>

          </div>

          <div className="ds-form-grid" style={{ marginBottom: '24px' }}>
            
            {/* VENTAS POR CATEGORIA */}
            <div className="ds-card">
              <div className="ds-card-header">
                <h3 className="ds-card-title"><PieChart size={18}/> Ventas por Categoría</h3>
              </div>
              <div className="ds-card-body" style={{ padding: 0 }}>
                <table className="ds-table">
                  <tbody>
                    {Object.entries(previewData.categoriasVentas || {}).map(([cat, val]) => (
                      <tr key={cat}>
                        <td>{cat}</td>
                        <td style={{ textAlign: 'right', fontWeight: '600', color: '#FFF' }}>{formatter.format(val)}</td>
                        <td style={{ textAlign: 'right', color: '#888' }}>{((val / (previewData.totalVentas || 1)) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* METODOS DE PAGO */}
            <div className="ds-card">
              <div className="ds-card-header">
                <h3 className="ds-card-title"><DollarSign size={18}/> Métodos de Pago</h3>
              </div>
              <div className="ds-card-body" style={{ padding: 0 }}>
                <table className="ds-table">
                  <tbody>
                    {Object.entries(previewData.metodosPago || {}).map(([mp, val]) => (
                      <tr key={mp}>
                        <td style={{ textTransform: 'capitalize' }}>{mp}</td>
                        <td style={{ textAlign: 'right', fontWeight: '600', color: '#FFF' }}>{formatter.format(val)}</td>
                        <td style={{ textAlign: 'right', color: '#888' }}>{((val / (previewData.totalVentas || 1)) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DESGLOSE COSTOS */}
            <div className="ds-card">
              <div className="ds-card-header">
                <h3 className="ds-card-title"><ShoppingBag size={18}/> Costos de Producción</h3>
              </div>
              <div className="ds-card-body" style={{ padding: 0 }}>
                <table className="ds-table">
                  <tbody>
                    {Object.entries(previewData.desgloseCostos || {}).map(([ing, cost]) => (
                      <tr key={ing}>
                        <td>{ing}</td>
                        <td style={{ textAlign: 'right', fontWeight: '600', color: '#EF4444' }}>- {formatter.format(cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DESGLOSE GASTOS */}
            <div className="ds-card">
              <div className="ds-card-header">
                <h3 className="ds-card-title"><FileText size={18}/> Gastos Operativos</h3>
              </div>
              <div className="ds-card-body" style={{ padding: 0 }}>
                <table className="ds-table">
                  <tbody>
                    {Object.entries(previewData.desgloseGastos || {}).map(([cat, val]) => (
                      <tr key={cat}>
                        <td>{cat}</td>
                        <td style={{ textAlign: 'right', fontWeight: '600', color: '#EF4444' }}>- {formatter.format(val)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* RESUMEN MATEMATICO */}
          <div className="ds-card" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
            <div className="ds-card-body" style={{ width: '100%', maxWidth: '500px' }}>
              <h3 style={{ margin: '0 0 24px 0', textAlign: 'center', color: '#D4A017', fontSize: '24px' }}>Resumen Financiero</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '18px' }}>
                <span style={{ color: '#BDBDBD' }}>Ventas Brutas</span>
                <span style={{ color: '#FFF', fontWeight: '600' }}>{formatter.format(previewData.totalVentas)}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '18px' }}>
                <span style={{ color: '#EF4444' }}>(-) Costo Producción</span>
                <span style={{ color: '#EF4444', fontWeight: '600' }}>- {formatter.format(previewData.totalCostoProduccion)}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '18px' }}>
                <span style={{ color: '#EF4444' }}>(-) Gastos Operativos</span>
                <span style={{ color: '#EF4444', fontWeight: '600' }}>- {formatter.format(previewData.totalGastos)}</span>
              </div>
              
              <div className="ds-divider" style={{ borderStyle: 'dashed', margin: '16px 0' }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', fontSize: '24px', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px' }}>
                <span style={{ color: '#22C55E', fontWeight: '800' }}>= UTILIDAD NETA</span>
                <span style={{ color: '#22C55E', fontWeight: '800' }}>{formatter.format(previewData.utilidadNeta)}</span>
              </div>

            </div>
          </div>

          {/* INVENTARIO FINAL */}
          <div className="ds-card no-print" style={{ marginBottom: '40px' }}>
            <div className="ds-card-header">
              <h3 className="ds-card-title">Inventario Final al Cierre</h3>
            </div>
            <div className="ds-card-body" style={{ padding: 0 }}>
              {isMobile ? (
                <div className="ds-table-cards">
                  {(previewData.inventarioSnapshot || []).map((inv, idx) => (
                    <div key={idx} className="ds-table-card">
                      <div className="ds-table-card-row">
                        <span className="ds-table-card-label">INGREDIENTE</span>
                        <span className="ds-table-card-value">{inv.name}</span>
                      </div>
                      <div className="ds-table-card-row">
                        <span className="ds-table-card-label">UNIDAD</span>
                        <span className="ds-table-card-value">{inv.unit}</span>
                      </div>
                      <div className="ds-table-card-row">
                        <span className="ds-table-card-label">CANTIDAD</span>
                        <span className="ds-table-card-value" style={{ fontWeight: '600' }}>{inv.quantity}</span>
                      </div>
                      <div className="ds-table-card-row">
                        <span className="ds-table-card-label">VALORIZADO</span>
                        <span className="ds-table-card-value" style={{ color: '#D4A017' }}>{formatter.format(inv.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ds-table-container">
                  <table className="ds-table">
                    <thead>
                      <tr>
                        <th>INGREDIENTE</th>
                        <th style={{ textAlign: 'center' }}>UNIDAD</th>
                        <th style={{ textAlign: 'right' }}>CANTIDAD RESTANTE</th>
                        <th style={{ textAlign: 'right' }}>VALORIZADO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(previewData.inventarioSnapshot || []).map((inv, idx) => (
                        <tr key={idx}>
                          <td>{inv.name}</td>
                          <td style={{ textAlign: 'center', color: '#BDBDBD' }}>{inv.unit}</td>
                          <td style={{ textAlign: 'right', fontWeight: '600' }}>{inv.quantity}</td>
                          <td style={{ textAlign: 'right', color: '#D4A017' }}>{formatter.format(inv.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* HISTORIAL NO IMPRIMIBLE */}
      <div className="no-print" style={{ marginTop: '40px' }}>
        <h2 style={{ color: '#FFF', marginBottom: '20px' }}>Historial de Cierres</h2>
        <div className="ds-card">
          {history.length === 0 ? (
            <div className="ds-empty-state">No hay cierres registrados.</div>
          ) : (
            isMobile ? (
              <div className="ds-table-cards">
                {history.map(h => (
                  <div key={h.id} className="ds-table-card">
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">PERÍODO</span>
                      <span className="ds-table-card-value">{h.start_date.split('T')[0]} a {h.end_date.split('T')[0]}</span>
                    </div>
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">ESTADO</span>
                      <span className="ds-table-card-value">
                        <span className={`ds-badge ${h.status === 'Cerrado' ? 'ds-badge-danger' : 'ds-badge-success'}`}>
                          {h.status}
                        </span>
                      </span>
                    </div>
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">VENTAS</span>
                      <span className="ds-table-card-value" style={{ fontWeight: '600' }}>{formatter.format(h.total_sales)}</span>
                    </div>
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">UTILIDAD</span>
                      <span className="ds-table-card-value" style={{ color: '#22C55E', fontWeight: '600' }}>{formatter.format(h.net_profit)}</span>
                    </div>
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">FECHA DE CIERRE</span>
                      <span className="ds-table-card-value">{new Date(h.closed_at).toLocaleDateString()}</span>
                    </div>
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">USUARIO</span>
                      <span className="ds-table-card-value">{h.closed_by}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ds-table-container">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>PERÍODO</th>
                      <th>ESTADO</th>
                      <th style={{ textAlign: 'right' }}>VENTAS</th>
                      <th style={{ textAlign: 'right' }}>UTILIDAD</th>
                      <th style={{ textAlign: 'right' }}>FECHA DE CIERRE</th>
                      <th style={{ textAlign: 'center' }}>USUARIO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id}>
                        <td>{h.start_date.split('T')[0]} a {h.end_date.split('T')[0]}</td>
                        <td>
                          <span className={`ds-badge ${h.status === 'Cerrado' ? 'ds-badge-danger' : 'ds-badge-success'}`}>
                            {h.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatter.format(h.total_sales)}</td>
                        <td style={{ textAlign: 'right', color: '#22C55E', fontWeight: '600' }}>{formatter.format(h.net_profit)}</td>
                        <td style={{ textAlign: 'right', color: '#BDBDBD' }}>{new Date(h.closed_at).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'center', color: '#BDBDBD' }}>{h.closed_by}</td>
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
  );
}
