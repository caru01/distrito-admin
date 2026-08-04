import { API_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, DollarSign, Tag, FileText, X } from 'lucide-react';

export default function AdminGastos() {
  const [gastos, setGastos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [formData, setFormData] = useState({
    category: 'Arriendo',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0]
  });
  
  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  });

  const fetchData = async () => {
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const res = await fetch(`${API_URL}/admin/expenses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.status === 'ok') setGastos(json.data || []);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const res = await fetch(`${API_URL}/admin/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setIsModalOpen(false);
        setFormData({ ...formData, description: '', amount: '' });
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

  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.amount), 0);

  return (
    <div className="ds-page">
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title" style={{ color: '#D4A017' }}>Gastos Operativos</h1>
          <p style={{ margin: 0, color: '#BDBDBD' }}>Registra y controla los egresos del negocio.</p>
        </div>
        <div className="ds-page-actions">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="ds-btn ds-btn-primary"
          >
            <Plus size={20} /> Registrar Gasto
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '20px', borderRadius: '12px', display: 'inline-block', marginBottom: '24px' }}>
        <p style={{ margin: '0 0 4px 0', color: '#EF4444', fontSize: '14px', fontWeight: '600' }}>Total Gastos Registrados</p>
        <h2 style={{ margin: 0, color: '#EF4444', fontSize: '28px' }}>{formatter.format(totalGastos)}</h2>
      </div>

      <div className="ds-card">
        {gastos.length === 0 ? (
          <div className="ds-empty-state">No hay gastos registrados.</div>
        ) : (
          isMobile ? (
            <div className="ds-table-cards">
              {gastos.map(g => (
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
                    <span className="ds-table-card-label">DESCRIPCIÓN</span>
                    <span className="ds-table-card-value">{g.description}</span>
                  </div>
                  <div className="ds-table-card-row">
                    <span className="ds-table-card-label">MONTO</span>
                    <span className="ds-table-card-value" style={{ color: '#EF4444', fontWeight: '700' }}>{formatter.format(g.amount)}</span>
                  </div>
                  <div className="ds-table-card-actions">
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
                    <th>DESCRIPCIÓN</th>
                    <th style={{ textAlign: 'right' }}>MONTO</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map(g => (
                    <tr key={g.id}>
                      <td>
                        {new Date(g.expense_date || g.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <span className="ds-badge ds-badge-neutral">{g.category}</span>
                      </td>
                      <td>{g.description}</td>
                      <td style={{ textAlign: 'right', color: '#EF4444', fontWeight: '700' }}>
                        {formatter.format(g.amount)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
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

      {/* MODAL CREAR GASTO */}
      {isModalOpen && (
        <div className="ds-modal-overlay">
          <div className="ds-modal">
            <form onSubmit={handleSubmit}>
              <div className="ds-modal-header">
                <h2 className="ds-modal-title">Registrar Gasto</h2>
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
                    <option>Otros</option>
                  </select>
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label"><FileText size={16}/> Descripción</label>
                  <input type="text" className="ds-input" required placeholder="Ej: Pago arriendo local junio" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label"><DollarSign size={16}/> Monto ($)</label>
                  <input type="number" className="ds-input" required placeholder="Ej: 1500000" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>

              </div>
              <div className="ds-modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="ds-btn ds-btn-ghost">
                  Cancelar
                </button>
                <button type="submit" className="ds-btn ds-btn-primary">
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
