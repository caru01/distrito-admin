import { API_URL } from '../config/api';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { printTicket } from '../services/printService';
import { DeliveryAddressPicker } from '@distrito/shared-ui';
import {
  Zap, Search, ShoppingCart, Trash2, Plus, Minus, ChefHat, Printer,
  MessageCircle, Phone, Globe, Store, Banknote, Wallet, CreditCard,
  MapPin, User, X, CheckCircle, AlertCircle, Clock, TrendingUp,
  Package, LayoutGrid
} from 'lucide-react';

const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
const DELIVERY_COST = 6000;

const EMPTY_CUSTOMER = {
  name: '', phone: '', address: '', barrio: '', notes: '', reference: '',
  apartment: '', tower: '', floor: '', latitude: null, longitude: null,
  placeId: '', locationAdjusted: false, locationConfirmed: false,
  deliveryType: 'domicilio', source: 'WhatsApp', paymentMethod: 'efectivo',
  voucher_reference: '', created_at: ''
};

const SOURCE_OPTIONS = [
  { key: 'WhatsApp',  label: 'WhatsApp',  icon: <MessageCircle size={15} />, color: '#25D366' },
  { key: 'Teléfono', label: 'Teléfono',  icon: <Phone size={15} />,         color: '#3B82F6' },
  { key: 'Web',      label: 'Web',        icon: <Globe size={15} />,         color: '#8B5CF6' },
  { key: 'Mostrador',label: 'Mostrador', icon: <Store size={15} />,         color: '#F59E0B' },
];

const PAYMENT_OPTIONS = [
  { key: 'efectivo',      label: 'Efectivo',      icon: <Banknote size={15} />, color: '#10B981' },
  { key: 'transferencia', label: 'Transferencia', icon: <Wallet size={15} />,   color: '#8B5CF6' },
];

const getCategoryEmoji = (name) => {
  if (!name) return '📦';
  const cat = name.toLowerCase();
  if (cat.includes('hamburguesa') || cat.includes('burger')) return '🍔';
  if (cat.includes('perro') || cat.includes('hot dog') || cat.includes('hotdog')) return '🌭';
  if (cat.includes('salchipapa') || cat.includes('papa')) return '🍟';
  if (cat.includes('bebida') || cat.includes('gaseosa') || cat.includes('jugo') || cat.includes('fria')) return '🥤';
  if (cat.includes('cerveza') || cat.includes('licor') || cat.includes('trago')) return '🍺';
  if (cat.includes('combo') || cat.includes('promocion')) return '🍱';
  if (cat.includes('entrada') || cat.includes('alita') || cat.includes('nugget') || cat.includes('picada')) return '🍗';
  if (cat.includes('postre') || cat.includes('helado') || cat.includes('dulce')) return '🍰';
  if (cat.includes('adicion') || cat.includes('extra') || cat.includes('salsa') || cat.includes('queso')) return '🧀';
  if (cat.includes('desayuno')) return '🍳';
  if (cat.includes('pizza')) return '🍕';
  if (cat.includes('taco') || cat.includes('mexican')) return '🌮';
  if (cat.includes('carne') || cat.includes('parrilla') || cat.includes('asado')) return '🥩';
  return '🍽️';
};

