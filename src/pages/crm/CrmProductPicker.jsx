import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, Minus, X, Package, Check, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function CrmProductPicker({
  products = [],
  categories = [],
  cart = [],
  onAddToCart,
  onUpdateQuantity,
  loading = false,
}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const searchTimerRef = useRef(null);

  // Debounce para no recalcular en cada tecleo
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
    }, 180);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  // Mapa de cantidades en carrito para badge de 0ms
  const cartQtyMap = useMemo(() => {
    const map = new Map();
    for (const item of cart) {
      map.set(Number(item.id), item.quantity);
    }
    return map;
  }, [cart]);

  // Filtrado optimizado en memoria
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status && p.status !== 'Activo') return false;
      if (activeCategory !== 'all' && p.category !== activeCategory) return false;
      if (!debouncedSearch) return true;
      const title = String(p.title || '').toLowerCase();
      const desc = String(p.description || '').toLowerCase();
      const cat = String(p.category || '').toLowerCase();
      return title.includes(debouncedSearch) || desc.includes(debouncedSearch) || cat.includes(debouncedSearch);
    });
  }, [products, activeCategory, debouncedSearch]);

  return (
    <div className="crm-product-picker">
      {/* Buscador rápido */}
      <div className="crm-picker-search-bar">
        <div className="crm-picker-input-wrap">
          <Search size={15} className="crm-picker-search-icon" />
          <input
            type="text"
            className="ds-input crm-picker-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar hamburguesas, combos, bebidas…"
          />
          {search && (
            <button
              type="button"
              className="crm-picker-clear-btn"
              onClick={() => setSearch('')}
              title="Borrar búsqueda"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Píldoras de categorías */}
      {categories.length > 0 && (
        <div className="crm-picker-cats-row">
          <button
            type="button"
            className={`crm-picker-cat-pill ${activeCategory === 'all' ? 'is-active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            Todas ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id || c.name}
              type="button"
              className={`crm-picker-cat-pill ${activeCategory === c.name ? 'is-active' : ''}`}
              onClick={() => setActiveCategory(c.name)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Lista de productos */}
      <div className="crm-picker-grid">
        {loading ? (
          <div className="crm-picker-empty">
            <span className="spin">⏳</span>
            <p>Cargando catálogo…</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((p) => {
            const qty = cartQtyMap.get(Number(p.id)) || 0;
            const inStock = p.track_stock ? Number(p.stock || 0) > 0 : true;

            return (
              <article
                key={p.id}
                className={`crm-picker-card ${qty > 0 ? 'is-in-cart' : ''} ${!inStock ? 'is-out-of-stock' : ''}`}
              >
                <div className="crm-picker-card-main">
                  <div className="crm-picker-card-info">
                    <div className="crm-picker-card-header">
                      <strong className="crm-picker-card-title">{p.title}</strong>
                      {p.category && (
                        <span className="crm-picker-badge-cat">{p.category}</span>
                      )}
                    </div>
                    {p.description && (
                      <p className="crm-picker-card-desc">{p.description}</p>
                    )}
                    <div className="crm-picker-card-footer">
                      <span className="crm-picker-price">
                        {formatCurrency(Number(p.price || 0))}
                      </span>
                      {p.track_stock && (
                        <small className={`crm-picker-stock ${inStock ? 'in-stock' : 'no-stock'}`}>
                          {inStock ? `${p.stock} disp.` : 'Agotado'}
                        </small>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="crm-picker-card-actions">
                    {qty === 0 ? (
                      <button
                        type="button"
                        className="ds-btn ds-btn-sm ds-btn-primary crm-picker-add-btn"
                        onClick={() => onAddToCart(p)}
                        disabled={!inStock}
                        title={inStock ? 'Agregar al pedido' : 'Producto sin existencias'}
                      >
                        <Plus size={14} />
                        <span>Agregar</span>
                      </button>
                    ) : (
                      <div className="crm-picker-qty-controls">
                        <button
                          type="button"
                          className="crm-qty-btn"
                          onClick={() => onUpdateQuantity(p.id, qty - 1)}
                          title="Restar 1"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="crm-qty-value">{qty}</span>
                        <button
                          type="button"
                          className="crm-qty-btn is-plus"
                          onClick={() => onUpdateQuantity(p.id, qty + 1)}
                          title="Sumar 1"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="crm-picker-empty">
            <Package size={28} className="ds-text-muted" />
            <p>No se encontraron productos con "{search}"</p>
            {activeCategory !== 'all' && (
              <button
                type="button"
                className="ds-btn ds-btn-ghost ds-btn-sm"
                onClick={() => setActiveCategory('all')}
              >
                Ver todas las categorías
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
