import React, { useState } from 'react';
import { Plus, Minus, Trash2, StickyNote, ShoppingCart, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function CrmOrderCart({
  cart = [],
  onUpdateQuantity,
  onRemoveItem,
  onUpdateItemNotes,
  onClearCart,
}) {
  const [editingNotesId, setEditingNotesId] = useState(null);

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );
  const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);

  if (cart.length === 0) {
    return (
      <div className="crm-cart-empty">
        <ShoppingCart size={36} className="ds-text-muted" />
        <h4>Tu pedido está vacío</h4>
        <p>Busca productos en el catálogo para agregarlos al pedido del cliente.</p>
      </div>
    );
  }

  return (
    <div className="crm-order-cart">
      <header className="crm-cart-header">
        <div className="crm-cart-count-badge">
          <strong>{totalItems}</strong> {totalItems === 1 ? 'producto' : 'productos'} seleccionados
        </div>
        <button
          type="button"
          className="ds-btn ds-btn-ghost ds-btn-sm crm-cart-clear-btn"
          onClick={() => {
            if (window.confirm('¿Seguro que deseas vaciar todos los productos del pedido?')) {
              onClearCart();
            }
          }}
          title="Eliminar todos los productos"
        >
          <Trash2 size={13} />
          <span>Vaciar</span>
        </button>
      </header>

      {/* Lista de productos en carrito */}
      <div className="crm-cart-items-list">
        {cart.map((item) => {
          const itemSubtotal = Number(item.price || 0) * Number(item.quantity || 1);
          const isEditingNotes = editingNotesId === item.id;

          return (
            <article key={item.id} className="crm-cart-item-card">
              <div className="crm-cart-item-top">
                <div className="crm-cart-item-info">
                  <strong className="crm-cart-item-title">{item.title}</strong>
                  <span className="crm-cart-item-unit-price">
                    {formatCurrency(Number(item.price || 0))} c/u
                  </span>
                </div>

                <div className="crm-cart-item-subtotal">
                  <strong>{formatCurrency(itemSubtotal)}</strong>
                </div>
              </div>

              {/* Controles de cantidad y notas */}
              <div className="crm-cart-item-bottom">
                <div className="crm-cart-item-qty-wrap">
                  <button
                    type="button"
                    className="crm-qty-btn"
                    onClick={() => onUpdateQuantity(item.id, Number(item.quantity || 1) - 1)}
                    title="Restar 1"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="crm-qty-value">{item.quantity}</span>
                  <button
                    type="button"
                    className="crm-qty-btn is-plus"
                    onClick={() => onUpdateQuantity(item.id, Number(item.quantity || 1) + 1)}
                    title="Sumar 1"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <div className="crm-cart-item-actions">
                  <button
                    type="button"
                    className={`crm-cart-note-toggle ${item.notes ? 'has-notes' : ''}`}
                    onClick={() => setEditingNotesId(isEditingNotes ? null : item.id)}
                    title={item.notes ? 'Editar nota de preparación' : 'Añadir nota de preparación'}
                  >
                    <StickyNote size={12} />
                    <span>{item.notes ? 'Con nota' : '+ Nota'}</span>
                  </button>

                  <button
                    type="button"
                    className="crm-cart-remove-btn"
                    onClick={() => onRemoveItem(item.id)}
                    title="Eliminar producto del pedido"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Editor desplegable de notas del producto */}
              {isEditingNotes && (
                <div className="crm-cart-item-notes-box">
                  <input
                    type="text"
                    className="ds-input crm-cart-note-input"
                    value={item.notes || ''}
                    onChange={(e) => onUpdateItemNotes(item.id, e.target.value)}
                    placeholder="Ej: Sin cebolla, término medio, salsa aparte…"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="ds-btn ds-btn-secondary ds-btn-sm"
                    onClick={() => setEditingNotesId(null)}
                  >
                    Listo
                  </button>
                </div>
              )}

              {item.notes && !isEditingNotes && (
                <p
                  className="crm-cart-item-notes-display"
                  onClick={() => setEditingNotesId(item.id)}
                  title="Clic para editar nota"
                >
                  📝 {item.notes}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {/* Resumen subtotal */}
      <footer className="crm-cart-footer">
        <div className="crm-cart-footer-row">
          <span>Subtotal productos:</span>
          <strong>{formatCurrency(subtotal)}</strong>
        </div>
      </footer>
    </div>
  );
}