export default function TomarPedido() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const navigate = useNavigate();

  // 🚀 OPTIMIZACIÓN 1: Carga instantánea desde Caché en 0ms
  const getInitialProducts = () => {
    try {
      const cached = sessionStorage.getItem('distrito_pos_products_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) { return []; }
  };

  const getInitialCategories = () => {
    try {
      const cached = sessionStorage.getItem('distrito_pos_categories_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) { return []; }
  };

  const [products, setProducts]             = useState(getInitialProducts);
  const [categories, setCategories]         = useState(getInitialCategories);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch]                 = useState('');
  const [cart, setCart]                     = useState([]);
  const [loading, setLoading]               = useState(products.length === 0);
  const [sending, setSending]               = useState(false);
  const [toast, setToast]                   = useState(null);
  const [stats, setStats]                   = useState({ inKitchen: 0, preparing: 0, ready: 0, todaySales: 0 });
  const [nextOrderId, setNextOrderId]       = useState(null);
  const [clientSearch, setClientSearch]               = useState([]);
  const [showClientSearch, setShowClientSearch]       = useState(false);
  const [pastClients, setPastClients]                 = useState([]);
  const [activeSearchField, setActiveSearchField]     = useState('name');
  const [showCategoriesPanel, setShowCategoriesPanel] = useState(() => window.innerWidth >= 768);
  const searchTimeout                       = useRef(null);
  const searchRef                           = useRef(null);
  const clientFormRef                       = useRef(null);

  const [isMobile, setIsMobile]             = useState(window.innerWidth < 768);
  const [isCompactLayout, setIsCompactLayout] = useState(window.innerWidth < 1600);
  const [showMobileCart, setShowMobileCart] = useState(false);

  // 🚀 CERRAR SUGERENCIAS AL HACER CLIC AFUERA
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (clientFormRef.current && !clientFormRef.current.contains(e.target)) {
        setShowClientSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [mapsAvailable, setMapsAvailable] = useState(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? null : false
  );

  const updateDeliveryLocation = useCallback((changes) => {
    setCustomer((current) => ({ ...current, ...changes }));
  }, []);

  // 🚀 CARGAR PEDIDO EN EDICIÓN EN 0ms
  useEffect(() => {
    if (!editId) return;

    const loadOrderToEdit = (ordersList) => {
      const editOrder = ordersList.find(o => String(o.id) === String(editId));
      if (editOrder) {
        setCustomer({
          name: editOrder.customer_name || '',
          phone: editOrder.customer_phone || '',
          address: editOrder.address || '',
          barrio: editOrder.barrio || '',
          notes: editOrder.notes || '',
          reference: editOrder.delivery_reference || '',
          apartment: editOrder.delivery_apartment || '',
          tower: editOrder.delivery_tower || '',
          floor: editOrder.delivery_floor || '',
          latitude: editOrder.delivery_latitude == null ? null : Number(editOrder.delivery_latitude),
          longitude: editOrder.delivery_longitude == null ? null : Number(editOrder.delivery_longitude),
          placeId: editOrder.delivery_place_id || '',
          locationAdjusted: Boolean(editOrder.delivery_location_adjusted),
          locationConfirmed: editOrder.delivery_latitude != null && editOrder.delivery_longitude != null,
          deliveryType: editOrder.delivery_type || 'domicilio',
          source: editOrder.source || 'WhatsApp',
          paymentMethod: editOrder.payment_method || 'efectivo',
          voucher_reference: editOrder.voucher_reference || '',
          created_at: editOrder.created_at ? editOrder.created_at.slice(0, 10) : ''
        });
        setCart((editOrder.cart_json || []).map(i => ({
          ...i,
          qty: i.quantity || i.qty || 1
        })));
      }
    };

    // 1. Cargar al instante desde Caché de sesión
    try {
      const cached = sessionStorage.getItem('distrito_admin_orders_cache');
      if (cached) {
        loadOrderToEdit(JSON.parse(cached));
      }
    } catch (e) {}

    // 2. Refrescar desde API por si hubo cambios
    const token = sessionStorage.getItem('distrito_admin_token');
    if (token) {
      fetch(`${API_URL}/admin/orders`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (data.status === 'ok' && data.orders) {
            loadOrderToEdit(data.orders);
          }
        })
        .catch(console.error);
    }
  }, [editId]);

  const searchClient = (query) => {
    if (!query || query.length < 1) { setClientSearch([]); setShowClientSearch(false); return; }
    const lowerQuery = String(query).toLowerCase();
    const results = pastClients.filter(c => {
      if (!c) return false;
      const nameStr = c.name ? String(c.name).toLowerCase() : '';
      const phoneStr = c.phone ? String(c.phone).toLowerCase() : '';
      return nameStr.includes(lowerQuery) || phoneStr.includes(lowerQuery);
    });
    setClientSearch(results.slice(0, 5));
    setShowClientSearch(results.length > 0);
  };

  const handleClientSelect = (client) => {
    setCustomer(c => ({
      ...c,
      name: client.name || '',
      phone: client.phone || '',
      address: client.address || '',
      barrio: client.barrio || '',
      reference: client.reference || '',
      apartment: client.apartment || '',
      tower: client.tower || '',
      floor: client.floor || '',
      latitude: client.latitude == null ? null : Number(client.latitude),
      longitude: client.longitude == null ? null : Number(client.longitude),
      placeId: client.placeId || '',
      locationAdjusted: Boolean(client.locationAdjusted),
      locationConfirmed: client.latitude != null && client.longitude != null,
      deliveryType: client.delivery_type || 'domicilio',
      paymentMethod: client.payment_method || 'efectivo',
      source: client.source || 'WhatsApp',
      notes: client.notes || ''
    }));
    setShowClientSearch(false);
  };

  // 🚀 OPTIMIZACIÓN 2: Desacoplar la carga pesada de pedidos e implementar atajos de teclado F2, F4, Ctrl+K
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F1') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F2') { e.preventDefault(); handleSubmit(true); }
      if (e.key === 'F4') { e.preventDefault(); setCart([]); }
      if (e.key === 'Escape') setSearch('');
    };
    window.addEventListener('keydown', handleKey);
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsCompactLayout(width < 1600);
      if (width < 768) setShowCategoriesPanel(false);
      if (width >= 1600) setShowMobileCart(false);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleResize);
    }
  }, []);

  const fetchData = useCallback(async () => {
    const token = sessionStorage.getItem('distrito_admin_token');
    if (!token) { setLoading(false); return; }

    // 1️⃣ Cargar productos PRIMERO (Sin esperar por los pedidos pasados)
    try {
      const prodRes = await fetch(`${API_URL}/admin/products`, { headers: { Authorization: `Bearer ${token}` } });
      const prodData = await prodRes.json();

      if (prodData.status === 'ok') {
        const active = (prodData.products || []).filter(p => p.status === 'Activo');
        setProducts(active);
        
        const cats = [];
        const seen = new Set();
        for (const p of active) {
          if (p.category && !seen.has(p.category)) {
            seen.add(p.category);
            cats.push({ id: p.category, name: p.category });
          }
        }
        setCategories(cats);

        // Guardar en caché local para carga en 0ms
        try {
          sessionStorage.setItem('distrito_pos_products_cache', JSON.stringify(active));
          sessionStorage.setItem('distrito_pos_categories_cache', JSON.stringify(cats));
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error cargando productos:', err);
    } finally {
      setLoading(false);
    }

    // 2️⃣ Cargar pedidos en SEGUNDO PLANO (sin bloquear el catálogo de productos)
    try {
      const ordRes = await fetch(`${API_URL}/admin/orders`, { headers: { Authorization: `Bearer ${token}` } });
      const ordData = await ordRes.json();

      if (ordData.status === 'ok' && ordData.orders) {
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = ordData.orders.filter(o => o.created_at?.startsWith(today));
        const inKitchen  = todayOrders.filter(o => o.status === 'Nuevo').length;
        const preparing  = todayOrders.filter(o => o.status === 'En preparación').length;
        const ready      = todayOrders.filter(o => o.status === 'Listo').length;
        const todaySales = todayOrders
          .filter(o => ['Entregado','Completado'].includes(o.status))
          .reduce((s, o) => s + (o.total || 0), 0);
        setStats({ inKitchen, preparing, ready, todaySales });
        
        if (ordData.orders.length > 0) {
          setNextOrderId(Math.max(...ordData.orders.map(o => o.id || 0)) + 1);
          
          const uniqueClients = [];
          const seenPhones = new Set();
          ordData.orders.forEach(o => {
            if (o.customer_name && o.customer_phone && !seenPhones.has(o.customer_phone)) {
              seenPhones.add(o.customer_phone);
              uniqueClients.push({
                name: o.customer_name,
                phone: o.customer_phone,
                address: o.address || '',
                barrio: o.barrio || '',
                reference: o.delivery_reference || '',
                apartment: o.delivery_apartment || '',
                tower: o.delivery_tower || '',
                floor: o.delivery_floor || '',
                latitude: o.delivery_latitude,
                longitude: o.delivery_longitude,
                placeId: o.delivery_place_id || '',
                locationAdjusted: Boolean(o.delivery_location_adjusted),
                delivery_type: o.delivery_type || 'domicilio',
                payment_method: o.payment_method || 'efectivo',
                source: o.source || 'WhatsApp',
                notes: o.notes || ''
              });
            }
          });
          setPastClients(uniqueClients);
        } else {
          setNextOrderId(1);
        }
      }
    } catch (err) {
      console.error('Error cargando historial:', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev
      .map(i => i.id === id ? { ...i, qty: i.qty + delta } : i)
      .filter(i => i.qty > 0)
    );
  };

  const clearCart = () => setCart([]);

  const subtotal  = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery  = customer.deliveryType === 'domicilio' ? DELIVERY_COST : 0;
  const total     = subtotal + delivery;
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (sendToKitchen = false) => {
    if (cart.length === 0) { showToast('Agrega al menos un producto', 'error'); return; }
    if (!customer.name.trim()) { showToast('Escribe el nombre del cliente', 'error'); return; }
    if (!customer.phone.trim()) { showToast('Escribe el teléfono del cliente', 'error'); return; }
    if (customer.deliveryType === 'domicilio' && (!customer.address.trim() || !customer.barrio.trim())) {
      showToast('Selecciona la dirección y completa el barrio', 'error'); return;
    }
    if (customer.deliveryType === 'domicilio' && mapsAvailable !== false
        && (!customer.locationConfirmed || customer.latitude == null || customer.longitude == null)) {
      showToast('Selecciona una sugerencia y confirma la ubicación exacta', 'error'); return;
    }

    setSending(true);
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const url = editId
        ? `${API_URL}/admin/orders/${editId}/edit`
        : `${API_URL}/checkout`;
      const method = editId ? 'PUT' : 'POST';

      const bodyData = {
        customer_name:     customer.name,
        customer_phone:    customer.phone,
        address:           customer.address,
        barrio:            customer.barrio,
        delivery_type:     customer.deliveryType,
        payment_method:    customer.paymentMethod,
        voucher_reference: customer.voucher_reference || '',
        source:            customer.source,
        notes:             customer.notes,
        cart:              cart.map(i => ({ id: i.id, title: i.title, price: i.price, quantity: i.qty })),
        total,
        status:            sendToKitchen ? 'Nuevo' : 'Nuevo',
        created_at:        customer.created_at ? customer.created_at : undefined,
        customer: {
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          barrio: customer.barrio,
          deliveryType: customer.deliveryType,
          paymentMethod: customer.paymentMethod,
          voucher_reference: customer.voucher_reference || '',
          source: customer.source,
          notes: customer.notes,
          reference: customer.reference,
          apartment: customer.apartment,
          tower: customer.tower,
          floor: customer.floor,
          latitude: customer.latitude,
          longitude: customer.longitude,
          placeId: customer.placeId,
          locationAdjusted: customer.locationAdjusted,
          locationConfirmed: customer.locationConfirmed,
          created_at: customer.created_at ? customer.created_at : undefined
        }
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(bodyData)
      });
      const data = await res.json();

      if (res.ok || data.status === 'ok') {
        const orderIdToPrint = data.order?.id || data.id || editId || nextOrderId || 1;
        const printOrder = {
          id: orderIdToPrint,
          customer_name: customer.name,
          customer_phone: customer.phone,
          address: customer.address,
          barrio: customer.barrio,
          delivery_type: customer.deliveryType,
          payment_method: customer.paymentMethod,
          voucher_reference: customer.voucher_reference || '',
          source: customer.source,
          notes: customer.notes,
          total,
          cart_json: cart,
          created_at: customer.created_at || new Date().toISOString()
        };

        // 🖨️ Generar e imprimir comanda de cocina automáticamente
        printTicket(printOrder, 80);

        try { sessionStorage.removeItem('distrito_admin_orders_cache'); } catch (e) {}
        showToast(editId ? '✓ Pedido actualizado' : (sendToKitchen ? '📦 Pedido enviado a cocina' : '✓ Pedido guardado'));
        setCart([]);
        setCustomer(EMPTY_CUSTOMER);
        if (editId) {
          navigate('/admin/pedidos');
        } else {
          fetchData();
          if (isCompactLayout) setShowMobileCart(false);
        }
      } else {
        showToast(data.message || data.error || 'Error al guardar pedido', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión', 'error');
    } finally {
      setSending(false);
    }
  };

  // 🚀 OPTIMIZACIÓN 3: Búsqueda y filtrado instantáneo a 60 FPS con useMemo
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (activeCategory !== 'all' && p.category !== activeCategory) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !(p.code && p.code.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [products, activeCategory, search]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        addToCart(filteredProducts[0]);
        setSearch('');
      }
    }
  };

  if (loading) return (
    <div className="ds-page take-order-page" style={{ padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="ds-loader" style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
    </div>
  );

  return (
    <div className="ds-page take-order-page" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {toast && (
        <div className="ds-toast-container">
          <div className={`ds-toast ${toast.type === 'error' ? 'ds-toast-error' : 'ds-toast-success'}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            {toast.msg}
          </div>
        </div>
      )}

      {/* Header Superior */}
      <div className="ds-page-header take-order-header" style={{ padding: '12px 20px', borderBottom: '1px solid var(--ds-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, backgroundColor: 'var(--ds-bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => setShowCategoriesPanel(!showCategoriesPanel)} 
            className="ds-btn ds-btn-secondary ds-btn-sm"
            title={showCategoriesPanel ? "Ocultar panel de categorías" : "Mostrar panel de categorías"}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <LayoutGrid size={16} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{showCategoriesPanel ? 'Ocultar Categorías' : 'Ver Categorías'}</span>
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="ds-page-title" style={{ margin: 0, fontSize: '20px' }}>Tomar Pedido</h1>
              <Zap size={20} color="var(--ds-primary)" fill="var(--ds-primary)" />
            </div>
          </div>
        </div>

        {cartCount > 0 && isCompactLayout && (
          <button onClick={() => setShowMobileCart(true)} className="ds-btn ds-btn-primary">
            Ver Carrito ({cartCount}) - {formatter.format(total)}
          </button>
        )}
        {cartCount > 0 && !isCompactLayout && (
          <div className="ds-badge ds-badge-warning" style={{ backgroundColor: 'var(--ds-primary)', color: '#000', fontSize: '14px', padding: '6px 14px', fontWeight: 700 }}>
            {cartCount} {cartCount === 1 ? 'producto' : 'productos'} (${total.toLocaleString()})
          </div>
        )}
      </div>

      {/* Cuerpo Principal */}
      <div className="take-order-workspace" style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* REQUISITO 3: PANORAMA IZQUIERDO DE CATEGORÍAS CON EMOJIS (240px) */}
        {showCategoriesPanel && (
          <div className="take-order-categories" style={{
            backgroundColor: 'var(--ds-bg-surface)',
            borderRight: '1px solid var(--ds-border)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflowY: 'auto',
            padding: '12px 10px'
          }}>
            <div style={{ padding: '4px 8px 12px 8px', borderBottom: '1px solid var(--ds-border)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categorías</span>
              <span style={{ fontSize: '12px', color: 'var(--ds-primary)', fontWeight: 700 }}>{categories.length + 1}</span>
            </div>

            <button
              onClick={() => { setActiveCategory('all'); if (isMobile) setShowCategoriesPanel(false); }}
              className={`ds-btn ds-btn-full ${activeCategory === 'all' ? 'ds-btn-primary' : 'ds-btn-ghost'}`}
              style={{ justifyContent: 'flex-start', marginBottom: '4px', padding: '10px 12px', fontSize: '13px', fontWeight: activeCategory === 'all' ? 700 : 500 }}
            >
              <span style={{ marginRight: '8px', fontSize: '16px' }}>✨</span>
              <span>Todos ({products.length})</span>
            </button>

            {categories.map(cat => {
              const catCount = products.filter(p => p.category === cat.id).length;
              const emoji = getCategoryEmoji(cat.name);
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); if (isMobile) setShowCategoriesPanel(false); }}
                  className={`ds-btn ds-btn-full ${isActive ? 'ds-btn-primary' : 'ds-btn-ghost'}`}
                  style={{
                    marginBottom: '4px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 500,
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{emoji}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</span>
                  </div>
                  <span style={{ fontSize: '11px', opacity: 0.7, backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : 'var(--ds-bg-elevated)', padding: '2px 6px', borderRadius: '999px', flexShrink: 0 }}>{catCount}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* CENTRO: BUSCADOR Y CATÁLOGO DE 4 COLUMNAS (1FR) */}
        <div className="take-order-catalog" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Buscador superior */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ds-border)', flexShrink: 0, backgroundColor: 'var(--ds-bg-elevated)' }}>
            <div className="ds-search" style={{ maxWidth: '100%' }}>
              <Search size={18} className="ds-search-icon" />
              <input 
                ref={searchRef} 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar producto... (Ctrl+K | Enter para agregar)"
                className="ds-search-input ds-input" 
                style={{ fontSize: '14px' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--ds-text-muted)', cursor: 'pointer', padding: 0 }}>
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Grilla de 4 productos por fila en Desktop */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div className="take-order-product-grid" style={{ 
              display: 'grid', 
              gap: '14px' 
            }}>
              {filteredProducts.map(p => {
                const inCart = cart.find(i => i.id === p.id);
                return (
                  <div 
                    key={p.id} 
                    onClick={() => addToCart(p)} 
                    className="ds-card" 
                    style={{ 
                      cursor: 'pointer', 
                      border: inCart ? '2px solid var(--ds-primary)' : '1px solid var(--ds-border)', 
                      overflow: 'hidden', 
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'var(--ds-transition)'
                    }}
                  >
                    {inCart && (
                      <div style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'var(--ds-primary)', color: '#000', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, zIndex: 3, boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
                        {inCart.qty}
                      </div>
                    )}
                    {p.is_featured && (
                      <div className="ds-badge ds-badge-success" style={{ position: 'absolute', top: 6, left: 6, zIndex: 3, fontSize: '11px', padding: '2px 6px' }}>⭐ Popular</div>
                    )}
                    <div style={{ position: 'relative', width: '100%', height: '110px', backgroundColor: 'var(--ds-bg-base)' }}>
                      {p.image ? (
                        <>
                          <img src={p.image} alt={p.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, background: 'linear-gradient(to top, var(--ds-bg-elevated), transparent)' }} />
                        </>
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Package size={32} color="var(--ds-text-muted)" />
                        </div>
                      )}
                    </div>
                    <div className="ds-card-body" style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <p style={{ fontWeight: 700, fontSize: '12px', margin: '0 0 4px', color: 'var(--ds-text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.2' }}>
                        {p.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                        <span style={{ color: 'var(--ds-primary)', fontWeight: 800, fontSize: '13px' }}>{formatter.format(p.price)}</span>
                        <div style={{ width: 24, height: 24, backgroundColor: 'var(--ds-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={14} color="#000" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="ds-empty-state" style={{ gridColumn: '1/-1', padding: '60px 0' }}>
                  <Package size={48} className="ds-empty-state-icon" />
                  <h3 className="ds-empty-state-title">No se encontraron productos</h3>
                  <p className="ds-empty-state-text">Intenta con otro término de búsqueda o selecciona otra categoría</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CONTENEDOR CHECKOUT DERECHO (760px TOTAL: 380px CADA SUB-PANEL) */}
        <div className={`take-order-checkout ${showMobileCart ? 'open' : ''}`} style={{
          backgroundColor: 'var(--ds-bg-base)',
          flexShrink: 0,
          boxShadow: '-4px 0 20px rgba(0,0,0,0.35)'
        }}>
          {isCompactLayout && (
            <div className="take-order-checkout-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--ds-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--ds-bg-elevated)', width: '100%' }}>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>Carrito & Datos de Cliente</h3>
              <button onClick={() => setShowMobileCart(false)} className="ds-btn ds-btn-icon ds-btn-secondary"><X size={22} /></button>
            </div>
          )}

          {/* PARTE 1 (SUB-PANEL 1: RESUMEN DEL PEDIDO - 380px) */}
          <div className="take-order-summary" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden',
            backgroundColor: 'var(--ds-bg-surface)',
            flexShrink: 0
          }}>
            <div style={{ padding: '14px 16px', backgroundColor: 'var(--ds-bg-elevated)', borderBottom: '1px solid var(--ds-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={18} color="var(--ds-primary)" />
                <span style={{ fontWeight: 800, fontSize: '15px' }}>1. Resumen Pedido</span>
                {nextOrderId && <span style={{ fontSize: '12px', color: 'var(--ds-primary)', fontWeight: 700 }}>#{nextOrderId}</span>}
              </div>
              {cart.length > 0 && (
                <button onClick={clearCart} className="ds-btn ds-btn-sm ds-btn-danger ds-btn-ghost" style={{ padding: '4px 8px', fontSize: '12px' }}>
                  <Trash2 size={14} style={{ marginRight: '4px' }} /> Vaciar
                </button>
              )}
            </div>

            {/* Listado de Productos */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
              {cart.length === 0 ? (
                <div className="ds-empty-state" style={{ padding: '50px 0' }}>
                  <ShoppingCart size={42} className="ds-empty-state-icon" />
                  <p className="ds-empty-state-text" style={{ fontSize: '13px', marginTop: '8px' }}>Toca un producto para agregarlo al pedido</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {cart.map(item => (
                    <div key={item.id} className="ds-card" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px' }}>
                      {item.image
                        ? <img src={item.image} alt="" loading="lazy" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                        : <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'var(--ds-bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={18} color="var(--ds-text-muted)" /></div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--ds-text-primary)' }}>{item.title}</p>
                        <p style={{ margin: 0, color: 'var(--ds-primary)', fontSize: '13px', fontWeight: 800 }}>{formatter.format(item.price * item.qty)}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => updateQty(item.id, -1)} className="ds-btn ds-btn-icon ds-btn-secondary ds-btn-sm" style={{ width: 28, height: 28 }}><Minus size={13} /></button>
                        <span style={{ fontWeight: 800, minWidth: 20, textAlign: 'center', fontSize: '14px' }}>{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="ds-btn ds-btn-icon ds-btn-primary ds-btn-sm" style={{ width: 28, height: 28 }}><Plus size={13} /></button>
                        <button onClick={() => setCart(c => c.filter(i => i.id !== item.id))} className="ds-btn ds-btn-icon ds-btn-ghost ds-btn-sm" style={{ width: 28, height: 28, color: 'var(--ds-text-muted)' }}><X size={15} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totales en la base del Resumen */}
            {cart.length > 0 && (
              <div style={{ padding: '14px 16px', backgroundColor: 'var(--ds-bg-elevated)', borderTop: '1px solid var(--ds-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ds-text-secondary)', marginBottom: '6px' }}>
                  <span>Subtotal</span>
                  <span style={{ color: 'var(--ds-text-primary)', fontWeight: 600 }}>{formatter.format(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ds-text-secondary)', marginBottom: '8px' }}>
                  <span>Domicilio</span>
                  <span style={{ color: 'var(--ds-text-primary)', fontWeight: 600 }}>{customer.deliveryType === 'domicilio' ? formatter.format(DELIVERY_COST) : '$0'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '17px', color: 'var(--ds-text-primary)' }}>
                  <span>TOTAL</span>
                  <span style={{ color: 'var(--ds-primary)' }}>{formatter.format(total)}</span>
                </div>
              </div>
            )}
          </div>

          {/* PARTE 2 (SUB-PANEL 2: DATOS DEL CLIENTE, PAGO Y BOTÓN ENVIAR A COCINA - 380px) */}
          <div className="take-order-customer" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            backgroundColor: 'var(--ds-bg-base)',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            <div style={{ padding: '14px 16px', backgroundColor: 'var(--ds-bg-elevated)', borderBottom: '1px solid var(--ds-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="var(--ds-primary)" />
              <span style={{ fontWeight: 800, fontSize: '15px' }}>2. Cliente & Pago</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
              
              <div className="ds-form-grid" ref={clientFormRef} style={{ marginBottom: '12px', gap: '10px' }}>
                <div className="ds-form-group" style={{ position: 'relative', marginBottom: 0 }}>
                  <User size={16} style={{ position: 'absolute', left: '10px', top: '13px', color: 'var(--ds-text-muted)', zIndex: 1 }} />
                  <input 
                    placeholder="Nombre Cliente" 
                    value={customer.name} 
                    onChange={e => { 
                      setCustomer(c => ({ ...c, name: e.target.value })); 
                      setActiveSearchField('name');
                      clearTimeout(searchTimeout.current); 
                      searchTimeout.current = setTimeout(() => searchClient(e.target.value), 300); 
                    }} 
                    onFocus={() => { if(customer.name) { setActiveSearchField('name'); searchClient(customer.name); } }}
                    className="ds-input" 
                    style={{ paddingLeft: '34px', height: '42px', fontSize: '13px' }} 
                  />
                  {showClientSearch && activeSearchField === 'name' && clientSearch.length > 0 && (
                    <div className="ds-autocomplete" style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--ds-bg-elevated)', border: '1px solid var(--ds-primary)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', zIndex: 100, marginTop: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                      {clientSearch.map((c, i) => (
                        <div key={i} className="ds-autocomplete-item" onClick={() => handleClientSelect(c)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: i < clientSearch.length - 1 ? '1px solid var(--ds-border)' : 'none' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text-primary)' }}>{c.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--ds-text-secondary)', marginTop: '2px' }}>📱 {c.phone} {c.address ? `| 📍 ${c.address}` : ''}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ds-form-group" style={{ position: 'relative', marginBottom: 0 }}>
                  <Phone size={16} style={{ position: 'absolute', left: '10px', top: '13px', color: 'var(--ds-text-muted)', zIndex: 1 }} />
                  <input 
                    placeholder="Teléfono" 
                    value={customer.phone} 
                    onChange={e => { 
                      setCustomer(c => ({ ...c, phone: e.target.value })); 
                      setActiveSearchField('phone');
                      clearTimeout(searchTimeout.current); 
                      searchTimeout.current = setTimeout(() => searchClient(e.target.value), 300); 
                    }} 
                    onFocus={() => { if(customer.phone) { setActiveSearchField('phone'); searchClient(customer.phone); } }}
                    className="ds-input" 
                    style={{ paddingLeft: '34px', height: '42px', fontSize: '13px' }} 
                  />
                  {showClientSearch && activeSearchField === 'phone' && clientSearch.length > 0 && (
                    <div className="ds-autocomplete" style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--ds-bg-elevated)', border: '1px solid var(--ds-primary)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', zIndex: 100, marginTop: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                      {clientSearch.map((c, i) => (
                        <div key={i} className="ds-autocomplete-item" onClick={() => handleClientSelect(c)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: i < clientSearch.length - 1 ? '1px solid var(--ds-border)' : 'none' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text-primary)' }}>{c.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--ds-text-secondary)', marginTop: '2px' }}>📱 {c.phone} {c.address ? `| 📍 ${c.address}` : ''}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {customer.deliveryType === 'domicilio' && <>
                <DeliveryAddressPicker
                  value={customer}
                  onChange={updateDeliveryLocation}
                  onAvailabilityChange={setMapsAvailable}
                  apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
                  mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'}
                  inputClassName="ds-input"
                  compact
                />
                <div className="ds-form-grid delivery-extra-fields" style={{ margin: '12px 0', gap: '10px' }}>
                  <div className="ds-form-group" style={{ marginBottom: 0 }}>
                    <input placeholder="Barrio" value={customer.barrio} onChange={e => setCustomer(c => ({ ...c, barrio: e.target.value }))} className="ds-input" />
                  </div>
                  <div className="ds-form-group" style={{ marginBottom: 0 }}>
                    <input placeholder="Apartamento" value={customer.apartment} onChange={e => setCustomer(c => ({ ...c, apartment: e.target.value }))} className="ds-input" />
                  </div>
                  <div className="ds-form-group" style={{ marginBottom: 0 }}>
                    <input placeholder="Torre" value={customer.tower} onChange={e => setCustomer(c => ({ ...c, tower: e.target.value }))} className="ds-input" />
                  </div>
                  <div className="ds-form-group" style={{ marginBottom: 0 }}>
                    <input placeholder="Piso" value={customer.floor} onChange={e => setCustomer(c => ({ ...c, floor: e.target.value }))} className="ds-input" />
                  </div>
                </div>
                <div className="ds-form-group" style={{ marginBottom: '12px' }}>
                  <input placeholder="Referencia (portón, color, frente a…)" value={customer.reference} onChange={e => setCustomer(c => ({ ...c, reference: e.target.value }))} className="ds-input" />
                </div>
              </>}

              <div className="ds-form-group" style={{ marginBottom: '12px' }}>
                <textarea placeholder="Observaciones / Notas de preparación" value={customer.notes} onChange={e => setCustomer(c => ({ ...c, notes: e.target.value }))} rows={2} className="ds-input" style={{ resize: 'none', fontSize: '13px', padding: '8px 10px' }} />
              </div>

              <div className="ds-form-group" style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--ds-text-secondary)', display: 'block', marginBottom: '4px' }}>📅 Fecha del Pedido (Opcional - por defecto HOY)</span>
                <input 
                  type="date" 
                  value={customer.created_at || ''} 
                  onChange={e => setCustomer(c => ({ ...c, created_at: e.target.value }))}
                  onClick={e => e.target.showPicker && e.target.showPicker()}
                  onFocus={e => e.target.showPicker && e.target.showPicker()}
                  className="ds-input" 
                  style={{ height: '42px', fontSize: '13px', colorScheme: 'dark', cursor: 'pointer', width: '100%' }} 
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--ds-text-secondary)', display: 'block', marginBottom: '6px' }}>Tipo de Entrega</span>
                <div className="ds-option-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {[{ key: 'domicilio', label: 'Domicilio' }, { key: 'presencial', label: 'Mostrador' }, { key: 'recoger', label: 'Recoger' }].map(d => (
                    <button 
                      key={d.key} 
                      onClick={() => setCustomer(c => ({ ...c, deliveryType: d.key }))} 
                      className={`ds-option-btn ${customer.deliveryType === d.key ? 'active' : ''}`}
                      style={{ padding: '8px 4px', fontSize: '12px', fontWeight: 600, textAlign: 'center', justifyContent: 'center', minHeight: '38px' }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--ds-text-secondary)', display: 'block', marginBottom: '6px' }}>Origen</span>
                <div className="ds-option-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {SOURCE_OPTIONS.map(s => (
                    <button 
                      key={s.key} 
                      onClick={() => setCustomer(c => ({ ...c, source: s.key }))} 
                      className={`ds-option-btn ${customer.source === s.key ? 'active' : ''}`} 
                      style={{ 
                        backgroundColor: customer.source === s.key ? s.color : undefined, 
                        color: customer.source === s.key ? '#fff' : undefined,
                        borderColor: customer.source === s.key ? s.color : undefined,
                        padding: '8px 6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        justifyContent: 'center',
                        minHeight: '38px'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{s.icon} {s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--ds-text-secondary)', display: 'block', marginBottom: '6px' }}>Método de Pago</span>
                <div className="ds-option-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {PAYMENT_OPTIONS.map(pay => (
                    <button 
                      key={pay.key} 
                      onClick={() => setCustomer(c => ({ ...c, paymentMethod: pay.key }))} 
                      className={`ds-option-btn ${customer.paymentMethod === pay.key ? 'active' : ''}`} 
                      style={{ 
                        backgroundColor: customer.paymentMethod === pay.key ? pay.color : undefined, 
                        color: customer.paymentMethod === pay.key ? '#fff' : undefined,
                        borderColor: customer.paymentMethod === pay.key ? pay.color : undefined,
                        padding: '8px 6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        justifyContent: 'center',
                        minHeight: '38px'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{pay.icon} {pay.label}</span>
                    </button>
                  ))}
                </div>
                {customer.paymentMethod === 'transferencia' && (
                  <div style={{ marginTop: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '12px', color: '#A78BFA', display: 'block', marginBottom: '4px' }}>
                      🧾 Número de Comprobante / Referencia
                    </span>
                    <input 
                      type="text" 
                      placeholder="Ej: 12345678" 
                      value={customer.voucher_reference || ''} 
                      onChange={e => setCustomer(c => ({ ...c, voucher_reference: e.target.value }))} 
                      className="ds-input" 
                      style={{ height: '42px', fontSize: '13px', border: '1.5px solid #8B5CF6', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#fff' }} 
                    />
                  </div>
                )}
              </div>
            </div>

            {/* BOTÓN ENVIAR A COCINA / ACTUALIZAR PEDIDO */}
            <div style={{ padding: '14px 16px', borderTop: '1px solid var(--ds-border)', backgroundColor: 'var(--ds-bg-elevated)', flexShrink: 0 }}>
              <button 
                onClick={() => handleSubmit(true)} 
                disabled={sending || cart.length === 0} 
                className="ds-btn ds-btn-primary ds-btn-full ds-btn-lg" 
                style={{ 
                  height: '48px', 
                  fontSize: '16px', 
                  fontWeight: 800, 
                  opacity: (sending || cart.length === 0) ? 0.6 : 1, 
                  cursor: (sending || cart.length === 0) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {sending ? (
                  <div className="ds-loader" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                ) : editId ? (
                  <CheckCircle size={22} />
                ) : (
                  <ChefHat size={22} />
                )}
                {sending 
                  ? (editId ? 'Actualizando...' : 'Enviando...') 
                  : (editId ? 'Actualizar Pedido →' : 'Enviar a Cocina →')}
              </button>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
