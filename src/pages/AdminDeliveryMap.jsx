import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bike, Clock3, MapPin, Navigation, Package, Radio, RefreshCw, Send, Signal, SignalZero, UserCheck } from 'lucide-react';
import LiveDeliveryMap from '../components/LiveDeliveryMap.jsx';
import { API_URL } from '../config/api';

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const dateTime = (value) => value
  ? new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' }).format(new Date(value))
  : '—';

function getToken() {
  return sessionStorage.getItem('distrito_admin_token');
}

export default function AdminDeliveryMap() {
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [store, setStore] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/delivery/overview`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible cargar la operación');
      setDrivers(data.drivers || []);
      setOrders(data.orders || []);
      setStore(data.store || null);
      setError('');
      setSelectedId((current) => current || data.drivers?.[0]?.id || null);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 20_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    let reconnect;
    const connect = async () => {
      try {
        const response = await fetch(`${API_URL}/realtime/stream`, {
          headers: { Authorization: `Bearer ${getToken()}` },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error('Canal en vivo no disponible');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const packets = buffer.split('\n\n');
          buffer = packets.pop() || '';
          for (const packet of packets) {
            if (!packet || packet.startsWith(':')) continue;
            const eventName = packet.match(/^event:\s*(.+)$/m)?.[1] || 'message';
            const raw = packet.match(/^data:\s*(.+)$/m)?.[1];
            let data = {};
            try { data = raw ? JSON.parse(raw) : {}; } catch {}
            if (eventName === 'delivery_location' && data.deliveryUserId) {
              setDrivers((current) => current.map((driver) => Number(driver.id) === Number(data.deliveryUserId) ? {
                ...driver,
                current_latitude: Number(data.latitude),
                current_longitude: Number(data.longitude),
                current_accuracy: data.accuracy,
                last_location_at: new Date().toISOString(),
                live_status: 'Ocupado',
              } : driver));
            } else if (eventName !== 'connected') {
              void load(true);
            }
          }
        }
        if (!controller.signal.aborted) reconnect = window.setTimeout(connect, 3000);
      } catch (streamError) {
        if (streamError.name !== 'AbortError') reconnect = window.setTimeout(connect, 4000);
      }
    };
    connect();
    return () => {
      controller.abort();
      window.clearTimeout(reconnect);
    };
  }, [load]);

  const selected = useMemo(
    () => drivers.find((driver) => Number(driver.id) === Number(selectedId)) || null,
    [drivers, selectedId],
  );
  const mappedDrivers = useMemo(() => drivers.map((driver) => ({
    id: driver.id,
    name: driver.name || driver.username,
    latitude: driver.current_latitude,
    longitude: driver.current_longitude,
    orderId: driver.active_order_id,
    status: driver.live_status,
    detail: driver.active_order_count
      ? `${driver.active_order_count}/${driver.max_active_orders || 5} pedidos`
      : (driver.vehicle_type || driver.plate || 'Domiciliario'),
  })), [drivers]);

  // Destinos del driver seleccionado para mostrarlos en el mapa
  const selectedDestinations = useMemo(() => {
    if (!selected) return [];
    if (selected.active_orders && Array.isArray(selected.active_orders)) {
      return selected.active_orders.map(o => ({
        latitude: Number(o.latitude),
        longitude: Number(o.longitude),
        address: [`#${o.id}`, o.customer_name].filter(Boolean).join(' — ') || 'Destino de entrega',
      })).filter(d => d.latitude && d.longitude);
    }
    // Fallback por si la API antigua se queda en caché
    if (!selected.active_destination_latitude || !selected.active_destination_longitude) return [];
    return [{
      latitude: Number(selected.active_destination_latitude),
      longitude: Number(selected.active_destination_longitude),
      address: [
        selected.active_order_id ? `#${selected.active_order_id}` : null,
        selected.active_customer || null,
      ].filter(Boolean).join(' — ') || 'Destino de entrega',
    }];
  }, [selected]);
  const connected = drivers.filter((driver) => driver.live_status !== 'Desconectado').length;
  const busy = drivers.filter((driver) => driver.live_status === 'Ocupado').length;

  const assign = async (orderId) => {
    const userId = assignments[orderId] || '';
    try {
      const response = await fetch(`${API_URL}/admin/delivery/orders/${orderId}/assign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await load(true);
    } catch (assignError) {
      setError(assignError.message);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) await load(true);
      else alert('Error actualizando pedido');
    } catch (err) { alert('Error de red'); }
  };

  return <div className="ds-page delivery-map-page">
    <div className="ds-page-header delivery-map-header">
      <div><div className="ds-breadcrumb">Dashboard <span>/</span> Mapa de Domicilios</div><h1 className="ds-page-title">Mapa de Domicilios</h1><p className="ds-page-subtitle"><Radio size={15}/> Motocicletas y pedidos sincronizados en tiempo real</p></div>
      <button className="ds-btn ds-btn-secondary" onClick={() => load()}><RefreshCw size={18}/> Actualizar</button>
    </div>
    {error && <div className="ds-alert ds-alert-danger">{error}</div>}
    <div className="delivery-kpis">
      <article className="ds-card"><UserCheck/><div><strong>{connected}</strong><span>Conectados</span></div></article>
      <article className="ds-card"><Bike/><div><strong>{busy}</strong><span>En entrega</span></div></article>
      <article className="ds-card"><Package/><div><strong>{orders.length}</strong><span>Listos por asignar</span></div></article>
      <article className="ds-card"><Signal/><div><strong>{drivers.length}</strong><span>Domiciliarios</span></div></article>
    </div>
    <div className="delivery-operations-grid">
      <section className="ds-card delivery-map-card">
        <div className="delivery-panel-heading"><div><h2>Ubicación en vivo</h2><p>{selected ? `${selected.name || selected.username}${selected.active_order_count ? ` · ${selected.active_order_count}/${selected.max_active_orders || 5} pedidos activos` : ''}` : 'Todos los domiciliarios'}</p></div>{selected && <span className={`delivery-live-pill is-${String(selected.live_status).toLowerCase()}`}>{selected.live_status}</span>}</div>
        <LiveDeliveryMap
          apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
          mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'}
          store={store}
          destinations={selectedDestinations}
          drivers={mappedDrivers}
          selectedDriverId={selectedId}
          onDriverSelect={setSelectedId}
          showJourney={Boolean(selectedDestinations.length > 0)}
          ariaLabel="Mapa con todos los domiciliarios y la cocina"
        />
        <div className="delivery-map-legend"><span><i className="is-store">🏪</i> Cocina — punto de salida</span><span><i className="is-driver">🛵</i> Domiciliario en vivo</span>{selectedDestinations && selectedDestinations.length > 0 && <span><i>📍</i> {selectedDestinations.length} destino(s)</span>}</div>
        <div className="delivery-map-footer"><span><Clock3/> Último GPS: {dateTime(selected?.last_location_at)}</span>{selected?.current_latitude && selected?.current_longitude && <a className="ds-btn ds-btn-primary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${selected.current_latitude},${selected.current_longitude}`}><Navigation size={17}/> Abrir Google Maps</a>}</div>
      </section>
      <section className="ds-card delivery-driver-panel">
        <div className="delivery-panel-heading"><div><h2>Domiciliarios</h2><p>Selecciona uno para resaltarlo</p></div></div>
        <div className="delivery-driver-list">{loading ? <div className="delivery-loading">Cargando…</div> : drivers.length ? drivers.map((driver) => (
          <div key={driver.id}>
            <button className={`delivery-driver ${Number(selectedId) === Number(driver.id) ? 'active' : ''}`} onClick={() => setSelectedId(driver.id)}><span className="delivery-avatar">{driver.photo_url ? <img src={driver.photo_url} alt=""/> : <Bike/>}<i className={`presence is-${String(driver.live_status).toLowerCase()}`}/></span><span><b>{driver.name || driver.username}</b><small>{driver.vehicle_type || 'Vehículo sin registrar'} {driver.plate ? `· ${driver.plate}` : ''}</small>{driver.active_order_count > 0 && <em>{driver.active_order_count}/{driver.max_active_orders || 5} pedidos activos{driver.active_order_id ? ` · Próximo #${driver.active_order_id}` : ''}</em>}</span><span className="delivery-driver-state">{driver.live_status === 'Desconectado' ? <SignalZero/> : <Signal/>}</span></button>
            {Number(selectedId) === Number(driver.id) && driver.active_orders && driver.active_orders.length > 0 && (
              <div style={{ padding: '10px', backgroundColor: 'var(--ds-bg-secondary)', borderRadius: '8px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--ds-text-secondary)' }}>Pedidos en curso:</h4>
                {driver.active_orders.map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--ds-bg-primary)', padding: '8px', borderRadius: '6px' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px' }}>#{o.id} - {o.customer_name}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{o.address}</span>
                    </div>
                    <button onClick={() => updateOrderStatus(o.id, 'Entregado')} className="ds-btn ds-btn-sm ds-btn-success" style={{ padding: '4px 8px', fontSize: '11px' }}>Entregado</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )) : <div className="delivery-map-empty compact"><Bike/><p>Crea usuarios con el rol Domiciliario para verlos aquí.</p></div>}</div>
      </section>
    </div>
    <section className="ds-card delivery-queue">
      <div className="delivery-panel-heading"><div><h2>Pedidos listos</h2><p>Asignación manual sin salir del mapa operativo</p></div><span className="ds-badge ds-badge-warning">{orders.length} pendientes</span></div>
      {orders.length ? <div className="delivery-order-grid">{orders.map((order) => <article key={order.id}><div><span className="ds-badge ds-badge-success">Listo</span><b>Pedido #{order.id}</b><small>{dateTime(order.createdAt)}</small></div><h3>{order.customerName}</h3><p><MapPin size={16}/> {order.address}, {order.barrio}</p><div className="delivery-order-meta"><span>{order.paymentMethod}</span><strong>{money.format(order.deliveryFee)}</strong></div><div className="delivery-assign"><select className="ds-input" value={assignments[order.id] ?? order.deliveryUserId ?? ''} onChange={(event) => setAssignments({ ...assignments, [order.id]: event.target.value })}><option value="">Todos los domiciliarios</option>{drivers.filter((driver) => Number(driver.active_order_count || 0) < Number(driver.max_active_orders || 5) || Number(driver.id) === Number(order.deliveryUserId)).map((driver) => <option value={driver.id} key={driver.id}>{driver.name || driver.username} · {driver.active_order_count || 0}/{driver.max_active_orders || 5}</option>)}</select><button className="ds-btn ds-btn-primary" onClick={() => assign(order.id)}><Send size={17}/> Asignar</button></div></article>)}</div> : <div className="delivery-map-empty compact"><Package/><p>No hay pedidos en estado Listo pendientes de reparto.</p></div>}
    </section>
  </div>;
}
