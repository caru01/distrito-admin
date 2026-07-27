import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, DollarSign, Tag, FileText } from 'lucide-react';

export default function AdminGastos() {
  const [gastos, setGastos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    category: 'Arriendo',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0]
  });

  const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';
  
  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  });

  const fetchData = async () => {
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const res = await fetch(`${API_URL}/api/pedidos/admin/expenses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.status === 'ok') setGastos(json.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const res = await fetch(`${API_URL}/api/pedidos/admin/expenses`, {
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
      await fetch(`${API_URL}/api/pedidos/admin/expenses/${id}`, {
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
    <div style={{ padding: '24px', backgroundColor: '#0D0D0D', minHeight: '100vh', color: '#FFF' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '800', color: '#D4A017' }}>Gastos Operativos</h1>
          <p style={{ margin: 0, color: '#BDBDBD' }}>Registra y controla los egresos del negocio.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ backgroundColor: '#D4A017', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={20} /> Registrar Gasto
        </button>
      </div>

      <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '20px', borderRadius: '12px', display: 'inline-block', marginBottom: '24px' }}>
        <p style={{ margin: '0 0 4px 0', color: '#EF4444', fontSize: '14px', fontWeight: '600' }}>Total Gastos Registrados</p>
        <h2 style={{ margin: 0, color: '#EF4444', fontSize: '28px' }}>{formatter.format(totalGastos)}</h2>
      </div>

      <div style={{ backgroundColor: '#111', borderRadius: '16px', border: '1px solid #333', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#1A1A1A', borderBottom: '1px solid #333' }}>
            <tr>
              <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontWeight: '600', fontSize: '13px' }}>FECHA</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontWeight: '600', fontSize: '13px' }}>CATEGORÍA</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontWeight: '600', fontSize: '13px' }}>DESCRIPCIÓN</th>
              <th style={{ padding: '16px', textAlign: 'right', color: '#888', fontWeight: '600', fontSize: '13px' }}>MONTO</th>
              <th style={{ padding: '16px', textAlign: 'right', color: '#888', fontWeight: '600', fontSize: '13px' }}></th>
            </tr>
          </thead>
          <tbody>
            {gastos.map(g => (
              <tr key={g.id} style={{ borderBottom: '1px solid #222' }}>
                <td style={{ padding: '16px', color: '#BDBDBD' }}>
                  {new Date(g.expense_date || g.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '16px', color: '#FFF', fontWeight: '600' }}>
                  <span style={{ backgroundColor: '#333', padding: '4px 12px', borderRadius: '20px', fontSize: '12px' }}>
                    {g.category}
                  </span>
                </td>
                <td style={{ padding: '16px', color: '#BDBDBD' }}>{g.description}</td>
                <td style={{ padding: '16px', textAlign: 'right', color: '#EF4444', fontWeight: '700' }}>
                  {formatter.format(g.amount)}
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <button onClick={() => handleDelete(g.id)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer' }}>
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {gastos.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  No hay gastos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CREAR GASTO */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#111', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '500px', border: '1px solid #333' }}>
            <h2 style={{ margin: '0 0 24px 0', color: '#FFF' }}>Registrar Gasto</h2>
            <form onSubmit={handleSubmit}>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#BDBDBD', fontSize: '14px', marginBottom: '8px' }}><Calendar size={16}/> Fecha del Gasto</label>
                <input type="date" required value={formData.expense_date} onChange={e => setFormData({...formData, expense_date: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#0D0D0D', border: '1px solid #333', color: '#FFF', padding: '12px', borderRadius: '8px' }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#BDBDBD', fontSize: '14px', marginBottom: '8px' }}><Tag size={16}/> Categoría</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', backgroundColor: '#0D0D0D', border: '1px solid #333', color: '#FFF', padding: '12px', borderRadius: '8px' }}>
                  <option>Arriendo</option>
                  <option>Nómina</option>
                  <option>Servicios Públicos</option>
                  <option>Publicidad</option>
                  <option>Empaques</option>
                  <option>Mantenimiento</option>
                  <option>Otros</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#BDBDBD', fontSize: '14px', marginBottom: '8px' }}><FileText size={16}/> Descripción</label>
                <input type="text" required placeholder="Ej: Pago arriendo local junio" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#0D0D0D', border: '1px solid #333', color: '#FFF', padding: '12px', borderRadius: '8px' }} />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#BDBDBD', fontSize: '14px', marginBottom: '8px' }}><DollarSign size={16}/> Monto ($)</label>
                <input type="number" required placeholder="Ej: 1500000" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#0D0D0D', border: '1px solid #333', color: '#FFF', padding: '12px', borderRadius: '8px' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, backgroundColor: 'transparent', border: '1px solid #333', color: '#FFF', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ flex: 1, backgroundColor: '#D4A017', border: 'none', color: '#000', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}>
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
