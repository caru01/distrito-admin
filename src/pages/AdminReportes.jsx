import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, BarChart3, CalendarDays, CheckCircle, Download, Eye,
  Package, RefreshCw, ShoppingCart, TrendingDown, TrendingUp, Users,
  Wallet, X, Truck,
} from 'lucide-react';
import {
  Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import { API_URL } from '../config/api';
import { formatCurrency, formatDateTime, formatNumber } from '../utils/formatters';

const COLORS = ['#D4A017', '#8B5CF6', '#3B82F6', '#10B981', '#EF4444', '#F59E0B'];
const EMPTY_REPORT = {
  kpis: {},
  trends: {},
  charts: { ventas: [], categorias: [], pagos: [], estados: [] },
  lists: { productos: [], clientes: [] },
  alerts: { out_of_stock: 0, low_stock: 0 },
  meta: {},
};

function todayInColombia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

function shiftDate(value, days) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function periodForDays(days) {
  const to = todayInColombia();
  return { from: shiftDate(to, -(days - 1)), to };
}

function TrendBadge({ value = 0 }) {
  const positive = Number(value) >= 0;
  return (
    <span className={`report-trend ${positive ? 'positive' : 'negative'}`}>
      {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {positive ? '+' : ''}{formatNumber(value)}%
    </span>
  );
}

function DistributionCard({ title, data, currency = true }) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  return (
    <article className="ds-card report-distribution-card">
      <div className="ds-card-header"><h2 className="ds-card-title">{title}</h2></div>
      <div className="ds-card-body report-distribution-body">
        {data.length ? (
          <>
            <div className="report-pie">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="value" innerRadius="58%" outerRadius="82%" paddingAngle={3}>
                    {data.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value) => currency ? formatCurrency(value) : formatNumber(value)}
                    contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="report-pie-center"><span>Total</span><strong>{currency ? formatCurrency(total) : formatNumber(total)}</strong></div>
            </div>
            <div className="report-legend">
              {data.map((item, index) => (
                <div key={item.name}>
                  <span><i style={{ background: COLORS[index % COLORS.length] }} />{item.name}</span>
                  <strong>{total ? Math.round((Number(item.value) / total) * 100) : 0}%</strong>
                </div>
              ))}
            </div>
          </>
        ) : <div className="ds-empty-state report-empty-compact">No hay datos en este periodo.</div>}
      </div>
    </article>
  );
}

