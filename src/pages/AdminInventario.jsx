import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Archive, ScanLine as Barcode, Boxes, Edit3, ExternalLink,
  PackageCheck, PackageX, Plus, Search, X, ShoppingCart, Layers, DollarSign,
  Trash2, ArrowUpRight, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { API_URL } from '../config/api';
import { formatCurrency, formatDateTime, formatNumber } from '../utils/formatters';

export default function AdminInventario() {
  const [activeTab, setActiveTab] = useState('productos'); // 'productos' | 'compras' | 'combos' | 'alertas'
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [combos, setCombos] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Settings for single product modal
  const [settings, setSettings] = useState({
    barcode: '',
    track_stock: true,
    low_stock_threshold: 5,
    inventory_unit: 'unidad',
    inventory_unit_cost: 0,
    average_cost: 0,
  });

  // Purchase registration form
  const [purchaseForm, setPurchaseForm] = useState({
    product_id: '',
    quantity: 1,
    unit_cost: '',
    total_cost: '',
    supplier: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  // Combo editor form
  const [selectedComboId, setSelectedComboId] = useState('');
  const [comboComponents, setComboComponents] = useState([]);
  const [newComponentId, setNewComponentId] = useState('');
  const [newComponentQty, setNewComponentQty] = useState(1);

  const token = sessionStorage.getItem('distrito_admin_token');
  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  // ==========================================
  // DATA LOADERS
  // ==========================================
  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/admin/product-stock`, { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible cargar productos');
      setProducts(data.data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }, [headers]);

  const loadPurchases = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/admin/inventory-purchases`, { headers });
      const data = await response.json();
      if (response.ok && data.status === 'ok') {
        setPurchases(data.purchases || []);
      }
    } catch (err) {
      console.error('Error cargando compras:', err);
    }
  }, [headers]);

  const loadCombos = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/admin/combos`, { headers });
      const data = await response.json();
      if (response.ok && data.status === 'ok') {
        setCombos(data.combos || []);
      }
    } catch (err) {
      console.error('Error cargando combos:', err);
    }
  }, [headers]);

  const reloadAll = useCallback(async () => {
    setBusy(true);
    await Promise.all([loadProducts(), loadPurchases(), loadCombos()]);
    setBusy(false);
  }, [loadProducts, loadPurchases, loadCombos]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  // Sync combo editor when combo selection changes
  useEffect(() => {
    if (!selectedComboId) {
      setComboComponents([]);
      return;
    }
    const found = combos.find((c) => String(c.combo_product_id) === String(selectedComboId));
    if (found && Array.isArray(found.components)) {
      setComboComponents(
        found.components.map((c) => ({
          component_product_id: c.component_product_id,
          component_title: c.component_title,
          quantity: c.quantity,
          track_stock: c.track_stock,
          stock: c.stock,
          average_cost: c.average_cost,
        }))
      );
    } else {
      setComboComponents([]);
    }
  }, [selectedComboId, combos]);

  // ==========================================
  // ACTIONS: PRODUCT SETTINGS
  // ==========================================
  const openProductModal = (product) => {
    setSelected(product);
    setSettings({
      barcode: product.barcode || '',
      track_stock: Boolean(product.track_stock),
      low_stock_threshold: product.low_stock_threshold ?? 5,
      inventory_unit: product.inventory_unit || 'unidad',
      inventory_unit_cost: product.inventory_unit_cost || 0,
      average_cost: product.average_cost || 0,
    });
  };

  const saveProductSettings = async () => {
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/admin/product-stock/${selected.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible guardar la configuración');
      setMessage({ type: 'success', text: 'Configuración de producto actualizada.' });
      setSelected(undefined);
      await loadProducts();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  // ==========================================
  // ACTIONS: PURCHASES
  // ==========================================
  const handlePurchaseQtyChange = (qty) => {
    const q = Number(qty);
    const u = Number(purchaseForm.unit_cost);
    setPurchaseForm((prev) => ({
      ...prev,
      quantity: q,
      total_cost: q > 0 && u >= 0 ? Math.round(q * u) : prev.total_cost,
    }));
  };

  const handlePurchaseUnitCostChange = (unitCost) => {
    const u = Number(unitCost);
    const q = Number(purchaseForm.quantity);
    setPurchaseForm((prev) => ({
      ...prev,
      unit_cost: unitCost,
      total_cost: q > 0 && u >= 0 ? Math.round(q * u) : prev.total_cost,
    }));
  };

  const handlePurchaseTotalCostChange = (totalCost) => {
    const t = Number(totalCost);
    const q = Number(purchaseForm.quantity);
    setPurchaseForm((prev) => ({
      ...prev,
      total_cost: totalCost,
      unit_cost: q > 0 && t >= 0 ? Math.round((t / q) * 100) / 100 : prev.unit_cost,
    }));
  };

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    if (!purchaseForm.product_id) {
      setMessage({ type: 'error', text: 'Selecciona un producto para la compra.' });
      return;
    }
    if (Number(purchaseForm.quantity) <= 0) {
      setMessage({ type: 'error', text: 'La cantidad debe ser mayor a cero.' });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/admin/inventory-purchases`, {
        method: 'POST',
        headers,
        body: JSON.stringify(purchaseForm),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'ok') throw new Error(data.error || 'No fue posible registrar la compra');

      setMessage({
        type: 'success',
        text: `Compra registrada exitosamente. Nuevo stock: ${data.product.new_stock}, Nuevo costo promedio: $${Number(data.product.new_average_cost).toLocaleString('es-CO')}.`,
      });
      setPurchaseForm({
        product_id: '',
        quantity: 1,
        unit_cost: '',
        total_cost: '',
        supplier: '',
        purchase_date: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      await reloadAll();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  // ==========================================
  // ACTIONS: COMBOS
  // ==========================================
  const handleAddComponentToCombo = () => {
    if (!newComponentId) {
      setMessage({ type: 'error', text: 'Selecciona un componente para agregar.' });
      return;
    }
    if (newComponentId === selectedComboId) {
      setMessage({ type: 'error', text: 'Un combo no puede ser componente de sí mismo.' });
      return;
    }
    if (comboComponents.some((c) => String(c.component_product_id) === String(newComponentId))) {
      setMessage({ type: 'error', text: 'Este componente ya está incluido en el combo.' });
      return;
    }
    const compProduct = products.find((p) => String(p.id) === String(newComponentId));
    if (!compProduct) return;

    setComboComponents((prev) => [
      ...prev,
      {
        component_product_id: compProduct.id,
        component_title: compProduct.title,
        quantity: Number(newComponentQty) > 0 ? Number(newComponentQty) : 1,
        track_stock: compProduct.track_stock,
        stock: compProduct.stock,
        average_cost: compProduct.average_cost,
      },
    ]);
    setNewComponentId('');
    setNewComponentQty(1);
  };

  const handleRemoveComponent = (compProductId) => {
    setComboComponents((prev) => prev.filter((c) => String(c.component_product_id) !== String(compProductId)));
  };

  const handleSaveCombo = async () => {
    if (!selectedComboId) {
      setMessage({ type: 'error', text: 'Selecciona el producto combo a configurar.' });
      return;
    }
    if (comboComponents.length === 0) {
      setMessage({ type: 'error', text: 'Debes agregar al menos un componente al combo.' });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/admin/combos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          combo_product_id: selectedComboId,
          components: comboComponents.map((c) => ({
            component_product_id: c.component_product_id,
            quantity: c.quantity,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'ok') throw new Error(data.error || 'No fue posible guardar el combo');

      setMessage({ type: 'success', text: 'Composición de combo guardada exitosamente.' });
      await loadCombos();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  // ==========================================
  // METRICS & FILTERS
  // ==========================================
  const negativeStockProducts = products.filter((p) => p.track_stock && Number(p.stock) < 0);
  const lowStockProducts = products.filter((p) => p.track_stock && Number(p.stock) >= 0 && Number(p.stock) <= Number(p.low_stock_threshold || 5));
  const trackedProducts = products.filter((p) => p.track_stock);

  const stats = {
    tracked: trackedProducts.length,
    negative: negativeStockProducts.length,
    low: lowStockProducts.length,
    totalPurchasesValue: purchases.reduce((sum, p) => sum + Number(p.total_cost || 0), 0),
  };

  const filteredProducts = products.filter((product) => {
    const matches = `${product.title} ${product.category || ''} ${product.barcode || ''}`.toLowerCase().includes(query.toLowerCase());
    if (!matches) return false;
    if (filter === 'negative') return product.track_stock && Number(product.stock) < 0;
    if (filter === 'low') return product.track_stock && Number(product.stock) <= Number(product.low_stock_threshold);
    if (filter === 'untracked') return !product.track_stock;
    if (filter === 'tracked') return product.track_stock;
    return true;
  });

  const getStockBadge = (product) => {
    if (!product.track_stock) return ['Sin control', 'ds-badge-neutral'];
    const stockNum = Number(product.stock) || 0;
    if (stockNum < 0) return [`⚠ Negativo (${stockNum})`, 'ds-badge-danger'];
    if (stockNum === 0) return ['Agotado (0)', 'ds-badge-danger'];
    if (stockNum <= Number(product.low_stock_threshold || 5)) return [`Stock bajo (${stockNum})`, 'ds-badge-warning'];
    return [`Disponible (${stockNum})`, 'ds-badge-success'];
  };

  return (
    <div className="ds-page inventory-page">
      <header className="ds-page-header">
        <div>
          <span className="ds-eyebrow">Gestión Operativa & Costos</span>
          <h1 className="ds-page-title">Inventario & Rentabilidad</h1>
          <p className="ds-page-subtitle">
            Control selectivo por producto, compras de insumos con costo promedio ponderado, combos y trazabilidad histórica.
          </p>
        </div>
        <div className="ds-page-actions">
          <a className="ds-btn ds-btn-primary" href="/admin/productos">
            <Plus size={17} /> Crear producto
          </a>
        </div>
      </header>

      {message.text && (
        <div className={`ds-alert ds-alert-${message.type === 'error' ? 'danger' : 'success'}`}>
          {message.text}
          <button className="ds-icon-btn ds-icon-btn-sm" onClick={() => setMessage({ type: '', text: '' })}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI CARDS */}
      <section className="inventory-kpis">
        <article className="ds-card" onClick={() => { setActiveTab('productos'); setFilter('tracked'); }} style={{ cursor: 'pointer' }}>
          <Boxes />
          <div>
            <strong>{stats.tracked}</strong>
            <span>Controlados</span>
          </div>
        </article>
        <article className="ds-card" onClick={() => { setActiveTab('alertas'); }} style={{ cursor: 'pointer', borderColor: stats.negative > 0 ? '#ef4444' : undefined }}>
          <ShieldAlert color={stats.negative > 0 ? '#ef4444' : undefined} />
          <div>
            <strong style={{ color: stats.negative > 0 ? '#ef4444' : undefined }}>{stats.negative}</strong>
            <span>Stock negativo ⚠</span>
          </div>
        </article>
        <article className="ds-card" onClick={() => { setActiveTab('alertas'); }} style={{ cursor: 'pointer' }}>
          <AlertTriangle />
          <div>
            <strong>{stats.low}</strong>
            <span>Stock bajo</span>
          </div>
        </article>
        <article className="ds-card" onClick={() => { setActiveTab('compras'); }} style={{ cursor: 'pointer' }}>
          <DollarSign />
          <div>
            <strong>{purchases.length}</strong>
            <span>Compras registradas</span>
          </div>
        </article>
      </section>

      {/* TAB NAVIGATION */}
      <div className="ds-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          className={`ds-btn ds-btn-sm ${activeTab === 'productos' ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
          onClick={() => setActiveTab('productos')}
        >
          <Boxes size={16} /> Productos ({products.length})
        </button>
        <button
          className={`ds-btn ds-btn-sm ${activeTab === 'compras' ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
          onClick={() => setActiveTab('compras')}
        >
          <ShoppingCart size={16} /> Compras & Costos ({purchases.length})
        </button>
        <button
          className={`ds-btn ds-btn-sm ${activeTab === 'combos' ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
          onClick={() => setActiveTab('combos')}
        >
          <Layers size={16} /> Combos Compuestos ({combos.length})
        </button>
        <button
          className={`ds-btn ds-btn-sm ${activeTab === 'alertas' ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
          onClick={() => setActiveTab('alertas')}
        >
          <AlertTriangle size={16} /> Alertas ({stats.negative + stats.low})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PRODUCTOS CONTROLADOS */}
      {/* ========================================================================= */}
      {activeTab === 'productos' && (
        <section className="ds-card">
          <div className="inventory-toolbar">
            <div className="ds-search" style={{ flex: 1, minWidth: '300px' }}>
              <Search size={20} className="ds-search-icon" />
              <input
                type="text"
                placeholder="Buscar producto, categoría o código"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ds-search-input ds-input"
              />
            </div>
            <div className="ds-filter-group">
              <button className={`ds-btn ds-btn-sm ${filter === 'all' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setFilter('all')}>
                Todos
              </button>
              <button className={`ds-btn ds-btn-sm ${filter === 'tracked' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setFilter('tracked')}>
                Controlados
              </button>
              <button className={`ds-btn ds-btn-sm ${filter === 'negative' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setFilter('negative')}>
                Negativos
              </button>
              <button className={`ds-btn ds-btn-sm ${filter === 'low' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setFilter('low')}>
                Stock Bajo
              </button>
              <button className={`ds-btn ds-btn-sm ${filter === 'untracked' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setFilter('untracked')}>
                Sin Control
              </button>
            </div>
          </div>

          <div className="ds-table-container">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Controlado</th>
                  <th>Existencias</th>
                  <th>Costo Promedio</th>
                  <th>Umbral Mínimo</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const badge = getStockBadge(product);
                  return (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.title}</strong>
                        <small>{product.category || 'General'}</small>
                      </td>
                      <td>
                        <span className={`ds-badge ${product.track_stock ? 'ds-badge-success' : 'ds-badge-neutral'}`}>
                          {product.track_stock ? 'Sí (Activo)' : 'No'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: Number(product.stock) < 0 ? '#ef4444' : undefined }}>
                          {product.track_stock ? `${Number(product.stock) || 0} ${product.inventory_unit || 'unidad'}` : '—'}
                        </strong>
                      </td>
                      <td>
                        <strong>
                          {product.track_stock ? formatCurrency(Number(product.average_cost || 0)) : '—'}
                        </strong>
                      </td>
                      <td>{product.track_stock ? product.low_stock_threshold : '—'}</td>
                      <td>
                        <span className={`ds-badge ${badge[1]}`}>{badge[0]}</span>
                      </td>
                      <td>
                        <button className="ds-btn ds-btn-secondary ds-btn-sm" onClick={() => openProductModal(product)}>
                          <Edit3 size={15} /> Gestionar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMPRAS & COSTO PROMEDIO */}
      {/* ========================================================================= */}
      {activeTab === 'compras' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 400px) 1fr', gap: '20px' }}>
          {/* REGISTRATION FORM */}
          <section className="ds-card">
            <div className="ds-card-header">
              <h2 className="ds-card-title"><ShoppingCart size={18} /> Registrar Compra de Insumo</h2>
            </div>
            <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="ds-form-group">
                <label className="ds-form-label">Producto a Abastecer *</label>
                <select
                  className="ds-select"
                  value={purchaseForm.product_id}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, product_id: e.target.value })}
                  required
                >
                  <option value="">-- Seleccionar producto --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.track_stock ? `(Stock: ${p.stock})` : '(Sin control)'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="ds-form-group">
                  <label className="ds-form-label">Cantidad *</label>
                  <input
                    className="ds-input"
                    type="number"
                    min="1"
                    step="1"
                    value={purchaseForm.quantity}
                    onChange={(e) => handlePurchaseQtyChange(e.target.value)}
                    required
                  />
                </div>
                <div className="ds-form-group">
                  <label className="ds-form-label">Fecha de Compra</label>
                  <input
                    className="ds-input"
                    type="date"
                    value={purchaseForm.purchase_date}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="ds-form-group">
                  <label className="ds-form-label">Costo Unitario ($)</label>
                  <input
                    className="ds-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Auto o manual"
                    value={purchaseForm.unit_cost}
                    onChange={(e) => handlePurchaseUnitCostChange(e.target.value)}
                  />
                </div>
                <div className="ds-form-group">
                  <label className="ds-form-label">Costo Total Factura ($) *</label>
                  <input
                    className="ds-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Total pagado"
                    value={purchaseForm.total_cost}
                    onChange={(e) => handlePurchaseTotalCostChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="ds-form-group">
                <label className="ds-form-label">Proveedor</label>
                <input
                  className="ds-input"
                  type="text"
                  placeholder="Ej: Distribuidora Postobón / Makro"
                  value={purchaseForm.supplier}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })}
                />
              </div>

              <div className="ds-form-group">
                <label className="ds-form-label">Observaciones</label>
                <textarea
                  className="ds-textarea"
                  rows="2"
                  placeholder="Factura #123, lote, nota…"
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                />
              </div>

              <button className="ds-btn ds-btn-primary" type="submit" disabled={busy} style={{ marginTop: '8px' }}>
                <CheckCircle2 size={16} /> Guardar Compra & Actualizar Costo Promedio
              </button>
            </form>
          </section>

          {/* PURCHASES HISTORY */}
          <section className="ds-card">
            <div className="ds-card-header">
              <h2 className="ds-card-title">Historial de Compras ({purchases.length})</h2>
            </div>
            <div className="ds-table-container">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Costo Unitario</th>
                    <th>Costo Total</th>
                    <th>Proveedor</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>
                        No hay compras registradas en el sistema.
                      </td>
                    </tr>
                  ) : (
                    purchases.map((p) => (
                      <tr key={p.id}>
                        <td>{p.purchase_date ? new Date(p.purchase_date).toLocaleDateString('es-CO') : '—'}</td>
                        <td>
                          <strong>{p.product_title}</strong>
                        </td>
                        <td>+{p.quantity}</td>
                        <td>{formatCurrency(Number(p.unit_cost || 0))}</td>
                        <td>
                          <strong>{formatCurrency(Number(p.total_cost || 0))}</strong>
                        </td>
                        <td>{p.supplier || 'General'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: COMBOS COMPUESTOS */}
      {/* ========================================================================= */}
      {activeTab === 'combos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 400px) 1fr', gap: '20px' }}>
          {/* COMBO SELECTOR & COMPONENT ADDER */}
          <section className="ds-card">
            <div className="ds-card-header">
              <h2 className="ds-card-title"><Layers size={18} /> Configurar Combo</h2>
            </div>

            <div className="ds-form-group">
              <label className="ds-form-label">Seleccionar Producto Combo (Padre) *</label>
              <select
                className="ds-select"
                value={selectedComboId}
                onChange={(e) => setSelectedComboId(e.target.value)}
              >
                <option value="">-- Seleccionar producto que se vende como Combo --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.category || 'General'}) - ${Number(p.price || 0).toLocaleString('es-CO')}
                  </option>
                ))}
              </select>
            </div>

            {selectedComboId && (
              <div style={{ marginTop: '16px', borderTop: '1px solid #333', paddingTop: '16px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Agregar Insumo / Componente</h3>
                <div className="ds-form-group">
                  <label className="ds-form-label">Producto Componente</label>
                  <select
                    className="ds-select"
                    value={newComponentId}
                    onChange={(e) => setNewComponentId(e.target.value)}
                  >
                    <option value="">-- Seleccionar ingrediente/producto --</option>
                    {products
                      .filter((p) => String(p.id) !== String(selectedComboId))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} {p.track_stock ? `[Controlado - Stock: ${p.stock}]` : '[Sin control]'}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="ds-form-group" style={{ marginTop: '8px' }}>
                  <label className="ds-form-label">Cantidad que incluye por cada Combo</label>
                  <input
                    className="ds-input"
                    type="number"
                    min="1"
                    step="1"
                    value={newComponentQty}
                    onChange={(e) => setNewComponentQty(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="ds-btn ds-btn-secondary ds-w-full"
                  onClick={handleAddComponentToCombo}
                  style={{ marginTop: '8px' }}
                >
                  <Plus size={16} /> Incluir en la receta del combo
                </button>
              </div>
            )}
          </section>

          {/* ACTIVE COMBO RECIPE */}
          <section className="ds-card">
            <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="ds-card-title">
                  {selectedComboId
                    ? `Componentes de: ${products.find((p) => String(p.id) === String(selectedComboId))?.title || 'Combo'}`
                    : 'Selecciona un combo para ver sus componentes'}
                </h2>
                <p className="ds-text-muted" style={{ fontSize: '13px', margin: 0 }}>
                  Al vender este combo, se descontarán automáticamente solo los componentes que tengan "Controlado = Sí".
                </p>
              </div>
              {selectedComboId && (
                <button className="ds-btn ds-btn-primary ds-btn-sm" onClick={handleSaveCombo} disabled={busy}>
                  <CheckCircle2 size={16} /> Guardar Composición
                </button>
              )}
            </div>

            <div className="ds-table-container" style={{ marginTop: '12px' }}>
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Componente</th>
                    <th>Cantidad en Combo</th>
                    <th>¿Controla Stock?</th>
                    <th>Stock Actual</th>
                    <th>Costo Promedio</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {comboComponents.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>
                        {selectedComboId
                          ? 'Este combo no tiene componentes configurados aún.'
                          : 'Selecciona un combo a la izquierda para empezar a configurar.'}
                      </td>
                    </tr>
                  ) : (
                    comboComponents.map((c) => (
                      <tr key={c.component_product_id}>
                        <td>
                          <strong>{c.component_title}</strong>
                        </td>
                        <td>
                          <span className="ds-badge ds-badge-neutral" style={{ fontSize: '13px' }}>
                            x{c.quantity}
                          </span>
                        </td>
                        <td>
                          <span className={`ds-badge ${c.track_stock ? 'ds-badge-success' : 'ds-badge-neutral'}`}>
                            {c.track_stock ? 'Sí' : 'No'}
                          </span>
                        </td>
                        <td>{c.track_stock ? c.stock : '—'}</td>
                        <td>{c.track_stock ? formatCurrency(Number(c.average_cost || 0)) : '—'}</td>
                        <td>
                          <button
                            className="ds-btn ds-btn-danger ds-btn-sm"
                            type="button"
                            onClick={() => handleRemoveComponent(c.component_product_id)}
                          >
                            <Trash2 size={14} /> Quitar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ALERTAS DE STOCK */}
      {/* ========================================================================= */}
      {activeTab === 'alertas' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* NEGATIVE STOCK */}
          <section className="ds-card" style={{ borderLeft: '4px solid #ef4444' }}>
            <div className="ds-card-header">
              <h2 className="ds-card-title" style={{ color: '#ef4444' }}>
                <ShieldAlert size={18} /> Stock Negativo ({negativeStockProducts.length})
              </h2>
              <p className="ds-text-muted" style={{ fontSize: '13px' }}>
                Productos vendidos sin compra previa registrada. Se debe ingresar la compra para equilibrar el kardex.
              </p>
            </div>
            <div className="ds-table-container">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Déficit</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {negativeStockProducts.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>
                        🎉 No hay productos con stock negativo.
                      </td>
                    </tr>
                  ) : (
                    negativeStockProducts.map((p) => (
                      <tr key={p.id}>
                        <td><strong>{p.title}</strong></td>
                        <td><span className="ds-badge ds-badge-danger">{p.stock} unidades</span></td>
                        <td>
                          <button
                            className="ds-btn ds-btn-sm ds-btn-primary"
                            onClick={() => {
                              setActiveTab('compras');
                              setPurchaseForm((prev) => ({ ...prev, product_id: p.id }));
                            }}
                          >
                            Comprar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* LOW STOCK */}
          <section className="ds-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div className="ds-card-header">
              <h2 className="ds-card-title" style={{ color: '#f59e0b' }}>
                <AlertTriangle size={18} /> Stock Bajo ({lowStockProducts.length})
              </h2>
              <p className="ds-text-muted" style={{ fontSize: '13px' }}>
                Productos próximos a agotarse que han alcanzado su umbral de reorden.
              </p>
            </div>
            <div className="ds-table-container">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Existencias</th>
                    <th>Umbral</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                        No hay productos en nivel crítico.
                      </td>
                    </tr>
                  ) : (
                    lowStockProducts.map((p) => (
                      <tr key={p.id}>
                        <td><strong>{p.title}</strong></td>
                        <td><span className="ds-badge ds-badge-warning">{p.stock}</span></td>
                        <td>{p.low_stock_threshold}</td>
                        <td>
                          <button
                            className="ds-btn ds-btn-sm ds-btn-primary"
                            onClick={() => {
                              setActiveTab('compras');
                              setPurchaseForm((prev) => ({ ...prev, product_id: p.id }));
                            }}
                          >
                            Comprar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT PRODUCT TRACKING */}
      {/* ========================================================================= */}
      {selected && (
        <div className="ds-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setSelected(undefined)}>
          <div className="ds-modal ds-modal-lg inventory-modal">
            <div className="ds-modal-header">
              <div>
                <h2 className="ds-modal-title">{selected.title}</h2>
                <p className="ds-text-muted">
                  Existencia actual: {selected.stock || 0} {selected.inventory_unit || 'unidad'} · Costo prom:{' '}
                  {formatCurrency(Number(selected.average_cost || 0))}
                </p>
              </div>
              <button className="ds-icon-btn" onClick={() => setSelected(undefined)}>
                <X />
              </button>
            </div>
            <div className="ds-modal-body inventory-modal-grid">
              <section className="inventory-panel">
                <h3><Archive size={18} /> Control de Stock</h3>
                <label className="ds-checkbox" style={{ margin: '12px 0' }}>
                  <input
                    type="checkbox"
                    checked={settings.track_stock}
                    onChange={(e) => setSettings({ ...settings, track_stock: e.target.checked })}
                  />
                  <span>Controlar inventario (descontar automáticamente en ventas)</span>
                </label>

                <div className="user-form-grid">
                  <label className="ds-form-group">
                    <span className="ds-form-label">Stock mínimo de alerta</span>
                    <input
                      className="ds-input"
                      type="number"
                      min="0"
                      value={settings.low_stock_threshold}
                      onChange={(e) => setSettings({ ...settings, low_stock_threshold: e.target.value })}
                    />
                  </label>
                  <label className="ds-form-group">
                    <span className="ds-form-label">Unidad de medida</span>
                    <input
                      className="ds-input"
                      value={settings.inventory_unit}
                      onChange={(e) => setSettings({ ...settings, inventory_unit: e.target.value })}
                    />
                  </label>
                </div>

                <div className="user-form-grid" style={{ marginTop: '8px' }}>
                  <label className="ds-form-group">
                    <span className="ds-form-label">Costo Promedio Actual ($)</span>
                    <input
                      className="ds-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.average_cost}
                      onChange={(e) => setSettings({ ...settings, average_cost: e.target.value })}
                    />
                    <small style={{ color: '#888', marginTop: '4px' }}>
                      Se actualiza automáticamente con cada compra registrada.
                    </small>
                  </label>
                </div>

                <button className="ds-btn ds-btn-primary ds-w-full" onClick={saveProductSettings} disabled={busy} style={{ marginTop: '16px' }}>
                  Guardar configuración
                </button>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
