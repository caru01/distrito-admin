import { BASE_URL as API_URL } from '../config/api';
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
  
  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0
  });

  const fetchHistory = async () => {
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const res = await fetch(`${API_URL}/api/pedidos/admin/closures`, { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      if (json.status === 'ok') setHistory(json.data);
    } catch (err) { console.error(err); }
  };

  const fetchPreview = async (start, end) => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const res = await fetch(`${API_URL}/api/pedidos/admin/closures/preview?startDate=${start}&endDate=${end}`, { headers: { 'Authorization': `Bearer ${token}` } });
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
    fetchHistory();
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
      const res = await fetch(`${API_URL}/api/pedidos/admin/closures`, {
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
    <div style={{ padding: '24px', backgroundColor: '#0D0D0D', minHeight: '100vh', color: '#FFF' }} className="print-container">
      
      {/* ENCABEZADO */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ color: '#BDBDBD', fontSize: '12px', marginBottom: '8px' }}>Dashboard &gt; Cierre Contable</div>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '800', color: '#D4A017' }}>Cierre Contable</h1>
        <p style={{ margin: 0, color: '#BDBDBD' }}>Consolida las ventas, costos, gastos y utilidades de un período para generar el cierre financiero del restaurante.</p>
      </div>

      {/* BARRA SUPERIOR NO IMPRIMIBLE */}
      <div className="no-print" style={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Calendar size={18} color="#D4A017" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ backgroundColor: '#0D0D0D', border: '1px solid #333', color: '#FFF', padding: '10px', borderRadius: '8px' }} />
            <span style={{ color: '#888' }}>-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ backgroundColor: '#0D0D0D', border: '1px solid #333', color: '#FFF', padding: '10px', borderRadius: '8px' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setDateRange('hoy')} style={{ backgroundColor: '#222', color: '#FFF', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Hoy</button>
            <button onClick={() => setDateRange('mes')} style={{ backgroundColor: '#222', color: '#FFF', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Este mes</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {isClosed ? (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#EF4444', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '18px' }}><Lock size={18} /> PERÍODO CERRADO</div>
              <div style={{ color: '#888', fontSize: '12px' }}>{new Date(closedInfo.closed_at).toLocaleString()}</div>
            </div>
          ) : (
            <div style={{ color: '#22C55E', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '18px' }}><Unlock size={18} /> PERÍODO ABIERTO</div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleImprimir} style={{ backgroundColor: '#222', color: '#FFF', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Printer size={18} /> Imprimir / PDF
            </button>
            {!isClosed && previewData && (
              <button onClick={handleCierre} style={{ backgroundColor: '#D4A017', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} /> Realizar Cierre
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && <p>Cargando cálculos financieros...</p>}

      {previewData && (
        <>
          {/* TARJETAS KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            
            <div style={{ backgroundColor: '#111', border: '1px solid #222', padding: '20px', borderRadius: '12px' }}>
              <div style={{ color: '#BDBDBD', fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><DollarSign size={16} color="#D4A017"/> Ventas Totales</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#FFF' }}>{formatter.format(previewData.totalVentas)}</div>
            </div>

            <div style={{ backgroundColor: '#111', border: '1px solid #222', padding: '20px', borderRadius: '12px' }}>
              <div style={{ color: '#BDBDBD', fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><ShoppingBag size={16} color="#3B82F6"/> Pedidos</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#FFF' }}>{previewData.totalPedidos}</div>
            </div>

            <div style={{ backgroundColor: '#111', border: '1px solid #222', padding: '20px', borderRadius: '12px' }}>
              <div style={{ color: '#BDBDBD', fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingDown size={16} color="#EF4444"/> Costo Producción</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#FFF' }}>{formatter.format(previewData.totalCostoProduccion)}</div>
            </div>

            <div style={{ backgroundColor: '#111', border: '1px solid #222', padding: '20px', borderRadius: '12px' }}>
              <div style={{ color: '#BDBDBD', fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={16} color="#F59E0B"/> Gastos Operativos</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#FFF' }}>{formatter.format(previewData.totalGastos)}</div>
            </div>

            <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '20px', borderRadius: '12px' }}>
              <div style={{ color: '#22C55E', fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}><TrendingUp size={16}/> Utilidad Neta</div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#22C55E' }}>{formatter.format(previewData.utilidadNeta)}</div>
            </div>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            
            {/* VENTAS POR CATEGORIA */}
            <div style={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#D4A017' }}><PieChart size={18}/> Ventas por Categoría</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(previewData.categoriasVentas || {}).map(([cat, val]) => (
                    <tr key={cat} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px 0', color: '#FFF' }}>{cat}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: '600', color: '#FFF' }}>{formatter.format(val)}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right', color: '#888' }}>{((val / (previewData.totalVentas || 1)) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* METODOS DE PAGO */}
            <div style={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#D4A017' }}><DollarSign size={18}/> Métodos de Pago</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(previewData.metodosPago || {}).map(([mp, val]) => (
                    <tr key={mp} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px 0', color: '#FFF', textTransform: 'capitalize' }}>{mp}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: '600', color: '#FFF' }}>{formatter.format(val)}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right', color: '#888' }}>{((val / (previewData.totalVentas || 1)) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* DESGLOSE COSTOS */}
            <div style={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#D4A017' }}><ShoppingBag size={18}/> Costos de Producción</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(previewData.desgloseCostos || {}).map(([ing, cost]) => (
                    <tr key={ing} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px 0', color: '#FFF' }}>{ing}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: '600', color: '#EF4444' }}>- {formatter.format(cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* DESGLOSE GASTOS */}
            <div style={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#D4A017' }}><FileText size={18}/> Gastos Operativos</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(previewData.desgloseGastos || {}).map(([cat, val]) => (
                    <tr key={cat} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px 0', color: '#FFF' }}>{cat}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: '600', color: '#EF4444' }}>- {formatter.format(val)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          {/* RESUMEN MATEMATICO */}
          <div style={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', padding: '32px', marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '500px' }}>
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
              
              <div style={{ borderTop: '2px dashed #444', margin: '16px 0' }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', fontSize: '24px', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', paddingInline: '16px' }}>
                <span style={{ color: '#22C55E', fontWeight: '800' }}>= UTILIDAD NETA</span>
                <span style={{ color: '#22C55E', fontWeight: '800' }}>{formatter.format(previewData.utilidadNeta)}</span>
              </div>

            </div>
          </div>

          {/* INVENTARIO FINAL */}
          <div className="no-print" style={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px', marginBottom: '40px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#D4A017' }}>Inventario Final al Cierre</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#1A1A1A', borderBottom: '1px solid #333' }}>
                <tr>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#888' }}>INGREDIENTE</th>
                  <th style={{ padding: '16px', textAlign: 'center', color: '#888' }}>UNIDAD</th>
                  <th style={{ padding: '16px', textAlign: 'right', color: '#888' }}>CANTIDAD RESTANTE</th>
                  <th style={{ padding: '16px', textAlign: 'right', color: '#888' }}>VALORIZADO</th>
                </tr>
              </thead>
              <tbody>
                {(previewData.inventarioSnapshot || []).map((inv, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '12px 16px', color: '#FFF' }}>{inv.name}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#BDBDBD' }}>{inv.unit}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#FFF', fontWeight: '600' }}>{inv.quantity}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#D4A017' }}>{formatter.format(inv.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* HISTORIAL NO IMPRIMIBLE */}
      <div className="no-print" style={{ marginTop: '40px' }}>
        <h2 style={{ color: '#FFF', marginBottom: '20px' }}>Historial de Cierres</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#111', borderRadius: '12px', overflow: 'hidden' }}>
          <thead style={{ backgroundColor: '#1A1A1A' }}>
            <tr>
              <th style={{ padding: '16px', textAlign: 'left', color: '#888' }}>PERÍODO</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#888' }}>ESTADO</th>
              <th style={{ padding: '16px', textAlign: 'right', color: '#888' }}>VENTAS</th>
              <th style={{ padding: '16px', textAlign: 'right', color: '#888' }}>UTILIDAD</th>
              <th style={{ padding: '16px', textAlign: 'right', color: '#888' }}>FECHA DE CIERRE</th>
              <th style={{ padding: '16px', textAlign: 'center', color: '#888' }}>USUARIO</th>
            </tr>
          </thead>
          <tbody>
            {history.map(h => (
              <tr key={h.id} style={{ borderBottom: '1px solid #222' }}>
                <td style={{ padding: '16px', color: '#FFF' }}>{h.start_date.split('T')[0]} a {h.end_date.split('T')[0]}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ backgroundColor: h.status === 'Cerrado' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)', color: h.status === 'Cerrado' ? '#EF4444' : '#22C55E', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                    {h.status}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'right', color: '#FFF', fontWeight: '600' }}>{formatter.format(h.total_sales)}</td>
                <td style={{ padding: '16px', textAlign: 'right', color: '#22C55E', fontWeight: '600' }}>{formatter.format(h.net_profit)}</td>
                <td style={{ padding: '16px', textAlign: 'right', color: '#BDBDBD' }}>{new Date(h.closed_at).toLocaleDateString()}</td>
                <td style={{ padding: '16px', textAlign: 'center', color: '#BDBDBD' }}>{h.closed_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
