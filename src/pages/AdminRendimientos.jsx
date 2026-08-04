import { BASE_URL as API_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Scale, Calculator, ArrowRight, DollarSign, ShoppingCart } from 'lucide-react';

export default function AdminRendimientos() {
  const [rendimientos, setRendimientos] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    ingrediente_id: '',
    ingrediente_name: '',
    unidad_compra: 'Kilogramos',
    cantidad_comprada: '',
    costo_compra: '',
    unidad_consumo: 'Gramos',
    conversion_definida: ''
  });

  const [newIngredientName, setNewIngredientName] = useState('');
  const [showNewIngredientInput, setShowNewIngredientInput] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const [resRendimientos, resInventory] = await Promise.all([
        fetch(`${API_URL}/api/pedidos/admin/rendimientos`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/pedidos/admin/inventory/basic`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const jsonR = await resRendimientos.json();
      const jsonI = await resInventory.json();
      
      if (jsonR.status === 'ok') setRendimientos(jsonR.data || []);
      if (jsonI.status === 'ok') setInventory(jsonI.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIngredient = async () => {
    if (!newIngredientName.trim()) return;
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const res = await fetch(`${API_URL}/api/pedidos/admin/inventory/basic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newIngredientName })
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setInventory([...inventory, json.data]);
        setFormData({ ...formData, ingrediente_id: json.data.id, ingrediente_name: json.data.name });
        setNewIngredientName('');
        setShowNewIngredientInput(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getStandardConversion = (compra, consumo) => {
    const c = compra.toLowerCase();
    const s = consumo.toLowerCase();
    if (c === 'kilogramos' && s === 'gramos') return 1000;
    if (c === 'litros' && s === 'mililitros') return 1000;
    if (c === 'metros' && s === 'centímetros') return 100;
    if (c === 'libras' && s === 'gramos') return 500;
    return null;
  };

  const standardFactor = getStandardConversion(formData.unidad_compra, formData.unidad_consumo);
  const isStandard = standardFactor !== null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalConv = isStandard ? standardFactor : formData.conversion_definida;
    if (!formData.ingrediente_id || !finalConv) return;
    const submitData = { ...formData, conversion_definida: finalConv };

    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const res = await fetch(`${API_URL}/api/pedidos/admin/rendimientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(submitData)
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setIsModalOpen(false);
        fetchData(); // Reload table
      } else {
        alert("Error al guardar: " + (json.error || "Error desconocido"));
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm('¿Eliminar este rendimiento?')) return;
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      await fetch(`${API_URL}/api/pedidos/admin/rendimientos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const appliedFactor = isStandard ? standardFactor : formData.conversion_definida;
  const rendimientoTotalCalculado = (formData.cantidad_comprada > 0 && appliedFactor > 0)
    ? formData.cantidad_comprada * appliedFactor
    : 0;

  const calculatedCost = (formData.costo_compra > 0 && rendimientoTotalCalculado > 0) 
    ? (formData.costo_compra / rendimientoTotalCalculado).toFixed(2)
    : 0;

  if (loading) return (
    <div className="ds-loader-container">
      <div className="ds-loader"></div>
      <p>Cargando módulo de rendimientos...</p>
    </div>
  );

  return (
    <div className="ds-page">
      
      {/* Encabezado */}
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Scale size={32} color="#D4A017" />
            Rendimientos
          </h1>
          <p className="ds-page-subtitle">
            Configura cómo se consume cada ingrediente comprado para calcular automáticamente los costos de producción y descontar el inventario.
          </p>
        </div>
        <div className="ds-page-actions">
          <button 
            onClick={() => {
              setFormData({
                ingrediente_id: '', ingrediente_name: '', unidad_compra: 'Kilogramos', 
                cantidad_comprada: '', costo_compra: '', unidad_consumo: 'Gramos', rendimiento_obtenido: ''
              });
              setIsModalOpen(true);
            }}
            className="ds-btn ds-btn-primary"
          >
            <Plus size={20} />
            Nuevo Rendimiento
          </button>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="ds-card">
        <div className="ds-table-container hide-on-mobile">
          <table className="ds-table">
            <thead>
              <tr>
                <th>Ingrediente</th>
                <th>Compra</th>
                <th>Rendimiento</th>
                <th>Costo Unidad</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rendimientos.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: '600' }}>{r.ingrediente_name}</td>
                  <td>
                    {r.cantidad_comprada} {r.unidad_compra}
                    <div style={{ fontSize: '12px', color: '#666' }}>${Number(r.costo_compra).toLocaleString()}</div>
                  </td>
                  <td>
                    {r.rendimiento_obtenido} {r.unidad_consumo}
                  </td>
                  <td style={{ color: '#D4A017', fontWeight: '700' }}>
                    ${Number(r.costo_por_unidad).toLocaleString()} <span style={{color: '#666', fontWeight: '500', fontSize: '12px'}}>/ {r.unidad_consumo.toLowerCase()}</span>
                  </td>
                  <td>
                    <span className={`ds-badge ${r.estado === 'Activo' ? 'ds-badge-success' : 'ds-badge-danger'}`}>
                      {r.estado}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="ds-btn-icon ds-btn-ghost"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(r.id)} className="ds-btn-icon ds-btn-ghost ds-btn-danger"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {rendimientos.length === 0 && (
                <tr>
                  <td colSpan="6" className="ds-empty-state">No hay rendimientos configurados. Presiona "Nuevo Rendimiento".</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile table cards view */}
        <div className="ds-table-cards show-on-mobile">
          {rendimientos.map(r => (
            <div key={r.id} className="ds-table-card">
              <div className="ds-table-card-row">
                <span className="ds-table-card-label">Ingrediente</span>
                <span className="ds-table-card-value" style={{ fontWeight: '600' }}>{r.ingrediente_name}</span>
              </div>
              <div className="ds-table-card-row">
                <span className="ds-table-card-label">Compra</span>
                <span className="ds-table-card-value">
                  {r.cantidad_comprada} {r.unidad_compra}
                  <span style={{ display: 'block', fontSize: '12px', color: '#666' }}>${Number(r.costo_compra).toLocaleString()}</span>
                </span>
              </div>
              <div className="ds-table-card-row">
                <span className="ds-table-card-label">Rendimiento</span>
                <span className="ds-table-card-value">{r.rendimiento_obtenido} {r.unidad_consumo}</span>
              </div>
              <div className="ds-table-card-row">
                <span className="ds-table-card-label">Costo Unidad</span>
                <span className="ds-table-card-value" style={{ color: '#D4A017', fontWeight: '700' }}>
                  ${Number(r.costo_por_unidad).toLocaleString()} <span style={{color: '#666', fontWeight: '500', fontSize: '12px'}}>/ {r.unidad_consumo.toLowerCase()}</span>
                </span>
              </div>
              <div className="ds-table-card-row">
                <span className="ds-table-card-label">Estado</span>
                <span className="ds-table-card-value">
                  <span className={`ds-badge ${r.estado === 'Activo' ? 'ds-badge-success' : 'ds-badge-danger'}`}>
                    {r.estado}
                  </span>
                </span>
              </div>
              <div className="ds-table-card-actions">
                <button className="ds-btn ds-btn-secondary ds-btn-sm"><Edit2 size={16} /> Editar</button>
                <button onClick={() => handleDelete(r.id)} className="ds-btn ds-btn-danger ds-btn-sm"><Trash2 size={16} /> Eliminar</button>
              </div>
            </div>
          ))}
          {rendimientos.length === 0 && (
            <div className="ds-empty-state">No hay rendimientos configurados. Presiona "Nuevo Rendimiento".</div>
          )}
        </div>
      </div>

      {/* Modal Nuevo Rendimiento */}
      {isModalOpen && (
        <div className="ds-modal-overlay">
          <div className="ds-modal ds-modal-lg">
            <div className="ds-modal-header">
              <h2 className="ds-modal-title">Nuevo Rendimiento</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="ds-modal-body ds-form">
              
              {/* Sección Ingrediente */}
              <div className="ds-form-group">
                <label className="ds-form-label">Seleccionar Ingrediente</label>
                {!showNewIngredientInput ? (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <select 
                      value={formData.ingrediente_id}
                      onChange={(e) => {
                        const ing = inventory.find(i => i.id === e.target.value);
                        setFormData({...formData, ingrediente_id: e.target.value, ingrediente_name: ing ? ing.name : ''});
                      }}
                      required
                      className="ds-select"
                      style={{ flex: 1 }}
                    >
                      <option value="">-- Selecciona del Inventario --</option>
                      {inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowNewIngredientInput(true)} className="ds-btn ds-btn-secondary">Nuevo</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input 
                      type="text" 
                      value={newIngredientName}
                      onChange={(e) => setNewIngredientName(e.target.value)}
                      placeholder="Nombre del nuevo ingrediente..."
                      className="ds-input"
                      style={{ flex: 1 }}
                    />
                    <button type="button" onClick={handleCreateIngredient} className="ds-btn ds-btn-primary">Crear</button>
                    <button type="button" onClick={() => setShowNewIngredientInput(false)} className="ds-btn ds-btn-secondary">Cancelar</button>
                  </div>
                )}
              </div>

              {/* Flex Grid 2 columnas */}
              <div className="ds-form-grid admin-rendimientos-grid">
                
                {/* Columna Izquierda: COMPRA */}
                <div className="admin-rendimientos-box">
                  <h3 style={{ margin: '0 0 16px 0', color: '#D4A017', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShoppingCart size={18} /> Datos de Compra
                  </h3>
                  
                  <div className="ds-form-grid" style={{ marginBottom: '16px' }}>
                    <div className="ds-form-group">
                      <label className="ds-form-label">Unidad de compra</label>
                      <select value={formData.unidad_compra} onChange={e => setFormData({...formData, unidad_compra: e.target.value})} className="ds-select">
                        <option>Kilogramos</option><option>Gramos</option><option>Libras</option>
                        <option>Litros</option><option>Galón</option>
                        <option>Unidad</option><option>Caja</option><option>Bolsa</option>
                      </select>
                    </div>
                    <div className="ds-form-group">
                      <label className="ds-form-label">Cant. comprada</label>
                      <input type="number" required value={formData.cantidad_comprada} onChange={e => setFormData({...formData, cantidad_comprada: e.target.value})} placeholder="Ej: 10" className="ds-input" />
                    </div>
                  </div>
                  
                  <div className="ds-form-group">
                    <label className="ds-form-label">Costo total de la compra ($)</label>
                    <div className="admin-rendimientos-input-group">
                      <DollarSign size={16} color="#666" className="input-group-icon" />
                      <input type="number" required value={formData.costo_compra} onChange={e => setFormData({...formData, costo_compra: e.target.value})} placeholder="Ej: 380000" className="ds-input" style={{ paddingLeft: '32px' }} />
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: CONSUMO */}
                <div className="admin-rendimientos-box">
                  <h3 style={{ margin: '0 0 16px 0', color: '#22C55E', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Scale size={18} /> Datos de Consumo
                  </h3>
                  <div className="ds-form-grid" style={{ marginBottom: '16px' }}>
                    <div className="ds-form-group">
                      <label className="ds-form-label">Unidad de consumo</label>
                      <select value={formData.unidad_consumo} onChange={e => setFormData({...formData, unidad_consumo: e.target.value})} className="ds-select">
                        <option>Gramos</option><option>Mililitros</option><option>Unidad</option>
                        <option>Tajada</option><option>Torreja</option><option>Rebanada</option>
                        <option>Porción</option><option>Cucharada</option><option>Onza</option>
                      </select>
                    </div>
                    {!isStandard && (
                      <div className="ds-form-group">
                        <label className="ds-form-label">Conversión Manual</label>
                        <input type="number" required value={formData.conversion_definida} onChange={e => setFormData({...formData, conversion_definida: e.target.value})} placeholder="Ej: 10" className="ds-input" />
                        <div style={{fontSize: '11px', color: '#888', marginTop: '4px'}}>1 {formData.unidad_compra} = X {formData.unidad_consumo}</div>
                      </div>
                    )}
                    {isStandard && (
                      <div className="ds-form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22C55E', padding: '10px', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(34,197,94,0.3)', textAlign: 'center', width: '100%', marginTop: '24px' }}>
                          Conversión automática: 1 {formData.unidad_compra} = {standardFactor} {formData.unidad_consumo}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ds-form-group">
                    <label className="ds-form-label">Costo por {formData.unidad_consumo.toLowerCase()} (Automático)</label>
                    <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #D4A017', borderRadius: '8px', padding: '10px', color: '#D4A017', fontWeight: '800', fontSize: '18px', textAlign: 'center' }}>
                      ${calculatedCost}
                    </div>
                  </div>
                </div>

              </div>

              {/* Vista Previa Lineal */}
              <div className="admin-rendimientos-preview">
                <h4 style={{ margin: '0 0 16px 0', color: '#D4A017', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>Vista Previa</h4>
                <div className="preview-steps">
                  <div className="preview-step">
                    <div className="step-label">Compra registrada</div>
                    <div className="step-value">{formData.cantidad_comprada || 0} {formData.unidad_compra} {formData.ingrediente_name ? `de ${formData.ingrediente_name}` : ''}</div>
                  </div>
                  <ArrowRight color="#D4A017" className="step-arrow" size={16} />
                  <div className="preview-step">
                    <div className="step-label">Conversión automática</div>
                    <div className="step-value">{rendimientoTotalCalculado} {formData.unidad_consumo} disponibles</div>
                  </div>
                  <ArrowRight color="#D4A017" className="step-arrow" size={16} />
                  <div className="preview-step">
                    <div className="step-label">Costo total</div>
                    <div className="step-value">${Number(formData.costo_compra || 0).toLocaleString()}</div>
                  </div>
                  <ArrowRight color="#D4A017" className="step-arrow" size={16} />
                  <div className="preview-step">
                    <div className="step-label">Costo unitario</div>
                    <div className="step-value" style={{ color: '#22C55E', fontSize: '18px' }}>${calculatedCost}</div>
                    <div className="step-sublabel">por {formData.unidad_consumo.toLowerCase()}</div>
                  </div>
                </div>
              </div>

              <div className="ds-modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="ds-btn ds-btn-ghost">
                  Cancelar
                </button>
                <button type="submit" disabled={!formData.ingrediente_id} className="ds-btn ds-btn-primary">
                  Guardar Rendimiento
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .hide-on-mobile { display: none !important; }
          .show-on-mobile { display: flex !important; flex-direction: column; gap: 16px; padding: 16px; }
          .admin-rendimientos-grid { grid-template-columns: 1fr; }
        }
        @media (min-width: 769px) {
          .show-on-mobile { display: none !important; }
        }
        .admin-rendimientos-box { background-color: #1A1A1A; padding: 20px; border-radius: 12px; border: 1px solid #333; }
        .admin-rendimientos-input-group { position: relative; }
        .admin-rendimientos-input-group .input-group-icon { position: absolute; left: 10px; top: 16px; pointer-events: none; }
        
        .admin-rendimientos-preview { background-color: rgba(212, 160, 23, 0.05); border: 1px dashed #D4A017; padding: 20px; border-radius: 12px; margin-top: 16px; }
        .preview-steps { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #FFF; }
        .preview-step { text-align: center; }
        .step-label { font-size: 12px; color: #BDBDBD; margin-bottom: 2px; }
        .step-value { font-weight: 700; font-size: 15px; }
        .step-sublabel { font-size: 12px; color: #BDBDBD; }
        .step-arrow { transform: rotate(90deg); }
      `}</style>
    </div>
  );
}
