import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, ScanLine as Barcode, Boxes, Edit3, ExternalLink, PackageCheck, PackageX, Plus, Search, X } from 'lucide-react';
import { API_URL } from '../config/api';

export default function AdminInventario() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(undefined);
  const [settings, setSettings] = useState({ barcode: '', track_stock: true, low_stock_threshold: 5, inventory_unit: 'unidad', inventory_unit_cost: 0 });
  const [movement, setMovement] = useState({ movement_type: 'ENTRADA', quantity: 1, reason: '' });
  const [lookup, setLookup] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const token = sessionStorage.getItem('distrito_admin_token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/admin/product-stock`, { headers }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible cargar el inventario');
      setProducts(data.data || []);
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  }, [headers]);
  useEffect(() => { load(); }, [load]);

  const open = (product) => {
    setSelected(product); setLookup(null);
    setSettings({ barcode: product.barcode || '', track_stock: product.track_stock, low_stock_threshold: product.low_stock_threshold ?? 5, inventory_unit: product.inventory_unit || 'unidad', inventory_unit_cost: product.inventory_unit_cost || 0 });
    setMovement({ movement_type: 'ENTRADA', quantity: 1, reason: '' });
  };

  const saveSettings = async () => {
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/admin/product-stock/${selected.id}`, { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No fue posible guardar');
      setMessage({ type: 'success', text: 'Control de inventario actualizado.' }); await load(); setSelected(undefined);
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };

  const registerMovement = async () => {
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/admin/product-stock/${selected.id}/movements`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(movement) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No fue posible registrar el movimiento');
      setMessage({ type: 'success', text: `Movimiento registrado. Nuevo stock: ${data.stock}.` }); await load(); setSelected(undefined);
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };

  const lookupBarcode = async () => {
    setBusy(true); setLookup(null);
    try {
      const response = await fetch(`${API_URL}/admin/products/lookup-barcode/${settings.barcode}`, { headers }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Código no encontrado');
      setLookup(data.product); setMessage({ type: 'success', text: 'Referencia encontrada. Verifica los datos antes de usarlos.' });
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };

  const stats = { tracked: products.filter((p) => p.track_stock).length, low: products.filter((p) => p.track_stock && Number(p.stock) > 0 && Number(p.stock) <= Number(p.low_stock_threshold)).length, out: products.filter((p) => p.track_stock && Number(p.stock) <= 0).length };
  const filtered = products.filter((product) => {
    const matches = `${product.title} ${product.category || ''} ${product.barcode || ''}`.toLowerCase().includes(query.toLowerCase());
    if (!matches) return false;
    if (filter === 'low') return product.track_stock && Number(product.stock) <= Number(product.low_stock_threshold);
    if (filter === 'untracked') return !product.track_stock;
    return true;
  });
  const stockBadge = (product) => !product.track_stock ? ['Sin control', 'ds-badge-neutral'] : Number(product.stock) <= 0 ? ['Agotado', 'ds-badge-danger'] : Number(product.stock) <= Number(product.low_stock_threshold) ? ['Stock bajo', 'ds-badge-warning'] : ['Disponible', 'ds-badge-success'];

  return <div className="ds-page inventory-page"><header className="ds-page-header"><div><span className="ds-eyebrow">Catálogo vendible</span><h1 className="ds-page-title">Inventario de productos</h1><p className="ds-page-subtitle">Sin ingredientes ni recetas: cada existencia corresponde al producto que el cliente compra.</p></div><a className="ds-btn ds-btn-primary" href="/admin/productos"><Plus size={17} /> Crear producto</a></header>
    {message.text && <div className={`ds-alert ds-alert-${message.type === 'error' ? 'danger' : 'success'}`}>{message.text}</div>}
    <section className="inventory-kpis"><article className="ds-card"><Boxes /><div><strong>{stats.tracked}</strong><span>Productos controlados</span></div></article><article className="ds-card"><AlertTriangle /><div><strong>{stats.low}</strong><span>Stock bajo</span></div></article><article className="ds-card"><PackageX /><div><strong>{stats.out}</strong><span>Agotados</span></div></article><article className="ds-card"><PackageCheck /><div><strong>{products.length - stats.out}</strong><span>Disponibles en catálogo</span></div></article></section>
    <section className="ds-card"><div className="inventory-toolbar"><div className="ds-search" style={{ flex: 1, minWidth: '300px' }}>
  <Search size={20} className="ds-search-icon" />
  <input 
    type="text" 
    placeholder="Buscar producto, categoría o código" 
    value={query} 
    onChange={(e) => setQuery(e.target.value)}
    className="ds-search-input ds-input" 
  />
</div><div className="ds-filter-group"><button className={`ds-btn ds-btn-sm ${filter === 'all' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setFilter('all')}>Todos</button><button className={`ds-btn ds-btn-sm ${filter === 'low' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setFilter('low')}>Críticos</button><button className={`ds-btn ds-btn-sm ${filter === 'untracked' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setFilter('untracked')}>Sin control</button></div></div>
      <div className="ds-table-container"><table className="ds-table"><thead><tr><th>Producto</th><th>Código</th><th>Existencias</th><th>Umbral</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{filtered.map((product) => { const badge = stockBadge(product); return <tr key={product.id}><td><strong>{product.title}</strong><small>{product.category || 'General'} · costo ${Number(product.inventory_unit_cost || 0).toLocaleString('es-CO')}</small></td><td>{product.barcode || '—'}</td><td><strong>{product.track_stock ? `${Number(product.stock) || 0} ${product.inventory_unit || 'unidad'}` : 'No aplica'}</strong></td><td>{product.track_stock ? product.low_stock_threshold : '—'}</td><td><span className={`ds-badge ${badge[1]}`}>{badge[0]}</span></td><td><button className="ds-btn ds-btn-secondary ds-btn-sm" onClick={() => open(product)}><Edit3 size={15} /> Gestionar</button></td></tr>; })}</tbody></table></div>
    </section>
    {selected && <div className="ds-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setSelected(undefined)}><div className="ds-modal ds-modal-lg inventory-modal"><div className="ds-modal-header"><div><h2 className="ds-modal-title">{selected.title}</h2><p className="ds-text-muted">Existencia actual: {selected.stock || 0} {selected.inventory_unit || 'unidad'}</p></div><button className="ds-icon-btn" onClick={() => setSelected(undefined)}><X /></button></div><div className="ds-modal-body inventory-modal-grid">
      <section className="inventory-panel"><h3><Archive size={18} /> Configuración</h3><label className="ds-checkbox"><input type="checkbox" checked={settings.track_stock} onChange={(e) => setSettings({ ...settings, track_stock: e.target.checked })} /><span>Descontar stock al crear pedidos</span></label><div className="user-form-grid"><label className="ds-form-group"><span className="ds-form-label">Stock mínimo</span><input className="ds-input" type="number" min="0" value={settings.low_stock_threshold} onChange={(e) => setSettings({ ...settings, low_stock_threshold: e.target.value })} /></label><label className="ds-form-group"><span className="ds-form-label">Unidad</span><input className="ds-input" value={settings.inventory_unit} onChange={(e) => setSettings({ ...settings, inventory_unit: e.target.value })} /></label><label className="ds-form-group"><span className="ds-form-label">Costo unitario</span><input className="ds-input" type="number" min="0" value={settings.inventory_unit_cost} onChange={(e) => setSettings({ ...settings, inventory_unit_cost: e.target.value })} /></label></div><label className="ds-form-group"><span className="ds-form-label"><Barcode size={15} /> Código de barras</span><div className="inventory-barcode-row"><input className="ds-input" inputMode="numeric" value={settings.barcode} onChange={(e) => setSettings({ ...settings, barcode: e.target.value.replace(/\D/g, '') })} /><button className="ds-btn ds-btn-secondary" type="button" onClick={lookupBarcode} disabled={busy || settings.barcode.length < 8}>Consultar</button></div></label>{lookup && <div className="inventory-lookup"><strong>{lookup.title || 'Producto sin nombre'}</strong><span>{lookup.brand} {lookup.quantity}</span><small>Dato externo de referencia; el catálogo local sigue siendo la fuente oficial.</small></div>}<button className="ds-btn ds-btn-primary ds-w-full" onClick={saveSettings} disabled={busy}>Guardar configuración</button></section>
      <section className="inventory-panel"><h3><ExternalLink size={18} /> Registrar movimiento</h3><label className="ds-form-group"><span className="ds-form-label">Tipo</span><select className="ds-select" value={movement.movement_type} onChange={(e) => setMovement({ ...movement, movement_type: e.target.value })}><option value="ENTRADA">Entrada</option><option value="SALIDA">Salida</option><option value="AJUSTE">Fijar cantidad exacta</option></select></label><label className="ds-form-group"><span className="ds-form-label">Cantidad</span><input className="ds-input" type="number" min="0" value={movement.quantity} onChange={(e) => setMovement({ ...movement, quantity: Number(e.target.value) })} /></label><label className="ds-form-group"><span className="ds-form-label">Motivo</span><textarea className="ds-textarea" rows="3" value={movement.reason} onChange={(e) => setMovement({ ...movement, reason: e.target.value })} placeholder="Compra, conteo físico, pérdida…" /></label><button className="ds-btn ds-btn-primary ds-w-full" onClick={registerMovement} disabled={busy}>Registrar movimiento</button></section>
    </div></div></div>}
  </div>;
}
