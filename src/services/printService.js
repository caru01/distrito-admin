/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SERVICIO PROFESIONAL UNIFICADO DE IMPRESIÓN DE COMANDAS TÉRMICAS ESC/POS
 * Formato DISTRIC HOUSE - Optimizado para papel 58(48) x 3276 mm sin espacios sobrantes
 * ─────────────────────────────────────────────────────────────────────────────
 */

const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

/**
 * Función principal para imprimir el ticket unificado de Comanda / Pedido
 * @param {Object} order - Objeto del pedido
 * @param {Number} paperWidth - 58 (default 58mm / 48mm imprimible) | 80
 */
export const printTicket = (order, paperWidth = 58) => {
  if (!order) return;

  const printWindow = window.open('', '_blank', 'width=320,height=550');
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
  }, 250);
};

/**
 * Generador HTML según especificación DISTRIC HOUSE:
 * - Tamaño base de fuente: 12px
 * - Espaciado ultra-compacto para evitar desbordes y saltos en 48mm
 * - Sin espacios en blanco sobrantes al inicio ni al final
 * - Etiquetas normales (400), valores en negrita (700/800)
 */
export const generateSingleComandaHTML = (order, paperWidth = 58) => {
  const is58 = paperWidth === 58;
  const printableWidth = is58 ? '44mm' : '72mm';
  const items = Array.isArray(order.cart_json) ? order.cart_json : (order.cart || []);

  const orderDate = order.created_at ? new Date(order.created_at) : new Date();
  const formattedDate = orderDate.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
  const formattedTime = orderDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' });
  const formattedDateTime = `${formattedDate} ${formattedTime}`;

  const orderNumber = String(order.id || '1').padStart(4, '0');
  const customerName = order.customer_name || order.customer?.name || order.name || 'Cliente';
  const customerPhone = order.customer_phone || order.customer?.phone || order.phone || 'Sin teléfono';
  const deliveryType = order.delivery_type || order.deliveryType || 'Domicilio';
  const deliveryTypeRaw = String(deliveryType).trim().toLowerCase();
  const isPickupOrCounter = deliveryTypeRaw.includes('recoger') || 
                            deliveryTypeRaw.includes('mostrador') || 
                            deliveryTypeRaw.includes('mesa') || 
                            deliveryTypeRaw.includes('local') ||
                            deliveryTypeRaw.includes('llevar');
  const isDelivery = !isPickupOrCounter;

  let cashierName = order.cajero || order.user || order.cashierName || '';
  if (!cashierName) {
    try {
      const stored = localStorage.getItem('distrito_user_profile');
      if (stored) {
        const u = JSON.parse(stored);
        cashierName = [u.name, u.last_name].filter(Boolean).join(' ') || u.username || '';
      }
    } catch (e) {}
  }
  if (!cashierName) cashierName = 'Camilo Rincones';

  const address = order.address || order.customer?.address || '';
  const barrio = order.barrio || order.customer?.barrio || '';
  const apartment = order.delivery_apartment || order.apartment || order.apartamento || order.customer?.apartment || order.customer?.apartamento || '';
  const tower = order.delivery_tower || order.tower || order.torre || order.customer?.tower || order.customer?.torre || '';
  const floor = order.delivery_floor || order.floor || order.piso || order.customer?.floor || order.customer?.piso || '';
  const reference = order.delivery_reference || order.reference || order.referencia || order.customer?.reference || order.customer?.referencia || '';

  const paymentMethod = order.payment_method || order.paymentMethod || 'Efectivo';

  // Cálculos de Subtotal, Domicilio y Total
  const subtotal = items.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || i.qty || 1)), 0);
  const deliveryFee = isDelivery ? Math.max(0, Number(order.delivery_fee || 0)) : 0;
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
        modifiers.map(m => `<div>• ${typeof m === 'string' ? m : (m.name || m.label || m.title)}</div>`).join('') +
      `</div>`;
    } else if (item.notes) {
      modifiersHtml = `<div class="modifier-item"><div>• ${item.notes}</div></div>`;
    }

    productsRowsHtml += `
      <div class="product-row">
        <div class="product-left">
          <span class="qty">${qty}x</span>
          <span class="product-name">${title}</span>
        </div>
        <div class="product-price">${formatter.format(itemTotal)}</div>
      </div>
      ${modifiersHtml}
    `;
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comanda #${orderNumber}</title>
  <style>
    @page {
      size: ${is58 ? '58mm auto' : '80mm auto'};
      margin: 0mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100% !important;
      margin: 0 auto !important;
      padding: 0 !important;
      height: auto !important;
      min-height: 0 !important;
      background: #fff;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.2;
      letter-spacing: -0.2px;
      -webkit-print-color-adjust: exact;
    }
    @media print {
      html, body {
        width: 100% !important;
        margin: 0 auto !important;
        padding: 0 !important;
        height: auto !important;
      }
      .ticket-wrapper {
        width: ${printableWidth} !important;
        max-width: ${printableWidth} !important;
        margin-left: auto !important;
        margin-right: auto !important;
        padding-left: 1mm !important;
        padding-right: 1mm !important;
        height: auto !important;
      }
    }

    .ticket-wrapper {
      width: 100%;
      max-width: ${printableWidth};
      margin: 0 auto;
      padding: 1px 1mm 0 1mm;
      box-sizing: border-box;
    }

    .dashed-divider {
      border-bottom: 1px dashed #000;
      margin: 3px 0;
      width: 100%;
      height: 0;
    }

    /* TITULO PRINCIPAL CENTRADO */
    .title-header {
      font-size: 15px;
      font-weight: 900;
      text-align: center;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin: 0 0 2px 0;
      color: #000;
      line-height: 1.15;
    }

    /* TITULO DE SECCION CENTRADO */
    .section-header {
      font-size: 12px;
      font-weight: 800;
      text-align: center;
      margin: 2px 0;
      color: #000;
      line-height: 1.15;
    }

    /* FILAS DE INFORMACION: Etiqueta normal, Valor en Negrita */
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      flex-wrap: wrap;
      font-size: 12px;
      margin-bottom: 1.5px;
      color: #000;
      line-height: 1.2;
      gap: 2px;
    }
    .info-label {
      font-weight: 400;
      font-size: 12px;
      flex-shrink: 0;
      margin-right: 4px;
    }
    .info-value {
      font-weight: 700;
      text-align: right;
      word-break: break-word;
      overflow-wrap: break-word;
      font-size: 12px;
      flex: 1 1 auto;
      max-width: 100%;
    }
    .order-number {
      font-weight: 900;
      font-size: 13px;
    }

    /* FILAS APILADAS: Etiqueta arriba, Valor abajo */
    .info-stacked {
      margin-bottom: 2px;
      font-size: 12px;
      line-height: 1.2;
    }
    .info-value-stacked {
      font-weight: 700;
      font-size: 12px;
      line-height: 1.2;
      word-break: break-word;
      overflow-wrap: break-word;
      color: #000;
    }

    /* FILAS DE PRODUCTOS EN NEGRITA */
    .product-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 2.5px;
      font-size: 12px;
      line-height: 1.2;
    }
    .product-left {
      display: flex;
      align-items: flex-start;
      gap: 3px;
      flex: 1 1 auto;
      min-width: 0;
    }
    .qty {
      font-weight: 800;
      min-width: 15px;
      flex-shrink: 0;
      font-size: 12px;
    }
    .product-name {
      font-weight: 800;
      line-height: 1.15;
      word-break: break-word;
      overflow-wrap: break-word;
      font-size: 12px;
    }
    .product-price {
      font-weight: 800;
      white-space: nowrap;
      margin-left: 3px;
      text-align: right;
      flex-shrink: 0;
      font-size: 12px;
    }
    .modifier-item {
      margin-left: 16px;
      margin-top: 1px;
      margin-bottom: 2px;
      font-size: 10.5px;
      color: #222;
      font-weight: 400;
      line-height: 1.15;
      word-break: break-word;
    }

    /* TOTALES: Etiquetas normales, Valores en negrita */
    .totals-container {
      margin-top: 1.5px;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      flex-wrap: wrap;
      font-size: 12px;
      margin-bottom: 1.5px;
      color: #000;
      line-height: 1.2;
      gap: 2px;
    }
    .total-label {
      font-weight: 400;
      font-size: 12px;
      flex-shrink: 0;
      margin-right: 4px;
    }
    .total-value {
      font-weight: 800;
      text-align: right;
      font-size: 12px;
      flex: 1 1 auto;
    }
    .grand-total {
      font-size: 13.5px;
      border-top: 1px dashed #000;
      padding-top: 3px;
      margin-top: 3px;
      line-height: 1.2;
    }
    .grand-total .total-label {
      font-weight: 400;
      font-size: 13.5px;
    }
    .grand-total .total-value {
      font-weight: 900;
      font-size: 14px;
    }

    /* OBSERVACIONES */
    .obs-text {
      font-size: 11.5px;
      font-weight: 700;
      line-height: 1.2;
      white-space: pre-line;
      word-break: break-word;
      color: #000;
      margin-top: 1.5px;
    }

    /* PIE DE PAGINA / COPYRIGHT */
    .ticket-footer {
      text-align: center;
      font-size: 10px;
      font-weight: 400;
      line-height: 1.2;
      color: #000;
      margin-top: 3px;
      margin-bottom: 0;
      padding-bottom: 0;
      word-break: break-word;
    }

    .ticket-wrapper > *:last-child,
    .totals-container > *:last-child,
    .ticket-footer:last-child {
      margin-bottom: 0 !important;
      padding-bottom: 0 !important;
    }
  </style>
