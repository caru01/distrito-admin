import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ShoppingBag, Truck, CheckCircle2, ChevronRight, RefreshCw, AlertCircle, PlusCircle, ArrowLeft } from 'lucide-react';
import { API_URL } from '../../config/api';
import { crmRequest, crmJson } from './crmApi';
import { formatCurrency } from '../../utils/formatters';
import CrmProductPicker from './CrmProductPicker';
import CrmOrderCart from './CrmOrderCart';
import CrmOrderDelivery from './CrmOrderDelivery';
import CrmOrderSummary from './CrmOrderSummary';

export default function CrmOrderComposer({
  conversation,
  contact,
  window24hActive = true,
  onClose,
  onOrderCreated,
}) {
  const [tab, setTab] = useState('products'); // 'products' | 'delivery' | 'summary'
  const [products, setProducts] = useState(() => {
    try {
      const cached = sessionStorage.getItem('distrito_pos_products_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [categories, setCategories] = useState(() => {
    try {
      const cached = sessionStorage.getItem('distrito_pos_categories_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [loadingCatalog, setLoadingCatalog] = useState(products.length === 0);

  // Estado del pedido en borrador (completamente aislado del chat)
  const [cart, setCart] = useState([]);
  const [deliveryType, setDeliveryType] = useState('domicilio');
  const [address, setAddress] = useState(contact?.address || conversation?.address || '');
  const [barrio, setBarrio] = useState(contact?.barrio || conversation?.barrio || '');
  const [reference, setReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [cashAmount, setCashAmount] = useState('');
  const [cashSplit, setCashSplit] = useState('');
  const [transferSplit, setTransferSplit] = useState('');
  const [notes, setNotes] = useState('');
  const [sendToKitchen, setSendToKitchen] = useState(true);
  const [sendWhatsAppSummary, setSendWhatsAppSummary] = useState(true);

  // Estados de envío y confirmación
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [createdOrderResult, setCreatedOrderResult] = useState(null);
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const isConsumidorFinal =
    conversation?.bsuid === '2222222' ||
    contact?.bsuid === '2222222' ||
    String(conversation?.display_name || '').toUpperCase() === 'CONSUMIDOR FINAL';

  // 🚀 CARGA DE CATÁLOGO Y CONFIGURACIÓN (con caché local para 0ms)
  useEffect(() => {
    const token = sessionStorage.getItem('distrito_admin_token');
    if (!token) return;

    let isMounted = true;
    async function loadData() {
      // 1. Domicilio desde settings
      try {
        const setRes = await fetch(`${API_URL}/admin/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const setData = await setRes.json();
        if (isMounted && setRes.ok && setData.settings?.delivery_cost !== undefined) {
          setDeliveryCost(Math.max(0, Number(setData.settings.delivery_cost || 0)));
        }
      } catch (e) {
        console.warn('No fue posible cargar el costo del domicilio:', e);
      }

      // 2. Productos
      try {
        const prodRes = await fetch(`${API_URL}/admin/products`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const prodData = await prodRes.json();
        if (isMounted && prodData.status === 'ok' && Array.isArray(prodData.products)) {
          const active = prodData.products.filter((p) => p.status === 'Activo');
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

          try {
            sessionStorage.setItem('distrito_pos_products_cache', JSON.stringify(active));
            sessionStorage.setItem('distrito_pos_categories_cache', JSON.stringify(cats));
          } catch (e) {}
        }
      } catch (e) {
        console.warn('Error al cargar catálogo en compositor de pedidos:', e);
      } finally {
        if (isMounted) setLoadingCatalog(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handlers del Carrito (memorizados para fluidez 60 FPS)
  const handleAddToCart = useCallback((product) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => Number(i.id) === Number(product.id));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          id: product.id,
          title: product.title,
          price: Number(product.price || 0),
          quantity: 1,
          category: product.category,
          notes: '',
        },
      ];
    });
  }, []);

  const handleUpdateQuantity = useCallback((productId, nextQty) => {
    setCart((prev) => {
      if (nextQty <= 0) {
        return prev.filter((i) => Number(i.id) !== Number(productId));
      }
      return prev.map((i) =>
        Number(i.id) === Number(productId) ? { ...i, quantity: nextQty } : i
      );
    });
  }, []);

  const handleRemoveItem = useCallback((productId) => {
    setCart((prev) => prev.filter((i) => Number(i.id) !== Number(productId)));
  }, []);

  const handleUpdateItemNotes = useCallback((productId, noteText) => {
    setCart((prev) =>
      prev.map((i) => (Number(i.id) === Number(productId) ? { ...i, notes: noteText } : i))
    );
  }, []);

  const handleClearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Cálculo de totales
  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );
  const effectiveDeliveryFee = deliveryType === 'domicilio' ? deliveryCost : 0;
  const orderTotal = subtotal + effectiveDeliveryFee;
  const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);

  // Confirmar y crear pedido
  const handleSubmitOrder = async () => {
    if (isSubmitting) return;
    if (cart.length === 0) {
      setSubmitError('Agrega al menos un producto al pedido.');
      return;
    }
    if (deliveryType === 'domicilio' && !address.trim()) {
      setSubmitError('La dirección de entrega es obligatoria para pedidos a domicilio.');
      setTab('delivery');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      customer: {
        name: contact?.display_name || conversation?.display_name || 'Cliente WhatsApp',
        phone: contact?.normalized_phone || conversation?.normalized_phone || '',
        address,
        barrio,
        reference,
        deliveryType,
        paymentMethod,
        cashAmount: paymentMethod === 'efectivo' && cashAmount !== '' ? Number(cashAmount) : undefined,
        cash_split: paymentMethod === 'compartido' ? cashSplit : undefined,
        transfer_split: paymentMethod === 'compartido' ? transferSplit : undefined,
        notes,
      },
      cart: cart.map((i) => ({
        id: i.id,
        title: i.title,
        price: i.price,
        quantity: i.quantity,
        notes: i.notes || undefined,
      })),
      deliveryType,
      paymentMethod,
      sendToKitchen,
      sendWhatsAppSummary: sendWhatsAppSummary && !isConsumidorFinal,
      idempotencyKey: idempotencyKeyRef.current,
    };

    try {
      const response = await crmRequest(
        `/conversations/${conversation.id}/orders`,
        crmJson('POST', payload, { 'Idempotency-Key': idempotencyKeyRef.current })
      );

      setCreatedOrderResult(response);
      if (onOrderCreated) {
        onOrderCreated(response);
      }
    } catch (err) {
      setSubmitError(err.message || 'Ocurrió un error al registrar el pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // PANTALLA DE ÉXITO TRAS CREACIÓN
  if (createdOrderResult) {
    const order = createdOrderResult.order;
    const wa = createdOrderResult.whatsapp;

    return (
      <aside className="crm-chat-drawer ds-card crm-order-composer-panel">
        <header className="crm-composer-header is-success">
          <div className="crm-composer-header-title">
            <CheckCircle2 size={18} className="ds-text-success" />
            <strong>¡Pedido Creado con Éxito!</strong>
          </div>
          <button
            type="button"
            className="ds-btn ds-btn-ghost ds-btn-sm"
            onClick={onClose}
            title="Cerrar panel"
          >
            <X size={15} />
          </button>
        </header>

        <div className="crm-composer-success-body">
          <div className="crm-order-success-card ds-card">
            <div className="crm-success-badge-top">
              <span className="crm-success-order-num">Pedido #{order.id}</span>
              <span className="ds-badge ds-badge-success">{order.status}</span>
            </div>

            <div className="crm-success-meta">
              <p>
                <strong>Cliente:</strong> {order.customer_name}
              </p>
              <p>
                <strong>Entrega:</strong> {order.delivery_type === 'domicilio' ? '🛵 Domicilio' : '🏪 Recoger en local'}
              </p>
              {order.address && (
                <p>
                  <strong>Dirección:</strong> {order.address} {order.barrio ? `(${order.barrio})` : ''}
                </p>
              )}
              <p>
                <strong>Pago:</strong> {order.payment_method?.toUpperCase()}
              </p>
              <p className="crm-success-total-row">
                <span>Total pagado:</span>
                <strong>{formatCurrency(order.total)}</strong>
              </p>
            </div>

            {/* Estado de envío WhatsApp */}
            <div className={`crm-success-wa-status ${wa?.status === 'queued' ? 'is-sent' : 'is-notice'}`}>
              <strong>WhatsApp:</strong>{' '}
              {wa?.status === 'queued' && '✅ Resumen encolado y enviado al cliente.'}
              {wa?.status === 'window_closed' && '⚠️ Ventana 24h cerrada; pedido creado en cocina sin texto libre.'}
              {wa?.status === 'omitted_consumidor_final' && 'ℹ️ Consumidor Final: resumen omitido para venta en local.'}
              {wa?.status === 'failed' && `❌ No se pudo enviar el WhatsApp: ${wa.message}`}
            </div>
          </div>

          <div className="crm-composer-success-actions">
            <button
              type="button"
              className="ds-btn ds-btn-primary ds-btn-block"
              onClick={() => {
                setCreatedOrderResult(null);
                setCart([]);
                setNotes('');
                idempotencyKeyRef.current = crypto.randomUUID();
                setTab('products');
              }}
            >
              <PlusCircle size={15} />
              <span>Crear otro pedido</span>
            </button>
            <button type="button" className="ds-btn ds-btn-secondary ds-btn-block" onClick={onClose}>
              Volver a la conversación
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="crm-chat-drawer ds-card crm-order-composer-panel">
      {/* Header del compositor */}
      <header className="crm-composer-header">
        <div className="crm-composer-header-title">
          <ShoppingBag size={17} className="crm-composer-icon" />
          <div>
            <strong>Crear Pedido en WhatsApp</strong>
            <small>{contact?.display_name || conversation?.display_name || 'Cliente'}</small>
          </div>
        </div>

        <button
          type="button"
          className="ds-btn ds-btn-ghost ds-btn-sm"
          onClick={onClose}
          title="Cerrar panel de pedido"
        >
          <X size={16} />
        </button>
      </header>

      {/* Navegación por pestañas */}
      <nav className="crm-composer-nav">
        <button
          type="button"
          className={`crm-composer-tab ${tab === 'products' ? 'is-active' : ''}`}
          onClick={() => setTab('products')}
        >
          <span>1. Productos</span>
          {totalItems > 0 && <span className="crm-tab-badge">{totalItems}</span>}
        </button>
        <button
          type="button"
          className={`crm-composer-tab ${tab === 'delivery' ? 'is-active' : ''}`}
          onClick={() => setTab('delivery')}
        >
          <span>2. Entrega y Pago</span>
        </button>
        <button
          type="button"
          className={`crm-composer-tab ${tab === 'summary' ? 'is-active' : ''}`}
          onClick={() => setTab('summary')}
        >
          <span>3. Confirmar</span>
          {cart.length > 0 && <span className="crm-tab-amount">{formatCurrency(orderTotal)}</span>}
        </button>
      </nav>

      {/* Cuerpo del panel según pestaña activa */}
      <div className="crm-composer-body">
        {tab === 'products' && (
          <div className="crm-composer-step-products">
            <CrmProductPicker
              products={products}
              categories={categories}
              cart={cart}
              onAddToCart={handleAddToCart}
              onUpdateQuantity={handleUpdateQuantity}
              loading={loadingCatalog}
            />

            {cart.length > 0 && (
              <div className="crm-composer-cart-preview-wrap">
                <CrmOrderCart
                  cart={cart}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveItem}
                  onUpdateItemNotes={handleUpdateItemNotes}
                  onClearCart={handleClearCart}
                />
              </div>
            )}
          </div>
        )}

        {tab === 'delivery' && (
          <div className="crm-composer-step-delivery">
            <CrmOrderDelivery
              deliveryType={deliveryType}
              onDeliveryTypeChange={setDeliveryType}
              address={address}
              onAddressChange={setAddress}
              barrio={barrio}
              onBarrioChange={setBarrio}
              reference={reference}
              onReferenceChange={setReference}
              deliveryFee={deliveryCost}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              cashAmount={cashAmount}
              onCashAmountChange={setCashAmount}
              cashSplit={cashSplit}
              onCashSplitChange={setCashSplit}
              transferSplit={transferSplit}
              onTransferSplitChange={setTransferSplit}
              notes={notes}
              onNotesChange={setNotes}
              sendToKitchen={sendToKitchen}
              onSendToKitchenChange={setSendToKitchen}
              sendWhatsAppSummary={sendWhatsAppSummary}
              onSendWhatsAppSummaryChange={setSendWhatsAppSummary}
              orderTotal={orderTotal}
              isConsumidorFinal={isConsumidorFinal}
            />
          </div>
        )}

        {tab === 'summary' && (
          <div className="crm-composer-step-summary">
            <CrmOrderSummary
              cart={cart}
              customer={{
                name: contact?.display_name || conversation?.display_name,
                phone: contact?.normalized_phone || conversation?.normalized_phone,
              }}
              deliveryType={deliveryType}
              address={address}
              barrio={barrio}
              paymentMethod={paymentMethod}
              cashAmount={cashAmount}
              deliveryFee={deliveryCost}
              sendToKitchen={sendToKitchen}
              sendWhatsAppSummary={sendWhatsAppSummary}
              isConsumidorFinal={isConsumidorFinal}
              window24hActive={window24hActive}
              onSubmitOrder={handleSubmitOrder}
              isSubmitting={isSubmitting}
              submitError={submitError}
            />
          </div>
        )}
      </div>

      {/* Footer de navegación entre pasos */}
      <footer className="crm-composer-footer">
        {tab === 'products' ? (
          <button
            type="button"
            className="ds-btn ds-btn-primary ds-btn-block"
            onClick={() => setTab('delivery')}
            disabled={cart.length === 0}
          >
            <span>Continuar a Entrega y Pago</span>
            <ChevronRight size={15} />
          </button>
        ) : tab === 'delivery' ? (
          <div className="crm-composer-footer-buttons">
            <button
              type="button"
              className="ds-btn ds-btn-secondary"
              onClick={() => setTab('products')}
            >
              <ArrowLeft size={14} />
              <span>Productos</span>
            </button>
            <button
              type="button"
              className="ds-btn ds-btn-primary"
              onClick={() => setTab('summary')}
              disabled={deliveryType === 'domicilio' && !address.trim()}
            >
              <span>Revisar y Confirmar</span>
              <ChevronRight size={14} />
            </button>
          </div>
        ) : (
          <div className="crm-composer-footer-buttons">
            <button
              type="button"
              className="ds-btn ds-btn-secondary"
              onClick={() => setTab('delivery')}
              disabled={isSubmitting}
            >
              <ArrowLeft size={14} />
              <span>Modificar Entrega</span>
            </button>
          </div>
        )}
      </footer>
    </aside>
  );
}
