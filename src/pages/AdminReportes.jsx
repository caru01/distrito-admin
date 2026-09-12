import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, BarChart3, CalendarDays, CheckCircle, Download, Eye,
  Package, RefreshCw, ShoppingCart, TrendingDown, TrendingUp, Users,
  Wallet, X, Truck, Building2, Phone, Search, Filter, Clock, CheckCircle2,
  UserCheck, Shield, ChevronRight, Award, Sparkles, DollarSign, Percent,
  Layers, Coins, LayoutGrid, Crown, Heart, ExternalLink
} from 'lucide-react';

import { API_URL } from '../config/api';
import { formatCurrency, formatDateTime, formatNumber } from '../utils/formatters';

const COLORS = ['#D4A017', '#8B5CF6', '#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#06B6D4', '#EC4899'];
const EMPTY_REPORT = {
  kpis: {},
  trends: {},
  charts: { ventas: [], categorias: [], pagos: [], estados: [] },
  lists: {
    productos: [],
    rentabilidad: [],
    clientes: [],
    domicilios: [],
    domicilios_empresas: [],
    domicilios_mensajeros: [],
    domicilios_detalle: []
  },
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

// Componente nativo de Gráfica de Barras para ventas diarias (100% confiable, sin colapsos de librerías externas)
function DailySalesBarChart({ data = [] }) {
  const [hovered, setHovered] = useState(null);

  if (!data || data.length === 0) {
    return <div className="ds-empty-state">No hay ventas completadas en este periodo.</div>;
  }

  const maxVal = Math.max(...data.map((d) => Number(d.ventas || 0)), 1000);
  const ceiling = Math.ceil((maxVal * 1.2) / 10000) * 10000 || 10000;

  const chartHeight = 220;
  const chartWidth = 640;
  const paddingLeft = 52;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 38;
  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  const gridSteps = [0, 0.333, 0.666, 1];
  const barCount = data.length;
  const slotWidth = usableWidth / Math.max(barCount, 1);
  const barWidth = Math.min(Math.max(slotWidth * 0.58, 14), 48);

  return (
    <div style={{ width: '100%', position: 'relative', userSelect: 'none', overflow: 'hidden' }}>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        style={{ width: '100%', height: 'auto', maxHeight: '250px', overflow: 'visible', display: 'block' }}
      >
        <defs>
          <linearGradient id="barSalesGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4A017" stopOpacity="1" />
            <stop offset="100%" stopColor="#8A6508" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="barSalesHover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE58F" stopOpacity="1" />
            <stop offset="100%" stopColor="#D4A017" stopOpacity="0.95" />
          </linearGradient>
          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#D4A017" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Líneas guía horizontales y valores del eje Y */}
        {gridSteps.map((fraction) => {
          const val = Math.round(ceiling * fraction);
          const y = paddingTop + usableHeight - fraction * usableHeight;
          return (
            <g key={fraction}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={chartWidth - paddingRight}
                y2={y}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeDasharray={fraction > 0 ? '4 4' : 'none'}
              />
              <text
                x={paddingLeft - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--ds-text-muted, #777)"
                fontFamily="system-ui, sans-serif"
                fontWeight="500"
              >
                ${val >= 1000 ? `${Math.round(val / 1000)}k` : val}
              </text>
            </g>
          );
        })}

        {/* Barras verticales */}
        {data.map((item, index) => {
          const val = Number(item.ventas || 0);
          const barH = ceiling > 0 ? (val / ceiling) * usableHeight : 0;
          const x = paddingLeft + index * slotWidth + (slotWidth - barWidth) / 2;
          const y = paddingTop + usableHeight - barH;
          const isHovered = hovered?.index === index;

          const rawDate = String(item.date || '');
          const dateLabel = rawDate.length >= 10 ? rawDate.slice(5) : rawDate;
          const showLabel = barCount <= 15 || index % Math.ceil(barCount / 10) === 0 || index === barCount - 1;

          return (
            <g
              key={item.date || index}
              onMouseEnter={() => setHovered({ item, index, x: x + barWidth / 2, y })}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Área interactiva amplia */}
              <rect
                x={paddingLeft + index * slotWidth}
                y={paddingTop}
                width={slotWidth}
                height={usableHeight}
                fill="transparent"
              />

              {/* Base elíptica sombreada */}
              {val > 0 && (
                <ellipse
                  cx={x + barWidth / 2}
                  cy={paddingTop + usableHeight}
                  rx={barWidth / 2}
                  ry={Math.min(barWidth / 6, 5)}
                  fill="rgba(0, 0, 0, 0.4)"
                />
              )}

              {/* Barra cilíndrica de la gráfica */}
              <rect
                x={x}
                y={val > 0 ? y : paddingTop + usableHeight - 2}
                width={barWidth}
                height={val > 0 ? Math.max(barH, 4) : 2}
                rx={barWidth / 4}
                fill={isHovered ? 'url(#barSalesHover)' : 'url(#barSalesGold)'}
                filter={val > 0 ? 'url(#goldGlow)' : undefined}
                style={{
                  transition: 'all 0.2s ease',
                  opacity: hovered && !isHovered ? 0.5 : 1,
                  stroke: isHovered ? '#FFFFFF' : 'none',
                  strokeWidth: isHovered ? 1.5 : 0,
                }}
              />

              {/* Tapa elíptica superior (efecto cilindro 3D iluminado) */}
              {val > 0 && barH >= 8 && (
                <ellipse
                  cx={x + barWidth / 2}
                  cy={y}
                  rx={barWidth / 2}
                  ry={Math.min(barWidth / 5, 6)}
                  fill={isHovered ? '#FFFFFF' : '#FFE58F'}
                  stroke="rgba(255, 255, 255, 0.6)"
                  strokeWidth="0.8"
                  opacity={isHovered ? 1 : 0.88}
                />
              )}

              {/* Valor sobre la barra si hay espacio */}
              {val > 0 && barWidth >= 24 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 7}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="bold"
                  fill="var(--ds-primary, #D4A017)"
                >
                  ${Math.round(val / 1000)}k
                </text>
              )}

              {/* Etiqueta de fecha en eje X */}
              {showLabel && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fill={isHovered ? 'var(--ds-text-primary, #fff)' : 'var(--ds-text-muted, #888)'}
                  fontWeight={isHovered ? 'bold' : 'normal'}
                >
                  {dateLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip flotante interactivo */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: `${(hovered.x / chartWidth) * 100}%`,
            top: `${Math.max(5, (hovered.y / chartHeight) * 100 - 28)}%`,
            transform: 'translate(-50%, -100%)',
            background: '#151518',
            border: '1px solid var(--ds-primary, #D4A017)',
            borderRadius: '8px',
            padding: '7px 14px',
            pointerEvents: 'none',
            zIndex: 20,
            boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--ds-text-muted, #aaa)' }}>
            Fecha: <strong style={{ color: '#fff' }}>{hovered.item.date}</strong>
          </div>
          <div style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--ds-primary, #D4A017)', marginTop: '2px' }}>
            {formatCurrency(hovered.item.ventas)}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de Gráfica de Barras Horizontales con Desglose (100% nativo, alta visibilidad)
function DistributionBarCard({ title, data = [], currency = true }) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const maxItemVal = Math.max(...data.map((item) => Number(item.value || 0)), 1);

  return (
    <article className="ds-card report-distribution-card" style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="ds-card-title">{title}</h2>
        <span className="ds-badge ds-badge-neutral" style={{ fontSize: '11px', fontWeight: 'bold' }}>
          {currency ? formatCurrency(total) : `${formatNumber(total)} pedidos`}
        </span>
      </div>

      <div className="ds-card-body" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {data.length > 0 ? (
          <div style={{ display: 'grid', gap: '16px' }}>
            {data.map((item, index) => {
              const val = Number(item.value || 0);
              const pct = total ? Math.round((val / total) * 100) : 0;
              const barFillPct = maxItemVal > 0 ? Math.max(5, Math.round((val / maxItemVal) * 100)) : 0;
              const color = COLORS[index % COLORS.length];

              return (
                <div key={item.name || index} style={{ display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                      <i style={{ width: '9px', height: '9px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ds-text-primary)' }}>
                        {item.name}
                      </strong>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontWeight: '600', color: 'var(--ds-text-primary)' }}>
                        {currency ? formatCurrency(val) : formatNumber(val)}
                      </span>
                      <span
                        className="ds-badge"
                        style={{
                          fontSize: '11px',
                          padding: '1px 6px',
                          background: `${color}25`,
                          color: color,
                          borderColor: `${color}50`,
                          fontWeight: 'bold',
                        }}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso / gráfica de barra horizontal con gradiente */}
                  <div
                    style={{
                      height: '11px',
                      background: 'rgba(255, 255, 255, 0.07)',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: `${barFillPct}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                        borderRadius: '9999px',
                        transition: 'width 0.6s ease',
                        boxShadow: `0 0 10px ${color}60`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ds-empty-state report-empty-compact">No hay datos en este periodo.</div>
        )}
      </div>
    </article>
  );
}

// Gráfica de Anillo / Donut SVG para Tasa de Éxito de Pedidos
function ModernDonutProgress({ completed = 0, total = 0, rate = 0 }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(Number(rate) || 0, 0), 100);
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="donut-circle-wrap">
      <svg width="125" height="125" viewBox="0 0 125 125" style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="donutGradSuccess" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id="donutGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10B981" floodOpacity="0.4" />
          </filter>
        </defs>
        <circle
          cx="62.5"
          cy="62.5"
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="9"
        />
        <circle
          cx="62.5"
          cy="62.5"
          r={radius}
          fill="transparent"
          stroke="url(#donutGradSuccess)"
          strokeWidth="9"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          filter="url(#donutGlow)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="donut-center-info">
        <strong style={{ fontSize: '1.2rem', fontWeight: '800', color: '#10B981', lineHeight: '1.1' }}>
          {formatNumber(rate)}%
        </strong>
        <span style={{ fontSize: '9.5px', color: 'var(--ds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>
          Finalizados
        </span>
      </div>
    </div>
  );
}

// Gráfica de Cilindros 3D para Clientes Top que más piden
function TopClientsCylinderChart({ clients = [], onSelectClient, className = '' }) {
  const [hovered, setHovered] = useState(null);

  if (!clients || clients.length === 0) {
    return (
      <section className={`ds-card ${className}`}>
        <div className="ds-card-header">
          <div>
            <span className="ds-page-kicker">Fidelización de Clientes</span>
            <h2 className="ds-card-title">Clientes que Más Piden</h2>
          </div>
        </div>
        <div className="ds-empty-state">No hay pedidos de clientes registrados en este periodo.</div>
      </section>
    );
  }

  const top6 = clients.slice(0, 6);
  const maxOrders = Math.max(...top6.map((c) => Number(c.count || 0)), 1);

  const chartHeight = 210;
  const chartWidth = 640;
  const paddingLeft = 46;
  const paddingRight = 24;
  const paddingTop = 28;
  const paddingBottom = 40;
  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = chartHeight - paddingTop - paddingBottom;
  const slotWidth = usableWidth / top6.length;
  const cylinderWidth = Math.min(Math.max(slotWidth * 0.48, 26), 56);

  const clientGradients = [
    { from: '#8B5CF6', mid: '#C4B5FD', to: '#6D28D9', cap: '#DDD6FE', glow: '#8B5CF6' },
    { from: '#D4A017', mid: '#FFF3C4', to: '#8A6508', cap: '#FFE58F', glow: '#D4A017' },
    { from: '#3B82F6', mid: '#BFDBFE', to: '#1D4ED8', cap: '#93C5FD', glow: '#3B82F6' },
    { from: '#10B981', mid: '#A7F3D0', to: '#047857', cap: '#6EE7B7', glow: '#10B981' },
    { from: '#F59E0B', mid: '#FDE68A', to: '#B45309', cap: '#FCD34D', glow: '#F59E0B' },
    { from: '#EC4899', mid: '#FBCFE8', to: '#BE185D', cap: '#F472B6', glow: '#EC4899' },
  ];

  return (
    <section className={`ds-card report-clients-section ${className}`}>
      <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="ds-page-kicker">Fidelización & Frecuencia</span>
            <span className="ds-badge ds-badge-primary" style={{ fontSize: '10.5px' }}>
              <Crown size={12} style={{ marginRight: '4px' }} /> Top Clientes
            </span>
          </div>
          <h2 className="ds-card-title">Clientes que Más Piden (Cantidad de Pedidos)</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <small style={{ color: 'var(--ds-text-muted)', fontSize: '11px' }}>
            💡 Clic para ver historial
          </small>
        </div>
      </div>

      <div className="ds-card-body" style={{ padding: '16px' }}>
        {/* Gráfica de Cilindros 3D SVG */}
        <div className="client-cylinder-chart-wrap">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            style={{ width: '100%', height: 'auto', maxHeight: '230px', overflow: 'visible', display: 'block' }}
          >
            <defs>
              {top6.map((_, i) => {
                const colors = clientGradients[i % clientGradients.length];
                return (
                  <linearGradient key={`cylGrad-${i}`} id={`clientCylGrad-${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={colors.from} />
                    <stop offset="35%" stopColor={colors.mid} />
                    <stop offset="70%" stopColor={colors.to} />
                    <stop offset="100%" stopColor={colors.from} stopOpacity="0.85" />
                  </linearGradient>
                );
              })}
            </defs>

            {/* Líneas guía horizontales */}
            {[0, 0.5, 1].map((frac) => {
              const y = paddingTop + usableHeight - frac * usableHeight;
              const val = Math.round(maxOrders * frac);
              return (
                <g key={frac}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeDasharray={frac > 0 ? '4 4' : 'none'}
                  />
                  <text
                    x={paddingLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="var(--ds-text-muted, #777)"
                    fontFamily="system-ui, sans-serif"
                    fontWeight="500"
                  >
                    {val} ped.
                  </text>
                </g>
              );
            })}

            {/* Columnas Cilíndricas 3D */}
            {top6.map((client, index) => {
              const count = Number(client.count || 0);
              const barH = maxOrders > 0 ? (count / maxOrders) * usableHeight : 0;
              const x = paddingLeft + index * slotWidth + (slotWidth - cylinderWidth) / 2;
              const y = paddingTop + usableHeight - barH;
              const colors = clientGradients[index % clientGradients.length];
              const isHovered = hovered?.index === index;
              const capRy = Math.min(cylinderWidth / 5, 8);

              const rawName = String(client.name || 'Cliente');
              const shortName = rawName.split(' ')[0] || rawName;

              return (
                <g
                  key={`${client.phone}-${index}`}
                  onClick={() => onSelectClient && onSelectClient(client)}
                  onMouseEnter={() => setHovered({ client, index, x: x + cylinderWidth / 2, y })}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Zona interactiva */}
                  <rect
                    x={paddingLeft + index * slotWidth}
                    y={paddingTop - 15}
                    width={slotWidth}
                    height={usableHeight + 40}
                    fill="transparent"
                  />

                  {/* Base elíptica sombreada */}
                  <ellipse
                    cx={x + cylinderWidth / 2}
                    cy={paddingTop + usableHeight}
                    rx={cylinderWidth / 2}
                    ry={capRy}
                    fill="rgba(0, 0, 0, 0.5)"
                  />

                  {/* Cuerpo cilíndrico */}
                  {count > 0 && (
                    <rect
                      x={x}
                      y={y}
                      width={cylinderWidth}
                      height={Math.max(barH, 4)}
                      fill={`url(#clientCylGrad-${index})`}
                      rx={cylinderWidth / 5}
                      style={{
                        transition: 'all 0.25s ease',
                        filter: isHovered ? `drop-shadow(0 0 12px ${colors.glow})` : undefined,
                        opacity: hovered && !isHovered ? 0.6 : 1,
                      }}
                    />
                  )}

                  {/* Tapa elíptica superior (Efecto 3D cilíndrico) */}
                  {count > 0 && barH >= 6 && (
                    <ellipse
                      cx={x + cylinderWidth / 2}
                      cy={y}
                      rx={cylinderWidth / 2}
                      ry={capRy}
                      fill={colors.cap}
                      stroke="rgba(255, 255, 255, 0.6)"
                      strokeWidth="1"
                      style={{
                        transition: 'all 0.25s ease',
                        filter: isHovered ? `drop-shadow(0 0 8px ${colors.glow})` : undefined,
                      }}
                    />
                  )}

                  {/* Badge numérico arriba del cilindro */}
                  <g transform={`translate(${x + cylinderWidth / 2}, ${y - 12})`}>
                    <rect
                      x="-26"
                      y="-14"
                      width="52"
                      height="18"
                      rx="9"
                      fill={isHovered ? colors.from : 'rgba(26,26,26,0.9)'}
                      stroke={colors.from}
                      strokeWidth="1.2"
                    />
                    <text
                      textAnchor="middle"
                      y="-2"
                      fontSize="11"
                      fontWeight="bold"
                      fill={isHovered ? '#FFFFFF' : colors.mid}
                      fontFamily="system-ui, sans-serif"
                    >
                      {count} ped.
                    </text>
                  </g>

                  {/* Etiqueta de Nombre del cliente */}
                  <text
                    x={x + cylinderWidth / 2}
                    y={chartHeight - 16}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight={isHovered ? 'bold' : '600'}
                    fill={isHovered ? '#FFFFFF' : 'var(--ds-text-secondary, #ccc)'}
                  >
                    {shortName}
                  </text>
                  <text
                    x={x + cylinderWidth / 2}
                    y={chartHeight - 3}
                    textAnchor="middle"
                    fontSize="10"
                    fill="var(--ds-text-muted, #777)"
                  >
                    #{index + 1}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Tooltip flotante interactivo */}
          {hovered && (
            <div
              style={{
                position: 'absolute',
                left: `${(hovered.x / chartWidth) * 100}%`,
                top: `${Math.max(4, (hovered.y / chartHeight) * 100 - 30)}%`,
                transform: 'translate(-50%, -100%)',
                background: '#151518',
                border: '1px solid var(--ds-primary, #D4A017)',
                borderRadius: '10px',
                padding: '9px 14px',
                pointerEvents: 'none',
                zIndex: 25,
                boxShadow: '0 8px 26px rgba(0,0,0,0.8), 0 0 14px rgba(212,160,23,0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <Crown size={14} color="#D4A017" />
                <strong style={{ color: '#fff', fontSize: '13px' }}>{hovered.client.name}</strong>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--ds-text-muted)' }}>
                {hovered.client.phone || 'Sin teléfono'} · Fav: <span style={{ color: '#FFE58F' }}>{hovered.client.favoriteProduct}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px' }}>
                <span style={{ color: '#10B981', fontWeight: 'bold', fontSize: '12.5px' }}>
                  {formatCurrency(hovered.client.total)}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--ds-primary)' }}>
                  {hovered.client.count} pedidos (Click para ver)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tarjetas inferiores con Clic para ver historial de pedidos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '8px', marginTop: '14px' }}>
          {top6.map((client, idx) => {
            const colors = clientGradients[idx % clientGradients.length];
            return (
              <div
                key={`${client.phone || client.name}-${idx}`}
                className="client-rank-card"
                onClick={() => onSelectClient && onSelectClient(client)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    className="client-avatar-circle"
                    style={{
                      background: `linear-gradient(135deg, ${colors.from}30, ${colors.to}50)`,
                      color: colors.mid,
                      border: `1.5px solid ${colors.from}`,
                    }}
                  >
                    {idx === 0 ? <Crown size={18} color="#D4A017" /> : client.name?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: '13px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {client.name}
                    </strong>
                    <small style={{ color: 'var(--ds-text-muted)', fontSize: '11px', display: 'block' }}>
                      {client.phone || 'Sin teléfono'} · {client.favoriteProduct}
                    </small>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span className="ds-badge ds-badge-primary" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                    {client.count} ped.
                  </span>
                  <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: 'var(--ds-success)', marginTop: '2px' }}>
                    {formatCurrency(client.total)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Componente de Tarjeta Moderna con Glow y Acentos (Rentabilidad y Domicilios)
function ReportModernCard({
  label,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeType = 'neutral',
  accentColor = 'var(--ds-primary)',
  glowColor = 'rgba(212, 160, 23, 0.2)',
  iconBg = 'rgba(212, 160, 23, 0.12)',
  iconColor = 'var(--ds-primary)',
}) {
  return (
    <article
      className="report-modern-card"
      style={{
        '--card-accent': accentColor,
        '--card-glow': glowColor,
        '--icon-bg': iconBg,
        '--icon-color': iconColor,
        '--icon-shadow': glowColor,
      }}
    >
      <div className="report-card-top">
        <div className="report-card-icon-wrap">
          <Icon size={22} />
        </div>
        {badgeText && (
          <span className={`report-card-badge ds-badge ds-badge-${badgeType}`}>
            {badgeText}
          </span>
        )}
      </div>
      <div className="report-card-body">
        <span className="report-card-label">{label}</span>
        <div className="report-card-value">{value}</div>
      </div>
      {subtitle && (
        <div className="report-card-footer">
          {subtitle}
        </div>
      )}
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
  const [resumenSubTab, setResumenSubTab] = useState('todos');
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Estados de control para la pestaña de Domicilios
  const [domicilioSubTab, setDomicilioSubTab] = useState('todas');
  const [domicilioSearch, setDomicilioSearch] = useState('');
  const [domicilioCompanyFilter, setDomicilioCompanyFilter] = useState('all');
  const [domicilioStatusFilter, setDomicilioStatusFilter] = useState('all');

  // Estados de control para la pestaña de Rentabilidad
  const [rentabilidadFilter, setRentabilidadFilter] = useState('all');
  const [rentabilidadSearch, setRentabilidadSearch] = useState('');

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
        lists: {
          ...EMPTY_REPORT.lists,
          ...(data.lists || {}),
          domicilios_empresas: data.lists?.domicilios_empresas || data.lists?.domicilios || [],
          domicilios_mensajeros: data.lists?.domicilios_mensajeros || [],
          domicilios_detalle: data.lists?.domicilios_detalle || []
        },
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
      [], ['Domicilios por Empresa Aliada', 'Envíos', 'Cobrado Cliente', 'Costo Operador', 'Margen', 'Tiempo Promedio (mins)'],
      ...(report.lists.domicilios_empresas || []).map((e) => [e.name, e.count, e.revenue, e.cost, e.margin, e.avg_duration_mins || '—']),
      [], ['Domicilios por Mensajero', 'Empresa', 'Teléfono', 'Vehículo', 'Placa', 'Envíos', 'Cobrado', 'Costo', 'Margen', 'Tiempo Promedio (mins)'],
      ...(report.lists.domicilios_mensajeros || []).map((m) => [m.name, m.company, m.phone, m.vehicle_type, m.plate, m.count, m.revenue, m.cost, m.margin, m.avg_duration_mins || '—']),
      [], ['Detalle Envíos Individuales', 'Pedido #', 'Fecha', 'Cliente', 'Teléfono', 'Dirección', 'Empresa', 'Mensajero', 'Placa', 'Cobrado', 'Costo', 'Margen', 'Estado', 'Tiempo (mins)'],
      ...(report.lists.domicilios_detalle || []).map((d) => [d.id, d.date, d.customer_name, d.customer_phone, d.destination, d.company_name, d.driver_name, d.driver_plate, d.fee, d.cost, d.margin, d.status, d.duration_mins || '—']),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(safe).join(';')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-distrito-${from}-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Datos calculados para Gráfica de Rentabilidad y Domicilios
  const companyShareData = useMemo(() => {
    return (report.lists.domicilios_empresas || [])
      .filter((e) => Number(e.count || 0) > 0)
      .map((e) => ({
        name: e.name,
        value: Number(e.count || 0),
      }));
  }, [report.lists.domicilios_empresas]);

  const topRentabilidadData = useMemo(() => {
    return (report.lists.rentabilidad || [])
      .filter((item) => Number(item.profit || 0) > 0)
      .slice(0, 5)
      .map((item) => ({
        name: item.name,
        value: Math.round(Number(item.profit || 0)),
      }));
  }, [report.lists.rentabilidad]);

  const filteredRentabilidad = useMemo(() => {
    let list = report.lists.rentabilidad || [];
    if (rentabilidadFilter === 'productos') {
      list = list.filter((item) => !item.is_combo);
    } else if (rentabilidadFilter === 'combos') {
      list = list.filter((item) => item.is_combo);
    } else if (rentabilidadFilter === 'high') {
      list = list.filter((item) => Number(item.margin || 0) >= 40);
    } else if (rentabilidadFilter === 'medium') {
      list = list.filter((item) => Number(item.margin || 0) >= 20 && Number(item.margin || 0) < 40);
    } else if (rentabilidadFilter === 'low') {
      list = list.filter((item) => Number(item.margin || 0) < 20);
    }

    if (rentabilidadSearch.trim()) {
      const q = rentabilidadSearch.toLowerCase();
      list = list.filter((item) =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [report.lists.rentabilidad, rentabilidadFilter, rentabilidadSearch]);

  const rentabilidadCounts = useMemo(() => {
    const list = report.lists.rentabilidad || [];
    return {
      all: list.length,
      productos: list.filter((i) => !i.is_combo).length,
      combos: list.filter((i) => i.is_combo).length,
      high: list.filter((i) => Number(i.margin || 0) >= 40).length,
      medium: list.filter((i) => Number(i.margin || 0) >= 20 && Number(i.margin || 0) < 40).length,
      low: list.filter((i) => Number(i.margin || 0) < 20).length,
    };
  }, [report.lists.rentabilidad]);

  if (loading) return <div className="ds-loader-container"><div className="ds-loader" /><p>Cargando inteligencia de negocio…</p></div>;

  const kpis = [
    { label: 'Ventas confirmadas', value: formatCurrency(report.kpis.totalVentas), trend: report.trends.totalVentas, icon: Wallet },
    { label: 'Pedidos recibidos', value: formatNumber(report.kpis.pedidosRealizados), trend: report.trends.pedidosRealizados, icon: ShoppingCart },
    { label: 'Clientes atendidos', value: formatNumber(report.kpis.clientesAtendidos), trend: report.trends.clientesAtendidos, icon: Users },
    { label: 'Ticket promedio', value: formatCurrency(report.kpis.ticketPromedio), trend: report.trends.ticketPromedio, icon: BarChart3 },
    { label: 'Utilidad estimada', value: formatCurrency(report.kpis.utilidadBruta), trend: report.trends.utilidadBruta, icon: TrendingUp },
  ];
  const tabs = ['Resumen', 'Ventas', 'Productos', 'Rentabilidad', 'Clientes', 'Domicilios'];

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
          {/* CUADROS KPI MODERNOS CON BRILLO Y ACENTOS CROMÁTICOS */}
          <div className="report-modern-grid">
            <ReportModernCard
              label="Ventas Confirmadas"
              value={formatCurrency(report.kpis.totalVentas || 0)}
              icon={Wallet}
              accentColor="var(--ds-primary)"
              glowColor="rgba(212, 160, 23, 0.25)"
              iconBg="rgba(212, 160, 23, 0.12)"
              iconColor="var(--ds-primary)"
              badgeText="Ingresos"
              badgeType="primary"
              subtitle={
                <span>
                  vs. anterior <TrendBadge value={report.trends.totalVentas} />
                </span>
              }
            />

            <ReportModernCard
              label="Pedidos Recibidos"
              value={formatNumber(report.kpis.pedidosRealizados || 0)}
              icon={ShoppingCart}
              accentColor="#3b82f6"
              glowColor="rgba(59, 130, 246, 0.25)"
              iconBg="rgba(59, 130, 246, 0.12)"
              iconColor="#3b82f6"
              badgeText="Órdenes"
              badgeType="info"
              subtitle={
                <span>
                  vs. anterior <TrendBadge value={report.trends.pedidosRealizados} />
                </span>
              }
            />

            <ReportModernCard
              label="Clientes Atendidos"
              value={formatNumber(report.kpis.clientesAtendidos || 0)}
              icon={Users}
              accentColor="#8b5cf6"
              glowColor="rgba(139, 92, 246, 0.25)"
              iconBg="rgba(139, 92, 246, 0.12)"
              iconColor="#8b5cf6"
              badgeText="Fidelización"
              badgeType="neutral"
              subtitle={
                <span>
                  vs. anterior <TrendBadge value={report.trends.clientesAtendidos} />
                </span>
              }
            />

            <ReportModernCard
              label="Ticket Promedio"
              value={formatCurrency(report.kpis.ticketPromedio || 0)}
              icon={Coins}
              accentColor="#06b6d4"
              glowColor="rgba(6, 182, 212, 0.25)"
              iconBg="rgba(6, 182, 212, 0.12)"
              iconColor="#06b6d4"
              badgeText="Consumo"
              badgeType="info"
              subtitle={
                <span>
                  vs. anterior <TrendBadge value={report.trends.ticketPromedio} />
                </span>
              }
            />

            <ReportModernCard
              label="Utilidad Bruta Estimada"
              value={formatCurrency(report.kpis.utilidadBruta || 0)}
              icon={TrendingUp}
              accentColor="#10b981"
              glowColor="rgba(16, 185, 129, 0.25)"
              iconBg="rgba(16, 185, 129, 0.12)"
              iconColor="#10b981"
              badgeText="Ganancia"
              badgeType="success"
              subtitle={
                <span>
                  Margen: <strong style={{ color: '#10b981' }}>{formatNumber(report.kpis.margenUtilidad || 0)}%</strong> sobre ventas
                </span>
              }
            />
          </div>

          {/* SELECTOR DE BOTONES PILLS INTERACTIVOS CON CONTEO (RESUMEN) */}
          {activeTab === 'Resumen' && (
            <div className="report-pills-bar">
              <div className="report-pills-group">
                <button
                  type="button"
                  className={`report-pill-btn ${resumenSubTab === 'todos' ? 'active' : ''}`}
                  onClick={() => setResumenSubTab('todos')}
                >
                  <LayoutGrid size={15} /> Todo el Resumen
                </button>
                <button
                  type="button"
                  className={`report-pill-btn ${resumenSubTab === 'ventas' ? 'active' : ''}`}
                  onClick={() => setResumenSubTab('ventas')}
                >
                  <BarChart3 size={15} /> Ventas Diarias
                </button>
                <button
                  type="button"
                  className={`report-pill-btn ${resumenSubTab === 'clientes' ? 'active' : ''}`}
                  onClick={() => setResumenSubTab('clientes')}
                >
                  <Crown size={15} /> Clientes que Más Piden
                  <span className="report-pill-badge">{(report.lists.clientes || []).length}</span>
                </button>
                <button
                  type="button"
                  className={`report-pill-btn ${resumenSubTab === 'operaciones' ? 'active' : ''}`}
                  onClick={() => setResumenSubTab('operaciones')}
                >
                  <Truck size={15} /> Operaciones & Logística
                  {((report.alerts?.out_of_stock || 0) + (report.alerts?.low_stock || 0)) > 0 && (
                    <span className="report-pill-badge" style={{ background: 'rgba(245,158,11,0.25)', color: '#F59E0B' }}>
                      {(report.alerts?.out_of_stock || 0) + (report.alerts?.low_stock || 0)} alertas
                    </span>
                  )}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="ds-badge ds-badge-neutral" style={{ fontSize: '11px' }}>
                  {report.meta.days || 0} días analizados
                </span>
              </div>
            </div>
          )}

          {/* GRÁFICAS DE VENTAS Y TOP CLIENTES EN CUADRÍCULA EJECUTIVA (APROVECHAMIENTO TOTAL DE ESPACIO) */}
          {activeTab === 'Resumen' && (
            <div className={resumenSubTab === 'todos' ? 'report-charts-grid' : ''} style={{ marginBottom: '22px' }}>
              {(resumenSubTab === 'todos' || resumenSubTab === 'ventas') && (
                <section className="ds-card report-sales-card report-chart-card">
                  <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span className="ds-page-kicker">Ventas completadas</span>
                      <h2 className="ds-card-title">Comportamiento Diario de Ventas</h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="ds-badge ds-badge-primary" style={{ fontSize: '11.5px', fontWeight: 'bold' }}>
                        {formatCurrency(report.kpis.totalVentas)} Facturado
                      </span>
                    </div>
                  </div>
                  <div className="ds-card-body report-chart" style={{ padding: '16px', minHeight: '260px', height: 'auto' }}>
                    <DailySalesBarChart data={report.charts.ventas} />
                  </div>
                </section>
              )}

              {(resumenSubTab === 'todos' || resumenSubTab === 'clientes') && (
                <TopClientsCylinderChart
                  clients={report.lists.clientes}
                  onSelectClient={setSelectedClient}
                  className="report-chart-card"
                />
              )}
            </div>
          )}

          {activeTab === 'Ventas' && (
            <section className="ds-card report-sales-card" style={{ marginBottom: '20px' }}>
              <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span className="ds-page-kicker">Ventas completadas</span>
                  <h2 className="ds-card-title">Comportamiento Diario de Ventas</h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="ds-badge ds-badge-primary" style={{ fontSize: '12px' }}>
                    {formatCurrency(report.kpis.totalVentas)} Facturado
                  </span>
                </div>
              </div>
              <div className="ds-card-body report-chart" style={{ padding: '16px', minHeight: '300px' }}>
                <DailySalesBarChart data={report.charts.ventas} />
              </div>
            </section>
          )}
        </>
      )}

      {activeTab === 'Resumen' && (resumenSubTab === 'todos' || resumenSubTab === 'operaciones' || resumenSubTab === 'ventas') && (
        <div className="report-summary-grid">
          {/* SALUD FINANCIERA */}
          <article className="ds-card" style={{ borderTop: '3px solid #10b981' }}>
            <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="ds-page-kicker" style={{ color: '#10b981' }}>Balance del Periodo</span>
                <h2 className="ds-card-title">Salud Financiera</h2>
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'grid', placeItems: 'center' }}>
                <Wallet size={20} />
              </div>
            </div>
            <div className="ds-card-body report-finance-list">
              <div><span>Ventas Facturadas</span><strong style={{ color: 'var(--ds-text-primary)' }}>{formatCurrency(report.kpis.totalVentas)}</strong></div>
              <div><span>Insumos / Compras</span><strong className="negative">− {formatCurrency(report.kpis.totalCompras)}</strong></div>
              <div><span>Fletes Operadores</span><strong className="negative">− {formatCurrency(report.kpis.costoDomiciliosExternos)}</strong></div>
              <div className="total" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>Utilidad Estimada</span>
                <strong style={{ color: '#10b981', fontSize: '1.25rem' }}>{formatCurrency(report.kpis.utilidadBruta)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Margen sobre Ventas</span>
                <span className="ds-badge ds-badge-success">{formatNumber(report.kpis.margenUtilidad)}%</span>
              </div>
            </div>
          </article>

          {/* RESULTADO DE PEDIDOS CON ANILLO DONUT DE FINALIZACIÓN */}
          <article className="ds-card" style={{ borderTop: '3px solid #3b82f6' }}>
            <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="ds-page-kicker" style={{ color: '#3b82f6' }}>Eficiencia Operativa</span>
                <h2 className="ds-card-title">Resultado de Pedidos</h2>
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(59,130,246,0.12)', color: '#3b82f6', display: 'grid', placeItems: 'center' }}>
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div className="ds-card-body" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {/* Donut SVG con porcentaje de finalización */}
              <ModernDonutProgress
                completed={report.kpis.pedidosCompletados}
                total={report.kpis.pedidosRealizados}
                rate={report.kpis.tasaFinalizacion}
              />
              <div style={{ flex: 1, minWidth: '140px', display: 'grid', gap: '8px' }}>
                {report.charts.estados.map((item) => (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--ds-text-secondary)' }}>
                    <span>{item.name}</span>
                    <strong style={{ color: 'var(--ds-text-primary)' }}>{item.value}</strong>
                  </div>
                ))}
                {!report.charts.estados.length && <div className="ds-empty-state report-empty-compact">Sin pedidos en el periodo.</div>}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Total Órdenes</span>
                  <strong>{formatNumber(report.kpis.pedidosRealizados)}</strong>
                </div>
              </div>
            </div>
          </article>

          {/* ALERTAS OPERATIVAS */}
          <article className="ds-card report-alert-card" style={{ borderTop: '3px solid #f59e0b' }}>
            <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="ds-page-kicker" style={{ color: '#f59e0b' }}>Inventario en Riesgo</span>
                <h2 className="ds-card-title">Alertas Operativas</h2>
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', display: 'grid', placeItems: 'center' }}>
                <AlertTriangle size={20} />
              </div>
            </div>
            <div className="ds-card-body">
              <button onClick={() => navigate('/admin/inventario')} style={{ cursor: 'pointer', transition: 'var(--ds-transition)' }}>
                <Package size={20} color="#ef4444" />
                <span>
                  <strong style={{ color: '#ef4444' }}>{report.alerts.out_of_stock || 0} agotados</strong>
                  <small>Insumos o productos en cero</small>
                </span>
                <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--ds-text-muted)' }} />
              </button>
              <button onClick={() => navigate('/admin/inventario')} style={{ cursor: 'pointer', transition: 'var(--ds-transition)' }}>
                <AlertTriangle size={20} color="#f59e0b" />
                <span>
                  <strong style={{ color: '#f59e0b' }}>{report.alerts.low_stock || 0} con stock bajo</strong>
                  <small>Requieren compra o reposición</small>
                </span>
                <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--ds-text-muted)' }} />
              </button>
            </div>
          </article>

          {/* LOGÍSTICA EXTERNA */}
          <article className="ds-card" style={{ borderTop: '3px solid var(--ds-primary)' }}>
            <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="ds-page-kicker" style={{ color: 'var(--ds-primary)' }}>Despachos a Domicilio</span>
                <h2 className="ds-card-title">Logística Externa</h2>
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(212,160,23,0.12)', color: 'var(--ds-primary)', display: 'grid', placeItems: 'center' }}>
                <Truck size={20} />
              </div>
            </div>
            <div className="ds-card-body report-finance-list">
              <div><span>Entregas Completadas</span><strong style={{ color: 'var(--ds-text-primary)' }}>{formatNumber(report.kpis.domiciliosExternos)}</strong></div>
              <div><span>Cobrado por Domicilio</span><strong style={{ color: 'var(--ds-success)' }}>{formatCurrency(report.kpis.ingresoDomiciliosExternos)}</strong></div>
              <div><span>Pagado a Operadores</span><strong className="negative">− {formatCurrency(report.kpis.costoDomiciliosExternos)}</strong></div>
              <div className="total" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                <span>Margen Logístico</span>
                <strong style={{ color: (report.kpis.margenLogisticoExterno || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                  {formatCurrency(report.kpis.margenLogisticoExterno)}
                </strong>
              </div>
              <button
                className="ds-btn ds-btn-secondary ds-btn-sm"
                onClick={() => setActiveTab('Domicilios')}
                style={{ width: '100%', marginTop: '6px', justifyContent: 'center' }}
              >
                Ver Reporte de Domicilios Completo <ChevronRight size={14} />
              </button>
            </div>
          </article>
        </div>
      )}

      {activeTab === 'Ventas' && (
        <div className="report-distribution-grid" style={{ marginTop: '20px' }}>
          <DistributionBarCard title="Ventas por categoría" data={report.charts.categorias} currency={true} />
          <DistributionBarCard title="Métodos de pago" data={report.charts.pagos} currency={true} />
          <DistributionBarCard title="Pedidos por estado" data={report.charts.estados} currency={false} />
        </div>
      )}

      {activeTab === 'Productos' && (
        <section className="ds-card">
          <div className="ds-card-header"><div><span className="ds-page-kicker">Ranking</span><h2 className="ds-card-title">Productos más vendidos</h2></div><span className="ds-badge ds-badge-primary">{report.lists.productos.length} resultados</span></div>
          <div className="report-ranking-list">
            {report.lists.productos.map((product, index) => <article key={`${product.name}-${index}`}><span className="report-rank">{index + 1}</span><div><strong>{product.name}</strong><small>{product.category || 'Sin categoría'} · {formatNumber(product.quantity)} unidades</small></div><strong>{formatCurrency(product.total)}</strong></article>)}
            {!report.lists.productos.length && <div className="ds-empty-state">No hay productos vendidos en el periodo.</div>}
          </div>
        </section>
      )}

      {activeTab === 'Rentabilidad' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* CUADROS KPI MODERNOS DE RENTABILIDAD */}
          <div className="report-modern-grid">
            <ReportModernCard
              label="Utilidad Bruta Total"
              value={formatCurrency(report.kpis.utilidadBruta || 0)}
              icon={DollarSign}
              accentColor="#10b981"
              glowColor="rgba(16, 185, 129, 0.25)"
              iconBg="rgba(16, 185, 129, 0.12)"
              iconColor="#10b981"
              badgeText="Rentabilidad"
              badgeType="success"
              subtitle={
                <span>
                  Margen promedio:{' '}
                  <strong style={{ color: '#10b981' }}>{formatNumber(report.kpis.margenUtilidad || 0)}%</strong> sobre ventas
                </span>
              }
            />

            <ReportModernCard
              label="Costo Mercancía (COGS)"
              value={formatCurrency(report.kpis.costoMercanciaVendida || 0)}
              icon={Layers}
              accentColor="#f59e0b"
              glowColor="rgba(245, 158, 11, 0.25)"
              iconBg="rgba(245, 158, 11, 0.12)"
              iconColor="#f59e0b"
              badgeText="Insumos"
              badgeType="warning"
              subtitle={
                <span>
                  Compras registradas: <strong>{formatCurrency(report.kpis.totalCompras || 0)}</strong>
                </span>
              }
            />

            <ReportModernCard
              label="Producto Más Rentable"
              value={report.kpis.productoMasRentable || '—'}
              icon={Award}
              accentColor="var(--ds-primary)"
              glowColor="rgba(212, 160, 23, 0.25)"
              iconBg="rgba(212, 160, 23, 0.12)"
              iconColor="var(--ds-primary)"
              badgeText="Estrella"
              badgeType="primary"
              subtitle={<span>Mayor ganancia unitaria y total</span>}
            />

            <ReportModernCard
              label="Combo Más Rentable"
              value={report.kpis.comboMasRentable || '—'}
              icon={Sparkles}
              accentColor="#3b82f6"
              glowColor="rgba(59, 130, 246, 0.25)"
              iconBg="rgba(59, 130, 246, 0.12)"
              iconColor="#3b82f6"
              badgeText="Top Combo"
              badgeType="info"
              subtitle={<span>Mejor rendimiento en combos</span>}
            />

            <ReportModernCard
              label="Oportunidad de Ajuste"
              value={report.kpis.productoMenosRentable || report.kpis.comboMenosRentable || '—'}
              icon={AlertTriangle}
              accentColor="#ef4444"
              glowColor="rgba(239, 68, 68, 0.25)"
              iconBg="rgba(239, 68, 68, 0.12)"
              iconColor="#ef4444"
              badgeText="Revisar"
              badgeType="danger"
              subtitle={<span>Sugerencia: revisar receta o PVP</span>}
            />
          </div>

          {/* GRÁFICA VISUAL DE TOP PRODUCTOS POR GANANCIA */}
          {topRentabilidadData.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              <DistributionBarCard
                title="Top 5 Items con Mayor Ganancia Neta ($)"
                data={topRentabilidadData}
                currency={true}
              />
              <article className="ds-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'grid', placeItems: 'center' }}>
                    <TrendingUp size={22} />
                  </div>
                  <div>
                    <span className="ds-eyebrow" style={{ color: '#10b981' }}>Inteligencia de Precios</span>
                    <strong style={{ fontSize: '15px', display: 'block', color: 'var(--ds-text-primary)' }}>Estrategia de Menú</strong>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', lineHeight: '1.5', margin: 0 }}>
                  Los items con margen superior al <strong>40%</strong> son el motor de rentabilidad de tu cocina. Promociónalos en combos destacados y banners de la tienda pública.
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                  <span className="ds-badge ds-badge-success">≥ 40% Excelente</span>
                  <span className="ds-badge ds-badge-warning">20% - 39% Saludable</span>
                  <span className="ds-badge ds-badge-danger">&lt; 20% Ajustar Costos</span>
                </div>
              </article>
            </div>
          )}

          {/* SELECTOR DE BOTONES PILLS Y BUSCADOR DE RENTABILIDAD */}
          <div className="report-pills-bar">
            <div className="report-pills-group">
              <button
                type="button"
                className={`report-pill-btn ${rentabilidadFilter === 'all' ? 'active' : ''}`}
                onClick={() => setRentabilidadFilter('all')}
              >
                <LayoutGrid size={14} /> Todos
                <span className="report-pill-badge">{rentabilidadCounts.all}</span>
              </button>
              <button
                type="button"
                className={`report-pill-btn ${rentabilidadFilter === 'productos' ? 'active' : ''}`}
                onClick={() => setRentabilidadFilter('productos')}
              >
                <Package size={14} /> Solo Productos
                <span className="report-pill-badge">{rentabilidadCounts.productos}</span>
              </button>
              <button
                type="button"
                className={`report-pill-btn ${rentabilidadFilter === 'combos' ? 'active' : ''}`}
                onClick={() => setRentabilidadFilter('combos')}
              >
                <Sparkles size={14} /> Solo Combos
                <span className="report-pill-badge">{rentabilidadCounts.combos}</span>
              </button>
              <button
                type="button"
                className={`report-pill-btn ${rentabilidadFilter === 'high' ? 'active' : ''}`}
                onClick={() => setRentabilidadFilter('high')}
              >
                <TrendingUp size={14} /> Alto Margen (≥40%)
                <span className="report-pill-badge">{rentabilidadCounts.high}</span>
              </button>
              <button
                type="button"
                className={`report-pill-btn ${rentabilidadFilter === 'medium' ? 'active' : ''}`}
                onClick={() => setRentabilidadFilter('medium')}
              >
                Margen Regular (20-39%)
                <span className="report-pill-badge">{rentabilidadCounts.medium}</span>
              </button>
              <button
                type="button"
                className={`report-pill-btn ${rentabilidadFilter === 'low' ? 'active' : ''}`}
                onClick={() => setRentabilidadFilter('low')}
              >
                <AlertTriangle size={14} /> Crítico (&lt;20%)
                <span className="report-pill-badge">{rentabilidadCounts.low}</span>
              </button>
            </div>

            <div className="ds-search" style={{ width: '260px' }}>
              <Search size={15} className="ds-search-icon" />
              <input
                type="text"
                className="ds-search-input ds-input"
                style={{ height: '34px', fontSize: '12px' }}
                placeholder="Buscar item por nombre o categoría..."
                value={rentabilidadSearch}
                onChange={(e) => setRentabilidadSearch(e.target.value)}
              />
              {rentabilidadSearch && (
                <button
                  type="button"
                  onClick={() => setRentabilidadSearch('')}
                  style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', color: 'var(--ds-text-muted)', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* TABLA DE RENTABILIDAD DETALLADA */}
          <section className="ds-card">
            <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="ds-page-kicker">Margen Real Unitario & Total</span>
                <h2 className="ds-card-title">Rentabilidad por Producto y Combo</h2>
              </div>
              <span className="ds-badge ds-badge-primary">
                {filteredRentabilidad.length} de {(report.lists.rentabilidad || []).length} analizados
              </span>
            </div>

            <div className="ds-table-container">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Item / Presentación</th>
                    <th>Tipo</th>
                    <th>Unids Vendidas</th>
                    <th>Facturación Bruta</th>
                    <th>Costo COGS</th>
                    <th>Ganancia Bruta</th>
                    <th style={{ minWidth: '150px' }}>Margen Comercial %</th>
                  </tr>
                </thead>
                <tbody>
                  {!filteredRentabilidad.length ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '36px' }}>
                        No se encontraron productos o combos con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredRentabilidad.map((item, idx) => {
                      const isCombo = Boolean(item.is_combo);
                      const marginVal = Number(item.margin || 0);
                      const marginColor = marginVal >= 40 ? '#10B981' : marginVal >= 20 ? '#F59E0B' : '#EF4444';
                      const marginClamped = Math.max(0, Math.min(100, marginVal));

                      return (
                        <tr key={`${item.name}-${idx}`}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: isCombo ? 'rgba(59,130,246,0.12)' : 'rgba(212,160,23,0.12)',
                                  color: isCombo ? '#3B82F6' : '#D4A017',
                                  display: 'grid',
                                  placeItems: 'center',
                                  flexShrink: 0
                                }}
                              >
                                {isCombo ? <Sparkles size={16} /> : <Package size={16} />}
                              </div>
                              <div>
                                <strong style={{ fontSize: '13px', display: 'block' }}>{item.name}</strong>
                                <small style={{ color: 'var(--ds-text-muted)', fontSize: '11px' }}>{item.category || 'General'}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`ds-badge ${isCombo ? 'ds-badge-info' : 'ds-badge-neutral'}`} style={{ fontSize: '11px' }}>
                              {isCombo ? 'Combo' : 'Individual'}
                            </span>
                          </td>
                          <td>
                            <strong>{formatNumber(item.quantity)}</strong> unids
                          </td>
                          <td style={{ fontWeight: '600', color: 'var(--ds-text-primary)' }}>
                            {formatCurrency(item.revenue)}
                          </td>
                          <td style={{ color: 'var(--ds-text-muted)' }}>
                            {formatCurrency(item.cogs)}
                          </td>
                          <td style={{ color: item.profit >= 0 ? '#10B981' : '#EF4444', fontWeight: '700', fontSize: '13.5px' }}>
                            {formatCurrency(item.profit)}
                          </td>
                          <td>
                            <div className="margin-progress-bar-wrap">
                              <div className="margin-progress-track">
                                <div
                                  className="margin-progress-fill"
                                  style={{
                                    width: `${marginClamped}%`,
                                    background: marginColor,
                                    boxShadow: `0 0 8px ${marginColor}80`
                                  }}
                                />
                              </div>
                              <span
                                className={`ds-badge ${marginVal >= 40 ? 'ds-badge-success' : marginVal >= 20 ? 'ds-badge-warning' : 'ds-badge-danger'}`}
                                style={{ fontSize: '11px', fontWeight: 'bold', minWidth: '46px', textAlign: 'center' }}
                              >
                                {marginVal}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
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

      {activeTab === 'Domicilios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* CUADROS KPI MODERNOS DE LOGÍSTICA */}
          <div className="report-modern-grid">
            <ReportModernCard
              label="Entregas Realizadas"
              value={formatNumber(report.kpis.domiciliosExternos || 0)}
              icon={Truck}
              accentColor="var(--ds-primary)"
              glowColor="rgba(212, 160, 23, 0.25)"
              iconBg="rgba(212, 160, 23, 0.12)"
              iconColor="var(--ds-primary)"
              badgeText="Despachados"
              badgeType="primary"
              subtitle={<span>Envíos finalizados en el periodo</span>}
            />

            <ReportModernCard
              label="Fletes Cobrados (Cliente)"
              value={formatCurrency(report.kpis.ingresoDomiciliosExternos || 0)}
              icon={Coins}
              accentColor="#10b981"
              glowColor="rgba(16, 185, 129, 0.25)"
              iconBg="rgba(16, 185, 129, 0.12)"
              iconColor="#10b981"
              badgeText="Recaudado"
              badgeType="success"
              subtitle={<span>Ingreso bruto por domicilios</span>}
            />

            <ReportModernCard
              label="Liquidado a Operadores"
              value={formatCurrency(report.kpis.costoDomiciliosExternos || 0)}
              icon={Wallet}
              accentColor="#ef4444"
              glowColor="rgba(239, 68, 68, 0.25)"
              iconBg="rgba(239, 68, 68, 0.12)"
              iconColor="#ef4444"
              badgeText="Costo Envíos"
              badgeType="danger"
              subtitle={<span>Pagado a empresas y domiciliarios</span>}
            />

            <ReportModernCard
              label="Margen Logístico Neto"
              value={formatCurrency(report.kpis.margenLogisticoExterno || 0)}
              icon={TrendingUp}
              accentColor={(report.kpis.margenLogisticoExterno || 0) >= 0 ? '#10b981' : '#ef4444'}
              glowColor={(report.kpis.margenLogisticoExterno || 0) >= 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}
              iconBg={(report.kpis.margenLogisticoExterno || 0) >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'}
              iconColor={(report.kpis.margenLogisticoExterno || 0) >= 0 ? '#10b981' : '#ef4444'}
              badgeText={
                report.kpis.ingresoDomiciliosExternos > 0
                  ? `${Math.round(((report.kpis.margenLogisticoExterno || 0) / report.kpis.ingresoDomiciliosExternos) * 100)}% Retorno`
                  : '0%'
              }
              badgeType={(report.kpis.margenLogisticoExterno || 0) >= 0 ? 'success' : 'danger'}
              subtitle={<span>Cobrado menos pagado por fletes</span>}
            />

            <ReportModernCard
              label="Red de Operadores"
              value={`${(report.lists.domicilios_empresas || []).length} Empresas`}
              icon={Building2}
              accentColor="#3b82f6"
              glowColor="rgba(59, 130, 246, 0.25)"
              iconBg="rgba(59, 130, 246, 0.12)"
              iconColor="#3b82f6"
              badgeText="Aliados"
              badgeType="info"
              subtitle={<span>{(report.lists.domicilios_mensajeros || []).length} mensajeros registrados</span>}
            />
          </div>

          {/* GRÁFICA VISUAL DE REPARTO POR EMPRESA ALIADA */}
          {companyShareData.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              <DistributionBarCard
                title="Cuota de Envíos por Empresa Aliada"
                data={companyShareData}
                currency={false}
              />
              <article className="ds-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(212,160,23,0.12)', color: 'var(--ds-primary)', display: 'grid', placeItems: 'center' }}>
                    <Truck size={22} />
                  </div>
                  <div>
                    <span className="ds-eyebrow" style={{ color: 'var(--ds-primary)' }}>Control de Despachos</span>
                    <strong style={{ fontSize: '15px', display: 'block', color: 'var(--ds-text-primary)' }}>Reparto Logístico</strong>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', lineHeight: '1.5', margin: 0 }}>
                  Monitorea el balance de carga entre tus proveedores de envíos. Puedes abrir la configuración para dar de alta nuevas empresas o vincular mensajeros.
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                  <span className="ds-badge ds-badge-primary">{(report.lists.domicilios_empresas || []).length} Empresas</span>
                  <span className="ds-badge ds-badge-neutral">{(report.lists.domicilios_mensajeros || []).length} Mensajeros</span>
                  <span className="ds-badge ds-badge-success">{(report.lists.domicilios_detalle || []).length} Envíos</span>
                </div>
              </article>
            </div>
          )}

          {/* SELECTOR DE SUB-PESTAÑAS CON BOTONES PILLS MODERNOS */}
          <div className="report-pills-bar">
            <div className="report-pills-group">
              <button
                type="button"
                className={`report-pill-btn ${domicilioSubTab === 'todas' ? 'active' : ''}`}
                onClick={() => setDomicilioSubTab('todas')}
              >
                <LayoutGrid size={15} /> Consolidado Completo
              </button>
              <button
                type="button"
                className={`report-pill-btn ${domicilioSubTab === 'empresas' ? 'active' : ''}`}
                onClick={() => setDomicilioSubTab('empresas')}
              >
                <Building2 size={15} /> Por Empresa Aliada
                <span className="report-pill-badge">{(report.lists.domicilios_empresas || []).length}</span>
              </button>
              <button
                type="button"
                className={`report-pill-btn ${domicilioSubTab === 'mensajeros' ? 'active' : ''}`}
                onClick={() => setDomicilioSubTab('mensajeros')}
              >
                <Truck size={15} /> Por Mensajero / Conductor
                <span className="report-pill-badge">{(report.lists.domicilios_mensajeros || []).length}</span>
              </button>
              <button
                type="button"
                className={`report-pill-btn ${domicilioSubTab === 'detalle' ? 'active' : ''}`}
                onClick={() => setDomicilioSubTab('detalle')}
              >
                <Clock size={15} /> Detalle Viaje por Viaje
                <span className="report-pill-badge">{(report.lists.domicilios_detalle || []).length}</span>
              </button>
            </div>

            <button
              type="button"
              className="ds-btn ds-btn-primary ds-btn-sm"
              onClick={() => navigate('/admin/empresas-domicilios')}
              style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Building2 size={14} /> Gestionar Empresas y Mensajeros
            </button>
          </div>

          {/* TABLA 1: POR EMPRESA ALIADA */}
          {(domicilioSubTab === 'todas' || domicilioSubTab === 'empresas') && (
            <section className="ds-card">
              <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="ds-page-kicker">Consolidado por Operador</span>
                  <h2 className="ds-card-title">Desempeño por Empresa Aliada</h2>
                </div>
                <span className="ds-badge ds-badge-primary">
                  {(report.lists.domicilios_empresas || []).length} empresas registradas
                </span>
              </div>
              <div className="ds-table-container">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Empresa Aliada</th>
                      <th>Mensajeros Activos</th>
                      <th>Viajes Realizados</th>
                      <th>Total Cobrado (Cliente)</th>
                      <th>Costo Pagado (Operador)</th>
                      <th>Margen Neto</th>
                      <th style={{ minWidth: '130px' }}>Margen %</th>
                      <th>Tiempo Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!(report.lists.domicilios_empresas || []).length ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '32px' }}>
                          No hay registros de domicilios asignados a empresas en este periodo.
                        </td>
                      </tr>
                    ) : (
                      report.lists.domicilios_empresas.map((emp) => {
                        const marginPct = emp.revenue > 0 ? Math.round((emp.margin / emp.revenue) * 100) : 0;
                        const marginClamped = Math.max(0, Math.min(100, marginPct));
                        const marginColor = marginPct >= 0 ? '#10b981' : '#ef4444';
                        return (
                          <tr key={emp.name}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                                <div
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: 'rgba(212,160,23,0.12)',
                                    color: 'var(--ds-primary)',
                                    display: 'grid',
                                    placeItems: 'center',
                                    flexShrink: 0
                                  }}
                                >
                                  <Building2 size={16} />
                                </div>
                                <strong style={{ fontSize: '13px' }}>{emp.name}</strong>
                              </div>
                            </td>
                            <td>
                              <span className="ds-badge ds-badge-neutral">
                                <UserCheck size={13} style={{ marginRight: '4px' }} />
                                {emp.drivers_count} mensajeros
                              </span>
                            </td>
                            <td>
                              <strong>{emp.count}</strong> viajes
                            </td>
                            <td style={{ color: 'var(--ds-success)', fontWeight: '600' }}>
                              {formatCurrency(emp.revenue)}
                            </td>
                            <td style={{ color: 'var(--ds-danger)', fontWeight: '600' }}>
                              {formatCurrency(emp.cost)}
                            </td>
                            <td style={{ fontWeight: '700', color: emp.margin >= 0 ? 'var(--ds-success)' : 'var(--ds-danger)', fontSize: '13.5px' }}>
                              {formatCurrency(emp.margin)}
                            </td>
                            <td>
                              <div className="margin-progress-bar-wrap">
                                <div className="margin-progress-track">
                                  <div
                                    className="margin-progress-fill"
                                    style={{
                                      width: `${marginClamped}%`,
                                      background: marginColor,
                                      boxShadow: `0 0 8px ${marginColor}80`
                                    }}
                                  />
                                </div>
                                <span className={`ds-badge ${marginPct >= 0 ? 'ds-badge-success' : 'ds-badge-danger'}`} style={{ fontSize: '11px', minWidth: '42px', textAlign: 'center' }}>
                                  {marginPct}%
                                </span>
                              </div>
                            </td>
                            <td>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--ds-text-secondary)', fontSize: '12px' }}>
                                <Clock size={13} /> {emp.avg_duration_mins ? `${emp.avg_duration_mins} min` : '—'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TABLA 2: POR MENSAJERO / DOMICILIARIO */}
          {(domicilioSubTab === 'todas' || domicilioSubTab === 'mensajeros') && (
            <section className="ds-card">
              <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="ds-page-kicker">Productividad Individual</span>
                  <h2 className="ds-card-title">Desempeño por Mensajero / Domiciliario</h2>
                </div>
                <span className="ds-badge ds-badge-primary">
                  {(report.lists.domicilios_mensajeros || []).length} mensajeros con viajes
                </span>
              </div>
              <div className="ds-table-container">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Mensajero</th>
                      <th>Empresa Aliada</th>
                      <th>Teléfono / WhatsApp</th>
                      <th>Vehículo & Placa</th>
                      <th>Viajes</th>
                      <th>Cobrado Cliente</th>
                      <th>Pagado Mensajero</th>
                      <th>Margen Generado</th>
                      <th>Tiempo Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!(report.lists.domicilios_mensajeros || []).length ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '32px' }}>
                          No hay viajes asociados a mensajeros en este periodo.
                        </td>
                      </tr>
                    ) : (
                      report.lists.domicilios_mensajeros.map((m, idx) => (
                        <tr key={`${m.name}-${m.company}-${idx}`}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: 'rgba(59,130,246,0.12)',
                                  color: '#3B82F6',
                                  display: 'grid',
                                  placeItems: 'center',
                                  flexShrink: 0
                                }}
                              >
                                <Truck size={16} />
                              </div>
                              <strong style={{ fontSize: '13px' }}>{m.name}</strong>
                            </div>
                          </td>
                          <td>
                            <span className="ds-badge ds-badge-neutral">{m.company || 'Sin empresa'}</span>
                          </td>
                          <td>
                            {m.phone ? (
                              <a
                                href={`https://wa.me/${m.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 9px',
                                  borderRadius: '20px',
                                  background: 'rgba(16,185,129,0.12)',
                                  color: '#10b981',
                                  border: '1px solid rgba(16,185,129,0.3)',
                                  textDecoration: 'none',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  transition: 'var(--ds-transition)'
                                }}
                              >
                                <Phone size={12} /> {m.phone}
                              </a>
                            ) : (
                              <span style={{ color: 'var(--ds-text-muted)' }}>—</span>
                            )}
                          </td>
                          <td>
                            <span className="ds-badge ds-badge-neutral" style={{ fontSize: '11px' }}>
                              {m.vehicle_type || 'Moto'} {m.plate && m.plate !== '—' ? `· ${m.plate}` : ''}
                            </span>
                          </td>
                          <td>
                            <strong>{m.count}</strong> viajes
                          </td>
                          <td style={{ color: 'var(--ds-success)', fontWeight: '600' }}>
                            {formatCurrency(m.revenue)}
                          </td>
                          <td style={{ color: 'var(--ds-danger)', fontWeight: '600' }}>
                            {formatCurrency(m.cost)}
                          </td>
                          <td style={{ fontWeight: '700', color: m.margin >= 0 ? 'var(--ds-success)' : 'var(--ds-danger)', fontSize: '13.5px' }}>
                            {formatCurrency(m.margin)}
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--ds-text-secondary)', fontSize: '12px' }}>
                              <Clock size={13} /> {m.avg_duration_mins ? `${m.avg_duration_mins} min` : '—'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TABLA 3: AUDITORÍA Y DETALLE VIAJE POR VIAJE */}
          {(domicilioSubTab === 'todas' || domicilioSubTab === 'detalle') && (
            <section className="ds-card">
              <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span className="ds-page-kicker">Auditoría Individual de Envíos</span>
                  <h2 className="ds-card-title">Historial Detallado Viaje por Viaje</h2>
                </div>

                {/* Filtros en vivo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div className="ds-search" style={{ width: '250px' }}>
                    <Search size={15} className="ds-search-icon" />
                    <input
                      type="text"
                      className="ds-search-input ds-input"
                      style={{ height: '34px', fontSize: '12px' }}
                      placeholder="Buscar pedido, cliente, mensajero..."
                      value={domicilioSearch}
                      onChange={(e) => setDomicilioSearch(e.target.value)}
                    />
                    {domicilioSearch && (
                      <button
                        type="button"
                        onClick={() => setDomicilioSearch('')}
                        style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', color: 'var(--ds-text-muted)', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <select
                    className="ds-select"
                    style={{ height: '34px', fontSize: '12px' }}
                    value={domicilioCompanyFilter}
                    onChange={(e) => setDomicilioCompanyFilter(e.target.value)}
                  >
                    <option value="all">Todas las Empresas</option>
                    {(report.lists.domicilios_empresas || []).map((e) => (
                      <option key={e.name} value={e.name}>{e.name}</option>
                    ))}
                  </select>

                  <select
                    className="ds-select"
                    style={{ height: '34px', fontSize: '12px' }}
                    value={domicilioStatusFilter}
                    onChange={(e) => setDomicilioStatusFilter(e.target.value)}
                  >
                    <option value="all">Todos los Estados</option>
                    <option value="Entregado">Solo Entregados</option>
                    <option value="En Ruta">En Camino / En Ruta</option>
                  </select>
                </div>
              </div>

              <div className="ds-table-container">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th># Pedido</th>
                      <th>Fecha / Hora</th>
                      <th>Cliente & Contacto</th>
                      <th>Destino / Dirección</th>
                      <th>Empresa Aliada</th>
                      <th>Mensajero Responsable</th>
                      <th>Cobrado ($)</th>
                      <th>Costo ($)</th>
                      <th>Margen ($)</th>
                      <th>Estado</th>
                      <th>Tiempo Entrega</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = (report.lists.domicilios_detalle || []).filter((item) => {
                        if (domicilioCompanyFilter !== 'all' && item.company_name !== domicilioCompanyFilter) return false;
                        if (domicilioStatusFilter !== 'all') {
                          if (domicilioStatusFilter === 'Entregado' && !['Entregado', 'Completado'].includes(item.status)) return false;
                          if (domicilioStatusFilter === 'En Ruta' && ['Entregado', 'Completado'].includes(item.status)) return false;
                        }
                        if (domicilioSearch) {
                          const s = domicilioSearch.toLowerCase();
                          const matchId = String(item.id).includes(s);
                          const matchCustomer = (item.customer_name || '').toLowerCase().includes(s);
                          const matchPhone = (item.customer_phone || '').toLowerCase().includes(s);
                          const matchDriver = (item.driver_name || '').toLowerCase().includes(s);
                          const matchCompany = (item.company_name || '').toLowerCase().includes(s);
                          const matchDest = (item.destination || '').toLowerCase().includes(s);
                          const matchPlate = (item.driver_plate || '').toLowerCase().includes(s);
                          if (!matchId && !matchCustomer && !matchPhone && !matchDriver && !matchCompany && !matchDest && !matchPlate) {
                            return false;
                          }
                        }
                        return true;
                      });

                      if (!filtered.length) {
                        return (
                          <tr>
                            <td colSpan="11" style={{ textAlign: 'center', padding: '36px' }}>
                              No se encontraron envíos que coincidan con los filtros aplicados.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((d) => (
                        <tr key={d.id}>
                          <td>
                            <strong>#{d.id}</strong>
                          </td>
                          <td>
                            <small>{formatDateTime(d.date)}</small>
                          </td>
                          <td>
                            <div>
                              <strong style={{ fontSize: '13px' }}>{d.customer_name}</strong>
                              {d.customer_phone && (
                                <a
                                  href={`https://wa.me/${d.customer_phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    color: '#10b981',
                                    fontSize: '11px',
                                    textDecoration: 'none',
                                    marginTop: '2px',
                                    fontWeight: 500
                                  }}
                                >
                                  <Phone size={11} /> {d.customer_phone}
                                </a>
                              )}
                            </div>
                          </td>
                          <td style={{ maxWidth: '200px' }}>
                            <small title={d.destination} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {d.destination}
                            </small>
                          </td>
                          <td>
                            <span className="ds-badge ds-badge-neutral">{d.company_name}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong>{d.driver_name}</strong>
                              {d.driver_plate && d.driver_plate !== '—' && (
                                <span className="ds-badge ds-badge-neutral" style={{ fontSize: '10px' }}>
                                  {d.driver_plate}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ color: 'var(--ds-success)', fontWeight: '600' }}>
                            {formatCurrency(d.fee)}
                          </td>
                          <td style={{ color: 'var(--ds-danger)', fontWeight: '600' }}>
                            {formatCurrency(d.cost)}
                          </td>
                          <td style={{ fontWeight: '700', color: d.margin >= 0 ? 'var(--ds-success)' : 'var(--ds-danger)', fontSize: '13.5px' }}>
                            {formatCurrency(d.margin)}
                          </td>
                          <td>
                            <span
                              className={`ds-badge ${['Entregado', 'Completado'].includes(d.status) ? 'ds-badge-success' : 'ds-badge-warning'}`}
                              style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: ['Entregado', 'Completado'].includes(d.status) ? '#10b981' : '#f59e0b',
                                  display: 'inline-block'
                                }}
                              />
                              {d.status}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--ds-text-secondary)' }}>
                              <Clock size={13} /> {d.duration_mins ? `${d.duration_mins} min` : '—'}
                            </span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {selectedClient && (
        <div
          className="ds-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedClient(null);
          }}
        >
          <div className="ds-modal ds-modal-lg" role="dialog" aria-modal="true" aria-labelledby="client-history-title" style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
            <div className="ds-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--ds-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  className="client-avatar-circle"
                  style={{
                    background: 'linear-gradient(135deg, rgba(212,160,23,0.2), rgba(212,160,23,0.05))',
                    color: 'var(--ds-primary)',
                    border: '1.5px solid var(--ds-primary)',
                    width: '46px',
                    height: '46px',
                    fontSize: '18px',
                  }}
                >
                  {selectedClient.name?.charAt(0)?.toUpperCase() || 'C'}
                </div>
                <div>
                  <h2 id="client-history-title" className="ds-modal-title" style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    {selectedClient.name}
                    <span className="ds-badge ds-badge-primary" style={{ fontSize: '11px' }}>
                      <Crown size={12} style={{ marginRight: '4px' }} /> Cliente Frecuente
                    </span>
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '3px' }}>
                    {selectedClient.phone ? (
                      <a
                        href={`https://wa.me/${selectedClient.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          background: 'rgba(16,185,129,0.12)',
                          color: '#10b981',
                          border: '1px solid rgba(16,185,129,0.3)',
                          textDecoration: 'none',
                          fontSize: '11.5px',
                          fontWeight: 600,
                        }}
                      >
                        <Phone size={12} /> {selectedClient.phone}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--ds-text-muted)', fontSize: '12px' }}>Sin teléfono</span>
                    )}
                    <span style={{ color: 'var(--ds-text-muted)', fontSize: '12px' }}>
                      · {selectedClient.count} pedidos realizados
                    </span>
                  </div>
                </div>
              </div>
              <button className="ds-modal-close" onClick={() => setSelectedClient(null)} aria-label="Cerrar">
                <X size={22} />
              </button>
            </div>

            <div className="ds-modal-body" style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Tarjetas KPI del cliente */}
              <div className="client-modal-kpis">
                <div className="client-modal-kpi" style={{ borderLeft: '3px solid var(--ds-primary)' }}>
                  <span>Total Facturado</span>
                  <strong style={{ color: 'var(--ds-primary)' }}>{formatCurrency(selectedClient.total)}</strong>
                </div>
                <div className="client-modal-kpi" style={{ borderLeft: '3px solid #3b82f6' }}>
                  <span>Pedidos Totales</span>
                  <strong style={{ color: '#3b82f6' }}>{selectedClient.count} compras</strong>
                </div>
                <div className="client-modal-kpi" style={{ borderLeft: '3px solid #10b981' }}>
                  <span>Ticket Promedio</span>
                  <strong style={{ color: '#10b981' }}>
                    {formatCurrency(selectedClient.count ? Math.round(selectedClient.total / selectedClient.count) : 0)}
                  </strong>
                </div>
                <div className="client-modal-kpi" style={{ borderLeft: '3px solid #8b5cf6' }}>
                  <span>Producto Favorito</span>
                  <strong style={{ color: '#8b5cf6', fontSize: '13px' }}>{selectedClient.favoriteProduct || '—'}</strong>
                </div>
              </div>

              {/* Listado de pedidos detallados */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ds-text-muted)' }}>
                    Historial de Compras ({selectedClient.orderHistory?.length || 0})
                  </h3>
                </div>

                <div style={{ display: 'grid', gap: '12px' }}>
                  {!(selectedClient.orderHistory?.length) ? (
                    <div className="ds-empty-state">No hay detalle de compras registrado.</div>
                  ) : (
                    selectedClient.orderHistory.map((order, index) => (
                      <div key={`${order.date}-${index}`} className="client-order-card">
                        <div className="client-order-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="ds-badge ds-badge-neutral" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                              #{index + 1}
                            </span>
                            <span style={{ fontSize: '12.5px', color: 'var(--ds-text-secondary)' }}>
                              <Clock size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                              {formatDateTime(order.date)}
                            </span>
                          </div>
                          <strong style={{ color: 'var(--ds-success)', fontSize: '14.5px' }}>
                            {formatCurrency(order.total)}
                          </strong>
                        </div>

                        <div className="client-order-items">
                          {(order.cart || []).map((item, itemIndex) => {
                            const qty = item.qty || item.quantity || 1;
                            const price = Number(item.price || 0);
                            const itemTotal = price * qty;
                            return (
                              <div key={`${item.title}-${itemIndex}`} className="client-order-item-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span className="ds-badge ds-badge-primary" style={{ padding: '1px 5px', fontSize: '10.5px' }}>
                                    {qty}×
                                  </span>
                                  <span style={{ color: 'var(--ds-text-primary)' }}>{item.title}</span>
                                </div>
                                <span style={{ fontWeight: '500' }}>{formatCurrency(itemTotal)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="ds-modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--ds-border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="ds-btn ds-btn-secondary ds-btn-sm" onClick={() => setSelectedClient(null)}>
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
