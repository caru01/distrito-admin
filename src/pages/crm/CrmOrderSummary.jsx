import React, { useMemo } from 'react';
import { ShoppingBag, Send, AlertTriangle, CheckCircle, RefreshCw, Eye } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function CrmOrderSummary({
  cart = [],
  customer = {},
  deliveryType = 'domicilio',
  address = '',
  barrio = '',
  paymentMethod = 'efectivo',
  cashAmount = '',
  deliveryFee = 0,
  sendToKitchen = true,
  sendWhatsAppSummary = true,
  isConsumidorFinal = false,
  window24hActive = true,
  onSubmitOrder,
  isSubmitting = false,
  submitError = null,
}) {
  const isDelivery = deliveryType === 'domicilio';
  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );
  const effectiveDeliveryFee = isDelivery ? Math.max(0, Number(deliveryFee) || 0) : 0;
  const total = subtotal + effectiveDeliveryFee;
  const cashNum = Number(cashAmount) || 0;
  const changeRequired = paymentMethod === 'efectivo' && cashNum >= total ? cashNum - total : null;

  // Previsualización en vivo del mensaje de WhatsApp
  const previewWhatsAppMessage = useMemo(() => {
    const lines = [
      '🍔 *Distrito BG — Confirmación de Pedido*',
      '*Pedido #----* (se asignará al crear)',
      '',
      `Hola *${customer.name || 'Cliente'}*, tu pedido fue registrado y se enviará *${
        sendToKitchen ? 'En preparación' : 'Nuevo'
      }* en nuestra cocina. 👨‍🍳🔥`,
      '',
      '*🛒 Detalle de tu pedido:*',
    ];
    for (const it of cart) {
      const qty = Number(it.quantity || 1);
      const sub = Number(it.price || 0) * qty;
      lines.push(`• ${qty}x ${it.title} — ${formatCurrency(sub)}`);
      if (it.notes) lines.push(`  ↳ _${it.notes}_`);
    }
    lines.push('');
    lines.push(`*Modalidad:* ${isDelivery ? '🛵 A Domicilio' : '🏪 Recoger en local'}`);
    if (isDelivery && address) {
      lines.push(`*Dirección:* ${address}${barrio ? ` (${barrio})` : ''}`);
    }
    lines.push(`*Método de Pago:* ${paymentMethod.toUpperCase()}`);
    if (changeRequired && changeRequired > 0) {
      lines.push(`*Cambio requerido:* ${formatCurrency(changeRequired)}`);
    }
    if (isDelivery && effectiveDeliveryFee > 0) {
      lines.push(`*Domicilio:* ${formatCurrency(effectiveDeliveryFee)}`);
    }
    lines.push(`*Total a pagar:* ${formatCurrency(total)}`);
    lines.push('', '🔎 *Rastrea tu pedido en tiempo real:*', 'https://www.distritobg.app/rastrear/---');
    lines.push('', '¡Muchas gracias por elegir Distrito BG! ❤️');
    return lines.join('\n');
  }, [cart, customer.name, sendToKitchen, isDelivery, address, barrio, paymentMethod, changeRequired, effectiveDeliveryFee, total]);

  const canSubmit = cart.length > 0 && (!isDelivery || Boolean(address.trim()));

  return (
    <div className="crm-order-summary">
      {/* Resumen financiero definitivo */}
      <section className="crm-summary-breakdown ds-card">
        <h4 className="crm-summary-title">Resumen de la orden</h4>

        <div className="crm-summary-rows">
          <div className="crm-summary-row">
            <span>Subtotal ({cart.reduce((s, i) => s + (Number(i.quantity) || 1), 0)} productos):</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>

          <div className="crm-summary-row">
            <span>
              {isDelivery ? 'Costo de envío (Domicilio):' : 'Entrega en local:'}
            </span>
            <span className={effectiveDeliveryFee === 0 ? 'ds-text-success' : ''}>
              {effectiveDeliveryFee > 0 ? formatCurrency(effectiveDeliveryFee) : 'GRATIS'}
            </span>
          </div>

          <div className="crm-summary-row is-total">
            <span>Total definitivo:</span>
            <strong className="crm-summary-total-amount">{formatCurrency(total)}</strong>
          </div>
        </div>

        {paymentMethod === 'efectivo' && cashNum > 0 && (
          <div className="crm-summary-cash-info">
            <span>Paga con: {formatCurrency(cashNum)}</span>
            {changeRequired !== null && (
              <span> · Cambio: <strong>{formatCurrency(changeRequired)}</strong></span>
            )}
          </div>
        )}
      </section>

      {/* Previsualización del mensaje de WhatsApp */}
      {sendWhatsAppSummary && !isConsumidorFinal && (
        <section className="crm-summary-whatsapp-preview ds-card">
          <div className="crm-preview-header">
            <Eye size={14} />
            <strong>Previsualización de mensaje WhatsApp</strong>
          </div>
          <pre className="crm-preview-bubble">{previewWhatsAppMessage}</pre>

          {!window24hActive && (
            <div className="crm-summary-window-notice">
              <AlertTriangle size={14} />
              <small>
                La ventana de atención de 24 horas del cliente está cerrada. El pedido se registrará y enviará a cocina de inmediato, pero el resumen requerirá una plantilla aprobada por Meta si el texto libre es rechazado.
              </small>
            </div>
          )}
        </section>
      )}

      {/* Alerta de error si ocurrió alguno */}
      {submitError && (
        <div className="crm-summary-error-box">
          <AlertTriangle size={16} />
          <span>{submitError}</span>
        </div>
      )}

      {/* Botón de confirmación explícita */}
      <div className="crm-summary-actions">
        <button
          type="button"
          className="ds-btn ds-btn-primary ds-btn-lg crm-confirm-order-btn"
          onClick={onSubmitOrder}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <RefreshCw size={17} className="spin" />
              <span>Registrando pedido…</span>
            </>
          ) : (
            <>
              <ShoppingBag size={17} />
              <span>CONFIRMAR Y CREAR PEDIDO ({formatCurrency(total)})</span>
            </>
          )}
        </button>

        {!canSubmit && (
          <small className="crm-cannot-submit-hint">
            {cart.length === 0
              ? 'Agrega al menos un producto al pedido.'
              : 'Indica la dirección de entrega antes de confirmar.'}
          </small>
        )}
      </div>
    </div>
  );
}
