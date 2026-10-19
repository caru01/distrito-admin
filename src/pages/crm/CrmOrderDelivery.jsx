import React from 'react';
import { Bike, Store, MapPin, Banknote, CreditCard, Wallet, AlertCircle, ChefHat, Send } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'transferencia', label: 'Transferencia', icon: Wallet },
  { id: 'compartido', label: 'Compartido', icon: CreditCard },
];

export default function CrmOrderDelivery({
  deliveryType = 'domicilio',
  onDeliveryTypeChange,
  address = '',
  onAddressChange,
  barrio = '',
  onBarrioChange,
  reference = '',
  onReferenceChange,
  deliveryFee = 0,
  paymentMethod = 'efectivo',
  onPaymentMethodChange,
  cashAmount = '',
  onCashAmountChange,
  cashSplit = '',
  onCashSplitChange,
  transferSplit = '',
  onTransferSplitChange,
  notes = '',
  onNotesChange,
  sendToKitchen = true,
  onSendToKitchenChange,
  sendWhatsAppSummary = true,
  onSendWhatsAppSummaryChange,
  orderTotal = 0,
  isConsumidorFinal = false,
}) {
  const isDelivery = deliveryType === 'domicilio';
  const cashNum = Number(cashAmount) || 0;
  const changeRequired = paymentMethod === 'efectivo' && cashNum >= orderTotal ? cashNum - orderTotal : null;

  return (
    <div className="crm-order-delivery">
      {/* Selector de modalidad de entrega */}
      <section className="crm-delivery-section">
        <label className="ds-form-label">Modalidad de entrega</label>
        <div className="crm-delivery-type-toggle">
          <button
            type="button"
            className={`crm-type-btn ${isDelivery ? 'is-active' : ''}`}
            onClick={() => onDeliveryTypeChange('domicilio')}
          >
            <Bike size={16} />
            <div>
              <strong>A Domicilio</strong>
              <small>{deliveryFee > 0 ? `+${formatCurrency(deliveryFee)}` : 'Tarifa configurada'}</small>
            </div>
          </button>

          <button
            type="button"
            className={`crm-type-btn ${!isDelivery ? 'is-active' : ''}`}
            onClick={() => onDeliveryTypeChange('recoger')}
          >
            <Store size={16} />
            <div>
              <strong>Recoger en local</strong>
              <small>Sin costo de envío</small>
            </div>
          </button>
        </div>
      </section>

      {/* Datos de dirección si es domicilio */}
      {isDelivery ? (
        <section className="crm-delivery-address-box">
          <div className="ds-form-group">
            <label className="ds-form-label">
              <MapPin size={13} /> Dirección de entrega <span className="ds-required">*</span>
            </label>
            <input
              type="text"
              className="ds-input"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="Ej: Cra. 19 #13-1, Calle 45 #12-30"
              required
            />
            {!address.trim() && (
              <small className="crm-field-error">
                <AlertCircle size={11} /> La dirección es requerida para pedidos a domicilio.
              </small>
            )}
          </div>

          <div className="crm-delivery-address-grid">
            <div className="ds-form-group">
              <label className="ds-form-label">Barrio</label>
              <input
                type="text"
                className="ds-input"
                value={barrio}
                onChange={(e) => onBarrioChange(e.target.value)}
                placeholder="Ej: La Elvira, Centro"
              />
            </div>

            <div className="ds-form-group">
              <label className="ds-form-label">Torre / Apto / Ref.</label>
              <input
                type="text"
                className="ds-input"
                value={reference}
                onChange={(e) => onReferenceChange(e.target.value)}
                placeholder="Ej: Torre 2 Apto 301"
              />
            </div>
          </div>
        </section>
      ) : (
        <div className="crm-pickup-notice">
          <Store size={18} />
          <div>
            <strong>Entrega en el establecimiento</strong>
            <p>El cliente recogerá el pedido directamente en el local de Distrito BG.</p>
          </div>
        </div>
      )}

      {/* Método de pago */}
      <section className="crm-payment-section">
        <label className="ds-form-label">Método de pago</label>
        <div className="crm-payment-pills">
          {PAYMENT_METHODS.map((pm) => {
            const Icon = pm.icon;
            const isSelected = paymentMethod === pm.id;
            return (
              <button
                key={pm.id}
                type="button"
                className={`crm-payment-pill ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onPaymentMethodChange(pm.id)}
              >
                <Icon size={14} />
                <span>{pm.label}</span>
              </button>
            );
          })}
        </div>

        {paymentMethod === 'efectivo' && (
          <div className="crm-cash-box">
            <div className="ds-form-group">
              <label className="ds-form-label">¿Con cuánto paga el cliente?</label>
              <input
                type="number"
                className="ds-input"
                value={cashAmount}
                onChange={(e) => onCashAmountChange(e.target.value)}
                placeholder={`Total a pagar: ${formatCurrency(orderTotal)}`}
                min={orderTotal}
                step="1000"
              />
            </div>

            {cashNum > 0 && (
              <div className={`crm-change-display ${cashNum < orderTotal ? 'is-warning' : 'is-ok'}`}>
                {cashNum >= orderTotal ? (
                  <span>
                    Cambio a entregar: <strong>{formatCurrency(changeRequired)}</strong>
                  </span>
                ) : (
                  <span>
                    ⚠️ El monto ingresado (${formatCurrency(cashNum)}) no cubre el total de {formatCurrency(orderTotal)}.
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {paymentMethod === 'compartido' && (
          <div className="crm-split-box">
            <div className="crm-split-grid">
              <div className="ds-form-group">
                <label className="ds-form-label">Monto en Efectivo</label>
                <input
                  type="number"
                  className="ds-input"
                  value={cashSplit}
                  onChange={(e) => onCashSplitChange(e.target.value)}
                  placeholder="Ej: 20000"
                  step="1000"
                />
              </div>

              <div className="ds-form-group">
                <label className="ds-form-label">Monto en Transferencia</label>
                <input
                  type="number"
                  className="ds-input"
                  value={transferSplit}
                  onChange={(e) => onTransferSplitChange(e.target.value)}
                  placeholder="Ej: 25000"
                  step="1000"
                />
              </div>
            </div>
            {(Number(cashSplit) || 0) + (Number(transferSplit) || 0) > 0 && (
              <small className="crm-split-total">
                Suma: {formatCurrency((Number(cashSplit) || 0) + (Number(transferSplit) || 0))} / Total:{' '}
                {formatCurrency(orderTotal)}
              </small>
            )}
          </div>
        )}
      </section>

      {/* Observaciones generales */}
      <section className="crm-notes-section">
        <label className="ds-form-label">Observaciones generales para el pedido</label>
        <textarea
          className="ds-textarea crm-order-notes-input"
          rows={2}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Instrucciones para la cocina o el repartidor…"
        />
      </section>

      {/* Opciones operativas */}
      <section className="crm-order-toggles">
        <label className="crm-toggle-row">
          <input
            type="checkbox"
            checked={sendToKitchen}
            onChange={(e) => onSendToKitchenChange(e.target.checked)}
          />
          <ChefHat size={16} className="crm-toggle-icon" />
          <div className="crm-toggle-text">
            <strong>Enviar a cocina de inmediato</strong>
            <small>Establece el estado en "En preparación" y activa la comanda operativa.</small>
          </div>
        </label>

        <label className={`crm-toggle-row ${isConsumidorFinal ? 'is-disabled' : ''}`}>
          <input
            type="checkbox"
            checked={sendWhatsAppSummary && !isConsumidorFinal}
            onChange={(e) => onSendWhatsAppSummaryChange(e.target.checked)}
            disabled={isConsumidorFinal}
          />
          <Send size={16} className="crm-toggle-icon" />
          <div className="crm-toggle-text">
            <strong>Enviar resumen por WhatsApp al cliente</strong>
            <small>
              {isConsumidorFinal
                ? 'Deshabilitado: CONSUMIDOR FINAL representa ventas presenciales en caja.'
                : 'Genera el mensaje con productos, total y enlace de seguimiento en tiempo real.'}
            </small>
          </div>
        </label>
      </section>
    </div>
  );
}
