import React, { useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Archive, ArrowRight, Banknote, BarChart3, CalendarClock,
  CheckCircle, ChefHat, CircleDollarSign, Clock, CreditCard, ExternalLink,
  Layers, Megaphone, Package, Plus, RefreshCw, Settings, ShoppingBag,
  ShoppingCart, Star, Store, Tags, TrendingUp, Truck, Zap,
} from 'lucide-react';
import { API_URL, STOREFRONT_URL } from '../config/api';
import { AuthContext } from '../context/AuthContext';
import { orderStatusMeta } from '@distrito/shared-ui';

const DASHBOARD_CACHE_KEY = 'distrito_admin_dashboard_cache';
const money = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
});

const EMPTY_DASHBOARD = {
  orders: {
    today: 0, new: 0, preparing: 0, ready: 0, onTheWay: 0,
    pendingPayment: 0, completed: 0, cancelled: 0, active: 0,
    revenue: 0, averageTicket: 0,
  },
  products: { total: 0, active: 0, inactive: 0, featured: 0 },
  inventory: { total: 0, critical: 0, outOfStock: 0 },
  recentOrders: [],
  topProducts: [],
  settings: { restaurantName: 'Distrito BG', currency: 'COP', enabledPayments: 0 },
  schedule: { isOpen: false, statusText: 'No disponible', currentSchedule: null },
};

