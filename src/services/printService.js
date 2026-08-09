/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SERVICIO PROFESIONAL UNIFICADO DE IMPRESIÓN DE COMANDAS TÉRMICAS ESC/POS
 * ERP Distrito BG - Altísima Legibilidad, Método de Pago & Tipo de Entrega
 * ─────────────────────────────────────────────────────────────────────────────
 */

const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

/**
 * Función principal para imprimir el ticket unificado de Comanda / Pedido
 * @param {Object} order - Objeto del pedido
 * @param {Number} paperWidth - 80 (default) | 58
 */
export const printTicket = (order, paperWidth = 80) => {
  if (!order) return;

  const printWindow = window.open('', '_blank', `width=${paperWidth === 58 ? 320 : 420},height=650`);
  if (!printWindow) {
    alert('Por favor habilite las ventanas emergentes (popups) para imprimir los tickets.');
    return;
  }

  const htmlContent = generateSingleComandaHTML(order, paperWidth);

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
};

/**
 * Generador HTML con alta legibilidad, Método de Pago, Tipo de Entrega y toques de color originales
 */
export const generateSingleComandaHTML = (order, paperWidth = 80) => {
  const is58 = paperWidth === 58;
  const items = Array.isArray(order.cart_json) ? order.cart_json : (order.cart || []);

  const orderDate = order.created_at ? new Date(order.created_at) : new Date();
  const formattedDate = orderDate.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
  const formattedTime = orderDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' });

  const originText = order.source || 'Salón';
  const deliveryType = order.delivery_type || order.deliveryType || 'Domicilio';
  const paymentMethod = order.payment_method || order.paymentMethod || 'Efectivo';
  const orderNumber = String(order.id || '1258').padStart(4, '0');
  const cashierName = order.cajero || order.user || 'Camilo Rincones';

  // Cálculos de Subtotal, Domicilio y Total
  const subtotal = items.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || i.qty || 1)), 0);
  const deliveryFee = (deliveryType.toLowerCase() === 'domicilio') ? Math.max(0, Number(order.delivery_fee || 0)) : 0;
  const grandTotal = Number(order.total ?? (subtotal + deliveryFee));

  let productsRowsHtml = '';
  items.forEach(item => {
    const qty = item.quantity || item.qty || 1;
    const title = item.title || item.name || 'Producto';
    const price = item.price || 0;
    const itemTotal = price * qty;
    const modifiers = item.modifiers || item.opciones || item.extras || [];

    let modifiersHtml = '';
    if (Array.isArray(modifiers) && modifiers.length > 0) {
      modifiersHtml = `<div class="modifier-item">` +
        modifiers.map(m => `<div>• ${typeof m === 'string' ? m : (m.name || m.label)}</div>`).join('') +
      `</div>`;
    } else if (item.notes) {
      modifiersHtml = `<div class="modifier-item"><div>• ${item.notes}</div></div>`;
    }

    productsRowsHtml += `
      <div class="product-row">
        <div class="product-left">
          <span class="qty">${qty}</span>
          <span class="product-name">${title}</span>
        </div>
        <div class="product-price">${formatter.format(itemTotal)}</div>
      </div>
      ${modifiersHtml}
    `;
  });

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Comanda #${orderNumber}</title>
      <style>
        @page { size: ${paperWidth}mm auto; margin: 0; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: ${is58 ? '13px' : '14px'};
          color: #000;
          background: #fff;
          margin: 0;
          padding: ${is58 ? '10px 8px' : '16px 12px'};
          width: 100%;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          line-height: 1.35;
        }

        .text-center { text-align: center; }
        .dashed-divider {
          border-bottom: 2px dashed #000;
          margin: 12px 0;
          width: 100%;
        }

        /* ENCABEZADO INSTITUCIONAL CENTRADO */
        .brand-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          margin-bottom: 8px;
        }
        .burger-icon {
          width: ${is58 ? '38px' : '46px'};
          height: ${is58 ? '38px' : '46px'};
          margin-bottom: 2px;
        }
        .brand-name {
          font-size: ${is58 ? '22px' : '26px'};
          font-weight: 900;
          letter-spacing: -0.5px;
          line-height: 1.1;
          color: #000;
        }
        .brand-slogan {
          font-size: ${is58 ? '11px' : '12px'};
          color: #333;
          margin-top: 4px;
          font-weight: 600;
        }

        /* COMANDA INFO */
        .comanda-title {
          font-size: ${is58 ? '15px' : '17px'};
          font-weight: 900;
          text-align: center;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
          color: #000;
        }
        .info-line {
          font-size: ${is58 ? '13px' : '14px'};
          margin-bottom: 4px;
          color: #000;
        }
        .info-label { font-weight: 800; color: #000; }
        .order-code {
          font-size: ${is58 ? '16px' : '18px'};
          font-weight: 900;
          color: #7C3AED;
        }

        /* SECCIONES PILL BADGES */
        .pill-badge {
          display: inline-block;
          background-color: #000;
          color: #fff;
          font-size: ${is58 ? '12px' : '13px'};
          font-weight: 900;
          padding: 4px 12px;
          border-radius: 4px;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
          text-transform: uppercase;
        }

        /* LISTA PRODUCTOS */
        .product-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-top: 8px;
          font-size: ${is58 ? '13px' : '15px'};
        }
        .product-left {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          flex: 1;
        }
        .qty {
          font-size: ${is58 ? '14px' : '16px'};
          font-weight: 900;
          min-width: 16px;
        }
        .product-name {
          font-weight: 800;
          line-height: 1.2;
        }
        .product-price {
          font-weight: 900;
          font-size: ${is58 ? '13px' : '15px'};
          white-space: nowrap;
          margin-left: 8px;
        }
        .modifier-item {
          margin-left: ${is58 ? '26px' : '30px'};
          margin-top: 3px;
          margin-bottom: 6px;
          font-size: ${is58 ? '12px' : '13px'};
          color: #222;
          font-weight: 600;
        }

        /* RESUMEN DE TOTALES */
        .totals-container {
          margin-top: 6px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: ${is58 ? '13px' : '14px'};
          margin-bottom: 4px;
          color: #000;
          font-weight: 600;
        }
        .grand-total {
          font-size: ${is58 ? '17px' : '20px'};
          font-weight: 900;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          padding: 6px 0;
          margin-top: 8px;
        }

        /* OBSERVACIONES */
        .obs-text {
          font-size: ${is58 ? '13px' : '14px'};
          font-weight: 700;
          line-height: 1.4;
          white-space: pre-line;
          color: #000;
        }

        /* FOOTER */
        .thanks-title {
          font-size: ${is58 ? '16px' : '18px'};
          font-weight: 900;
          color: #7C3AED;
          margin-bottom: 3px;
        }
        .footer-sub {
          font-size: ${is58 ? '12px' : '13px'};
          font-weight: 700;
          color: #000;
        }
      </style>
    </head>
    <body>
      
      <!-- ENCABEZADO INSTITUCIONAL CENTRADO -->
      <div class="brand-header">
        <div class="brand-name">DISTRITO BG</div>
        <div class="brand-slogan">Más que hamburguesas, una experiencia.</div>
      </div>

      <div class="dashed-divider"></div>

      <!-- COMANDA DE COCINA INFO -->
      <div class="comanda-title">COMANDA DE COCINA</div>

      <div class="info-line">
        <span class="info-label">Pedido:</span> <span class="order-code">#${orderNumber}</span>
      </div>
      <div class="info-line">
        <span class="info-label">Fecha:</span> <span>${formattedDate} &nbsp; ${formattedTime}</span>
      </div>
      <div class="info-line">
        <span class="info-label">Origen:</span> <span>${originText}</span> ${order.mesa ? `&nbsp;&nbsp;&nbsp;&nbsp; <span class="info-label">Mesa:</span> <span>${order.mesa}</span>` : ''}
      </div>
      <div class="info-line">
        <span class="info-label">Tipo de Entrega:</span> <span style="font-weight:800; text-transform:uppercase;">${deliveryType}</span>
      </div>
      <div class="info-line">
        <span class="info-label">Método de Pago:</span> <span style="font-weight:800; text-transform:uppercase;">${paymentMethod}</span>
      </div>
      ${order.voucher_reference ? `
        <div class="info-line">
          <span class="info-label">Comprobante N°:</span> <span style="font-weight:800; color:#7C3AED;">#${order.voucher_reference}</span>
        </div>
      ` : ''}
      <div class="info-line">
        <span class="info-label">Cajero:</span> <span>${cashierName}</span>
      </div>

      <!-- DATOS DEL CLIENTE POR SEPARADOS -->
      ${order.customer_name ? `
        <div class="info-line"><span class="info-label">Nombre:</span> <span>${order.customer_name}</span></div>
      ` : ''}
      ${order.customer_phone ? `
        <div class="info-line"><span class="info-label">Teléfono:</span> <span>${order.customer_phone}</span></div>
      ` : ''}
      ${order.address ? `
        <div class="info-line"><span class="info-label">Dirección:</span> <span>${order.address}</span></div>
      ` : ''}
      ${order.barrio ? `
        <div class="info-line"><span class="info-label">Barrio:</span> <span>${order.barrio}</span></div>
      ` : ''}

      <div class="dashed-divider"></div>

      <!-- SECCIÓN PRODUCTOS -->
      <div class="pill-badge">PRODUCTOS</div>

      <div>
        ${productsRowsHtml}
      </div>

      <!-- RESUMEN DE TOTALES -->
      <div class="dashed-divider"></div>
      <div class="totals-container">
        <div class="total-row"><span>Subtotal:</span><span>${formatter.format(subtotal)}</span></div>
        ${deliveryFee > 0 ? `<div class="total-row"><span>Domicilio:</span><span>${formatter.format(deliveryFee)}</span></div>` : ''}
        <div class="total-row grand-total"><span>TOTAL:</span><span>${formatter.format(grandTotal)}</span></div>
      </div>

      <!-- SECCIÓN OBSERVACIONES -->
      ${order.notes ? `
        <div class="dashed-divider"></div>
        <div class="pill-badge">OBSERVACIONES</div>
        <div class="obs-text">${order.notes}</div>
      ` : ''}

      <div class="dashed-divider"></div>

      <!-- MENSAJE FINAL -->
      <div class="text-center" style="margin-top: 8px;">
        <div class="thanks-title">¡Gracias!</div>
        <div class="footer-sub">En cocina hacemos tu pedido con amor ❤️</div>
      </div>

    </body>
    </html>
  `;
};
