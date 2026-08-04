import { API_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Folder, Plus, Search, Package, BadgeCheck, Pencil, Trash2, ChevronLeft, ChevronRight, X, Utensils } from 'lucide-react';

const EMOJI_OPTIONS = [
  '🍔', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🍟', '🥩', '🍗', '🍖', '🥓', 
  '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', 
  '🥠', '🥐', '🍞', '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🥗', '🥣', '🥚', 
  '🍳', '🍿', '🧂', '🥫', '🍄', '🥜', '🌰', '🥑', '🍆', '🥔', '🥕', '🌽', 
  '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍅', '🍓', '🍒', '🍎', '🍉', 
  '🍑', '🍊', '🍍', '🍌', '🍋', '🍈', '🍏', '🍐', '🥝', '🥭', '🥥', '🍇', 
  '🫐', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍩', '🍪', '🍨', '🍧', 
  '🍦', '🥧', '🥤', '🧋', '🧃', '🧉', '🥛', '☕', '🍵', '🍶', '🍾', '🍷', 
  '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🧊', '🍽️', '🍴', '🥄', '🥢', '🥡', '🔥', '⭐', '✨'
];

export default function AdminCategorias() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [currentCategory, setCurrentCategory] = useState({ id: null, name: '', description: '', image: 'Utensils', status: 'Activa' });

  const fetchCategories = async () => {
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const res = await fetch(`${API_URL}/admin/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenModal = (cat = null) => {
    if (cat) {
      setCurrentCategory({ ...cat, image: cat.image || 'Utensils' });
    } else {
      setCurrentCategory({ id: null, name: '', description: '', image: 'Utensils', status: 'Activa' });
    }
    setShowIconPicker(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem('distrito_admin_token');
    const method = currentCategory.id ? 'PUT' : 'POST';
    const url = currentCategory.id 
      ? `${API_URL}/admin/categories/${currentCategory.id}` 
      : `${API_URL}/admin/categories`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(currentCategory)
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setIsModalOpen(false);
        fetchCategories();
      } else {
        alert(data.error || 'Error guardando categoría');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta categoría?')) return;
    const token = sessionStorage.getItem('distrito_admin_token');
    try {
      const res = await fetch(`${API_URL}/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'ok') {
        fetchCategories();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const displayCategories = categories.length > 0 ? categories : [];
  const activeCategories = displayCategories.filter(c => c.status === 'Activa').length;

  return (
    <div className="ds-page">
      
      {/* Navegación y Encabezado */}
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title">Categorías</h1>
        </div>
        
        <div className="ds-page-actions">
          <button className="ds-btn ds-btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={20} />
            Nueva categoría
          </button>
        </div>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="ds-cards-grid" style={{ marginBottom: '40px' }}>
        <div className="ds-card">
          <div className="ds-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>{displayCategories.length}</div>
              <div style={{ color: '#BDBDBD', fontSize: '14px', fontWeight: '500' }}>Total de categorías</div>
            </div>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(212, 160, 23, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4A017' }}>
              <Package size={28} />
            </div>
          </div>
        </div>

        <div className="ds-card">
          <div className="ds-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>{activeCategories}</div>
              <div style={{ color: '#BDBDBD', fontSize: '14px', fontWeight: '500' }}>Categorías activas</div>
            </div>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22C55E' }}>
              <BadgeCheck size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda */}
      <div className="ds-form" style={{ marginBottom: '24px' }}>
        <div className="ds-search" style={{ width: '100%' }}>
          <Search size={20} className="ds-search-icon" />
          <input 
            type="text" 
            className="ds-input"
            placeholder="Buscar categoría..." 
            style={{ paddingLeft: '48px' }}
          />
        </div>
      </div>

      {/* Tabla (Desktop) */}
      <div className="hide-on-mobile ds-table-container">
        <table className="ds-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Icono</th>
              <th>Categoría</th>
              <th>Descripción</th>
              <th style={{ textAlign: 'center' }}>Productos</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {displayCategories.map((cat) => (
              <tr key={cat.id}>
                <td>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: '1px solid #333333' }}>
                    {cat.image || '🍔'}
                  </div>
                </td>
                <td style={{ color: '#FFFFFF', fontWeight: '700', fontSize: '15px' }}>{cat.name}</td>
                <td style={{ color: '#BDBDBD', fontSize: '14px' }}>{cat.description || cat.desc}</td>
                <td style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '15px', textAlign: 'center' }}>{cat.products || 0}</td>
                <td>
                  <span className={`ds-badge ${cat.status === 'Activa' ? 'ds-badge-success' : 'ds-badge-danger'}`}>
                    {cat.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="ds-btn-icon ds-btn-secondary" onClick={() => handleOpenModal(cat)}><Pencil size={18} /></button>
                    <button className="ds-btn-icon ds-btn-danger ds-btn-secondary" onClick={() => handleDelete(cat.id)}><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {displayCategories.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#BDBDBD' }}>
                  No hay categorías registradas. ¡Haz clic en "Nueva categoría" para empezar!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cards (Mobile) */}
      <div className="hide-on-desktop ds-table-cards">
        {displayCategories.map((cat) => (
          <div key={cat.id} className="ds-table-card">
            <div className="ds-table-card-row">
              <span className="ds-table-card-label">Icono</span>
              <span className="ds-table-card-value">{cat.image || '🍔'}</span>
            </div>
            <div className="ds-table-card-row">
              <span className="ds-table-card-label">Categoría</span>
              <span className="ds-table-card-value" style={{ fontWeight: '700' }}>{cat.name}</span>
            </div>
            <div className="ds-table-card-row">
              <span className="ds-table-card-label">Estado</span>
              <span className="ds-table-card-value">
                <span className={`ds-badge ${cat.status === 'Activa' ? 'ds-badge-success' : 'ds-badge-danger'}`}>
                  {cat.status}
                </span>
              </span>
            </div>
            <div className="ds-table-card-actions">
              <button className="ds-btn-icon ds-btn-secondary" onClick={() => handleOpenModal(cat)}><Pencil size={16} /></button>
              <button className="ds-btn-icon ds-btn-danger ds-btn-secondary" onClick={() => handleDelete(cat.id)}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="ds-modal-overlay">
          <div className="ds-modal" style={{ maxWidth: '500px' }}>
            <div className="ds-modal-header">
              <h2 className="ds-modal-title">{currentCategory.id ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
              <button className="ds-modal-close" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="ds-form">
              <div className="ds-form-group">
                <label className="ds-form-label">Icono y Nombre</label>
                <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                  <button 
                    type="button"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    style={{ 
                      width: '48px', height: '48px', flexShrink: 0, backgroundColor: '#1A1A1A', border: '1px solid #333333', 
                      borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', cursor: 'pointer'
                    }}
                  >
                    {currentCategory.image || '🍔'}
                  </button>

                  <input 
                    type="text" 
                    className="ds-input"
                    required
                    placeholder="Ej: Hamburguesas"
                    value={currentCategory.name}
                    onChange={e => setCurrentCategory({...currentCategory, name: e.target.value})}
                  />

                  {/* Dropdown de Iconos */}
                  {showIconPicker && (
                    <div className="admin-category-emoji-picker" style={{ 
                      position: 'absolute', top: '56px', left: 0, backgroundColor: '#1A1A1A', border: '1px solid #333333', 
                      borderRadius: '12px', padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px',
                      zIndex: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', width: '400px', maxHeight: '300px', overflowY: 'auto'
                    }}>
                      {EMOJI_OPTIONS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setCurrentCategory({...currentCategory, image: emoji});
                            setShowIconPicker(false);
                          }}
                          style={{
                            width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: currentCategory.image === emoji ? '#D4A017' : 'transparent',
                            fontSize: '20px', border: 'none', cursor: 'pointer'
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="ds-form-group">
                <label className="ds-form-label">Descripción</label>
                <textarea 
                  className="ds-textarea"
                  value={currentCategory.description}
                  onChange={e => setCurrentCategory({...currentCategory, description: e.target.value})}
                />
              </div>

              <div className="ds-form-group">
                <label className="ds-form-label">Estado</label>
                <select 
                  className="ds-select"
                  value={currentCategory.status}
                  onChange={e => setCurrentCategory({...currentCategory, status: e.target.value})}
                >
                  <option value="Activa">Activa</option>
                  <option value="Inactiva">Inactiva</option>
                </select>
              </div>

              <div className="ds-modal-footer">
                <button type="button" className="ds-btn ds-btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="ds-btn ds-btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .hide-on-mobile { display: none !important; }
        }
        @media (min-width: 768px) {
          .hide-on-desktop { display: none !important; }
        }
      `}</style>
    </div>
  );
}
