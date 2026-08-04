import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Boxes, CheckCircle, ChevronLeft, ChevronRight, Copy,
  Eye, Image as ImageIcon, Package, Pencil, Plus, RefreshCw, Search,
  Star, Trash2, Upload, X, XCircle,
} from 'lucide-react';
import { API_URL } from '../config/api';
import { formatCurrency, formatNumber } from '../utils/formatters';

const PAGE_SIZE = 10;
const EMPTY_PRODUCT = {
  id: null, title: '', description: '', price: '', category: '', image: '',
  status: 'Activo', is_featured: false, stock: 0, barcode: '', track_stock: false,
  low_stock_threshold: 5, inventory_unit: 'unidad', inventory_unit_cost: 0,
};

function productStockState(product) {
  if (!product.track_stock) return { label: 'Sin control', tone: 'neutral' };
  const stock = Number(product.stock || 0);
  if (stock <= 0) return { label: 'Agotado', tone: 'danger' };
  if (stock <= Number(product.low_stock_threshold || 5)) return { label: `${formatNumber(stock)} · Bajo`, tone: 'warning' };
  return { label: `${formatNumber(stock)} ${product.inventory_unit || 'unid.'}`, tone: 'success' };
}

function ProductImage({ product, size = 'table' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [product.image]);
  return product.image && !failed
    ? <img className={`product-image product-image-${size}`} src={product.image} alt={product.title} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    : <span className={`product-image product-image-${size} product-image-empty`}><ImageIcon size={size === 'preview' ? 42 : 20} /></span>;
}

