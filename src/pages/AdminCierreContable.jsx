import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Banknote, Calendar, CheckCircle, Download, FileText, Lock,
  Package, Printer, RefreshCw, RotateCcw, ShoppingBag, TrendingDown, TrendingUp,
} from 'lucide-react';
import { API_URL } from '../config/api';
import { formatCurrency, formatDateTime } from '../utils/formatters';

const token = () => sessionStorage.getItem('distrito_admin_token');
const colombiaDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(date);
function shift(date, days) { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); }

export default function AdminCierreContable() {
  const today = colombiaDate();
  const [period, setPeriod] = useState({ start: today, end: today });
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [cashCounted, setCashCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const exactClosure = useMemo(() => history.find((item) => item.start_date.slice(0, 10) === period.start && item.end_date.slice(0, 10) === period.end && item.status === 'Cerrado'), [history, period]);
  const data = exactClosure?.summary_json || preview;
  const expectedCash = Number(data?.efectivoEsperado || 0);
  const counted = cashCounted === '' ? expectedCash : Number(cashCounted || 0);
  const difference = counted - expectedCash;

  const loadHistory = useCallback(async () => {
    const response = await fetch(`${API_URL}/admin/closures`, { headers: { Authorization: `Bearer ${token()}` } });
    const json = await response.json(); if (!response.ok) throw new Error(json.error); setHistory(json.data || []);
  }, []);
  const loadPreview = useCallback(async () => {
    if (!period.start || !period.end || period.start > period.end) return;
    setLoading(true); setNotice(null);
    try {
      const response = await fetch(`${API_URL}/admin/closures/preview?startDate=${period.start}&endDate=${period.end}`, { headers: { Authorization: `Bearer ${token()}` } });
      const json = await response.json(); if (!response.ok) throw new Error(json.error); setPreview(json.data); setCashCounted(String(json.data.efectivoEsperado || 0));
    } catch (error) { setNotice({ type: 'error', text: error.message || 'No fue posible calcular el cierre.' }); }
    finally { setLoading(false); }
  }, [period]);
  useEffect(() => { loadHistory().catch((error) => setNotice({ type: 'error', text: error.message })); }, [loadHistory]);
  useEffect(() => { const timer = setTimeout(loadPreview, 200); return () => clearTimeout(timer); }, [loadPreview]);

  const preset = (type) => {
    if (type === 'today') setPeriod({ start: today, end: today });
    if (type === 'week') setPeriod({ start: shift(today, -6), end: today });
    if (type === 'month') setPeriod({ start: `${today.slice(0, 8)}01`, end: today });
  };
  const closePeriod = async () => {
    if (!data || exactClosure || !window.confirm(`¿Cerrar el período ${period.start} a ${period.end}? Los valores serán recalculados por el servidor.`)) return;
    setBusy(true); setNotice(null);
    try {
      const response = await fetch(`${API_URL}/admin/closures`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ startDate: period.start, endDate: period.end, cashCounted: counted, notes }) });
      const json = await response.json(); if (!response.ok) throw new Error(json.error);
      setNotice({ type: 'success', text: `Cierre #${json.data.id} creado con conciliación de efectivo.` }); setNotes(''); await loadHistory();
    } catch (error) { setNotice({ type: 'error', text: error.message || 'No fue posible cerrar el período.' }); }
    finally { setBusy(false); }
  };
  const reopen = async (closure) => {
    const reason = window.prompt(`Motivo para reabrir el cierre #${closure.id}:`); if (!reason) return;
    try {
      const response = await fetch(`${API_URL}/admin/closures/${closure.id}/reopen`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ reason }) });
      const json = await response.json(); if (!response.ok) throw new Error(json.error); setNotice({ type: 'success', text: `Cierre #${closure.id} reabierto.` }); await loadHistory();
    } catch (error) { setNotice({ type: 'error', text: error.message || 'No fue posible reabrir.' }); }
  };
  const exportCsv = () => {
    if (!data) return;
    const rows = [['Concepto','Valor'],['Ventas',data.totalVentas],['Pedidos',data.totalPedidos],['Cancelados',data.pedidosCancelados],['Costo de productos',data.totalCostoProduccion],['Gastos',data.totalGastos],['Utilidad neta',data.utilidadNeta],['Efectivo esperado',expectedCash],['Efectivo contado',counted],['Diferencia',difference]];
    const url = URL.createObjectURL(new Blob([`\uFEFF${rows.map((row) => row.join(',')).join('\n')}`], { type: 'text/csv' })); const link = document.createElement('a'); link.href = url; link.download = `cierre-${period.start}-${period.end}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  return <div className="ds-page closure-page">
    <header className="ds-page-header"><div><span className="ds-page-kicker">Control financiero</span><h1 className="ds-page-title">Cierre contable</h1><p className="ds-page-subtitle">Concilia ventas, efectivo, costos, gastos e inventario con cálculos protegidos en el servidor.</p></div><div className="ds-page-actions"><button className="ds-btn ds-btn-secondary" onClick={exportCsv} disabled={!data}><Download size={18} /> CSV</button><button className="ds-btn ds-btn-secondary" onClick={() => window.print()}><Printer size={18} /> Imprimir</button></div></header>
    {notice && <div className={`ds-inline-alert ds-inline-alert-${notice.type === 'success' ? 'success' : 'danger'}`}>{notice.type === 'success' ? <CheckCircle /> : <AlertTriangle />}<span>{notice.text}</span></div>}
    <section className="ds-card closure-period no-print"><div className="closure-period-fields"><Calendar /><input className="ds-input" type="date" value={period.start} onChange={(e) => setPeriod({ ...period, start: e.target.value })} /><span>a</span><input className="ds-input" type="date" min={period.start} value={period.end} onChange={(e) => setPeriod({ ...period, end: e.target.value })} /></div><div className="closure-presets"><button className="ds-btn ds-btn-ghost ds-btn-sm" onClick={() => preset('today')}>Hoy</button><button className="ds-btn ds-btn-ghost ds-btn-sm" onClick={() => preset('week')}>7 días</button><button className="ds-btn ds-btn-ghost ds-btn-sm" onClick={() => preset('month')}>Este mes</button><button className="ds-btn ds-btn-secondary ds-btn-sm" onClick={loadPreview}><RefreshCw size={16} /> Recalcular</button></div><span className={`ds-badge ds-badge-${exactClosure ? 'danger' : 'success'}`}>{exactClosure ? <Lock size={14} /> : null}{exactClosure ? `Cerrado #${exactClosure.id}` : 'Período abierto'}</span></section>
    {loading ? <div className="ds-loader-container"><div className="ds-loader" /><p>Calculando con datos actuales…</p></div> : data && <>
      <section className="closure-kpis"><article><TrendingUp /><div><strong>{formatCurrency(data.totalVentas)}</strong><span>Ventas finalizadas</span></div></article><article><ShoppingBag /><div><strong>{data.totalPedidos || 0}</strong><span>Pedidos entregados</span></div></article><article><TrendingDown /><div><strong>{formatCurrency(data.totalCostoProduccion)}</strong><span>Costo de productos</span></div></article><article><FileText /><div><strong>{formatCurrency(data.totalGastos)}</strong><span>Gastos operativos</span></div></article><article className={Number(data.utilidadNeta) < 0 ? 'danger' : 'success'}><Banknote /><div><strong>{formatCurrency(data.utilidadNeta)}</strong><span>Utilidad neta</span></div></article></section>
      <div className="closure-grid"><section className="ds-card"><div className="ds-card-header"><h2 className="ds-card-title">Conciliación de caja</h2></div><div className="ds-card-body ds-form"><div className="closure-reconciliation"><div><span>Efectivo esperado</span><strong>{formatCurrency(expectedCash)}</strong></div><label><span>Efectivo contado</span><input className="ds-input" type="number" min="0" value={cashCounted} disabled={Boolean(exactClosure)} onChange={(e) => setCashCounted(e.target.value)} /></label><div className={difference === 0 ? 'balanced' : 'unbalanced'}><span>Diferencia</span><strong>{formatCurrency(exactClosure ? exactClosure.cash_difference : difference)}</strong></div></div><label className="ds-form-group"><span className="ds-form-label">Notas del cierre</span><textarea className="ds-textarea" value={exactClosure?.notes || notes} disabled={Boolean(exactClosure)} onChange={(e) => setNotes(e.target.value)} placeholder="Novedades de caja, comprobantes o responsables…" /></label>{!exactClosure && <button className="ds-btn ds-btn-primary ds-w-full" onClick={closePeriod} disabled={busy}><Lock size={18} /> {busy ? 'Cerrando…' : 'Confirmar y cerrar período'}</button>}</div></section>
        <section className="ds-card"><div className="ds-card-header"><h2 className="ds-card-title">Resumen financiero</h2></div><div className="ds-card-body closure-equation"><div><span>Ventas</span><strong>{formatCurrency(data.totalVentas)}</strong></div><div><span>− Costos de productos</span><strong>{formatCurrency(data.totalCostoProduccion)}</strong></div><div><span>− Gastos operativos</span><strong>{formatCurrency(data.totalGastos)}</strong></div><div className="total"><span>= Utilidad neta</span><strong>{formatCurrency(data.utilidadNeta)}</strong></div><small>Margen bruto: {Number(data.margenBruto || 0).toFixed(1)}% · Cancelados: {data.pedidosCancelados || 0}</small></div></section>
      </div>
      <div className="closure-breakdowns"><Breakdown title="Métodos de pago" rows={data.metodosPago} /><Breakdown title="Ventas por categoría" rows={data.categoriasVentas} /><Breakdown title="Costo por producto" rows={data.desgloseCostos} /><Breakdown title="Gastos por categoría" rows={data.desgloseGastos} /></div>
      <section className="ds-card"><div className="ds-card-header"><h2 className="ds-card-title"><Package size={19} /> Inventario valorizado al momento del cálculo</h2></div><div className="ds-table-container"><table className="ds-table"><thead><tr><th>Producto</th><th>Unidad</th><th>Existencias</th><th>Valor</th></tr></thead><tbody>{(data.inventarioSnapshot || []).map((item) => <tr key={item.name}><td>{item.name}</td><td>{item.unit}</td><td>{item.quantity}</td><td>{formatCurrency(item.value)}</td></tr>)}</tbody></table></div></section>
    </>}
    <section className="ds-card closure-history no-print"><div className="ds-card-header"><h2 className="ds-card-title">Historial de cierres</h2></div>{history.length ? <div className="closure-history-list">{history.map((item) => <article key={item.id}><div><strong>#{item.id} · {item.start_date.slice(0, 10)} a {item.end_date.slice(0, 10)}</strong><span className={`ds-badge ds-badge-${item.status === 'Cerrado' ? 'danger' : 'warning'}`}>{item.status}</span></div><dl><div><dt>Ventas</dt><dd>{formatCurrency(item.total_sales)}</dd></div><div><dt>Pedidos</dt><dd>{item.orders_count || 0}</dd></div><div><dt>Diferencia caja</dt><dd>{formatCurrency(item.cash_difference)}</dd></div><div><dt>Cerrado</dt><dd>{formatDateTime(item.closed_at)}</dd></div></dl>{item.status === 'Cerrado' ? <button className="ds-btn ds-btn-ghost ds-btn-sm" onClick={() => reopen(item)}><RotateCcw size={16} /> Reabrir con motivo</button> : <small>Reabierto: {item.reopen_reason || 'Sin detalle'}</small>}</article>)}</div> : <div className="ds-empty-state">No hay cierres registrados.</div>}</section>
  </div>;
}

function Breakdown({ title, rows = {} }) {
  const entries = Object.entries(rows || {});
  return <section className="ds-card"><div className="ds-card-header"><h3 className="ds-card-title">{title}</h3></div>{entries.length ? <div className="closure-breakdown-list">{entries.map(([name, value]) => <div key={name}><span>{name}</span><strong>{formatCurrency(value)}</strong></div>)}</div> : <div className="ds-empty-state">Sin movimientos</div>}</section>;
}
