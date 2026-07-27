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
    <div style={{ padding: '24px', backgroundColor: '#0D0D0D', minHeight: '100vh', color: '#FFF' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '800', color: '#D4A017' }}>Creador de Recetas</h1>
        <p style={{ margin: 0, color: '#BDBDBD' }}>Configura los ingredientes de cada producto para calcular tu rentabilidad automáticamente.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
        
        {/* COLUMNA IZQUIERDA: LISTA DE PRODUCTOS */}
        <div style={{ backgroundColor: '#111', borderRadius: '16px', border: '1px solid #333', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #333', backgroundColor: '#1A1A1A' }}>
            <h3 style={{ margin: 0, color: '#FFF', fontWeight: '700' }}>Selecciona un Producto</h3>
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {products.map(p => {
              const costData = recipesCosts.find(rc => rc.product_id === p.id);
              const cost = costData ? Number(costData.total_cost) : 0;
              const isSelected = selectedProduct?.id === p.id;
              
              return (
                <div 
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  style={{ 
                    padding: '16px 20px', 
                    borderBottom: '1px solid #333', 
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#1A1A1A' : 'transparent',
                    borderLeft: isSelected ? '4px solid #D4A017' : '4px solid transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <div>
                    <strong style={{ display: 'block', color: isSelected ? '#D4A017' : '#FFF', marginBottom: '4px' }}>{p.title}</strong>
                    <span style={{ fontSize: '12px', color: '#888' }}>Precio: {formatter.format(p.price)}</span>
                  </div>
                  {cost > 0 ? (
                    <div style={{ textAlign: 'right', fontSize: '12px' }}>
                      <span style={{ color: '#EF4444', display: 'block' }}>Costo: {formatter.format(cost)}</span>
                      <span style={{ color: '#10B981', fontWeight: '700' }}>Ganancia: {formatter.format(p.price - cost)}</span>
                    </div>
                  ) : (
                    <span style={{ color: '#888', fontSize: '12px', fontStyle: 'italic' }}>Sin receta</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMNA DERECHA: CONSTRUCTOR DE RECETA */}
        {selectedProduct ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* TARJETA FINANCIERA DORADA */}
            <div style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #0D0D0D 100%)', borderRadius: '16px', border: '1px solid #D4A017', padding: '24px', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px rgba(212, 160, 23, 0.1)' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.05, transform: 'rotate(15deg)' }}>
                <TrendingUp size={150} color="#D4A017" />
              </div>
              
              <h2 style={{ margin: '0 0 20px 0', color: '#FFF', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {selectedProduct.title}
                <span style={{ fontSize: '12px', backgroundColor: '#333', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' }}>Rentabilidad Activa</span>
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                  <p style={{ margin: '0 0 8px 0', color: '#BDBDBD', fontSize: '13px' }}>Precio de Venta</p>
                  <div style={{ color: '#FFF', fontSize: '20px', fontWeight: '800' }}>{formatter.format(salePrice)}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <p style={{ margin: '0 0 8px 0', color: '#EF4444', fontSize: '13px' }}>Costo Producción</p>
                  <div style={{ color: '#EF4444', fontSize: '20px', fontWeight: '800' }}>{formatter.format(totalCost)}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <p style={{ margin: '0 0 8px 0', color: '#10B981', fontSize: '13px' }}>Ganancia Neta</p>
                  <div style={{ color: '#10B981', fontSize: '20px', fontWeight: '800' }}>{formatter.format(profit)}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(212, 160, 23, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(212, 160, 23, 0.3)' }}>
                  <p style={{ margin: '0 0 8px 0', color: '#D4A017', fontSize: '13px' }}>Margen (ROI)</p>
                  <div style={{ color: '#D4A017', fontSize: '20px', fontWeight: '800' }}>{margin}%</div>
                </div>
              </div>
            </div>

            {/* CREADOR DE INGREDIENTES */}
            <div style={{ backgroundColor: '#111', borderRadius: '16px', border: '1px solid #333', padding: '24px' }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#FFF' }}>Agregar Ingrediente</h3>
              <form onSubmit={handleAddIngredient} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: '13px', marginBottom: '8px' }}>Ingrediente (Del panel de Rendimientos)</label>
                  <select 
                    value={newIngredientId} 
                    onChange={e => setNewIngredientId(e.target.value)} 
                    required
                    style={{ width: '100%', backgroundColor: '#1A1A1A', border: '1px solid #333', color: '#FFF', padding: '12px', borderRadius: '8px' }}
                  >
                    <option value="">-- Seleccionar --</option>
                    {rendimientos.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.ingrediente_name} (1 {r.unidad_consumo} = {formatter.format(r.costo_por_unidad)})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: '13px', marginBottom: '8px' }}>Cantidad Usada</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={cantidadUsada}
                    onChange={e => setCantidadUsada(e.target.value)}
                    placeholder="Ej: 100"
                    style={{ width: '100%', backgroundColor: '#1A1A1A', border: '1px solid #333', color: '#FFF', padding: '12px', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>
                <button type="submit" style={{ backgroundColor: '#D4A017', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={20} /> Agregar
                </button>
              </form>
            </div>

            {/* TABLA DE LA RECETA */}
            <div style={{ backgroundColor: '#111', borderRadius: '16px', border: '1px solid #333', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#1A1A1A', borderBottom: '1px solid #333' }}>
                  <tr>
                    <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontWeight: '600', fontSize: '13px' }}>INGREDIENTE</th>
                    <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontWeight: '600', fontSize: '13px' }}>CANTIDAD</th>
                    <th style={{ padding: '16px', textAlign: 'right', color: '#888', fontWeight: '600', fontSize: '13px' }}>COSTO</th>
                    <th style={{ padding: '16px', textAlign: 'right', color: '#888', fontWeight: '600', fontSize: '13px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecipe.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '16px', color: '#FFF', fontWeight: '600' }}>{item.ingrediente_name}</td>
                      <td style={{ padding: '16px', color: '#BDBDBD' }}>{item.cantidad_usada} {item.unidad_consumo}</td>
                      <td style={{ padding: '16px', textAlign: 'right', color: '#EF4444', fontWeight: '700' }}>{formatter.format(item.costo_calculado)}</td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button onClick={() => handleDeleteIngredient(item.id)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {currentRecipe.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                        <AlertCircle size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                        No hay ingredientes en esta receta.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        ) : (
          <div style={{ backgroundColor: '#111', borderRadius: '16px', border: '1px solid #333', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '600px', color: '#666', textAlign: 'center', padding: '40px' }}>
            <ArrowRight size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 8px 0', color: '#888' }}>Selecciona un Producto</h3>
            <p style={{ margin: 0 }}>Haz clic en cualquier producto de la lista izquierda<br/>para empezar a armar su receta.</p>
          </div>
        )}
      </div>
    </div>
  );
}