export default function AdminProductos() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: '', category: '', status: '', featured: '', stock: '', sort: 'updated_desc' });
  const [page, setPage] = useState(1);
  const [currentProduct, setCurrentProduct] = useState(EMPTY_PRODUCT);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setNotice(null);
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const headers = { Authorization: `Bearer ${token}` };
      const [productsResponse, categoriesResponse] = await Promise.all([
        fetch(`${API_URL}/admin/products`, { headers }),
        fetch(`${API_URL}/admin/categories`, { headers }),
      ]);
      const [productsData, categoriesData] = await Promise.all([productsResponse.json(), categoriesResponse.json()]);
      if (!productsResponse.ok || productsData.status !== 'ok') throw new Error(productsData.error || 'No fue posible cargar los productos.');
      if (!categoriesResponse.ok || categoriesData.status !== 'ok') throw new Error(categoriesData.error || 'No fue posible cargar las categorías.');
      setProducts(productsData.products || []);
      setCategories(categoriesData.categories || []);
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'No fue posible cargar el catálogo.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredProducts = useMemo(() => {
    const query = filters.search.trim().toLocaleLowerCase('es');
    return products.filter((product) => {
      if (query && ![product.title, product.description, product.barcode, product.category].some((value) => String(value || '').toLocaleLowerCase('es').includes(query))) return false;
      if (filters.category && product.category !== filters.category) return false;
      if (filters.status && product.status !== filters.status) return false;
      if (filters.featured === 'yes' && !product.is_featured) return false;
      if (filters.featured === 'no' && product.is_featured) return false;
      const stock = Number(product.stock || 0);
      const threshold = Number(product.low_stock_threshold || 5);
      if (filters.stock === 'out' && (!product.track_stock || stock > 0)) return false;
      if (filters.stock === 'low' && (!product.track_stock || stock <= 0 || stock > threshold)) return false;
      if (filters.stock === 'controlled' && !product.track_stock) return false;
      return true;
    }).sort((a, b) => {
      if (filters.sort === 'name_asc') return a.title.localeCompare(b.title, 'es');
      if (filters.sort === 'name_desc') return b.title.localeCompare(a.title, 'es');
      if (filters.sort === 'price_asc') return Number(a.price) - Number(b.price);
      if (filters.sort === 'price_desc') return Number(b.price) - Number(a.price);
      if (filters.sort === 'stock_asc') return Number(a.stock || 0) - Number(b.stock || 0);
      return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    });
  }, [filters, products]);

  useEffect(() => { setPage(1); }, [filters]);
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  const visibleProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter((product) => product.status === 'Activo').length,
    low: products.filter((product) => product.track_stock && Number(product.stock || 0) > 0 && Number(product.stock || 0) <= Number(product.low_stock_threshold || 5)).length,
    out: products.filter((product) => product.track_stock && Number(product.stock || 0) <= 0).length,
  }), [products]);

  const openProduct = (product = null, duplicate = false) => {
    if (!product) setCurrentProduct(EMPTY_PRODUCT);
    else setCurrentProduct({ ...EMPTY_PRODUCT, ...product, id: duplicate ? null : product.id, title: duplicate ? `${product.title} (copia)` : product.title, barcode: duplicate ? '' : (product.barcode || '') });
    setIsModalOpen(true);
  };

  const updateProduct = (field, value) => setCurrentProduct((current) => ({ ...current, [field]: value }));

  const uploadImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setNotice({ type: 'error', text: 'Selecciona una imagen válida.' });
    if (file.size > 4 * 1024 * 1024) return setNotice({ type: 'error', text: 'La imagen supera el máximo de 4 MB.' });
    const reader = new FileReader();
    reader.onload = () => updateProduct('image', reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setNotice(null);
    const price = Number(currentProduct.price);
    if (!currentProduct.title.trim() || !Number.isFinite(price) || price < 0 || !currentProduct.category) {
      setNotice({ type: 'error', text: 'Completa nombre, categoría y un precio válido.' });
      return;
    }
    setSaving(true);
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const response = await fetch(currentProduct.id ? `${API_URL}/admin/products/${currentProduct.id}` : `${API_URL}/admin/products`, {
        method: currentProduct.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...currentProduct,
          title: currentProduct.title.trim(), description: currentProduct.description.trim(),
          price, stock: Number(currentProduct.stock || 0),
          low_stock_threshold: Number(currentProduct.low_stock_threshold || 0),
          inventory_unit_cost: Number(currentProduct.inventory_unit_cost || 0),
          barcode: currentProduct.barcode.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'ok') throw new Error(data.error || 'No fue posible guardar el producto.');
      setProducts((current) => currentProduct.id ? current.map((product) => product.id === data.product.id ? data.product : product) : [data.product, ...current]);
      setIsModalOpen(false);
      setNotice({ type: 'success', text: `${currentProduct.title} se guardó correctamente.` });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'No fue posible guardar el producto.' });
    } finally {
      setSaving(false);
    }
  };

  const quickUpdate = async (product, changes) => {
    setBusyId(product.id);
    setNotice(null);
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const response = await fetch(`${API_URL}/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...product, ...changes }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'ok') throw new Error(data.error || 'No fue posible actualizar el producto.');
      setProducts((current) => current.map((item) => item.id === product.id ? data.product : item));
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'No fue posible actualizar el producto.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`¿Eliminar “${product.title}”? Esta acción no se puede deshacer.`)) return;
    setBusyId(product.id);
    try {
      const token = sessionStorage.getItem('distrito_admin_token');
      const response = await fetch(`${API_URL}/admin/products/${product.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok || data.status !== 'ok') throw new Error(data.error || 'No fue posible eliminar el producto.');
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setNotice({ type: 'success', text: `${product.title} fue eliminado.` });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'No fue posible eliminar el producto.' });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="ds-loader-container"><div className="ds-loader" /><p>Cargando catálogo…</p></div>;

  const start = filteredProducts.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(page * PAGE_SIZE, filteredProducts.length);
  const hasFilters = Object.entries(filters).some(([key, value]) => key !== 'sort' && value);

  return (
    <div className="ds-page products-page">
      <header className="ds-page-header">
        <div><span className="ds-page-kicker">Catálogo e inventario</span><h1 className="ds-page-title">Productos</h1><p className="ds-page-subtitle">Administra disponibilidad, precios, imágenes y existencias desde un solo lugar.</p></div>
        <div className="ds-page-actions"><button className="ds-btn ds-btn-secondary" onClick={() => fetchData({ silent: true })}><RefreshCw size={18} /> Actualizar</button><button className="ds-btn ds-btn-primary" onClick={() => openProduct()}><Plus size={19} /> Nuevo producto</button></div>
      </header>

      {notice && <div className={`ds-inline-alert ds-inline-alert-${notice.type === 'success' ? 'success' : 'danger'}`} role="alert">{notice.type === 'success' ? <CheckCircle size={19} /> : <XCircle size={19} />}<span>{notice.text}</span></div>}

      <section className="product-kpi-grid">
        <article><Package size={21} /><div><strong>{stats.total}</strong><span>Total</span></div></article>
        <article><CheckCircle size={21} /><div><strong>{stats.active}</strong><span>Activos</span></div></article>
        <article className={stats.low ? 'warning' : ''}><AlertTriangle size={21} /><div><strong>{stats.low}</strong><span>Stock bajo</span></div></article>
        <article className={stats.out ? 'danger' : ''}><Boxes size={21} /><div><strong>{stats.out}</strong><span>Agotados</span></div></article>
      </section>

      <section className="ds-card product-catalog-card">
        <div className="product-toolbar">
          <div className="ds-search product-search"><Search className="ds-search-icon" size={18} /><input className="ds-search-input" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Buscar por nombre, categoría o código…" /></div>
          <select className="ds-select" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">Todas las categorías</option>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select>
          <select className="ds-select" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Todos los estados</option><option value="Activo">Activos</option><option value="Inactivo">Inactivos</option></select>
          <select className="ds-select" value={filters.stock} onChange={(event) => setFilters({ ...filters, stock: event.target.value })}><option value="">Cualquier inventario</option><option value="controlled">Con control</option><option value="low">Stock bajo</option><option value="out">Agotados</option></select>
          <select className="ds-select" value={filters.featured} onChange={(event) => setFilters({ ...filters, featured: event.target.value })}><option value="">Todos</option><option value="yes">Destacados</option><option value="no">No destacados</option></select>
          <select className="ds-select" value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}><option value="updated_desc">Actualizados recientemente</option><option value="name_asc">Nombre A–Z</option><option value="name_desc">Nombre Z–A</option><option value="price_asc">Menor precio</option><option value="price_desc">Mayor precio</option><option value="stock_asc">Menor existencia</option></select>
          {hasFilters && <button className="ds-btn ds-btn-ghost" onClick={() => setFilters({ search: '', category: '', status: '', featured: '', stock: '', sort: 'updated_desc' })}><X size={17} /> Limpiar</button>}
        </div>

        <div className="ds-table-container product-table-container">
          <table className="ds-table product-table">
            <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Inventario</th><th>Visible</th><th>Destacado</th><th className="product-actions-heading">Acciones</th></tr></thead>
            <tbody>{visibleProducts.map((product) => { const stockState = productStockState(product); return <tr key={product.id}>
              <td><div className="product-name-cell"><ProductImage product={product} /><div><strong>{product.title}</strong><span>{product.description || 'Sin descripción'}</span>{product.barcode && <small>Cod. {product.barcode}</small>}</div></div></td>
              <td><span className="ds-badge ds-badge-neutral">{product.category || 'Sin categoría'}</span></td>
              <td><strong>{formatCurrency(product.price)}</strong>{Number(product.inventory_unit_cost) > 0 && <small className="product-cost">Costo {formatCurrency(product.inventory_unit_cost)}</small>}</td>
              <td><span className={`ds-badge ds-badge-${stockState.tone}`}><Boxes size={13} /> {stockState.label}</span></td>
              <td><button className={`ds-switch ${product.status === 'Activo' ? 'active' : ''}`} disabled={busyId === product.id} onClick={() => quickUpdate(product, { status: product.status === 'Activo' ? 'Inactivo' : 'Activo' })} aria-label={`${product.status === 'Activo' ? 'Ocultar' : 'Publicar'} ${product.title}`} aria-pressed={product.status === 'Activo'}><i /></button></td>
              <td><button className={`product-feature-button ${product.is_featured ? 'active' : ''}`} disabled={busyId === product.id} onClick={() => quickUpdate(product, { is_featured: !product.is_featured })} aria-label={`${product.is_featured ? 'Quitar de' : 'Agregar a'} destacados`} aria-pressed={product.is_featured}><Star size={21} fill={product.is_featured ? 'currentColor' : 'none'} /></button></td>
              <td><div className="product-row-actions"><button className="ds-btn-icon ds-btn-secondary" onClick={() => setPreviewProduct(product)} aria-label={`Ver ${product.title}`}><Eye size={16} /></button><button className="ds-btn-icon ds-btn-secondary" onClick={() => openProduct(product)} aria-label={`Editar ${product.title}`}><Pencil size={16} /></button><button className="ds-btn-icon ds-btn-secondary" onClick={() => openProduct(product, true)} aria-label={`Duplicar ${product.title}`}><Copy size={16} /></button><button className="ds-btn-icon ds-btn-danger" disabled={busyId === product.id} onClick={() => handleDelete(product)} aria-label={`Eliminar ${product.title}`}><Trash2 size={16} /></button></div></td>
            </tr>; })}</tbody>
          </table>
          {!visibleProducts.length && <div className="ds-empty-state"><Package size={38} /><strong>No encontramos productos</strong><span>Ajusta los filtros o crea un producto nuevo.</span></div>}
        </div>

        <div className="product-mobile-list">{visibleProducts.map((product) => { const stockState = productStockState(product); return <article key={product.id} className="product-mobile-card"><div className="product-mobile-heading"><ProductImage product={product} /><div><strong>{product.title}</strong><span>{product.category || 'Sin categoría'}</span></div><strong>{formatCurrency(product.price)}</strong></div><div className="product-mobile-meta"><span className={`ds-badge ds-badge-${product.status === 'Activo' ? 'success' : 'neutral'}`}>{product.status}</span><span className={`ds-badge ds-badge-${stockState.tone}`}>{stockState.label}</span>{product.is_featured && <span className="ds-badge ds-badge-primary"><Star size={12} /> Destacado</span>}</div><div className="product-mobile-actions"><button className="ds-btn ds-btn-secondary" onClick={() => setPreviewProduct(product)}><Eye size={16} /> Ver</button><button className="ds-btn ds-btn-secondary" onClick={() => openProduct(product)}><Pencil size={16} /> Editar</button><button className="ds-btn ds-btn-danger" onClick={() => handleDelete(product)}><Trash2 size={16} /></button></div></article>; })}{!visibleProducts.length && <div className="ds-empty-state"><Package size={38} /><strong>No encontramos productos</strong></div>}</div>

        <footer className="product-pagination"><span>Mostrando {start}–{end} de {filteredProducts.length}</span><div><button className="ds-btn-icon ds-btn-secondary" disabled={page === 1} onClick={() => setPage((value) => value - 1)} aria-label="Página anterior"><ChevronLeft size={18} /></button><strong>Página {page} de {pageCount}</strong><button className="ds-btn-icon ds-btn-secondary" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)} aria-label="Página siguiente"><ChevronRight size={18} /></button></div></footer>
      </section>

      {isModalOpen && <div className="ds-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setIsModalOpen(false); }}><div className="ds-modal ds-modal-xl product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title"><form onSubmit={handleSave}>
        <div className="ds-modal-header"><div><span className="ds-page-kicker">{currentProduct.id ? 'Edición' : 'Nuevo registro'}</span><h2 id="product-modal-title" className="ds-modal-title">{currentProduct.id ? currentProduct.title : 'Crear producto'}</h2></div><button type="button" className="ds-modal-close" disabled={saving} onClick={() => setIsModalOpen(false)} aria-label="Cerrar"><X size={22} /></button></div>
        <div className="ds-modal-body"><div className="product-form-layout">
          <section className="ds-form"><div className="product-form-section"><strong>Información de venta</strong><span>Datos visibles en la tienda.</span></div><div className="ds-form-group"><label className="ds-form-label" htmlFor="product-name">Nombre</label><input id="product-name" className="ds-input" required maxLength={255} value={currentProduct.title} onChange={(event) => updateProduct('title', event.target.value)} /></div><div className="ds-form-group"><label className="ds-form-label" htmlFor="product-description">Descripción</label><textarea id="product-description" className="ds-textarea" maxLength={1000} value={currentProduct.description} onChange={(event) => updateProduct('description', event.target.value)} /></div><div className="ds-form-grid"><div className="ds-form-group"><label className="ds-form-label" htmlFor="product-price">Precio</label><input id="product-price" type="number" min="0" step="1" className="ds-input" required value={currentProduct.price} onChange={(event) => updateProduct('price', event.target.value)} /></div><div className="ds-form-group"><label className="ds-form-label" htmlFor="product-category">Categoría</label><select id="product-category" className="ds-select" required value={currentProduct.category} onChange={(event) => updateProduct('category', event.target.value)}><option value="">Selecciona…</option>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></div></div><div className="ds-form-grid"><div className="ds-form-group"><label className="ds-form-label" htmlFor="product-status">Estado</label><select id="product-status" className="ds-select" value={currentProduct.status} onChange={(event) => updateProduct('status', event.target.value)}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></div><label className="product-feature-field"><input type="checkbox" checked={currentProduct.is_featured} onChange={(event) => updateProduct('is_featured', event.target.checked)} /><Star size={20} fill={currentProduct.is_featured ? 'currentColor' : 'none'} /><span><strong>Producto destacado</strong><small>Aparece primero en la tienda.</small></span></label></div>
          </section>
          <section className="ds-form"><div className="product-form-section"><strong>Imagen</strong><span>Archivo o URL del producto.</span></div><div className="product-image-editor">{currentProduct.image ? <img key={currentProduct.image} src={currentProduct.image} alt="Vista previa" /> : <div><ImageIcon size={40} /><span>Sin imagen</span></div>}<div><label className="ds-btn ds-btn-secondary"><Upload size={17} /> Subir imagen<input type="file" accept="image/*" onChange={uploadImage} /></label>{currentProduct.image && <button type="button" className="ds-btn ds-btn-ghost" onClick={() => updateProduct('image', '')}><Trash2 size={17} /> Quitar</button>}</div></div><div className="ds-form-group"><label className="ds-form-label" htmlFor="product-image-url">URL de imagen</label><input id="product-image-url" className="ds-input" value={currentProduct.image?.startsWith('data:') ? '' : currentProduct.image} onChange={(event) => updateProduct('image', event.target.value)} placeholder="https://…" /></div>
          </section>
          <section className="ds-form product-inventory-section"><div className="product-form-section"><strong>Inventario</strong><span>La misma información usada por el módulo de existencias.</span></div><label className="announcement-publish-toggle"><input type="checkbox" checked={currentProduct.track_stock} onChange={(event) => updateProduct('track_stock', event.target.checked)} /><span className="ds-switch" aria-hidden="true"><i /></span><span><strong>Controlar existencias</strong><small>Impide vender cuando no hay stock.</small></span></label>{currentProduct.track_stock && <><div className="ds-form-grid-3"><div className="ds-form-group"><label className="ds-form-label" htmlFor="product-stock">Existencia</label><input id="product-stock" type="number" min="0" step="0.01" className="ds-input" value={currentProduct.stock} onChange={(event) => updateProduct('stock', event.target.value)} /></div><div className="ds-form-group"><label className="ds-form-label" htmlFor="product-threshold">Alerta mínima</label><input id="product-threshold" type="number" min="0" step="0.01" className="ds-input" value={currentProduct.low_stock_threshold} onChange={(event) => updateProduct('low_stock_threshold', event.target.value)} /></div><div className="ds-form-group"><label className="ds-form-label" htmlFor="product-unit">Unidad</label><select id="product-unit" className="ds-select" value={currentProduct.inventory_unit} onChange={(event) => updateProduct('inventory_unit', event.target.value)}><option value="unidad">Unidad</option><option value="porción">Porción</option><option value="gramo">Gramo</option><option value="mililitro">Mililitro</option></select></div></div><div className="ds-form-grid"><div className="ds-form-group"><label className="ds-form-label" htmlFor="product-cost">Costo unitario</label><input id="product-cost" type="number" min="0" step="1" className="ds-input" value={currentProduct.inventory_unit_cost} onChange={(event) => updateProduct('inventory_unit_cost', event.target.value)} /></div><div className="ds-form-group"><label className="ds-form-label" htmlFor="product-barcode">Código de barras</label><input id="product-barcode" inputMode="numeric" className="ds-input" value={currentProduct.barcode} onChange={(event) => updateProduct('barcode', event.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="8 a 14 dígitos" /></div></div></>}
          </section>
        </div></div>
        <div className="ds-modal-footer"><button type="button" className="ds-btn ds-btn-secondary" disabled={saving} onClick={() => setIsModalOpen(false)}>Cancelar</button><button className="ds-btn ds-btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar producto'}</button></div>
      </form></div></div>}

      {previewProduct && <div className="ds-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewProduct(null); }}><div className="ds-modal product-preview-modal" role="dialog" aria-modal="true" aria-labelledby="product-preview-title"><div className="ds-modal-header"><h2 id="product-preview-title" className="ds-modal-title">Vista en tienda</h2><button className="ds-modal-close" onClick={() => setPreviewProduct(null)} aria-label="Cerrar"><X size={22} /></button></div><div className="ds-modal-body"><div className="product-store-preview"><ProductImage product={previewProduct} size="preview" /><span className="ds-badge ds-badge-neutral">{previewProduct.category}</span>{previewProduct.is_featured && <span className="ds-badge ds-badge-primary"><Star size={12} /> Destacado</span>}<h3>{previewProduct.title}</h3><p>{previewProduct.description || 'Sin descripción'}</p><strong>{formatCurrency(previewProduct.price)}</strong><button className="ds-btn ds-btn-primary" type="button">Agregar al pedido</button></div></div></div></div>}
    </div>
  );
}
