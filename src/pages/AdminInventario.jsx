import React, { useCallback, useEffect, useState } from 'react';
import {
  Archive, Boxes, Edit3, Plus, Search, X, ShoppingCart, Layers, DollarSign,
  Trash2, CheckCircle2, ShieldAlert, Utensils
} from 'lucide-react';
import { API_URL } from '../config/api';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export default function AdminInventario() {
  const { fetchAuth } = useAuth();
  
  const [activeTab, setActiveTab] = useState('insumos'); 
  const [query, setQuery] = useState('');
  
  const [insumos, setInsumos] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [combos, setCombos] = useState([]);
  const [movements, setMovements] = useState([]);
  
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Insumo form
  const [insumoModal, setInsumoModal] = useState(false);
  const [insumoForm, setInsumoForm] = useState({ id: null, name: '', unit: 'unidad', track_stock: true, min_stock: 5, unit_cost: 0 });

  // Purchase form
  const [purchaseForm, setPurchaseForm] = useState({
    inventory_id: '',
    quantity: 1,
    unit_cost: '',
    total_cost: '',
    supplier: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  // Recipe form
  const [selectedRecipeProduct, setSelectedRecipeProduct] = useState('');
  const [recipeComponents, setRecipeComponents] = useState([]);
  const [newRecipeInsumo, setNewRecipeInsumo] = useState('');
  const [newRecipeQty, setNewRecipeQty] = useState(1);

  // Combo form
  const [selectedComboId, setSelectedComboId] = useState('');
  const [comboComponents, setComboComponents] = useState([]);
  const [newComboComponent, setNewComboComponent] = useState('');
  const [newComboQty, setNewComboQty] = useState(1);

  // ==========================================
  // DATA LOADERS
  // ==========================================
  const loadInsumos = useCallback(async () => {
    try {
      const res = await fetchAuth(`${API_URL}/admin/inventory`);
      const data = await res.json();
      if (res.ok) setInsumos(data.data || data.inventory || []);
    } catch (err) { console.error(err); }
  }, [fetchAuth]);

  const loadPurchases = useCallback(async () => {
    try {
      const res = await fetchAuth(`${API_URL}/admin/inventory-purchases`);
      const data = await res.json();
      if (res.ok) setPurchases(data.data || data.purchases || []);
    } catch (err) { console.error(err); }
  }, [fetchAuth]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetchAuth(`${API_URL}/admin/products`);
      const data = await res.json();
      if (res.ok) setProducts(data.data || data.products || []);
    } catch (err) { console.error(err); }
  }, [fetchAuth]);

  const loadRecipes = useCallback(async () => {
    try {
      const res = await fetchAuth(`${API_URL}/admin/recipes`);
      const data = await res.json();
      if (res.ok) setRecipes(data.data || data.recipes || []);
    } catch (err) { console.error(err); }
  }, [fetchAuth]);

  const loadCombos = useCallback(async () => {
    try {
      const res = await fetchAuth(`${API_URL}/admin/combos`);
      const data = await res.json();
      if (res.ok) setCombos(data.data || data.combos || []);
    } catch (err) { console.error(err); }
  }, [fetchAuth]);

  const loadMovements = useCallback(async () => {
    try {
      const res = await fetchAuth(`${API_URL}/admin/stock-movements?limit=150`);
      const data = await res.json();
      if (res.ok) setMovements(data.data || data.movements || []);
    } catch (err) { console.error(err); }
  }, [fetchAuth]);

  const reloadAll = useCallback(async () => {
    setBusy(true);
    await Promise.all([
      loadInsumos(),
      loadPurchases(),
      loadProducts(),
      loadRecipes(),
      loadCombos(),
      loadMovements()
    ]);
    setBusy(false);
  }, [loadInsumos, loadPurchases, loadProducts, loadRecipes, loadCombos, loadMovements]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  // Sync recipes when selection changes
  useEffect(() => {
    if (!selectedRecipeProduct) {
      setRecipeComponents([]);
      return;
    }
    const found = recipes.filter(r => String(r.product_id) === String(selectedRecipeProduct));
    setRecipeComponents(found);
  }, [selectedRecipeProduct, recipes]);

  // Sync combos when selection changes
  useEffect(() => {
    if (!selectedComboId) {
      setComboComponents([]);
      return;
    }
    const found = combos.find((c) => String(c.combo_product_id) === String(selectedComboId));
    if (found && Array.isArray(found.components)) {
      setComboComponents(found.components);
    } else {
      setComboComponents([]);
    }
  }, [selectedComboId, combos]);


  // ==========================================
  // ACTIONS: INSUMOS (TAB 1)
  // ==========================================
  const handleOpenInsumo = (insumo = null) => {
    if (insumo) {
      setInsumoForm({ ...insumo });
    } else {
      setInsumoForm({ id: null, name: '', unit: 'unidad', track_stock: true, min_stock: 5, unit_cost: 0 });
    }
    setInsumoModal(true);
  };

  const handleSaveInsumo = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const method = insumoForm.id ? 'PUT' : 'POST';
      const url = insumoForm.id ? `${API_URL}/admin/inventory/${insumoForm.id}` : `${API_URL}/admin/inventory`;
      
      const res = await fetchAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(insumoForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando insumo');
      
      setMessage({ type: 'success', text: 'Insumo guardado correctamente.' });
      setInsumoModal(false);
      loadInsumos();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  // ==========================================
  // ACTIONS: COMPRAS (TAB 2)
  // ==========================================
  const handlePurchaseQtyChange = (qty) => {
    const q = Number(qty);
    const u = Number(purchaseForm.unit_cost);
    setPurchaseForm(prev => ({
      ...prev,
      quantity: q,
      total_cost: q > 0 && u >= 0 ? Math.round(q * u) : prev.total_cost,
    }));
  };

  const handlePurchaseUnitCostChange = (unitCost) => {
    const u = Number(unitCost);
    const q = Number(purchaseForm.quantity);
    setPurchaseForm(prev => ({
      ...prev,
      unit_cost: unitCost,
      total_cost: q > 0 && u >= 0 ? Math.round(q * u) : prev.total_cost,
    }));
  };

  const handlePurchaseTotalCostChange = (totalCost) => {
    const t = Number(totalCost);
    const q = Number(purchaseForm.quantity);
    setPurchaseForm(prev => ({
      ...prev,
      total_cost: totalCost,
      unit_cost: q > 0 && t >= 0 ? Math.round((t / q) * 100) / 100 : prev.unit_cost,
    }));
  };

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    if (!purchaseForm.inventory_id) return setMessage({ type: 'error', text: 'Selecciona un insumo' });
    setBusy(true);
    try {
      const res = await fetchAuth(`${API_URL}/admin/inventory-purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando compra');
      
      setMessage({ type: 'success', text: 'Compra registrada exitosamente.' });
      setPurchaseForm({
        inventory_id: '', quantity: 1, unit_cost: '', total_cost: '',
        supplier: '', purchase_date: new Date().toISOString().slice(0, 10), notes: '',
      });
      reloadAll();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  // ==========================================
  // ACTIONS: RECETAS (TAB 3)
  // ==========================================
  const handleAddRecipeInsumo = async () => {
    if (!selectedRecipeProduct || !newRecipeInsumo) return setMessage({ type: 'error', text: 'Selecciona producto e insumo.' });
    setBusy(true);
    try {
      const res = await fetchAuth(`${API_URL}/admin/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedRecipeProduct,
          inventory_id: newRecipeInsumo,
          quantity: newRecipeQty
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error agregando receta');
      }
      setMessage({ type: 'success', text: 'Insumo agregado a la receta.' });
      setNewRecipeInsumo('');
      setNewRecipeQty(1);
      loadRecipes();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveRecipe = async (recipeId) => {
    setBusy(true);
    try {
      const res = await fetchAuth(`${API_URL}/admin/recipes/${recipeId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error eliminando receta');
      loadRecipes();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  // ==========================================
  // ACTIONS: COMBOS (TAB 4)
  // ==========================================
  const handleAddComboComponent = () => {
    if (!newComboComponent) return setMessage({ type: 'error', text: 'Selecciona componente' });
    const compProduct = products.find(p => String(p.id) === String(newComboComponent));
    if (!compProduct) return;
    
    setComboComponents(prev => [
      ...prev,
      {
        component_product_id: compProduct.id,
        component_title: compProduct.title || compProduct.name,
        quantity: Number(newComboQty) > 0 ? Number(newComboQty) : 1
      }
    ]);
    setNewComboComponent('');
    setNewComboQty(1);
  };

  const handleRemoveComboComponent = (compId) => {
    setComboComponents(prev => prev.filter(c => String(c.component_product_id) !== String(compId)));
  };

  const handleSaveCombo = async () => {
    if (!selectedComboId || comboComponents.length === 0) return setMessage({ type: 'error', text: 'Faltan datos' });
    setBusy(true);
    try {
      const res = await fetchAuth(`${API_URL}/admin/combos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          combo_product_id: selectedComboId,
          components: comboComponents.map(c => ({
            component_product_id: c.component_product_id,
            quantity: c.quantity
          }))
        })
      });
      if (!res.ok) throw new Error('Error guardando combo');
      setMessage({ type: 'success', text: 'Combo guardado' });
      loadCombos();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ds-page inventory-page">
      <header className="ds-page-header">
        <div>
          <span className="ds-eyebrow">Gestión Operativa & Costos</span>
          <h1 className="ds-page-title">Inventario & Recetas</h1>
          <p className="ds-page-subtitle">
            Gestión de Insumos físicos, Compras, Recetas de productos, Combos y Kardex.
          </p>
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

      {/* TABS */}
      <div className="ds-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button className={`ds-btn ds-btn-sm ${activeTab === 'insumos' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setActiveTab('insumos')}>
          <Boxes size={16} /> Insumos ({insumos.length})
        </button>
        <button className={`ds-btn ds-btn-sm ${activeTab === 'compras' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setActiveTab('compras')}>
          <ShoppingCart size={16} /> Compras ({purchases.length})
        </button>
        <button className={`ds-btn ds-btn-sm ${activeTab === 'recetas' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setActiveTab('recetas')}>
          <Utensils size={16} /> Recetas
        </button>
        <button className={`ds-btn ds-btn-sm ${activeTab === 'combos' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setActiveTab('combos')}>
          <Layers size={16} /> Combos ({combos.length})
        </button>
        <button className={`ds-btn ds-btn-sm ${activeTab === 'movimientos' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setActiveTab('movimientos')}>
          <Archive size={16} /> Movimientos ({movements.length})
        </button>
      </div>

      {/* TAB 1: INSUMOS */}
      {activeTab === 'insumos' && (
        <section className="ds-card">
          <div className="inventory-toolbar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div className="ds-search" style={{ flex: 1, maxWidth: '400px' }}>
              <Search size={20} className="ds-search-icon" />
              <input
                type="text"
                placeholder="Buscar insumo..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="ds-search-input ds-input"
              />
            </div>
            <button className="ds-btn ds-btn-primary" onClick={() => handleOpenInsumo()}>
              <Plus size={16} /> Nuevo Insumo
            </button>
          </div>
          
          <div className="ds-table-container">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Unidad</th>
                  <th>Controlado</th>
                  <th>Stock Actual</th>
                  <th>Costo Prom.</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {insumos.filter(i => (i.name || '').toLowerCase().includes(query.toLowerCase())).map(insumo => (
                  <tr key={insumo.id}>
                    <td><strong>{insumo.name}</strong></td>
                    <td>{insumo.unit}</td>
                    <td>
                      <span className={`ds-badge ${insumo.track_stock ? 'ds-badge-success' : 'ds-badge-neutral'}`}>
                        {insumo.track_stock ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td>{insumo.stock || 0}</td>
                    <td>{formatCurrency(Number(insumo.unit_cost || 0))}</td>
                    <td>
                      <button className="ds-btn ds-btn-secondary ds-btn-sm" onClick={() => handleOpenInsumo(insumo)}>
                        <Edit3 size={15} /> Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: COMPRAS */}
      {activeTab === 'compras' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 400px) 1fr', gap: '20px' }}>
          <section className="ds-card">
            <div className="ds-card-header"><h2 className="ds-card-title"><ShoppingCart size={18} /> Registrar Compra</h2></div>
            <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="ds-form-group">
                <label className="ds-form-label">Insumo *</label>
                <select className="ds-select" value={purchaseForm.inventory_id} onChange={e => setPurchaseForm({...purchaseForm, inventory_id: e.target.value})} required>
                  <option value="">-- Seleccionar --</option>
                  {insumos.map(i => <option key={i.id} value={i.id}>{i.name} (Stock: {i.stock})</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="ds-form-group">
                  <label className="ds-form-label">Cantidad *</label>
                  <input className="ds-input" type="number" step="0.01" min="0.01" value={purchaseForm.quantity} onChange={e => handlePurchaseQtyChange(e.target.value)} required />
                </div>
                <div className="ds-form-group">
                  <label className="ds-form-label">Fecha</label>
                  <input className="ds-input" type="date" value={purchaseForm.purchase_date} onChange={e => setPurchaseForm({...purchaseForm, purchase_date: e.target.value})} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="ds-form-group">
                  <label className="ds-form-label">Costo Unit. ($)</label>
                  <input className="ds-input" type="number" step="0.01" min="0" value={purchaseForm.unit_cost} onChange={e => handlePurchaseUnitCostChange(e.target.value)} />
                </div>
                <div className="ds-form-group">
                  <label className="ds-form-label">Costo Total ($) *</label>
                  <input className="ds-input" type="number" step="0.01" min="0" value={purchaseForm.total_cost} onChange={e => handlePurchaseTotalCostChange(e.target.value)} required />
                </div>
              </div>
              <div className="ds-form-group">
                <label className="ds-form-label">Proveedor</label>
                <input className="ds-input" type="text" value={purchaseForm.supplier} onChange={e => setPurchaseForm({...purchaseForm, supplier: e.target.value})} />
              </div>
              <div className="ds-form-group">
                <label className="ds-form-label">Notas</label>
                <textarea className="ds-textarea" value={purchaseForm.notes} onChange={e => setPurchaseForm({...purchaseForm, notes: e.target.value})} />
              </div>
              <button className="ds-btn ds-btn-primary" type="submit" disabled={busy}><CheckCircle2 size={16} /> Guardar Compra</button>
            </form>
          </section>
          <section className="ds-card">
            <div className="ds-card-header"><h2 className="ds-card-title">Historial de Compras</h2></div>
            <div className="ds-table-container">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Fecha</th><th>Insumo</th><th>Cantidad</th><th>Costo Total</th><th>Proveedor</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map(p => (
                    <tr key={p.id}>
                      <td>{p.purchase_date ? new Date(p.purchase_date).toLocaleDateString('es-CO') : '—'}</td>
                      <td><strong>{p.inventory_name || p.insumo_name || 'Insumo'}</strong></td>
                      <td>+{p.quantity}</td>
                      <td>{formatCurrency(Number(p.total_cost || 0))}</td>
                      <td>{p.supplier || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: RECETAS */}
      {activeTab === 'recetas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 400px) 1fr', gap: '20px' }}>
          <section className="ds-card">
            <div className="ds-card-header"><h2 className="ds-card-title"><Utensils size={18} /> Configurar Receta</h2></div>
            <div className="ds-form-group">
              <label className="ds-form-label">Producto de Venta *</label>
              <select className="ds-select" value={selectedRecipeProduct} onChange={e => setSelectedRecipeProduct(e.target.value)}>
                <option value="">-- Seleccionar Producto --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.title || p.name}</option>)}
              </select>
            </div>
            {selectedRecipeProduct && (
              <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Agregar Insumo a la Receta</h3>
                <div className="ds-form-group">
                  <label className="ds-form-label">Insumo</label>
                  <select className="ds-select" value={newRecipeInsumo} onChange={e => setNewRecipeInsumo(e.target.value)}>
                    <option value="">-- Seleccionar Insumo --</option>
                    {insumos.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div className="ds-form-group" style={{ marginTop: '8px' }}>
                  <label className="ds-form-label">Cantidad necesaria</label>
                  <input className="ds-input" type="number" step="0.01" min="0.01" value={newRecipeQty} onChange={e => setNewRecipeQty(e.target.value)} />
                </div>
                <button type="button" className="ds-btn ds-btn-secondary ds-w-full" onClick={handleAddRecipeInsumo} style={{ marginTop: '8px' }} disabled={busy}>
                  <Plus size={16} /> Añadir a receta
                </button>
              </div>
            )}
          </section>
          
          <section className="ds-card">
            <div className="ds-card-header"><h2 className="ds-card-title">Componentes de Receta</h2></div>
            <div className="ds-table-container">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Cantidad</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {recipeComponents.length === 0 ? (
                    <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Sin componentes o seleccione producto.</td></tr>
                  ) : (
                    recipeComponents.map(rc => (
                      <tr key={rc.id}>
                        <td><strong>{rc.inventory_name || rc.insumo_name || 'Insumo'}</strong></td>
                        <td>{rc.quantity}</td>
                        <td>
                          <button className="ds-btn ds-btn-danger ds-btn-sm" onClick={() => handleRemoveRecipe(rc.id)} disabled={busy}><Trash2 size={14} /></button>
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

      {/* TAB 4: COMBOS */}
      {activeTab === 'combos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 400px) 1fr', gap: '20px' }}>
          <section className="ds-card">
            <div className="ds-card-header"><h2 className="ds-card-title"><Layers size={18} /> Configurar Combo</h2></div>
            <div className="ds-form-group">
              <label className="ds-form-label">Producto Combo (Padre) *</label>
              <select className="ds-select" value={selectedComboId} onChange={e => setSelectedComboId(e.target.value)}>
                <option value="">-- Seleccionar --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.title || p.name}</option>)}
              </select>
            </div>
            {selectedComboId && (
              <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                <div className="ds-form-group">
                  <label className="ds-form-label">Producto Componente</label>
                  <select className="ds-select" value={newComboComponent} onChange={e => setNewComboComponent(e.target.value)}>
                    <option value="">-- Seleccionar --</option>
                    {products.filter(p => String(p.id) !== String(selectedComboId)).map(p => <option key={p.id} value={p.id}>{p.title || p.name}</option>)}
                  </select>
                </div>
                <div className="ds-form-group" style={{ marginTop: '8px' }}>
                  <label className="ds-form-label">Cantidad</label>
                  <input className="ds-input" type="number" step="1" min="1" value={newComboQty} onChange={e => setNewComboQty(e.target.value)} />
                </div>
                <button type="button" className="ds-btn ds-btn-secondary ds-w-full" onClick={handleAddComboComponent} style={{ marginTop: '8px' }}>
                  <Plus size={16} /> Añadir componente
                </button>
              </div>
            )}
          </section>
          
          <section className="ds-card">
            <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="ds-card-title">Componentes del Combo</h2>
              {selectedComboId && <button className="ds-btn ds-btn-primary ds-btn-sm" onClick={handleSaveCombo} disabled={busy}><CheckCircle2 size={16} /> Guardar</button>}
            </div>
            <div className="ds-table-container">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {comboComponents.map(c => (
                    <tr key={c.component_product_id}>
                      <td><strong>{c.component_title}</strong></td>
                      <td>x{c.quantity}</td>
                      <td>
                        <button className="ds-btn ds-btn-danger ds-btn-sm" onClick={() => handleRemoveComboComponent(c.component_product_id)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 5: MOVIMIENTOS */}
      {activeTab === 'movimientos' && (
        <section className="ds-card">
          <div className="ds-card-header"><h2 className="ds-card-title"><Archive size={18} /> Kardex / Movimientos</h2></div>
          <div className="ds-table-container">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Insumo</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id}>
                    <td>{formatDateTime(m.created_at)}</td>
                    <td><strong>{m.inventory_name || m.insumo_name || 'Insumo'}</strong></td>
                    <td>{m.movement_type}</td>
                    <td style={{ color: Number(m.quantity) > 0 ? '#10b981' : '#ef4444' }}>
                      {Number(m.quantity) > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td>{m.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* INSUMO MODAL */}
      {insumoModal && (
        <div className="ds-modal-overlay" onMouseDown={e => e.target === e.currentTarget && setInsumoModal(false)}>
          <div className="ds-modal ds-modal-lg">
            <div className="ds-modal-header">
              <h2 className="ds-modal-title">{insumoForm.id ? 'Editar Insumo' : 'Nuevo Insumo'}</h2>
              <button className="ds-icon-btn" onClick={() => setInsumoModal(false)}><X /></button>
            </div>
            <div className="ds-modal-body">
              <form onSubmit={handleSaveInsumo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="ds-form-group">
                  <label className="ds-form-label">Nombre *</label>
                  <input className="ds-input" required value={insumoForm.name} onChange={e => setInsumoForm({...insumoForm, name: e.target.value})} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Unidad de Medida (Ej: kg, litro, unidad)</label>
                    <input className="ds-input" required value={insumoForm.unit} onChange={e => setInsumoForm({...insumoForm, unit: e.target.value})} />
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Stock Mínimo</label>
                    <input className="ds-input" type="number" min="0" value={insumoForm.min_stock} onChange={e => setInsumoForm({...insumoForm, min_stock: e.target.value})} />
                  </div>
                </div>
                <label className="ds-checkbox">
                  <input type="checkbox" checked={insumoForm.track_stock} onChange={e => setInsumoForm({...insumoForm, track_stock: e.target.checked})} />
                  <span>Controlar Stock (Restar automáticamente)</span>
                </label>
                <div className="ds-form-group">
                  <label className="ds-form-label">Costo Unitario Referencia</label>
                  <input className="ds-input" type="number" step="0.01" min="0" value={insumoForm.unit_cost} onChange={e => setInsumoForm({...insumoForm, unit_cost: e.target.value})} />
                </div>
                <button className="ds-btn ds-btn-primary ds-w-full" type="submit" disabled={busy}>Guardar Insumo</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
