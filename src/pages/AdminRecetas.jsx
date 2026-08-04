import { BASE_URL as API_URL } from '../config/api';
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Search, ArrowRight, TrendingUp, AlertCircle } from 'lucide-react';

export default function AdminRecetas() {
  const [products, setProducts] = useState([]);
  const [rendimientos, setRendimientos] = useState([]);
  const [recipesCosts, setRecipesCosts] = useState([]);
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentRecipe, setCurrentRecipe] = useState([]);
  
  const [newIngredientId, setNewIngredientId] = useState('');
  const [cantidadUsada, setCantidadUsada] = useState('');
  
  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  });

  const fetchData = async () => {
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const [resProducts, resRendimientos, resCosts] = await Promise.all([
        fetch(`${API_URL}/api/pedidos/admin/products`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/pedidos/admin/rendimientos`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/pedidos/admin/recipes`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const jsonP = await resProducts.json();
      const jsonR = await resRendimientos.json();
      const jsonC = await resCosts.json();
      
      if (jsonP.status === 'ok') setProducts(jsonP.products.filter(p => p.status === 'Activo'));
      if (jsonR.status === 'ok') setRendimientos(jsonR.data || []);
      if (jsonC.status === 'ok') setRecipesCosts(jsonC.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const loadRecipe = async (productId) => {
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const res = await fetch(`${API_URL}/api/pedidos/admin/recipes/${productId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setCurrentRecipe(json.data || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    loadRecipe(product.id);
  };

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !newIngredientId || !cantidadUsada) return;

    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const res = await fetch(`${API_URL}/api/pedidos/admin/recipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          rendimiento_id: newIngredientId,
          cantidad_usada: cantidadUsada
        })
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setNewIngredientId('');
        setCantidadUsada('');
        loadRecipe(selectedProduct.id);
        fetchData(); // Refresh general costs
      } else {
        alert("Error al agregar ingrediente: " + (json.error || "Error desconocido"));
      }
    } catch (error) {
      alert("Error de conexión: " + error.message);
    }
  };

  const handleDeleteIngredient = async (recipeId) => {
    if (!window.confirm('¿Eliminar ingrediente de la receta?')) return;
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      await fetch(`${API_URL}/api/pedidos/admin/recipes/${recipeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      loadRecipe(selectedProduct.id);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  // Cálculos Financieros
  const totalCost = currentRecipe.reduce((sum, item) => sum + Number(item.costo_calculado), 0);
  const salePrice = selectedProduct ? selectedProduct.price : 0;
  const profit = salePrice - totalCost;
  const margin = salePrice > 0 ? ((profit / salePrice) * 100).toFixed(1) : 0;

  return (
    <div className="ds-page">
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title" style={{ color: '#D4A017' }}>Creador de Recetas</h1>
          <p className="ds-page-subtitle">Configura los ingredientes de cada producto para calcular tu rentabilidad automáticamente.</p>
        </div>
      </div>

      <div className="admin-recetas-grid">
        
        {/* COLUMNA IZQUIERDA: LISTA DE PRODUCTOS */}
        <div className="ds-card admin-recetas-sidebar">
          <div className="ds-card-header">
            <h3 style={{ margin: 0 }}>Selecciona un Producto</h3>
          </div>
          <div className="ds-card-body" style={{ padding: 0, maxHeight: '600px', overflowY: 'auto' }}>
            {products.map(p => {
              const costData = recipesCosts.find(rc => rc.product_id === p.id);
              const cost = costData ? Number(costData.total_cost) : 0;
              const isSelected = selectedProduct?.id === p.id;
              
              return (
                <div 
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  className={`admin-recetas-product-item ${isSelected ? 'active' : ''}`}
                >
                  <div>
                    <strong className="product-title">{p.title}</strong>
                    <span className="product-price">Precio: {formatter.format(p.price)}</span>
                  </div>
                  {cost > 0 ? (
                    <div className="product-costs">
                      <span className="cost-label">Costo: {formatter.format(cost)}</span>
                      <span className="profit-label">Ganancia: {formatter.format(p.price - cost)}</span>
                    </div>
                  ) : (
                    <span className="no-recipe-label">Sin receta</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMNA DERECHA: CONSTRUCTOR DE RECETA */}
        {selectedProduct ? (
          <div className="admin-recetas-main">
            
            {/* TARJETA FINANCIERA DORADA */}
            <div className="ds-card admin-recetas-finance-card">
              <div className="finance-bg-icon">
                <TrendingUp size={150} color="#D4A017" />
              </div>
              
              <h2 className="finance-title">
                {selectedProduct.title}
                <span className="finance-badge">Rentabilidad Activa</span>
              </h2>
              
              <div className="ds-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                <div className="ds-stat-card" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: 'none' }}>
                  <div className="ds-stat-label">Precio de Venta</div>
                  <div className="ds-stat-value">{formatter.format(salePrice)}</div>
                </div>
                <div className="ds-stat-card" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div className="ds-stat-label" style={{ color: '#EF4444' }}>Costo Producción</div>
                  <div className="ds-stat-value" style={{ color: '#EF4444' }}>{formatter.format(totalCost)}</div>
                </div>
                <div className="ds-stat-card" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div className="ds-stat-label" style={{ color: '#10B981' }}>Ganancia Neta</div>
                  <div className="ds-stat-value" style={{ color: '#10B981' }}>{formatter.format(profit)}</div>
                </div>
                <div className="ds-stat-card" style={{ backgroundColor: 'rgba(212, 160, 23, 0.1)', border: '1px solid rgba(212, 160, 23, 0.3)' }}>
                  <div className="ds-stat-label" style={{ color: '#D4A017' }}>Margen (ROI)</div>
                  <div className="ds-stat-value" style={{ color: '#D4A017' }}>{margin}%</div>
                </div>
              </div>
            </div>

            {/* CREADOR DE INGREDIENTES */}
            <div className="ds-card">
              <div className="ds-card-header">
                <h3>Agregar Ingrediente</h3>
              </div>
              <div className="ds-card-body">
                <form onSubmit={handleAddIngredient} className="ds-form-grid" style={{ alignItems: 'flex-end' }}>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Ingrediente (Del panel de Rendimientos)</label>
                    <select 
                      value={newIngredientId} 
                      onChange={e => setNewIngredientId(e.target.value)} 
                      required
                      className="ds-select"
                    >
                      <option value="">-- Seleccionar --</option>
                      {rendimientos.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.ingrediente_name} (1 {r.unidad_consumo} = {formatter.format(r.costo_por_unidad)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Cantidad Usada</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={cantidadUsada}
                      onChange={e => setCantidadUsada(e.target.value)}
                      placeholder="Ej: 100"
                      className="ds-input"
                    />
                  </div>
                  <div className="ds-form-group">
                    <button type="submit" className="ds-btn ds-btn-primary ds-btn-full">
                      <Plus size={20} /> Agregar
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* TABLA DE LA RECETA */}
            <div className="ds-card">
              <div className="ds-table-container hide-on-mobile">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>INGREDIENTE</th>
                      <th>CANTIDAD</th>
                      <th style={{ textAlign: 'right' }}>COSTO</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecipe.map((item) => (
                      <tr key={item.id}>
                        <td>{item.ingrediente_name}</td>
                        <td>{item.cantidad_usada} {item.unidad_consumo}</td>
                        <td style={{ textAlign: 'right', color: '#EF4444', fontWeight: '700' }}>{formatter.format(item.costo_calculado)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => handleDeleteIngredient(item.id)} className="ds-btn-icon ds-btn-ghost" style={{ color: '#EF4444' }}>
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {currentRecipe.length === 0 && (
                      <tr>
                        <td colSpan="4" className="ds-empty-state">
                          <AlertCircle size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                          No hay ingredientes en esta receta.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards view */}
              <div className="ds-table-cards show-on-mobile">
                {currentRecipe.map((item) => (
                  <div key={item.id} className="ds-table-card">
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">INGREDIENTE</span>
                      <span className="ds-table-card-value">{item.ingrediente_name}</span>
                    </div>
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">CANTIDAD</span>
                      <span className="ds-table-card-value">{item.cantidad_usada} {item.unidad_consumo}</span>
                    </div>
                    <div className="ds-table-card-row">
                      <span className="ds-table-card-label">COSTO</span>
                      <span className="ds-table-card-value" style={{ color: '#EF4444', fontWeight: '700' }}>{formatter.format(item.costo_calculado)}</span>
                    </div>
                    <div className="ds-table-card-actions">
                      <button onClick={() => handleDeleteIngredient(item.id)} className="ds-btn ds-btn-danger ds-btn-sm ds-btn-full">
                        <Trash2 size={16} /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                {currentRecipe.length === 0 && (
                  <div className="ds-empty-state">
                    <AlertCircle size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                    No hay ingredientes en esta receta.
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="ds-card ds-empty-state admin-recetas-empty">
            <ArrowRight size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h3>Selecciona un Producto</h3>
            <p>Haz clic en cualquier producto de la lista izquierda<br/>para empezar a armar su receta.</p>
          </div>
        )}
      </div>

      <style>{`
        .admin-recetas-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 24px; align-items: start; }
        @media (max-width: 768px) {
          .admin-recetas-grid { grid-template-columns: 1fr; }
          .hide-on-mobile { display: none !important; }
          .show-on-mobile { display: flex !important; flex-direction: column; gap: 16px; padding: 16px; }
        }
        @media (min-width: 769px) {
          .show-on-mobile { display: none !important; }
        }

        .admin-recetas-product-item { padding: 16px 20px; border-bottom: 1px solid #333; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; border-left: 4px solid transparent; }
        .admin-recetas-product-item:hover { background-color: rgba(255,255,255,0.05); }
        .admin-recetas-product-item.active { background-color: #1A1A1A; border-left: 4px solid #D4A017; }
        .admin-recetas-product-item .product-title { display: block; margin-bottom: 4px; color: #FFF; }
        .admin-recetas-product-item.active .product-title { color: #D4A017; }
        .admin-recetas-product-item .product-price { font-size: 12px; color: #888; }
        .admin-recetas-product-item .product-costs { text-align: right; font-size: 12px; }
        .admin-recetas-product-item .cost-label { color: #EF4444; display: block; }
        .admin-recetas-product-item .profit-label { color: #10B981; font-weight: 700; }
        .admin-recetas-product-item .no-recipe-label { color: #888; font-size: 12px; font-style: italic; }

        .admin-recetas-main { display: flex; flex-direction: column; gap: 24px; }
        
        .admin-recetas-finance-card { background: linear-gradient(135deg, #1A1A1A 0%, #0D0D0D 100%); border: 1px solid #D4A017; position: relative; overflow: hidden; box-shadow: 0 10px 30px rgba(212, 160, 23, 0.1); }
        .finance-bg-icon { position: absolute; top: -20px; right: -20px; opacity: 0.05; transform: rotate(15deg); }
        .finance-title { margin: 0 0 20px 0; color: #FFF; font-size: 24px; display: flex; align-items: center; gap: 12px; z-index: 1; position: relative; }
        .finance-badge { font-size: 12px; background-color: #333; padding: 4px 12px; border-radius: 20px; font-weight: 600; }
        
        .admin-recetas-empty { min-height: 400px; display: flex; flex-direction: column; justify-content: center; }
      `}</style>
    </div>
  );
}