function getCachedDashboard() {
  try {
    const value = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function relativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Sin fecha';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return new Date(timestamp).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, hasPermission } = useContext(AuthContext);
  const cached = useMemo(getCachedDashboard, []);
  const [dashboard, setDashboard] = useState(cached || EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Rentabilidad
  const PROFITABILITY_PERIODS = [
    { value: '15d', label: 'Últ. 15 días' },
    { value: 'weekly', label: 'Esta semana' },
    { value: 'monthly', label: 'Este mes' },
  ];
  const [profPeriod, setProfPeriod] = useState('15d');
  const [profData, setProfData] = useState(null);
  const [profLoading, setProfLoading] = useState(false);
  const [profError, setProfError] = useState('');

  const isFetchingRef = useRef(false);

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (isFetchingRef.current) return;
    const token = sessionStorage.getItem('distrito_admin_token');
    if (!token) return;
    
    isFetchingRef.current = true;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'ok' || !data.dashboard) {
        throw new Error(data.error || 'No fue posible cargar el dashboard.');
      }
      setDashboard(data.dashboard);
      try {
        sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(data.dashboard));
      } catch { /* El dashboard funciona aunque el almacenamiento esté lleno. */ }
    } catch (requestError) {
      setError(requestError.message || 'No fue posible actualizar el resumen.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadDashboard({ silent: Boolean(cached) });
    const interval = setInterval(() => {
      loadDashboard({ silent: true });
    }, 60000);
    return () => clearInterval(interval);
  }, [cached, loadDashboard]);

  const loadProfitability = useCallback(async (period) => {
    const token = sessionStorage.getItem('distrito_admin_token');
    if (!token) return;
    setProfLoading(true);
    setProfError('');
    try {
      const response = await fetch(`${API_URL}/admin/dashboard/profitability?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'ok') {
        throw new Error(data.error || 'No fue posible calcular la rentabilidad.');
      }
      setProfData(data.profitability);
    } catch (e) {
      setProfError(e.message || 'Error al cargar rentabilidad.');
      setProfData(null);
    } finally {
      setProfLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfitability(profPeriod);
  }, [profPeriod, loadProfitability]);

  if (loading) {
    return (
      <div className="ds-page">
        <div className="ds-loader-container">
          <div className="ds-loader" />
          <p className="ds-loader-text">Preparando la operación de la tienda</p>
        </div>
      </div>
    );
  }

  const { orders, products, inventory, recentOrders, topProducts, settings, schedule } = dashboard;
  const userName = user?.name || user?.nombre || user?.username || 'Equipo Distrito';
  const firstName = String(userName).split(' ')[0];
  const scheduleText = schedule?.currentSchedule
    ? `${String(schedule.currentSchedule.open_time || '').slice(0, 5)} - ${String(schedule.currentSchedule.close_time || '').slice(0, 5)}`
    : schedule?.statusText || 'Horario no disponible';

  const metrics = [
    { label: 'Pedidos de hoy', value: orders.today, note: `${orders.active} requieren atención`, icon: ShoppingBag, tone: 'primary' },
    { label: 'Ventas confirmadas', value: money.format(Number(orders.revenue || 0)), note: `${orders.completed} pedidos completados`, icon: Banknote, tone: 'success' },
    { label: 'Pedidos en curso', value: orders.active, note: `${orders.new} nuevos · ${orders.preparing} en cocina`, icon: Clock, tone: 'warning' },
    { label: 'Ticket promedio', value: money.format(Number(orders.averageTicket || 0)), note: 'Solo pedidos completados', icon: CircleDollarSign, tone: 'info' },
    { label: 'Productos activos', value: products.active, note: `${products.featured} destacados en tienda`, icon: Package, tone: 'violet' },
    { label: 'Stock crítico', value: inventory.critical, note: inventory.outOfStock ? `${inventory.outOfStock} agotados` : 'Sin productos agotados', icon: AlertTriangle, tone: inventory.critical ? 'danger' : 'success' },
  ];

  const pipeline = [
    { label: 'Recibidos', value: orders.new, icon: Zap, tone: 'info' },
    { label: 'En cocina', value: orders.preparing, icon: ChefHat, tone: 'warning' },
    { label: 'Listos para despacho', value: orders.ready, icon: CheckCircle, tone: 'success' },
    { label: 'En reparto', value: orders.onTheWay, icon: Truck, tone: 'violet' },
    { label: 'Pago pendiente', value: orders.pendingPayment, icon: CreditCard, tone: 'danger' },
  ];
  const pipelineMaximum = Math.max(...pipeline.map(item => Number(item.value || 0)), 1);

  const quickActions = [
    { title: 'Tomar pedido', description: 'Crear una venta de mostrador, WhatsApp o teléfono.', path: '/admin/tomar-pedido', module: 'Pedidos', icon: Plus, featured: true },
    { title: 'Gestionar pedidos', description: 'Cambiar estados, editar, imprimir y contactar clientes.', path: '/admin/pedidos', module: 'Pedidos', icon: ShoppingCart },
    { title: 'Productos', description: 'Administrar el catálogo visible en la tienda.', path: '/admin/productos', module: 'Productos', icon: Package },
    { title: 'Categorías', description: 'Organizar el menú y sus secciones.', path: '/admin/categorias', module: 'Categorias', icon: Tags },
    { title: 'Inventario', description: 'Controlar existencias y movimientos de los productos vendibles.', path: '/admin/inventario', module: 'Inventario', icon: Archive },
    { title: 'Reportes', description: 'Consultar ventas, costos, clientes y rentabilidad.', path: '/admin/reportes', module: 'Reportes', icon: BarChart3 },
    { title: 'Horarios', description: 'Definir atención, cierres y excepciones.', path: '/admin/horarios', module: 'Configuracion', icon: CalendarClock },
    { title: 'Anuncios', description: 'Publicar promociones en la tienda virtual.', path: '/admin/anuncios', module: 'Configuracion', icon: Megaphone },
    { title: 'Configuración', description: 'Pagos, domicilio, identidad y datos del negocio.', path: '/admin/configuracion', module: 'Configuracion', icon: Settings },
  ].filter(action => hasPermission(action.module, 'ver'));

  const readiness = [
    { label: 'Tienda recibiendo pedidos', ok: Boolean(schedule?.isOpen), value: schedule?.isOpen ? 'Abierta' : 'Cerrada' },
    { label: 'Catálogo disponible', ok: products.active > 0, value: `${products.active} activos` },
    { label: 'Métodos de pago', ok: settings.enabledPayments > 0, value: `${settings.enabledPayments || 0} habilitados` },
    { label: 'Productos destacados', ok: products.featured > 0, value: `${products.featured || 0} destacados` },
  ];

  return (
    <div className="ds-page admin-dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-content">
          <span className="dashboard-eyebrow">Centro de operaciones</span>
          <h1>Hola, {firstName}. Tu tienda está {schedule?.isOpen ? 'lista para vender' : 'fuera de horario'}.</h1>
          <p>
            Controla pedidos, catálogo, inventario y configuración de {settings.restaurantName || 'Distrito BG'} desde un solo lugar.
          </p>
          <div className="dashboard-hero-meta">
            <span className={`dashboard-store-status ${schedule?.isOpen ? 'open' : 'closed'}`}>
              <Store size={16} /> {schedule?.isOpen ? 'Tienda abierta' : 'Tienda cerrada'}
            </span>
            <span><Clock size={16} /> {scheduleText}</span>
            <span>{new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </div>
        <div className="dashboard-hero-actions">
          {hasPermission('Pedidos', 'ver') && (
            <button type="button" className="ds-btn ds-btn-primary ds-btn-lg" onClick={() => navigate('/admin/tomar-pedido')}>
              <Plus size={20} /> Nuevo pedido
            </button>
          )}
          <a className="ds-btn ds-btn-secondary ds-btn-lg" href={STOREFRONT_URL} target="_blank" rel="noreferrer">
            <ExternalLink size={19} /> Ver tienda virtual
          </a>
          <button type="button" className="ds-btn ds-btn-ghost" onClick={() => loadDashboard({ silent: true })} disabled={refreshing}>
            <RefreshCw size={18} className={refreshing ? 'dashboard-spin' : ''} /> {refreshing ? 'Actualizando' : 'Actualizar'}
          </button>
        </div>
      </section>

      {error && (
        <div className="dashboard-error" role="alert">
          <AlertTriangle size={20} />
          <span>{error} Se mantienen los últimos datos disponibles.</span>
          <button type="button" onClick={() => loadDashboard({ silent: true })}>Reintentar</button>
        </div>
      )}

      <section aria-labelledby="dashboard-metrics-title">
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-section-kicker">Hoy</span>
            <h2 id="dashboard-metrics-title">Pulso de la tienda</h2>
          </div>
          <span className="dashboard-updated">Datos operativos en tiempo real</span>
        </div>
        <div className="dashboard-metrics-grid">
          {metrics.map(({ label, value, note, icon: Icon, tone }) => (
            <article key={label} className="dashboard-metric-card">
              <div className={`dashboard-icon dashboard-icon-${tone}`}><Icon size={22} /></div>
              <div>
                <p>{label}</p>
                <strong>{value}</strong>
                <span>{note}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ─── TARJETA RENTABILIDAD */}
      <section className="ds-card dashboard-panel dashboard-profitability-card" aria-labelledby="profitability-title">
        <div className="ds-card-header">
          <div>
            <span className="dashboard-section-kicker">Finanzas</span>
            <h2 id="profitability-title" className="ds-card-title">Rentabilidad</h2>
          </div>
          <div className="dashboard-profitability-period-selector" role="group" aria-label="Período de rentabilidad">
            {PROFITABILITY_PERIODS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`dashboard-period-btn${profPeriod === value ? ' active' : ''}`}
                onClick={() => { setProfPeriod(value); }}
                disabled={profLoading}
                aria-pressed={profPeriod === value}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="ds-card-body">
          {profLoading && (
            <div className="dashboard-profitability-loading" aria-busy="true">
              <div className="ds-loader ds-loader-sm" />
              <span>Calculando rentabilidad…</span>
            </div>
          )}

          {!profLoading && profError && (
            <div className="dashboard-error dashboard-profitability-error" role="alert">
              <AlertTriangle size={16} />
              <span>{profError}</span>
              <button type="button" onClick={() => loadProfitability(profPeriod)}>Reintentar</button>
            </div>
          )}

          {!profLoading && !profError && profData && (() => {
            const fmt = (v) => money.format(Number(v || 0));
            const fmtPct = (v) => (v === null || v === undefined) ? '—' : `${Number(v).toFixed(1)} %`;
            const periodLabel = profData.periodLabel || 'Período';
            const startFmt = profData.periodStart
              ? new Date(profData.periodStart + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
              : '';
            const endFmt = profData.periodEnd
              ? new Date(profData.periodEnd + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
              : '';
            const marginTone = profData.grossMarginPct === null ? 'neutral'
              : profData.grossMarginPct >= 50 ? 'success'
              : profData.grossMarginPct >= 25 ? 'warning'
              : 'danger';

            return (
              <>
                <p className="dashboard-profitability-range">
                  {periodLabel} · {startFmt}–{endFmt}
                </p>

                {profData.cogsIsPartial && Number(profData.completedCount) > 0 && (
                  <div className="dashboard-profitability-banner dashboard-profitability-banner-warning">
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>Costos de productos parciales:</strong> Solo {profData.cogsCoveredOrders} de {profData.completedCount} pedidos completados ({profData.cogsMissingOrders} sin costo) tienen recetas con costo registradas. La ganancia bruta y el margen son <strong>provisionales</strong> y disminuirán al registrar los insumos de los productos restantes.
                    </div>
                  </div>
                )}

                <div className="dashboard-profitability-grid">
                  <article className="dashboard-profitability-item">
                    <span className="dashboard-profitability-label">Ventas de productos</span>
                    <strong className="dashboard-profitability-value">{fmt(profData.productSales)}</strong>
                    <small>
                      {profData.totalItemsCount || 0} ítems vendidos en {profData.completedCount} pedidos completados
                    </small>
                  </article>

                  <article className="dashboard-profitability-item">
                    <span className="dashboard-profitability-label">Cobro por domicilio</span>
                    <strong className="dashboard-profitability-value">{fmt(profData.deliveryFeeTotal)}</strong>
                    <small>
                      {Number(profData.deliveryCostTotal) > 0
                        ? `Costo mensajería: ${fmt(profData.deliveryCostTotal)} · Margen: ${fmt(profData.deliveryNetMargin)}`
                        : 'Sin costos de mensajería externa'}
                    </small>
                  </article>

                  <article className="dashboard-profitability-item">
                    <span className="dashboard-profitability-label">Ventas netas totales</span>
                    <strong className="dashboard-profitability-value">{fmt(profData.netSales)}</strong>
                    <small>
                      Productos ({fmt(profData.productSales)}) + Domicilios ({fmt(profData.deliveryFeeTotal)})
                    </small>
                  </article>

                  <article className="dashboard-profitability-item">
                    <span className="dashboard-profitability-label">
                      Costo de productos
                      {profData.cogsIsPartial && Number(profData.completedCount) > 0 && (
                        <span className="dashboard-profitability-badge">Parcial</span>
                      )}
                    </span>
                    {Number(profData.completedCount) === 0 ? (
                      <>
                        <strong className="dashboard-profitability-value">—</strong>
                        <small>Sin pedidos completados en el período</small>
                      </>
                    ) : (
                      <>
                        <strong className="dashboard-profitability-value">{fmt(profData.totalCogs)}</strong>
                        <small className={profData.cogsIsPartial ? 'dashboard-profitability-warning' : ''}>
                          {profData.cogsIsPartial
                            ? `Cobertura: ${profData.cogsCoveredOrders}/${profData.completedCount} pedidos (${profData.cogsCoveragePct}%)`
                            : `Cobertura completa: ${profData.cogsCoveredOrders}/${profData.completedCount} pedidos con receta`}
                        </small>
                      </>
                    )}
                  </article>

                  <article className={`dashboard-profitability-item dashboard-profitability-highlight dashboard-profitability-${marginTone}`}>
                    <span className="dashboard-profitability-label">
                      Ganancia bruta
                      {profData.cogsIsPartial && (
                        <span className="dashboard-profitability-badge">Provisional</span>
                      )}
                    </span>
                    <strong className="dashboard-profitability-value">{fmt(profData.grossProfit)}</strong>
                    <small>
                      Margen bruto: {fmtPct(profData.grossMarginPct)}
                      {profData.cogsIsPartial && ' (provisional)'}
                    </small>
                  </article>

                  <article className="dashboard-profitability-item">
                    <span className="dashboard-profitability-label">Gastos del período</span>
                    {profData.hasExpenses ? (
                      <>
                        <strong className="dashboard-profitability-value">{fmt(profData.expenses)}</strong>
                        <small>{profData.expensesCount} gasto{profData.expensesCount !== 1 ? 's' : ''} registrado{profData.expensesCount !== 1 ? 's' : ''}</small>
                      </>
                    ) : (
                      <>
                        <strong className="dashboard-profitability-value" style={{ fontSize: '1.05rem', color: 'var(--ds-text-secondary)' }}>Sin gastos registrados</strong>
                        <small>No hay gastos registrados en el módulo de Gastos para este período.</small>
                      </>
                    )}
                  </article>

                  <article className="dashboard-profitability-item">
                    <span className="dashboard-profitability-label">
                      Ganancia después de gastos
                      <span className="dashboard-profitability-badge">estimada</span>
                    </span>
                    <strong className="dashboard-profitability-value">{fmt(profData.profitAfterExpenses)}</strong>
                    <small>
                      Ganancia bruta - Gastos registrados
                      {(!profData.hasExpenses || profData.cogsIsPartial) && ' · Datos parciales'}
                    </small>
                  </article>
                </div>
              </>
            );
          })()}

          {!profLoading && !profError && !profData && (
            <div className="ds-empty-state dashboard-compact-empty">
              <TrendingUp size={32} className="ds-empty-state-icon" />
              <p className="ds-empty-state-text">Los indicadores de rentabilidad aparecerán aquí.</p>
            </div>
          )}
        </div>
      </section>

      <div className="dashboard-overview-grid">
        <section className="ds-card dashboard-panel" aria-labelledby="pipeline-title">
          <div className="ds-card-header">
            <div>
              <span className="dashboard-section-kicker">Operación en vivo</span>
              <h2 id="pipeline-title" className="ds-card-title">Flujo de pedidos</h2>
            </div>
            <button type="button" className="dashboard-text-action" onClick={() => navigate('/admin/pedidos')}>Ver pedidos <ArrowRight size={16} /></button>
          </div>
          <div className="ds-card-body dashboard-pipeline">
            {pipeline.map(({ label, value, icon: Icon, tone }) => (
              <div className="dashboard-pipeline-row" key={label}>
                <div className={`dashboard-pipeline-icon dashboard-icon-${tone}`}><Icon size={18} /></div>
                <div className="dashboard-pipeline-copy">
                  <div><span>{label}</span><strong>{value}</strong></div>
                  <div className="dashboard-progress" aria-label={`Progreso: ${value} de ${pipelineMaximum} pedidos`} title={`Progreso: ${value} de ${pipelineMaximum} pedidos`}>
                    <span style={{ '--dashboard-progress': `${Math.max(4, (Number(value || 0) / pipelineMaximum) * 100)}%` }} aria-hidden="true" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ds-card dashboard-panel" aria-labelledby="readiness-title">
          <div className="ds-card-header">
            <div>
              <span className="dashboard-section-kicker">Escaparate</span>
              <h2 id="readiness-title" className="ds-card-title">Estado de la tienda virtual</h2>
            </div>
            <Layers size={21} color="var(--ds-primary)" />
          </div>
          <div className="ds-card-body dashboard-readiness">
            {readiness.map(item => (
              <div key={item.label} className="dashboard-readiness-row">
                <span className={`dashboard-readiness-check ${item.ok ? 'ready' : 'pending'}`}>
                  {item.ok ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                </span>
                <div><strong>{item.label}</strong><span>{item.value}</span></div>
              </div>
            ))}
          </div>
          <div className="ds-card-footer">
            <a className="ds-btn ds-btn-secondary ds-btn-full" href={STOREFRONT_URL} target="_blank" rel="noreferrer">
              Revisar experiencia del cliente <ExternalLink size={17} />
            </a>
          </div>
        </section>
      </div>

      <div className="dashboard-overview-grid dashboard-orders-products-grid">
        <section className="ds-card dashboard-panel" aria-labelledby="recent-orders-title">
          <div className="ds-card-header">
            <div>
              <span className="dashboard-section-kicker">Actividad reciente</span>
              <h2 id="recent-orders-title" className="ds-card-title">Últimos pedidos</h2>
            </div>
            <span className="ds-badge ds-badge-neutral">{recentOrders.length}</span>
          </div>
          <div className="dashboard-recent-orders">
            {recentOrders.length === 0 ? (
              <div className="ds-empty-state">
                <ShoppingBag size={36} className="ds-empty-state-icon" />
                <p className="ds-empty-state-title">Aún no hay pedidos</p>
                <p className="ds-empty-state-text">El primer pedido de la tienda aparecerá aquí.</p>
              </div>
            ) : recentOrders.map(order => {
              const meta = orderStatusMeta(order.status, { deliveryType: order.delivery_type, hasDriver: Boolean(order.delivery_user_id), deliveryStatus: order.delivery_status });
              return (
                <button type="button" key={order.id} className="dashboard-order-row" onClick={() => navigate('/admin/pedidos')}>
                  <span className="dashboard-order-id">#{String(order.id).padStart(4, '0')}</span>
                  <span className="dashboard-order-customer">
                    <strong>{order.customer_name || 'Cliente sin nombre'}</strong>
                    <small>{order.source || 'Web'} · {relativeTime(order.created_at)}</small>
                  </span>
                  <span className={`ds-badge order-status-${meta.tone}`} title={meta.description}>{meta.label}</span>
                  <strong className="dashboard-order-total">{money.format(Number(order.total || 0))}</strong>
                  <ArrowRight size={17} className="dashboard-order-arrow" />
                </button>
              );
            })}
          </div>
        </section>

        <section className="ds-card dashboard-panel" aria-labelledby="top-products-title">
          <div className="ds-card-header">
            <div>
              <span className="dashboard-section-kicker">Demanda de hoy</span>
              <h2 id="top-products-title" className="ds-card-title">Productos más solicitados</h2>
            </div>
            <Star size={21} color="var(--ds-primary)" />
          </div>
          <div className="ds-card-body dashboard-top-products">
            {topProducts.length === 0 ? (
              <div className="ds-empty-state dashboard-compact-empty">
                <Package size={34} className="ds-empty-state-icon" />
                <p className="ds-empty-state-text">Los productos vendidos hoy aparecerán aquí.</p>
              </div>
            ) : topProducts.map((product, index) => (
              <div className="dashboard-product-row" key={product.title}>
                <span className="dashboard-product-position">{index + 1}</span>
                <div><strong>{product.title}</strong><span>{Number(product.quantity || 0)} unidades</span></div>
                <strong>{money.format(Number(product.total || 0))}</strong>
              </div>
            ))}
          </div>
          <div className="ds-card-footer">
            <button type="button" className="ds-btn ds-btn-secondary ds-btn-full" onClick={() => navigate('/admin/productos')}>
              Administrar catálogo <ArrowRight size={17} />
            </button>
          </div>
        </section>
      </div>

      <section aria-labelledby="quick-actions-title">
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-section-kicker">Herramientas</span>
            <h2 id="quick-actions-title">Gestiona toda la tienda</h2>
          </div>
          <span className="dashboard-updated">Solo ves las opciones permitidas para tu rol</span>
        </div>
        <div className="dashboard-actions-grid">
          {quickActions.map(({ title, description, path, icon: Icon, featured }) => (
            <button type="button" key={path} className={`dashboard-action-card ${featured ? 'featured' : ''}`} onClick={() => navigate(path)}>
              <span className="dashboard-action-icon"><Icon size={22} /></span>
              <span><strong>{title}</strong><small>{description}</small></span>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