</head>
<body>
  <div class="ticket-wrapper">
    <div class="dashed-divider"></div>

    <!-- TITULO PRINCIPAL CENTRADO -->
    <div class="title-header">DISTRIC HOUSE</div>

    <div class="dashed-divider"></div>

    <!-- SECCION: INFORMACION GENERAL DEL PEDIDO -->
    <div class="info-row">
      <span class="info-label">Pedido:</span>
      <span class="info-value order-number">#${orderNumber}</span>
    </div>
    <div class="info-stacked">
      <div class="info-label">Fecha y hora :</div>
      <div class="info-value-stacked">${formattedDateTime}</div>
    </div>

    <div class="dashed-divider"></div>

    <!-- SECCION: DETALLE DEL PEDIDO CENTRADO -->
    <div class="section-header">Detalle del pedido</div>

    <div class="dashed-divider"></div>

    <!-- PRODUCTOS -->
    <div>
      ${productsRowsHtml}
    </div>

    <!-- SUBTOTAL -->
    <div class="total-row" style="margin-top: 3px;">
      <span class="total-label">Subtotal :</span>
      <span class="total-value">${formatter.format(subtotal)}</span>
    </div>

    <!-- OBSERVACIONES -->
    <div class="info-row" style="margin-top: 2px;">
      <span class="info-label">Observaciones :</span>
      <span class="info-value">${order.notes || ''}</span>
    </div>

    <div class="dashed-divider"></div>

    <!-- SECCION: DATOS CLIENTE CENTRADO -->
    <div class="section-header">Datos cliente</div>

    <div class="dashed-divider"></div>

    <div class="info-row">
      <span class="info-label">Nombre :</span>
      <span class="info-value">${customerName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Telefono:</span>
      <span class="info-value">${customerPhone}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Tipo de entrega :</span>
      <span class="info-value" style="text-transform: capitalize;">${deliveryType}</span>
    </div>

    ${isDelivery ? `
    <div class="dashed-divider"></div>

    <!-- SECCION: DOMICILIO CENTRADO -->
    <div class="section-header">Domicilio</div>

    <div class="dashed-divider"></div>

    <div class="info-stacked">
      <div class="info-label">Fecha y Hora :</div>
      <div class="info-value-stacked">${formattedDateTime}</div>
    </div>
    <div class="info-row">
      <span class="info-label">Costo del domicilio:</span>
      <span class="info-value">${formatter.format(deliveryFee)}</span>
    </div>
    <div class="info-stacked">
      <div class="info-label">Dirección :</div>
      <div class="info-value-stacked">${address || 'N/A'}</div>
    </div>
    ${barrio ? `
    <div class="info-row">
      <span class="info-label">Barrio:</span>
      <span class="info-value">${barrio}</span>
    </div>
    ` : ''}
    ${apartment ? `
    <div class="info-row">
      <span class="info-label">Apartamento :</span>
      <span class="info-value">${apartment}</span>
    </div>
    ` : ''}
    ${tower ? `
    <div class="info-row">
      <span class="info-label">Torre :</span>
      <span class="info-value">${tower}</span>
    </div>
    ` : ''}
    ${floor ? `
    <div class="info-row">
      <span class="info-label">Piso :</span>
      <span class="info-value">${floor}</span>
    </div>
    ` : ''}
    ${reference ? `
    <div class="info-stacked">
      <div class="info-label">Referencia :</div>
      <div class="info-value-stacked">${reference}</div>
    </div>
    ` : ''}
    ` : ''}

    <div class="dashed-divider"></div>

    <!-- SECCION: TOTALES -->
    <div class="totals-container">
      <div class="info-stacked">
        <div class="total-label">Tipo de pago:</div>
        <div class="info-value-stacked" style="text-transform: capitalize;">${paymentMethod}</div>
      </div>
      ${isDelivery ? `
      <div class="total-row" style="margin-top: 2px;">
        <span class="total-label">Costo del domicilio:</span>
        <span class="total-value">${formatter.format(deliveryFee)}</span>
      </div>
      ` : ''}

      <div class="dashed-divider"></div>

      <div class="total-row grand-total" style="border-top: none; margin-top: 0; padding-top: 0;">
        <span class="total-label">Total:</span>
        <span class="total-value">${formatter.format(grandTotal)}</span>
      </div>
      ${paymentMethod.toLowerCase() === 'efectivo' && order.cashAmount !== undefined && order.cashAmount > 0 ? `
        <div class="total-row" style="margin-top: 2.5px; font-size: 11px;">
          <span class="total-label">Efectivo Recibido:</span>
          <span class="total-value">${formatter.format(order.cashAmount)}</span>
        </div>
        <div class="total-row" style="font-size: 11.5px;">
          <span class="total-label">Cambio:</span>
          <span class="total-value">${formatter.format(order.change_required || 0)}</span>
        </div>
      ` : ''}
    </div>

    <!-- PIE DE PAGINA / COPYRIGHT Y REDES SOCIALES -->
    <div class="dashed-divider"></div>
    <div class="ticket-footer">
      <div>© 2026 Distric House. Todos los derechos reservados</div>
      <div style="margin-top: 2px;"><span style="font-weight: 400;">Instagram :</span> <span style="font-weight: 700;">districhouse</span></div>
      <div><span style="font-weight: 400;">TikTok :</span> <span style="font-weight: 700;">districhouse</span></div>
    </div>
  </div>
</body>
</html>`;
};