export default function AdminReportes() {
  const navigate = useNavigate();
  const initialPeriod = useMemo(() => periodForDays(30), []);
  const [report, setReport] = useState(EMPTY_REPORT);
  const [from, setFrom] = useState(initialPeriod.from);
  const [to, setTo] = useState(initialPeriod.to);
  const [preset, setPreset] = useState('30');
  const [activeTab, setActiveTab] = useState('Resumen');
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadReport = useCallback(async ({ silent = false } = {}) => {
    if (!from || !to || from > to) {
      setError('Selecciona un rango de fechas válido.');
      return;
    }
    if (silent) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const response = await fetch(`${API_URL}/admin/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'ok') throw new Error(data.error || 'No fue posible generar el reporte.');
      setReport({
        ...EMPTY_REPORT,
        ...data,
        charts: { ...EMPTY_REPORT.charts, ...(data.charts || {}) },
        lists: { ...EMPTY_REPORT.lists, ...(data.lists || {}) },
        alerts: { ...EMPTY_REPORT.alerts, ...(data.alerts || {}) },
      });
    } catch (requestError) {
      setError(requestError.message || 'No fue posible generar el reporte.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [from, to]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const changePreset = (value) => {
    setPreset(value);
    if (value !== 'custom') {
      const period = periodForDays(Number(value));
      setFrom(period.from);
      setTo(period.to);
    }
  };

  const exportCsv = () => {
    const safe = (value) => {
      const text = String(value ?? '');
      const protectedText = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${protectedText.replace(/"/g, '""')}"`;
    };
    const rows = [
      ['Reporte Distrito BG'], ['Desde', from], ['Hasta', to], [],
      ['Indicador', 'Valor'],
      ['Ventas totales', report.kpis.totalVentas || 0],
      ['Pedidos realizados', report.kpis.pedidosRealizados || 0],
      ['Pedidos completados', report.kpis.pedidosCompletados || 0],
      ['Clientes atendidos', report.kpis.clientesAtendidos || 0],
      ['Ticket promedio', report.kpis.ticketPromedio || 0],
      ['Utilidad bruta', report.kpis.utilidadBruta || 0],
      ['Domicilios externos', report.kpis.domiciliosExternos || 0],
      ['Costo operadores externos', report.kpis.costoDomiciliosExternos || 0],
      ['Margen logístico externo', report.kpis.margenLogisticoExterno || 0],
      [], ['Productos', 'Categoría', 'Unidades', 'Ventas'],
      ...report.lists.productos.map((item) => [item.name, item.category, item.quantity, item.total]),
      [], ['Clientes', 'Teléfono', 'Pedidos', 'Compras'],
      ...report.lists.clientes.map((item) => [item.name, item.phone, item.count, item.total]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(safe).join(';')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-distrito-${from}-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="ds-loader-container"><div className="ds-loader" /><p>Cargando inteligencia de negocio…</p></div>;

  const kpis = [
    { label: 'Ventas confirmadas', value: formatCurrency(report.kpis.totalVentas), trend: report.trends.totalVentas, icon: Wallet },
    { label: 'Pedidos recibidos', value: formatNumber(report.kpis.pedidosRealizados), trend: report.trends.pedidosRealizados, icon: ShoppingCart },
    { label: 'Clientes atendidos', value: formatNumber(report.kpis.clientesAtendidos), trend: report.trends.clientesAtendidos, icon: Users },
    { label: 'Ticket promedio', value: formatCurrency(report.kpis.ticketPromedio), trend: report.trends.ticketPromedio, icon: BarChart3 },
    { label: 'Utilidad estimada', value: formatCurrency(report.kpis.utilidadBruta), trend: report.trends.utilidadBruta, icon: TrendingUp },
  ];
  const tabs = ['Resumen', 'Ventas', 'Productos', 'Clientes'];

  return (
    <div className="ds-page report-page">
      <header className="ds-page-header">
        <div>
          <span className="ds-page-kicker">Inteligencia del negocio</span>
          <h1 className="ds-page-title">Reportes</h1>
          <p className="ds-page-subtitle">Resultados reales del periodo y comparación con el intervalo anterior.</p>
        </div>
        <div className="ds-page-actions">
          <button className="ds-btn ds-btn-secondary" onClick={() => loadReport({ silent: true })} disabled={refreshing}>
            <RefreshCw size={18} className={refreshing ? 'dashboard-spin' : ''} /> {refreshing ? 'Actualizando' : 'Actualizar'}
          </button>
          <button className="ds-btn ds-btn-primary" onClick={exportCsv}><Download size={18} /> Exportar CSV</button>
        </div>
      </header>

      <section className="ds-card report-period-card" aria-label="Periodo del reporte">
        <div className="report-period-control">
          <CalendarDays size={20} />
          <label><span>Periodo</span><select className="ds-select" value={preset} onChange={(event) => changePreset(event.target.value)}>
            <option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option><option value="custom">Personalizado</option>
          </select></label>
          <label><span>Desde</span><input className="ds-input" type="date" value={from} max={to} onChange={(event) => { setPreset('custom'); setFrom(event.target.value); }} /></label>
          <label><span>Hasta</span><input className="ds-input" type="date" value={to} min={from} max={todayInColombia()} onChange={(event) => { setPreset('custom'); setTo(event.target.value); }} /></label>
          <div className="report-period-summary"><strong>{report.meta.days || 0} días</strong><span>Hora Colombia</span></div>
        </div>
      </section>

      {error && <div className="ds-inline-alert ds-inline-alert-danger" role="alert"><AlertTriangle size={19} /><span>{error}</span><button onClick={() => loadReport()}>Reintentar</button></div>}

      <nav className="ds-tabs" aria-label="Secciones del reporte">
        {tabs.map((tab) => <button key={tab} className={`ds-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>)}
      </nav>

      {(activeTab === 'Resumen' || activeTab === 'Ventas') && (
        <>
          <section className="report-kpi-grid">
            {kpis.map(({ label, value, trend, icon: Icon }) => (
              <article key={label} className="report-kpi-card">
                <div className="report-kpi-icon"><Icon size={21} /></div>
                <div><span>{label}</span><strong>{value}</strong><small>vs. periodo anterior <TrendBadge value={trend} /></small></div>
              </article>
            ))}
          </section>
          <section className="ds-card report-sales-card">
            <div className="ds-card-header"><div><span className="ds-page-kicker">Ventas completadas</span><h2 className="ds-card-title">Comportamiento diario</h2></div><strong>{formatCurrency(report.kpis.totalVentas)}</strong></div>
            <div className="ds-card-body report-chart">
              {report.charts.ventas.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={report.charts.ventas} margin={{ left: 4, right: 8, top: 10 }}>
                <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} stroke="#777" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}k`} stroke="#777" fontSize={11} tickLine={false} axisLine={false} width={52} />
                <RechartsTooltip formatter={(value) => formatCurrency(value)} labelFormatter={(value) => `Fecha: ${value}`} cursor={{ fill: 'rgba(212,160,23,.08)' }} contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 10 }} />
                <Bar dataKey="ventas" fill="var(--ds-primary)" radius={[6, 6, 0, 0]} />
              </BarChart></ResponsiveContainer> : <div className="ds-empty-state">No hay ventas completadas en este periodo.</div>}
            </div>
          </section>
        </>
      )}

      {activeTab === 'Resumen' && (
        <div className="report-summary-grid">
          <article className="ds-card">
            <div className="ds-card-header"><h2 className="ds-card-title">Salud financiera</h2><Wallet size={20} color="var(--ds-primary)" /></div>
            <div className="ds-card-body report-finance-list">
              <div><span>Ventas</span><strong>{formatCurrency(report.kpis.totalVentas)}</strong></div>
              <div><span>Compras registradas</span><strong className="negative">− {formatCurrency(report.kpis.totalCompras)}</strong></div>
              <div><span>Operadores externos</span><strong className="negative">− {formatCurrency(report.kpis.costoDomiciliosExternos)}</strong></div>
              <div className="total"><span>Utilidad estimada</span><strong>{formatCurrency(report.kpis.utilidadBruta)}</strong></div>
              <div><span>Margen estimado</span><strong>{formatNumber(report.kpis.margenUtilidad)}%</strong></div>
            </div>
          </article>
          <article className="ds-card">
            <div className="ds-card-header"><h2 className="ds-card-title">Resultado de pedidos</h2><CheckCircle size={20} color="var(--ds-success)" /></div>
            <div className="ds-card-body report-status-list">
              {report.charts.estados.map((item) => <div key={item.name}><span>{item.name}</span><strong>{item.value}</strong></div>)}
              {!report.charts.estados.length && <div className="ds-empty-state report-empty-compact">Sin pedidos en el periodo.</div>}
              <div className="report-completion"><span>Tasa de finalización</span><strong>{formatNumber(report.kpis.tasaFinalizacion)}%</strong></div>
            </div>
          </article>
          <article className="ds-card report-alert-card">
            <div className="ds-card-header"><h2 className="ds-card-title">Alertas operativas</h2><AlertTriangle size={20} color="var(--ds-warning)" /></div>
            <div className="ds-card-body">
              <button onClick={() => navigate('/admin/inventario')}><Package size={20} /><span><strong>{report.alerts.out_of_stock || 0} agotados</strong><small>Productos sin existencias</small></span></button>
              <button onClick={() => navigate('/admin/inventario')}><AlertTriangle size={20} /><span><strong>{report.alerts.low_stock || 0} con stock bajo</strong><small>Requieren reposición</small></span></button>
            </div>
          </article>
          <article className="ds-card">
            <div className="ds-card-header"><h2 className="ds-card-title">Logística externa</h2><Truck size={20} color="var(--ds-primary)" /></div>
            <div className="ds-card-body report-finance-list">
              <div><span>Entregas completadas</span><strong>{formatNumber(report.kpis.domiciliosExternos)}</strong></div>
              <div><span>Cobrado por domicilio</span><strong>{formatCurrency(report.kpis.ingresoDomiciliosExternos)}</strong></div>
              <div><span>Pagado a operadores</span><strong className="negative">− {formatCurrency(report.kpis.costoDomiciliosExternos)}</strong></div>
              <div className="total"><span>Margen logístico</span><strong>{formatCurrency(report.kpis.margenLogisticoExterno)}</strong></div>
              <button className="ds-btn ds-btn-secondary ds-btn-sm" onClick={() => navigate('/admin/empresas-domicilios')}>Ver empresas</button>
            </div>
          </article>
        </div>
      )}

      {activeTab === 'Ventas' && <div className="report-distribution-grid"><DistributionCard title="Ventas por categoría" data={report.charts.categorias} /><DistributionCard title="Métodos de pago" data={report.charts.pagos} /><DistributionCard title="Pedidos por estado" data={report.charts.estados} currency={false} /></div>}

      {activeTab === 'Productos' && (
        <section className="ds-card">
          <div className="ds-card-header"><div><span className="ds-page-kicker">Ranking</span><h2 className="ds-card-title">Productos más vendidos</h2></div><span className="ds-badge ds-badge-primary">{report.lists.productos.length} resultados</span></div>
          <div className="report-ranking-list">
            {report.lists.productos.map((product, index) => <article key={`${product.name}-${index}`}><span className="report-rank">{index + 1}</span><div><strong>{product.name}</strong><small>{product.category || 'Sin categoría'} · {formatNumber(product.quantity)} unidades</small></div><strong>{formatCurrency(product.total)}</strong></article>)}
            {!report.lists.productos.length && <div className="ds-empty-state">No hay productos vendidos en el periodo.</div>}
          </div>
        </section>
      )}

      {activeTab === 'Clientes' && (
        <section className="ds-card">
          <div className="ds-card-header"><div><span className="ds-page-kicker">Fidelización</span><h2 className="ds-card-title">Clientes frecuentes</h2></div><span className="ds-badge ds-badge-primary">{report.lists.clientes.length} resultados</span></div>
          <div className="report-customer-list">
            {report.lists.clientes.map((client, index) => <article key={`${client.phone}-${index}`}><span className="ds-avatar">{client.name?.charAt(0)?.toUpperCase() || 'C'}</span><div><strong>{client.name || 'Cliente'}</strong><small>{client.count} pedidos · Favorito: {client.favoriteProduct}</small></div><strong>{formatCurrency(client.total)}</strong><button className="ds-btn-icon ds-btn-secondary" onClick={() => setSelectedClient(client)} aria-label={`Ver historial de ${client.name}`}><Eye size={17} /></button></article>)}
            {!report.lists.clientes.length && <div className="ds-empty-state">No hay clientes en el periodo.</div>}
          </div>
        </section>
      )}

      {selectedClient && <div className="ds-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedClient(null); }}>
        <div className="ds-modal ds-modal-lg" role="dialog" aria-modal="true" aria-labelledby="client-history-title">
          <div className="ds-modal-header"><div><h2 id="client-history-title" className="ds-modal-title">Historial de {selectedClient.name}</h2><p className="ds-form-help">{selectedClient.phone || 'Sin teléfono'} · {selectedClient.count} pedidos</p></div><button className="ds-modal-close" onClick={() => setSelectedClient(null)} aria-label="Cerrar"><X size={22} /></button></div>
          <div className="ds-modal-body report-history-list">
            {selectedClient.orderHistory?.map((order, index) => <article key={`${order.date}-${index}`}><div><strong>{formatDateTime(order.date)}</strong><span>{formatCurrency(order.total)}</span></div>{order.cart?.map((item, itemIndex) => <p key={`${item.title}-${itemIndex}`}><span>{item.qty || item.quantity || 1} × {item.title}</span><strong>{formatCurrency(Number(item.price || 0) * Number(item.qty || item.quantity || 1))}</strong></p>)}</article>)}
          </div>
        </div>
      </div>}
    </div>
  );
}
