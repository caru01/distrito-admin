import { API_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, DollarSign, Tag, FileText, X, Edit3, CreditCard, Camera, Eye } from 'lucide-react';

export default function AdminGastos() {
  const [gastos, setGastos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [editId, setEditId] = useState(null);
  
  const [formData, setFormData] = useState({
    category: 'Arriendo',
    description: '',
    amount: '',
    subtotal: '',
    iva: '',
    iva_percentage: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'Efectivo',
    receipt_url: '',
    items: [],
    provider: ''
  });
  
  const [viewGasto, setViewGasto] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);

  const getStartOfWeek = () => {
    const d = new Date();
    const day = d.getDay() || 7; // Sunday is 0, make it 7
    d.setDate(d.getDate() - day + 1);
    return d.toISOString().split('T')[0];
  };
  const getEndOfWeek = () => {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 7);
    return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getStartOfWeek());
  const [endDate, setEndDate] = useState(getEndOfWeek());

  // Derive unique item names from past expenses for autocomplete
  const suggestedItems = Array.from(new Set(
    gastos.flatMap(g => {
      let parsed = [];
      try { parsed = typeof g.items === 'string' ? JSON.parse(g.items) : (g.items || []); } catch(e){}
      return parsed.map(it => it.name);
    }).filter(Boolean)
  ));

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      if (file.size > 2 * 1024 * 1024) {
        alert('El PDF es demasiado grande. El límite es 2MB para asegurar una carga rápida.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, receipt_url: event.target.result }));
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          setFormData(prev => ({ ...prev, receipt_url: dataUrl }));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };
  
  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });

  const fetchData = async () => {
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const res = await fetch(`${API_URL}/admin/expenses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.status === 'ok') setGastos(json.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    fetchData();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openNewModal = () => {
    setEditId(null);
    setFormData({
      category: 'Arriendo',
      description: '',
      amount: '',
      subtotal: '',
      iva: '',
      iva_percentage: '',
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'Efectivo',
      receipt_url: '',
      items: [],
      provider: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (g) => {
    setEditId(g.id);
    let parsedItems = [];
    if (g.items) {
      try {
        parsedItems = typeof g.items === 'string' ? JSON.parse(g.items) : g.items;
      } catch (e) {
        parsedItems = [];
      }
    }
    
    // For legacy records that don't have subtotal/iva split properly
    const amountVal = Number(g.amount) || 0;
    const subtotalVal = g.subtotal !== undefined && g.subtotal !== null ? Number(g.subtotal) : amountVal;
    const ivaVal = g.iva !== undefined && g.iva !== null ? Number(g.iva) : 0;
    const ivaPerc = g.iva_percentage !== undefined && g.iva_percentage !== null ? Number(g.iva_percentage) : '';
    
    setFormData({
      category: g.category,
      description: g.description,
      amount: amountVal,
      subtotal: subtotalVal,
      iva: ivaVal || '',
      iva_percentage: ivaPerc,
      expense_date: g.expense_date ? new Date(g.expense_date).toISOString().split('T')[0] : new Date(g.created_at).toISOString().split('T')[0],
      payment_method: g.payment_method || 'Efectivo',
      receipt_url: g.receipt_url || '',
      items: parsedItems,
      provider: g.provider || ''
    });
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { name: '', price: '', quantity: 1 }]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      const newSubtotal = newItems.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
      const sub = newItems.length > 0 ? newSubtotal : (prev.subtotal || 0);
      const calcIva = prev.iva_percentage ? (sub * (Number(prev.iva_percentage) / 100)) : 0;
      return { 
        ...prev, 
        items: newItems, 
        subtotal: sub,
        iva: calcIva || '',
        amount: Number(sub || 0) + Number(calcIva || 0)
      };
    });
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index][field] = value;
      const newSubtotal = newItems.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
      const calcIva = prev.iva_percentage ? (newSubtotal * (Number(prev.iva_percentage) / 100)) : 0;
      return { 
        ...prev, 
        items: newItems, 
        subtotal: newSubtotal,
        iva: calcIva || '',
        amount: Number(newSubtotal || 0) + Number(calcIva || 0)
      };
    });
  };

  const handleSubtotalChange = (val) => {
    setFormData(prev => {
      const sub = val;
      const calcIva = prev.iva_percentage ? (Number(sub) * (Number(prev.iva_percentage) / 100)) : 0;
      return {
        ...prev,
        subtotal: sub,
        iva: calcIva || '',
        amount: Number(sub || 0) + Number(calcIva || 0)
      };
    });
  };

  const handleIvaChange = (perc) => {
    setFormData(prev => {
      const p = perc;
      const calcIva = p ? (Number(prev.subtotal || 0) * (Number(p) / 100)) : 0;
      return {
        ...prev,
        iva_percentage: p,
        iva: calcIva || '',
        amount: Number(prev.subtotal || 0) + Number(calcIva || 0)
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const url = editId ? `${API_URL}/admin/expenses/${editId}` : `${API_URL}/admin/expenses`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setIsModalOpen(false);
        fetchData();
      } else {
        alert("Error: " + (json.error || "Desconocido"));
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión");
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm('¿Eliminar este gasto?')) return;
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      await fetch(`${API_URL}/admin/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const filteredGastos = gastos.filter(g => {
    const gDate = new Date(g.expense_date || g.created_at).toISOString().split('T')[0];
    if (startDate && gDate < startDate) return false;
    if (endDate && gDate > endDate) return false;
    return true;
  });

  const totalGastos = filteredGastos.reduce((sum, g) => sum + Number(g.amount), 0);

  return (
    <div className="ds-page">
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title" style={{ color: '#D4A017' }}>Gastos Operativos</h1>
          <p style={{ margin: 0, color: '#BDBDBD' }}>Registra y controla los egresos del negocio.</p>
        </div>
        <div className="ds-page-actions">
          <button 
            onClick={openNewModal}
            className="ds-btn ds-btn-primary"
          >
            <Plus size={20} /> Registrar Gasto
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--ds-card)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--ds-border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '12px', color: '#BDBDBD', marginBottom: '4px' }}>Desde</label>
            <input type="date" className="ds-input" style={{ colorScheme: 'dark', padding: '6px' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '12px', color: '#BDBDBD', marginBottom: '4px' }}>Hasta</label>
            <input type="date" className="ds-input" style={{ colorScheme: 'dark', padding: '6px' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button onClick={() => { setStartDate(''); setEndDate(''); }} className="ds-btn ds-btn-ghost ds-btn-sm" style={{ alignSelf: 'flex-end', height: '36px' }}>
            Todas
          </button>
        </div>
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ margin: '0 0 4px 0', color: '#EF4444', fontSize: '12px', fontWeight: '600' }}>TOTAL GASTOS (PERÍODO)</p>
          <h2 style={{ margin: 0, color: '#EF4444', fontSize: '24px' }}>{formatter.format(totalGastos)}</h2>
        </div>
      </div>

      <div className="ds-card">
        {filteredGastos.length === 0 ? (
          <div className="ds-empty-state">No hay gastos en este período.</div>
        ) : (
          isMobile ? (
            <div className="ds-table-cards">
              {filteredGastos.map(g => (
                <div key={g.id} className="ds-table-card">
                  <div className="ds-table-card-row">
                    <span className="ds-table-card-label">FECHA</span>
                    <span className="ds-table-card-value">{new Date(g.expense_date || g.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="ds-table-card-row">
                    <span className="ds-table-card-label">CATEGORÍA</span>
                    <span className="ds-table-card-value">
                      <span className="ds-badge ds-badge-neutral">{g.category}</span>
                    </span>
                  </div>
                  <div className="ds-table-card-row">
                    <span className="ds-table-card-label">PAGO</span>
                    <span className="ds-table-card-value">{g.payment_method || 'Efectivo'}</span>
                  </div>
                  <div className="ds-table-card-row">
                    <span className="ds-table-card-label">DESCRIPCIÓN</span>
                    <span className="ds-table-card-value">{g.description}</span>
                  </div>
                  <div className="ds-table-card-row">
                    <span className="ds-table-card-label">MONTO</span>
                    <span className="ds-table-card-value" style={{ color: '#EF4444', fontWeight: '700' }}>{formatter.format(g.amount)}</span>
                  </div>
                  <div className="ds-table-card-actions">
                    <button onClick={() => setViewGasto(g)} className="ds-btn ds-btn-icon ds-btn-ghost ds-btn-sm" style={{ marginRight: '8px', color: '#8B5CF6' }} title="Ver Resumen">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => handleEdit(g)} className="ds-btn ds-btn-icon ds-btn-ghost ds-btn-sm" style={{ marginRight: '8px' }}>
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => handleDelete(g.id)} className="ds-btn ds-btn-icon ds-btn-danger ds-btn-sm">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ds-table-container">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>FECHA</th>
                    <th>CATEGORÍA</th>
                    <th>MÉTODO</th>
                    <th>DESCRIPCIÓN</th>
                    <th style={{ textAlign: 'right' }}>MONTO</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGastos.map(g => (
                    <tr key={g.id}>
                      <td>
                        {new Date(g.expense_date || g.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <span className="ds-badge ds-badge-neutral">{g.category}</span>
                      </td>
                      <td>{g.payment_method || 'Efectivo'}</td>
                      <td>{g.description}</td>
                      <td style={{ textAlign: 'right', color: '#EF4444', fontWeight: '700' }}>
                        {formatter.format(g.amount)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => setViewGasto(g)} className="ds-btn ds-btn-icon ds-btn-ghost ds-btn-sm" style={{ marginRight: '8px', color: '#8B5CF6' }} title="Ver Resumen">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => handleEdit(g)} className="ds-btn ds-btn-icon ds-btn-ghost ds-btn-sm" style={{ marginRight: '8px', color: '#D4A017' }}>
                          <Edit3 size={18} />
                        </button>
                        <button onClick={() => handleDelete(g.id)} className="ds-btn ds-btn-icon ds-btn-ghost ds-btn-sm" style={{ color: '#EF4444' }}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* MODAL CREAR/EDITAR GASTO */}
      {isModalOpen && (
        <div className="ds-modal-overlay">
          <div className="ds-modal">
            <form onSubmit={handleSubmit}>
              <div className="ds-modal-header">
                <h2 className="ds-modal-title">{editId ? 'Editar Gasto' : 'Registrar Gasto'}</h2>
                <button type="button" className="ds-modal-close" onClick={() => setIsModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="ds-modal-body ds-form">
                
                <div className="ds-form-group">
                  <label className="ds-form-label"><Calendar size={16}/> Fecha del Gasto</label>
                  <input type="date" className="ds-input" required value={formData.expense_date} onChange={e => setFormData({...formData, expense_date: e.target.value})} style={{ colorScheme: 'dark' }} />
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label"><Tag size={16}/> Categoría</label>
                  <select className="ds-select" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option>Arriendo</option>
                    <option>Nómina</option>
                    <option>Servicios Públicos</option>
                    <option>Publicidad</option>
                    <option>Empaques</option>
                    <option>Mantenimiento</option>
                    <option>Insumos</option>
                    <option>Aseo</option>
                    <option>Productos</option>
                    <option>Otros</option>
                  </select>
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label"><CreditCard size={16}/> Método de Pago</label>
                  <select className="ds-select" value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})}>
                    <option>Efectivo</option>
                    <option>Transferencia</option>
                  </select>
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label"><FileText size={16}/> Descripción</label>
                  <input type="text" className="ds-input" required placeholder="Ej: Pago arriendo local junio" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label"><Tag size={16}/> Proveedor (Opcional)</label>
                  <input type="text" className="ds-input" placeholder="Ej: Distribuidora XYZ" value={formData.provider} onChange={e => setFormData({...formData, provider: e.target.value})} />
                </div>

                <div className="ds-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="ds-form-label" style={{ margin: 0 }}>Ítems del Gasto (Opcional)</label>
                    <button type="button" onClick={handleAddItem} className="ds-btn ds-btn-ghost ds-btn-sm" style={{ color: '#8B5CF6', padding: '4px 8px', height: 'auto', fontSize: '12px' }}>
                      <Plus size={14} style={{ marginRight: '4px' }} /> Agregar Ítem
                    </button>
                  </div>
                  {formData.items && formData.items.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                      <datalist id="item-suggestions">
                        {suggestedItems.map((name, i) => <option key={i} value={name} />)}
                      </datalist>
                      {formData.items.map((item, index) => (
                        <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input type="text" className="ds-input" list={item.name.trim().length > 0 ? "item-suggestions" : undefined} placeholder="Nombre (Ej: Jabón)" value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)} required style={{ flex: 2 }} />
                          <input type="number" className="ds-input" placeholder="Cant." value={item.quantity || ''} onChange={e => handleItemChange(index, 'quantity', e.target.value)} required style={{ flex: '0 0 70px' }} min="1" />
                          <input type="number" className="ds-input" placeholder="Valor c/u ($)" value={item.price} onChange={e => handleItemChange(index, 'price', e.target.value)} required style={{ flex: 1 }} />
                          <button type="button" onClick={() => handleRemoveItem(index)} className="ds-btn ds-btn-icon ds-btn-danger ds-btn-sm" style={{ padding: '6px' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Subtotal ($)</label>
                    <input type="number" className="ds-input" required placeholder="Ej: 1500000" value={formData.subtotal} onChange={e => handleSubtotalChange(e.target.value)} readOnly={formData.items && formData.items.length > 0} style={{ opacity: (formData.items && formData.items.length > 0) ? 0.7 : 1 }} />
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">IVA (%)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="number" className="ds-input" placeholder="Ej: 19" value={formData.iva_percentage} onChange={e => handleIvaChange(e.target.value)} style={{ width: '80px' }} />
                      <span style={{ fontSize: '13px', color: '#666' }}>
                        {formData.iva ? `+${formatter.format(formData.iva)}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label"><DollarSign size={16}/> Monto Total a Pagar ($)</label>
                  <input type="number" className="ds-input" required value={formData.amount} readOnly style={{ opacity: 0.8, fontWeight: 'bold' }} />
                  {formData.items && formData.items.length > 0 && <small style={{ color: '#BDBDBD', display: 'block', marginTop: '4px' }}>El subtotal se calcula basado en los ítems y el IVA se suma al total.</small>}
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label"><Camera size={16}/> Foto de Factura / Comprobante (Imagen o PDF)</label>
                  <input type="file" accept="image/*,application/pdf" capture="environment" className="ds-input" style={{ padding: '8px' }} onChange={handlePhotoUpload} />
                  {formData.receipt_url && (
                    <div style={{ marginTop: '8px', position: 'relative', display: 'inline-block', width: '100%' }}>
                      {formData.receipt_url.startsWith('data:application/pdf') ? (
                        <embed src={formData.receipt_url} type="application/pdf" width="100%" height="200px" style={{ borderRadius: '8px', border: '1px solid var(--ds-border)' }} />
                      ) : (
                        <img src={formData.receipt_url} alt="Comprobante" style={{ maxHeight: '100px', borderRadius: '8px', border: '1px solid var(--ds-border)' }} />
                      )}
                      <button type="button" onClick={() => setFormData(f => ({...f, receipt_url: ''}))} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', border: 'none', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}><X size={14}/></button>
                    </div>
                  )}
                </div>

              </div>
              <div className="ds-modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="ds-btn ds-btn-ghost">
                  Cancelar
                </button>
                <button type="submit" className="ds-btn ds-btn-primary">
                  {editId ? 'Guardar Cambios' : 'Guardar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL VER RESUMEN Y FOTO */}
      {viewGasto && (
        <div className="ds-modal-overlay" onClick={() => setViewGasto(null)} style={{ zIndex: 9999 }}>
          <div className="ds-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div className="ds-modal-header">
              <h2 className="ds-modal-title">Resumen del Gasto</h2>
              <button type="button" className="ds-modal-close" onClick={() => setViewGasto(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="ds-modal-body ds-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#BDBDBD' }}>Fecha</p>
                  <p style={{ margin: 0, fontWeight: '600' }}>{new Date(viewGasto.expense_date || viewGasto.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#BDBDBD' }}>Categoría</p>
                  <p style={{ margin: 0, fontWeight: '600' }}><span className="ds-badge ds-badge-neutral">{viewGasto.category}</span></p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#BDBDBD' }}>Método de Pago</p>
                  <p style={{ margin: 0, fontWeight: '600' }}>{viewGasto.payment_method || 'Efectivo'}</p>
                </div>
                {viewGasto.iva && Number(viewGasto.iva) > 0 ? (
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#BDBDBD' }}>Subtotal</p>
                    <p style={{ margin: 0, fontWeight: '600' }}>{formatter.format(viewGasto.subtotal || viewGasto.amount - viewGasto.iva)}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#BDBDBD', marginTop: '4px' }}>IVA ({viewGasto.iva_percentage}%)</p>
                    <p style={{ margin: 0, fontWeight: '600' }}>{formatter.format(viewGasto.iva)}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#BDBDBD', marginTop: '4px' }}>Total a Pagar</p>
                    <p style={{ margin: 0, fontWeight: '700', color: '#EF4444' }}>{formatter.format(viewGasto.amount)}</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#BDBDBD' }}>Monto Total</p>
                    <p style={{ margin: 0, fontWeight: '700', color: '#EF4444' }}>{formatter.format(viewGasto.amount)}</p>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#BDBDBD' }}>Descripción</p>
                  <p style={{ margin: '4px 0 0 0' }}>{viewGasto.description}</p>
                </div>
                {viewGasto.provider && (
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#BDBDBD' }}>Proveedor</p>
                    <p style={{ margin: '4px 0 0 0' }}>{viewGasto.provider}</p>
                  </div>
                )}
              </div>
              
              {(() => {
                let items = [];
                if (viewGasto.items) {
                  try {
                    items = typeof viewGasto.items === 'string' ? JSON.parse(viewGasto.items) : viewGasto.items;
                  } catch (e) {}
                }
                if (items.length > 0) {
                  return (
                    <div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#BDBDBD' }}>Ítems Detallados</p>
                      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                        {items.map((it, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: i !== items.length - 1 ? '1px solid var(--ds-border)' : 'none', paddingBottom: i !== items.length - 1 ? '8px' : '0', marginBottom: i !== items.length - 1 ? '8px' : '0' }}>
                            <span>{it.quantity || 1}x {it.name}</span>
                            <span style={{ fontWeight: '600' }}>{formatter.format((it.price || 0) * (it.quantity || 1))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
                return null;
              })()}
              
              {viewGasto.receipt_url && (
                <div style={{ marginTop: '8px', width: '100%' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#BDBDBD' }}>Factura / Comprobante adjunto</p>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--ds-border)', width: '100%' }}>
                    {viewGasto.receipt_url.startsWith('data:application/pdf') ? (
                      <embed src={viewGasto.receipt_url} type="application/pdf" width="100%" height="400px" style={{ borderRadius: '4px', border: 'none' }} />
                    ) : (
                      <img 
                        src={viewGasto.receipt_url} 
                        alt="Comprobante" 
                        onClick={() => setZoomedImage(viewGasto.receipt_url)}
                        style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '4px', objectFit: 'contain', cursor: 'zoom-in' }} 
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ZOOM IMAGEN */}
      {zoomedImage && (
        <div className="ds-modal-overlay" onClick={() => setZoomedImage(null)} style={{ zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div style={{ position: 'relative', maxWidth: '95vw', maxHeight: '95vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setZoomedImage(null)} style={{ position: 'absolute', top: -20, right: -20, background: 'var(--ds-danger)', color: 'white', borderRadius: '50%', border: 'none', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
              <X size={24} />
            </button>
            <img 
              src={zoomedImage} 
              alt="Comprobante Ampliado" 
              style={{ maxWidth: '100%', maxHeight: '95vh', borderRadius: '8px', objectFit: 'contain', cursor: 'zoom-out' }} 
              onClick={() => setZoomedImage(null)}
            />
          </div>
        </div>
      )}

    </div>
  );
}
