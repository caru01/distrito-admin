import { API_URL, STOREFRONT_URL } from '../config/api';
import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { printTicket } from '../services/printService';
import { buildReadyOrderWhatsAppMessage, createWhatsAppUrl, orderStatusMeta } from '@distrito/shared-ui';
import DeliveryAssignmentModal from '../components/DeliveryAssignmentModal';
import { readApiJson } from '../utils/http';
import {
  ShoppingCart, Plus, Search, Filter, Globe, MessageCircle, Store, Phone,
  Clock, Eye, Pencil, Printer, MoreVertical, CheckCircle, ChefHat, Trash2, MapPin,
  Banknote, CreditCard, Smartphone, X, ChevronLeft, ChevronRight, Zap, Minus, Wallet, User, AlertCircle, Package, Building2, Truck
} from 'lucide-react';

const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
const colombiaDateKey = (value = new Date()) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(value)).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const formatColombiaDateTime = (value) => new Date(value).toLocaleString('es-CO', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota'
});

export default function AdminPedidos() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isAdmin = ['Admin', 'Administrador', 'Super Administrador', 'super_admin'].includes(user?.role || user?.role_name || '');

  // 🚀 OPTIMIZACIÓN 1: Inicialización inmediata desde Caché en 0ms
  const getInitialOrders = () => {
    try {
      const cached = sessionStorage.getItem('distrito_admin_orders_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) { return []; }
  };

  const [orders, setOrders] = useState(getInitialOrders);
  const [loading, setLoading] = useState(orders.length === 0);
  const [activeTab, setActiveTab] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState(() => colombiaDateKey());

  // Modal & Print State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [openPrintMenuId, setOpenPrintMenuId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [assigningOrder, setAssigningOrder] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      if (!token) return;
      const res = await fetch(`${API_URL}/admin/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'ok' && data.orders) {
        setOrders(data.orders);
        setSelectedOrder(current => current
          ? data.orders.find(order => Number(order.id) === Number(current.id)) || current
          : null);
        try {
          sessionStorage.setItem('distrito_admin_orders_cache', JSON.stringify(data.orders));
        } catch (e) { }
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fetchOrders]);

  useEffect(() => {
    const controller = new AbortController();
    let reconnectTimer;
    const connect = async () => {
      try {
        const token = sessionStorage.getItem('distrito_admin_token');
        if (!token) return;
        const response = await fetch(`${API_URL}/realtime/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          if (events.some(event => event && !event.startsWith(':'))) fetchOrders();
        }
        reconnectTimer = window.setTimeout(connect, 3000);
      } catch (streamError) {
        if (streamError.name !== 'AbortError') reconnectTimer = window.setTimeout(connect, 4000);
      }
    };
    connect();
    return () => { controller.abort(); window.clearTimeout(reconnectTimer); };
  }, [fetchOrders]);

  const handleUpdateStatus = async (id, newStatus) => {
    const order = orders.find(o => o.id === id);
    const isPickupOrder = order && String(order.delivery_type || '').toLowerCase() !== 'domicilio';
    if (newStatus === 'Listo' && order && !order.tracking_sent_at && (isPickupOrder || order.source !== 'Web')) {
      const prompt = isPickupOrder
        ? '¿Deseas avisar por WhatsApp que el pedido está listo para recoger?'
        : '¿Deseas enviar el enlace de seguimiento a este cliente por WhatsApp?';
      if (window.confirm(prompt)) {
        handleSendWhatsApp(order.customer_phone, id, order);
      }
    }

    const token = sessionStorage.getItem('distrito_admin_token');
    const nowIso = new Date().toISOString();
    setUpdatingOrderId(id);

    // Actualizar estado local inmediatamente para congelar el reloj al instante en pantalla
    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        const isDelivered = newStatus === 'Entregado' || newStatus === 'Completado';
        return {
          ...o,
          status: newStatus,
          updated_at: nowIso,
          delivered_at: isDelivered ? (o.delivered_at || nowIso) : o.delivered_at
        };
      }
      return o;
    }));
    setSelectedOrder(current => current && current.id === id
      ? {
          ...current,
          status: newStatus,
          updated_at: nowIso,
          delivered_at: newStatus === 'Entregado' || newStatus === 'Completado'
            ? (current.delivered_at || nowIso)
            : current.delivered_at,
        }
      : current);

    try {
      const res = await fetch(`${API_URL}/admin/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': globalThis.crypto?.randomUUID?.() || `order-${id}-${Date.now()}`,
        },
        body: JSON.stringify({ status: newStatus, version: order?.version })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok' && data.order) {
          setOrders(prev => prev.map(o => o.id === id ? data.order : o));
        }
        setSelectedOrder(null);
        return true;
      } else {
        const data = await res.json();
        alert(data.error || 'Error al actualizar el estado del pedido');
        fetchOrders();
        return false;
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al intentar actualizar');
      fetchOrders();
      return false;
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este pedido?')) return;
    const token = sessionStorage.getItem('distrito_admin_token');
    try {
      await fetch(`${API_URL}/admin/orders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintOrder = (order) => {
    printTicket(order, 80);
  };

  const handlePrepareOrder = async (order) => {
    handlePrintOrder(order);
    await handleUpdateStatus(order.id, 'En preparación');
  };

  const handleExternalTransition = async (order, action, body = {}) => {
    setUpdatingOrderId(order.id);
    try {
      const response = await fetch(`${API_URL}/admin/delivery/orders/${order.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('distrito_admin_token')}` },
        body: JSON.stringify(body),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'No fue posible actualizar la entrega.');
      setSelectedOrder(null);
      await fetchOrders();
    } catch (error) { alert(error.message); }
    finally { setUpdatingOrderId(null); }
  };

  const confirmExternalCompletion = async (order) => {
    if (!window.confirm('¿Confirmas que el cliente recibió este pedido?')) return;
    const notes = window.prompt('Observaciones de entrega (opcional):', '') || '';
    await handleExternalTransition(order, 'external-complete', { confirmReceived: true, notes });
  };

  const handleSendWhatsApp = async (phone, id, order = null) => {
    if (!phone) return alert('No hay número de teléfono registrado');
    try {
      const code = String(phone).replace(/\D/g, '').slice(-4);
      const publicBase = 'https://www.distritobg.app';
      const trackingUrl = `${publicBase}/rastrear/${id}?c=${code}`;
      const orderData = order || orders.find(o => o.id === id);
      const message = buildReadyOrderWhatsAppMessage({
        orderId: id,
        trackingUrl,
        restaurantName: 'Distrito BG',
        deliveryType: orderData?.delivery_type || orderData?.deliveryType,
        providerType: orderData?.delivery_provider_type || orderData?.deliveryProviderType,
        externalCompanyName: orderData?.external_company_name || orderData?.externalCompany?.name,
        status: orderData?.delivery_status || orderData?.status,
      });
      window.open(createWhatsAppUrl(phone, message), '_blank', 'noopener,noreferrer');
      const token = sessionStorage.getItem('distrito_admin_token');
      await fetch(`${API_URL}/admin/orders/${id}/tracking-sent`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, tracking_sent_at: new Date().toISOString() } : o));
      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder(cur => ({ ...cur, tracking_sent_at: new Date().toISOString() }));
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleEditOrder = (order) => {
    navigate(`/admin/tomar-pedido?edit=${order.id}`);
  };

  const tabs = ['Todos', 'Recibidos', 'En cocina', 'Listos para despacho', 'En reparto', 'Entregados', 'Pago pendiente', 'Cancelados'];

  // 🚀 OPTIMIZACIÓN 2: Filtrado memoizado ultra-rápido a 60 FPS
  const filteredOrders = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return orders.filter(order => {
      const matchesTab = activeTab === 'Todos' ||
        (activeTab === 'Recibidos' && order.status === 'Nuevo') ||
        (activeTab === 'En cocina' && order.status === 'En preparación') ||
        (activeTab === 'Listos para despacho' && ['Listo', 'Asignado externo', 'Entregado al operador externo'].includes(order.status)) ||
        (activeTab === 'En reparto' && order.status === 'En camino') ||
        (activeTab === 'Entregados' && order.status === 'Entregado') ||
        (activeTab === 'Pago pendiente' && order.status === 'Pendiente Pago') ||
        (activeTab === 'Cancelados' && order.status === 'Cancelado');

      const matchesSearch = !searchQuery ||
        order.id.toString().includes(searchLower) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(searchLower)) ||
        (order.customer_phone && order.customer_phone.includes(searchLower));

      let matchesDate = true;
      if (filterDate && order.created_at) {
        const orderDate = new Date(order.created_at);
        matchesDate = !Number.isNaN(orderDate.getTime()) && colombiaDateKey(orderDate) === filterDate;
      }
      return matchesTab && matchesSearch && matchesDate;
    });
  }, [orders, activeTab, searchQuery, filterDate]);

  const getStatusBadge = (status, order = null) => {
    const meta = orderStatusMeta(status, {
      deliveryType: order?.delivery_type,
      hasDriver: Boolean(order?.delivery_user_id),
      deliveryStatus: order?.delivery_status,
    });
    return <span className={`order-status-badge order-status-${meta.tone}`} title={meta.description}><i aria-hidden="true" /><span>{meta.label}</span></span>;
  };

  const getDeliveryTypeBadge = (type) => {
    const t = String(type || '').toLowerCase();
    if (t === 'domicilio') return <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3B82F6', fontWeight: 600 }}><Truck size={14}/> Domicilio</div>;
    if (t === 'recoger') return <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F59E0B', fontWeight: 600 }}><Package size={14}/> Recoger</div>;
    if (t === 'mostrador') return <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8B5CF6', fontWeight: 600 }}><Store size={14}/> Mostrador</div>;
    if (t === 'mesa') return <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#EC4899', fontWeight: 600 }}><ChefHat size={14}/> Mesa</div>;
    return <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--ds-text-muted)' }}>{type || '-'}</div>;
  };

  const getSourceIcon = (source) => {
    if (source === 'WhatsApp') return <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MessageCircle size={16} color="#22C55E" /> WhatsApp</div>;
    if (source === 'Presencial' || source === 'Mostrador') return <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Store size={16} color="#D4A017" /> {source}</div>;
    if (source === 'Teléfono') return <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={16} color="#60A5FA" /> Teléfono</div>;
    return <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Globe size={16} color="#A78BFA" /> Web</div>;
  };

  const getPaymentIcon = (method) => {
    if (!method) return '-';
    const m = method.toLowerCase();
    if (m.includes('efectivo')) return <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Banknote size={16} color="#4ADE80" /> Efectivo</div>;
    return <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Wallet size={16} color="#8B5CF6" /> Transferencia</div>;
  };

  const formatDuration = (totalMins) => {
    if (totalMins < 60) return `${totalMins} min`;
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (mins === 0) return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    return `${hours} ${hours === 1 ? 'hora' : 'horas'} con ${mins} min`;
  };

  const getDeliveryDurationText = (order) => {
    const deliverySeconds = Number(order?.delivery_duration_seconds);
    if (Number.isFinite(deliverySeconds) && deliverySeconds >= 0) {
      return formatDuration(Math.max(1, Math.ceil(deliverySeconds / 60)));
    }
    if (!order?.created_at || !order?.delivered_at) return null;
    const elapsed = new Date(order.delivered_at) - new Date(order.created_at);
    return Number.isFinite(elapsed) && elapsed >= 0 ? formatDuration(Math.max(1, Math.ceil(elapsed / 60000))) : null;
  };

  const getTimeElapsed = (order) => {
    if (!order || !order.created_at) return '-';
    const start = new Date(order.created_at);
    if (isNaN(start.getTime())) return '-';

    const isCompleted = order.status === 'Entregado' || order.status === 'Completado' || order.status === 'Cancelado';
    
    let end;
    let hasDeliveryTimestamp = false;

    if (isCompleted) {
      if (order.delivered_at) {
        end = new Date(order.delivered_at);
        hasDeliveryTimestamp = true;
      } else if (order.updated_at) {
        end = new Date(order.updated_at);
        hasDeliveryTimestamp = true;
      } else {
        end = start;
      }
      if (isNaN(end.getTime())) {
        end = start;
        hasDeliveryTimestamp = false;
      }
    } else {
      end = new Date();
    }

    const diffMins = Math.max(0, Math.floor((end - start) / 60000));
    const isLate = !isCompleted && diffMins > 45;
    const formattedText = formatDuration(diffMins);

    if (isCompleted) {
      const deliveryDuration = order.status === 'Entregado' ? getDeliveryDurationText(order) : null;
      if (deliveryDuration) {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontWeight: '700' }} title="Tiempo desde que el domiciliario aceptó hasta la entrega">
            <CheckCircle size={16} color="#10B981" /> {deliveryDuration} (Entregado)
          </div>
        );
      }
      // Si es un pedido histórico antiguo entregado sin marca de fecha entregado previa:
      if (!hasDeliveryTimestamp || diffMins === 0) {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: order.status === 'Cancelado' ? '#F59E0B' : '#10B981', fontWeight: '700' }} title="Pedido finalizado">
            <CheckCircle size={16} /> {order.status === 'Cancelado' ? 'Cancelado' : 'Entregado'}
          </div>
        );
      }
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: order.status === 'Cancelado' ? '#F59E0B' : '#10B981', fontWeight: '700' }} title="Duración final fija">
          <CheckCircle size={16} /> {formattedText} ({order.status === 'Cancelado' ? 'Cancelado' : 'Entregado'})
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isLate ? '#EF4444' : '#BDBDBD', fontWeight: isLate ? '600' : '400' }} title="Tiempo transcurrido en preparación">
        <Clock size={16} color={isLate ? '#EF4444' : '#BDBDBD'} /> {formattedText}
      </div>
    );
  };

  const ordersInDate = useMemo(() => {
    return orders.filter(o => {
      if (!filterDate || !o.created_at) return true;
      const orderDate = new Date(o.created_at);
      if (isNaN(orderDate.getTime())) return false;
      return colombiaDateKey(orderDate) === filterDate;
    });
  }, [orders, filterDate]);

  const statNuevos = ordersInDate.filter(o => o.status === 'Nuevo').length;
  const statPreparacion = ordersInDate.filter(o => o.status === 'En preparación').length;
  const statEntregados = ordersInDate.filter(o => o.status === 'Entregado').length;
  const completedOrders = ordersInDate.filter(o => o.status === 'Entregado' || o.status === 'Completado');
  const totalVentas = completedOrders.reduce((s, o) => s + (o.total || 0), 0);
  const totalEfectivo = completedOrders.filter(o => (o.payment_method || '').toLowerCase() === 'efectivo').reduce((s, o) => s + (o.total || 0), 0);
  const totalTransferencia = completedOrders.filter(o => ['transferencia', 'nequi', 'tarjeta'].includes((o.payment_method || '').toLowerCase())).reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div className="ds-page">
      <div className="ds-page-header">
        <div>
          <div style={{ color: 'var(--ds-text-secondary)', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>Dashboard <span style={{ margin: '0 8px' }}>/</span> <span style={{ color: 'var(--ds-text-primary)' }}>Pedidos</span></div>
          <h1 className="ds-page-title">Pedidos</h1>
          <p style={{ color: 'var(--ds-text-secondary)', fontSize: '16px', margin: 0 }}>Administra todos los pedidos recibidos por web, WhatsApp, teléfono y presencial.</p>
        </div>
        <div className="ds-page-actions">
          <button
            className="ds-btn ds-btn-primary ds-btn-lg"
            onClick={() => navigate('/admin/tomar-pedido')}
          >
            <Plus size={20} /> Nuevo Pedido
          </button>
        </div>
      </div>

      <div className="ds-cards-grid" style={{ marginBottom: '40px' }}>
        {[
          { label: filterDate ? 'Pedidos' : 'Total Histórico', value: ordersInDate.length, icon: <ShoppingCart size={24} /> },
          { label: 'Recién recibidos', value: statNuevos, icon: <Clock size={24} /> },
          { label: 'En preparación', value: statPreparacion, icon: <ChefHat size={24} /> },
          { label: 'Pedidos entregados', value: statEntregados, icon: <CheckCircle size={24} /> },
          { label: 'Ventas del día', value: `$${totalVentas.toLocaleString()}`, icon: <Banknote size={24} /> },
          { label: 'Efectivo', value: `$${totalEfectivo.toLocaleString()}`, icon: <Banknote size={24} color="#10B981" /> },
          { label: 'Transferencia', value: `$${totalTransferencia.toLocaleString()}`, icon: <Banknote size={24} color="#8B5CF6" /> },
        ].map((stat, i) => (
          <div key={i} className="ds-card">
            <div className="ds-card-body" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ color: 'var(--ds-primary)' }}>{stat.icon}</div>
              <div>
                <div style={{ fontSize: '30px', fontWeight: '700', color: 'var(--ds-text-primary)', lineHeight: '1' }}>{stat.value}</div>
                <div style={{ color: 'var(--ds-text-secondary)', fontSize: '13px', fontWeight: '500', marginTop: '6px' }}>{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-orders-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
        <div className="ds-search" style={{ flex: 1, minWidth: '300px' }}>
          <Search size={20} className="ds-search-icon" />
          <input type="text" placeholder="Buscar pedido, cliente o teléfono..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="ds-search-input ds-input" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--ds-bg-elevated)', border: '1px solid var(--ds-border)', borderRadius: '12px', padding: '0 16px', height: '52px' }}>
          <label style={{ color: 'var(--ds-text-secondary)', fontSize: '14px', fontWeight: '500', marginRight: '12px' }}>Fecha:</label>
          <input type="date" onClick={(e) => e.target.showPicker && e.target.showPicker()} value={filterDate} onChange={e => setFilterDate(e.target.value)}
            style={{ backgroundColor: 'transparent', color: 'var(--ds-text-primary)', border: 'none', outline: 'none', fontSize: '15px', cursor: 'pointer', colorScheme: 'dark' }} />
          {filterDate && <button onClick={() => setFilterDate('')} style={{ background: 'none', border: 'none', color: 'var(--ds-text-muted)', cursor: 'pointer', marginLeft: '8px', padding: '4px' }}><X size={16} /></button>}
        </div>
        <button className="ds-btn ds-btn-secondary" style={{ height: '52px' }}>
          <Filter size={18} color="var(--ds-primary)" /> Más Filtros
        </button>
      </div>

      <div className="ds-tabs" style={{ marginBottom: '24px' }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab;
          let count = 0;
          if (tab === 'Todos') count = orders.length;
          else if (tab === 'Recibidos') count = statNuevos;
          else if (tab === 'En cocina') count = statPreparacion;
          else if (tab === 'Listos para despacho') count = orders.filter(o => ['Listo', 'Asignado externo', 'Entregado al operador externo'].includes(o.status)).length;
          else if (tab === 'En reparto') count = orders.filter(o => o.status === 'En camino').length;
          else if (tab === 'Entregados') count = statEntregados;
          else if (tab === 'Pago pendiente') count = orders.filter(o => o.status === 'Pendiente Pago').length;
          else if (tab === 'Cancelados') count = orders.filter(o => o.status === 'Cancelado').length;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`ds-tab ${isActive ? 'active' : ''}`}>
              {tab}
              <span className="ds-badge ds-badge-neutral" style={{ marginLeft: '8px', backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : 'var(--ds-bg-base)', color: isActive ? '#000' : 'var(--ds-text-secondary)' }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="ds-card" style={{ overflow: 'hidden' }}>
        {!isMobile ? (
          <div className="ds-table-container">
            <table className="ds-table">
              <thead>
                <tr>
                  {['Pedido', 'Cliente', 'Origen', 'Estado', 'Total', 'Método de pago', 'Tiempo', 'Acciones'].map((h, i) => (
                    <th key={i} style={{ textAlign: i === 7 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <div style={{ color: 'var(--ds-text-primary)', fontWeight: '700', fontSize: '16px' }}>#{order.id.toString().padStart(4, '0')}</div>
                      <div style={{ color: 'var(--ds-text-muted)', fontSize: '13px', marginTop: '4px' }}>{formatColombiaDateTime(order.created_at)}</div>
                    </td>
                    <td>
                      <div style={{ color: 'var(--ds-text-primary)', fontWeight: '600', fontSize: '15px' }}>{order.customer_name || 'Sin nombre'}</div>
                      <div style={{ color: 'var(--ds-text-secondary)', fontSize: '13px', marginTop: '4px' }}>{order.customer_phone || 'Sin teléfono'}</div>
                      <div style={{ marginTop: '4px' }}>{getDeliveryTypeBadge(order.delivery_type)}</div>
                      {(order.barrio || order.address) && <div style={{ color: 'var(--ds-text-muted)', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} />{[order.barrio, order.address].filter(Boolean).join(', ')}</div>}
                      {order.notes && <div style={{ color: '#FCD34D', fontSize: '12px', marginTop: '6px', fontStyle: 'italic', padding: '4px 8px', backgroundColor: 'rgba(252,211,77,0.1)', borderRadius: '4px', display: 'inline-block' }}>Nota: {order.notes}</div>}
                    </td>
                    <td>{getSourceIcon(order.source || 'Web')}</td>
                    <td><div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '7px' }}>{getStatusBadge(order.status || 'Nuevo', order)}{order.status === 'Entregado' && getDeliveryDurationText(order) && <small style={{ color: '#10B981', fontWeight: 700 }}>{getDeliveryDurationText(order)}</small>}</div></td>
                    <td style={{ color: 'var(--ds-text-primary)', fontWeight: '700', fontSize: '15px' }}>${(order.total || 0).toLocaleString()}</td>
                    <td>
                      {getPaymentIcon(order.payment_method)}
                      {order.voucher_reference && <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: '700' }}>Ref: {order.voucher_reference}</div>}
                    </td>
                    <td>{getTimeElapsed(order)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', position: 'relative' }}>
                        <button onClick={() => setSelectedOrder(order)} className="ds-btn ds-btn-icon ds-btn-secondary ds-btn-sm"><Eye size={16} /></button>
                        {['Nuevo', 'En preparación', 'Pendiente Pago'].includes(order.status) && (<button onClick={() => handleEditOrder(order)} className="ds-btn ds-btn-icon ds-btn-secondary ds-btn-sm"><Pencil size={16} /></button>)}
                        <button onClick={() => handlePrintOrder(order)} className="ds-btn ds-btn-icon ds-btn-secondary ds-btn-sm" title="Imprimir Comanda">
                          <Printer size={16} />
                        </button>

                        <button onClick={() => setOpenMenuId(openMenuId === order.id ? null : order.id)} className="ds-btn ds-btn-icon ds-btn-secondary ds-btn-sm"><MoreVertical size={16} /></button>
                        {openMenuId === order.id && (
                          <div className="ds-dropdown" style={{ display: 'block', top: '100%', right: 0, zIndex: 40 }}>
                            <div className="ds-dropdown-menu">
                              <button onClick={() => { handleSendWhatsApp(order.customer_phone, order.id); setOpenMenuId(null); }} className="ds-dropdown-item"><MessageCircle size={16} color="#22C55E" /> WhatsApp</button>
                              <button onClick={() => { handleUpdateStatus(order.id, 'Cancelado'); setOpenMenuId(null); }} className="ds-dropdown-item" style={{ color: '#F59E0B' }}><X size={16} /> Anular Orden</button>
                              <button onClick={() => { handleDeleteOrder(order.id); setOpenMenuId(null); }} className="ds-dropdown-item ds-dropdown-item-danger"><Trash2 size={16} /> Eliminar</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr><td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: 'var(--ds-text-secondary)' }}>No hay pedidos que coincidan con esta vista.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ds-table-cards">
            {filteredOrders.map((order) => (
              <div key={order.id} className="ds-table-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: 'var(--ds-text-primary)', fontWeight: '700', fontSize: '16px' }}>#{order.id.toString().padStart(4, '0')}</div>
                    <div style={{ color: 'var(--ds-text-muted)', fontSize: '13px', marginTop: '4px' }}>{formatColombiaDateTime(order.created_at)}</div>
                  </div>
                  <div style={{ display: 'grid', justifyItems: 'end', gap: '5px' }}>{getStatusBadge(order.status || 'Nuevo', order)}{order.status === 'Entregado' && getDeliveryDurationText(order) && <small style={{ color: '#10B981', fontWeight: 700 }}>{getDeliveryDurationText(order)}</small>}</div>
                </div>

                <div className="ds-table-card-row">
                  <span className="ds-table-card-label">Cliente</span>
                  <span className="ds-table-card-value">
                    <div style={{ fontWeight: '600' }}>{order.customer_name || 'Sin nombre'}</div>
                    <div style={{ color: 'var(--ds-text-secondary)' }}>{order.customer_phone || 'Sin teléfono'}</div>
                  </span>
                </div>
                <div className="ds-table-card-row">
                  <span className="ds-table-card-label">Tipo Entrega</span>
                  <span className="ds-table-card-value">{getDeliveryTypeBadge(order.delivery_type)}</span>
                </div>
                <div className="ds-table-card-row">
                  <span className="ds-table-card-label">Origen</span>
                  <span className="ds-table-card-value">{getSourceIcon(order.source || 'Web')}</span>
                </div>
                <div className="ds-table-card-row">
                  <span className="ds-table-card-label">Total</span>
                  <span className="ds-table-card-value" style={{ fontWeight: '700', color: 'var(--ds-text-primary)' }}>${(order.total || 0).toLocaleString()}</span>
                </div>

                <div className="ds-table-card-actions" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button onClick={() => setSelectedOrder(order)} className="ds-btn ds-btn-secondary" style={{ flex: 1 }}><Eye size={16} /> Ver</button>
                  {['Nuevo', 'En preparación', 'Pendiente Pago'].includes(order.status) && (<button onClick={() => handleEditOrder(order)} className="ds-btn ds-btn-secondary ds-btn-icon"><Pencil size={16} /></button>)}
                  <button onClick={() => handlePrintOrder(order)} className="ds-btn ds-btn-secondary ds-btn-icon"><Printer size={16} /></button>
                  <button onClick={() => setOpenMenuId(openMenuId === order.id ? null : order.id)} className="ds-btn ds-btn-secondary ds-btn-icon"><MoreVertical size={16} /></button>
                  {openMenuId === order.id && (
                    <div className="ds-dropdown" style={{ display: 'block', bottom: '100%', right: 0, marginBottom: '8px' }}>
                      <div className="ds-dropdown-menu">
                        <button onClick={() => { handleSendWhatsApp(order.customer_phone, order.id); setOpenMenuId(null); }} className="ds-dropdown-item"><MessageCircle size={16} color="#22C55E" /> WhatsApp</button>
                        <button onClick={() => { handleUpdateStatus(order.id, 'Cancelado'); setOpenMenuId(null); }} className="ds-dropdown-item" style={{ color: '#F59E0B' }}><X size={16} /> Anular Orden</button>
                        <button onClick={() => { handleDeleteOrder(order.id); setOpenMenuId(null); }} className="ds-dropdown-item ds-dropdown-item-danger"><Trash2 size={16} /> Eliminar</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--ds-text-secondary)' }}>No hay pedidos que coincidan con esta vista.</div>
            )}
          </div>
        )}

        <div className="ds-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: 'var(--ds-text-secondary)', fontSize: '14px', fontWeight: '500' }}>Mostrando {filteredOrders.length > 0 ? 1 : 0} a {filteredOrders.length} de {filteredOrders.length} pedidos</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="ds-btn ds-btn-icon ds-btn-secondary ds-btn-sm" style={{ cursor: 'not-allowed' }}><ChevronLeft size={18} /></button>
            <button className="ds-btn ds-btn-icon ds-btn-primary ds-btn-sm" style={{ fontWeight: '700' }}>1</button>
            <button className="ds-btn ds-btn-icon ds-btn-secondary ds-btn-sm" style={{ cursor: 'not-allowed' }}><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      {selectedOrder && (
        <div className="ds-modal-overlay">
          <div className="ds-modal ds-modal-lg" style={{ height: '100%', maxHeight: '100%', borderRadius: 0, borderLeft: '1px solid var(--ds-border)' }}>
            <div className="ds-modal-header">
              <div>
                <h2 className="ds-modal-title">Pedido #{selectedOrder.id.toString().padStart(4, '0')}</h2>
                <div style={{ color: 'var(--ds-text-secondary)', fontSize: '14px', marginTop: '4px' }}>{formatColombiaDateTime(selectedOrder.created_at)}</div>
              </div>
              <button className="ds-modal-close" onClick={() => setSelectedOrder(null)}><X size={24} /></button>
            </div>
            <div className="ds-modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div className="order-status-detail"><div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>{getStatusBadge(selectedOrder.status || 'Nuevo', selectedOrder)}{selectedOrder.status === 'Entregado' && getDeliveryDurationText(selectedOrder) && <strong style={{ color: '#10B981', fontSize: '13px' }}>Entregado en {getDeliveryDurationText(selectedOrder)}</strong>}</div><small>{orderStatusMeta(selectedOrder.status, { deliveryType: selectedOrder.delivery_type, hasDriver: Boolean(selectedOrder.delivery_user_id), deliveryStatus: selectedOrder.delivery_status }).description}</small></div>
                <div style={{ color: 'var(--ds-text-primary)', fontSize: '14px', fontWeight: '500' }}>{getSourceIcon(selectedOrder.source || 'Web')}</div>
              </div>
              <div className="ds-card" style={{ padding: '20px', marginBottom: '24px' }}>
                <h3 style={{ color: 'var(--ds-text-secondary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px 0' }}>Cliente</h3>
                <div style={{ color: 'var(--ds-text-primary)', fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>{selectedOrder.customer_name}</div>
                <div style={{ color: 'var(--ds-text-secondary)', fontSize: '14px', marginBottom: '12px' }}>{selectedOrder.customer_phone}</div>
                <div style={{ borderTop: '1px solid var(--ds-border)', paddingTop: '12px' }}>
                  <div style={{ color: 'var(--ds-text-secondary)', fontSize: '14px' }}><strong>Dirección:</strong> {selectedOrder.address}, {selectedOrder.barrio}</div>
                  <div style={{ color: 'var(--ds-text-secondary)', fontSize: '14px', marginTop: '4px' }}><strong>Entrega:</strong> {selectedOrder.delivery_type}</div>
                  {selectedOrder.source !== 'Web' && (
                    <div style={{ marginTop: '12px', padding: '10px', backgroundColor: selectedOrder.tracking_sent_at ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', borderRadius: '8px', border: `1px solid ${selectedOrder.tracking_sent_at ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: selectedOrder.tracking_sent_at ? '#22C55E' : '#F59E0B', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MessageCircle size={14} /> {selectedOrder.tracking_sent_at ? 'Seguimiento Enviado' : 'Seguimiento Pendiente'}
                          </strong>
                          <div style={{ color: 'var(--ds-text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                            {selectedOrder.tracking_sent_at ? `Enviado el ${new Date(selectedOrder.tracking_sent_at).toLocaleString()}` : 'El cliente aún no recibe el enlace'}
                          </div>
                        </div>
                        <button onClick={() => handleSendWhatsApp(selectedOrder.customer_phone, selectedOrder.id, selectedOrder)} className="ds-btn ds-btn-sm" style={{ backgroundColor: '#25D366', color: '#fff', fontSize: '12px', padding: '4px 8px' }}>
                          Enviar seguimiento
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {String(selectedOrder.delivery_type || '').toLowerCase() === 'domicilio' && (selectedOrder.delivery_provider_type || selectedOrder.delivery_user_id) && <div className="ds-card" style={{ padding: '20px', marginBottom: '24px' }}>
                <h3 style={{ color: 'var(--ds-text-secondary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px 0' }}>Logística de entrega</h3>
                {String(selectedOrder.delivery_provider_type || '').startsWith('external_') ? <div className="order-logistics-grid"><div><span>Tipo de entrega</span><strong><Building2 size={15}/> Empresa externa</strong></div><div><span>Empresa</span><strong>{selectedOrder.external_company_name || 'Operador aliado'}</strong></div><div><span>Domiciliario</span><strong>{selectedOrder.external_driver_name || 'Pendiente de informar'}</strong></div><div><span>Teléfono</span><strong>{selectedOrder.external_driver_phone || 'No informado'}</strong></div><div><span>Placa / identificación</span><strong>{selectedOrder.external_vehicle_id || 'No informada'}</strong></div><div><span>ETA</span><strong>{selectedOrder.external_eta_minutes ? `${selectedOrder.external_eta_minutes} min` : 'No informado'}</strong></div><div><span>Domicilio cliente</span><strong>{formatter.format(selectedOrder.delivery_fee || 0)}</strong></div><div><span>Costo externo</span><strong>{formatter.format(selectedOrder.external_delivery_cost || 0)}</strong></div><div><span>Margen logístico</span><strong style={{ color: Number(selectedOrder.logistics_margin ?? ((selectedOrder.delivery_fee || 0) - (selectedOrder.external_delivery_cost || 0))) < 0 ? '#EF4444' : '#22C55E' }}>{formatter.format(selectedOrder.logistics_margin ?? ((selectedOrder.delivery_fee || 0) - (selectedOrder.external_delivery_cost || 0)))}</strong></div></div> : <div className="order-logistics-own"><Truck size={19}/><div><strong>Domiciliario Distrito BG</strong><small>El mapa del cliente solo se activa cuando existe una señal GPS real.</small></div></div>}
              </div>}
              <div className="ds-card" style={{ padding: '20px', marginBottom: '24px' }}>
                <h3 style={{ color: 'var(--ds-text-secondary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px 0' }}>Productos</h3>
                {selectedOrder.cart_json && selectedOrder.cart_json.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: idx < selectedOrder.cart_json.length - 1 ? '1px solid var(--ds-border)' : 'none', paddingBottom: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ color: 'var(--ds-text-primary)', fontWeight: '500' }}>{item.quantity || item.qty || 1}x {item.title}</div>
                      {item.notes && <div style={{ color: 'var(--ds-primary)', fontSize: '13px', marginTop: '4px' }}>Nota: {item.notes}</div>}
                    </div>
                    <div style={{ color: 'var(--ds-text-primary)', fontWeight: '600' }}>${((item.price || 0) * (item.quantity || item.qty || 1)).toLocaleString()}</div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--ds-border)', paddingTop: '12px', marginTop: '4px' }}>
                  <div style={{ color: 'var(--ds-text-primary)', fontWeight: '700', fontSize: '18px' }}>Total</div>
                  <div style={{ color: 'var(--ds-primary)', fontWeight: '800', fontSize: '18px' }}>${(selectedOrder.total || 0).toLocaleString()}</div>
                </div>
              </div>
              <div className="ds-card" style={{ padding: '20px' }}>
                <h3 style={{ color: 'var(--ds-text-secondary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px 0' }}>Pago</h3>
                <div style={{ color: 'var(--ds-text-primary)', fontSize: '15px' }}>{getPaymentIcon(selectedOrder.payment_method)}</div>
              </div>
            </div>
            <div className="ds-modal-footer" style={{ borderTop: '1px solid var(--ds-border)', backgroundColor: 'var(--ds-bg-elevated)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', width: '100%' }}>
                {selectedOrder.status === 'Nuevo' && <button disabled={updatingOrderId === selectedOrder.id} onClick={() => handlePrepareOrder(selectedOrder)} className="ds-btn ds-btn-full ds-btn-info" style={{ gridColumn: '1 / -1', backgroundColor: '#3B82F6' }}><Printer size={17}/> {updatingOrderId === selectedOrder.id ? 'Preparando…' : 'Preparar e imprimir cocina'}</button>}
                {selectedOrder.status === 'Pendiente Pago' && <button disabled={updatingOrderId === selectedOrder.id} onClick={() => handlePrepareOrder(selectedOrder)} className="ds-btn ds-btn-full ds-btn-info" style={{ gridColumn: '1 / -1', backgroundColor: '#3B82F6' }}><Printer size={17}/> {updatingOrderId === selectedOrder.id ? 'Confirmando…' : 'Pago confirmado: enviar a cocina'}</button>}
                {selectedOrder.status === 'En preparación' && <button disabled={updatingOrderId === selectedOrder.id} onClick={() => handleUpdateStatus(selectedOrder.id, 'Listo')} className="ds-btn ds-btn-full ds-btn-success" style={{ gridColumn: '1 / -1', backgroundColor: '#22C55E' }}><Package size={17}/> {updatingOrderId === selectedOrder.id ? 'Actualizando…' : 'Marcar listo para despacho'}</button>}
                {selectedOrder.status === 'Listo' && String(selectedOrder.delivery_type || '').toLowerCase() === 'domicilio' && <button type="button" onClick={() => { setAssigningOrder(selectedOrder); setSelectedOrder(null); }} className="ds-btn ds-btn-full order-ready-action" style={{ gridColumn: '1 / -1', opacity: 1 }}><Truck size={17}/> Asignar entrega</button>}
                {selectedOrder.status === 'Asignado externo' && <button disabled={updatingOrderId === selectedOrder.id} onClick={() => handleExternalTransition(selectedOrder, 'external-handoff')} className="ds-btn ds-btn-full ds-btn-info" style={{ gridColumn: '1 / -1' }}><Building2 size={17}/> Confirmar entrega al operador externo</button>}
                {selectedOrder.status === 'Entregado al operador externo' && <button disabled={updatingOrderId === selectedOrder.id} onClick={() => handleExternalTransition(selectedOrder, 'external-start')} className="ds-btn ds-btn-full order-delivery-action" style={{ gridColumn: '1 / -1' }}><Truck size={17}/> Confirmar que va en camino</button>}
                {selectedOrder.status === 'Listo' && String(selectedOrder.delivery_type || '').toLowerCase() !== 'domicilio' && <button disabled={updatingOrderId === selectedOrder.id} onClick={() => handleUpdateStatus(selectedOrder.id, 'Entregado')} className="ds-btn ds-btn-full ds-btn-success" style={{ gridColumn: '1 / -1', backgroundColor: '#22C55E' }}><CheckCircle size={17}/> Confirmar entrega en el local</button>}
                {isAdmin && (selectedOrder.status === 'En camino' || selectedOrder.status === 'Entregado al operador externo') && <button disabled={updatingOrderId === selectedOrder.id} onClick={() => handleUpdateStatus(selectedOrder.id, 'Entregado')} className="ds-btn ds-btn-full ds-btn-success" style={{ gridColumn: '1 / -1', backgroundColor: '#10B981' }}><CheckCircle size={17}/> Forzar Entrega (Manual)</button>}
                {selectedOrder.status === 'En camino' && String(selectedOrder.delivery_provider_type || '').startsWith('external_') && <button type="button" disabled={updatingOrderId === selectedOrder.id} onClick={() => confirmExternalCompletion(selectedOrder)} className="ds-btn ds-btn-full ds-btn-success" style={{ gridColumn: '1 / -1' }}><CheckCircle size={17}/> Confirmar entrega externa</button>}
                {selectedOrder.status === 'En camino' && !String(selectedOrder.delivery_provider_type || '').startsWith('external_') && <button type="button" disabled className="ds-btn ds-btn-full order-delivery-action" style={{ gridColumn: '1 / -1', opacity: 1 }}><MapPin size={17}/> Entrega en curso</button>}
                {selectedOrder.status === 'Entregado' && <div style={{ gridColumn: '1 / -1', padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(34,197,94,.12)', color: '#22C55E', textAlign: 'center', fontWeight: 800 }}><CheckCircle size={17} style={{ verticalAlign: 'middle', marginRight: '7px' }}/> Entregado{getDeliveryDurationText(selectedOrder) ? ` en ${getDeliveryDurationText(selectedOrder)}` : ''}</div>}
                {!['Pendiente Pago', 'Entregado', 'Completado', 'Cancelado', 'En camino', 'Asignado externo', 'Entregado al operador externo'].includes(selectedOrder.status) && <button disabled={updatingOrderId === selectedOrder.id} onClick={() => handleUpdateStatus(selectedOrder.id, 'Pendiente Pago')} className="ds-btn ds-btn-full" style={{ backgroundColor: '#8B5CF6', color: '#FFFFFF' }}>Marcar pago pendiente</button>}
                {!['Entregado', 'Completado', 'Cancelado'].includes(selectedOrder.status) && <button disabled={updatingOrderId === selectedOrder.id} onClick={() => handleUpdateStatus(selectedOrder.id, 'Cancelado')} className="ds-btn ds-btn-full ds-btn-danger">Cancelar pedido</button>}
              </div>
            </div>
          </div>
        </div>
      )}
      {assigningOrder && <DeliveryAssignmentModal
        order={assigningOrder}
        onClose={() => setAssigningOrder(null)}
        onSuccess={() => { setAssigningOrder(null); fetchOrders(); }}
      />}
    </div>
  );
}
