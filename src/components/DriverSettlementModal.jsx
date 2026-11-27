import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bike, 
  Calendar, 
  DollarSign, 
  MessageCircle, 
  Copy, 
  Check, 
  X, 
  CheckCircle, 
  Truck, 
  MapPin, 
  Clock, 
  Phone,
  AlertCircle,
  Eye,
  ShoppingBag
} from 'lucide-react';
import { API_URL } from '../config/api';

const formatCOP = (val) => {
  const num = Number(val) || 0;
  return num.toLocaleString('es-CO');
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (year && month && day) {
    return `${day}/${month}/${year}`;
  }
  return dateStr;
};

const getColombiaDateString = (dateObj = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(dateObj).filter(p => p.type !== 'literal').map(p => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export default function DriverSettlementModal({ isOpen, onClose, orders = [], activeDate = '' }) {
  if (!isOpen) return null;

  const [date, setDate] = useState(() => activeDate || getColombiaDateString());
  const [driversList, setDriversList] = useState([]);
  const [selectedDriverName, setSelectedDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [feePerDelivery, setFeePerDelivery] = useState(() => {
    const saved = localStorage.getItem('distrito_driver_fee_rate');
    return saved ? Number(saved) : 6000;
  });
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);

  // 1. Cargar lista de domiciliarios registrados desde la API
  useEffect(() => {
    let isCancelled = false;
    const fetchDrivers = async () => {
      setLoadingDrivers(true);
      try {
        const token = sessionStorage.getItem('distrito_admin_token');
        const res = await fetch(`${API_URL}/admin/delivery/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && Array.isArray(data.drivers)) {
            // Filtrar domiciliarios propios (sin external_company_id)
            const ownDrivers = data.drivers.filter(d => !d.external_company_id && d.status !== 'Inactivo');
            setDriversList(ownDrivers);
          }
        }
      } catch (err) {
        console.warn('No se pudo cargar overview de domiciliarios:', err);
      } finally {
        if (!isCancelled) setLoadingDrivers(false);
      }
    };
    fetchDrivers();
    return () => { isCancelled = true; };
  }, []);

  // 2. Extraer todos los domiciliarios internos únicos (desde API y desde las órdenes cargadas)
  const allInternalDrivers = useMemo(() => {
    const driverMap = new Map();

    // Agregar domiciliarios de la API
    driversList.forEach(d => {
      const name = (d.name || d.username || '').trim();
      if (name) {
        driverMap.set(name.toLowerCase(), {
          id: d.id,
          name,
          phone: d.phone || '',
          source: 'api'
        });
      }
    });

    // Agregar domiciliarios asignados en las órdenes
    orders.forEach(o => {
      const isInternal = !o.external_company_name && (o.delivery_provider_type === 'own' || o.delivery_driver_name);
      if (isInternal && o.delivery_driver_name) {
        const name = o.delivery_driver_name.trim();
        const key = name.toLowerCase();
        const existing = driverMap.get(key);
        if (!existing) {
          driverMap.set(key, {
            id: o.delivery_driver_id || o.delivery_user_id || null,
            name,
            phone: o.delivery_driver_phone || '',
            source: 'orders'
          });
        } else if (!existing.phone && o.delivery_driver_phone) {
          existing.phone = o.delivery_driver_phone;
        }
      }
    });

    return Array.from(driverMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [driversList, orders]);

  // 3. Filtrar órdenes que corresponden a la fecha y son a domicilio
  const ordersInDate = useMemo(() => {
    return orders.filter(o => {
      const isDelivery = String(o.delivery_type || '').toLowerCase() === 'domicilio';
      if (!isDelivery) return false;

      // No cancelados
      if (o.status === 'Cancelado') return false;

      if (!date) return true;
      if (!o.created_at) return false;

      const orderDateKey = getColombiaDateString(new Date(o.created_at));
      return orderDateKey === date;
    });
  }, [orders, date]);

  // Contar cuántos domicilios tiene cada domiciliario en la fecha seleccionada
  const driverDeliveryCounts = useMemo(() => {
    const counts = {};
    ordersInDate.forEach(o => {
      const isInternal = !o.external_company_name && (o.delivery_provider_type === 'own' || o.delivery_driver_name);
      if (isInternal && o.delivery_driver_name) {
        const key = o.delivery_driver_name.trim().toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [ordersInDate]);

  // 4. Seleccionar el primer domiciliario por defecto si no hay uno elegido
  useEffect(() => {
    if (!selectedDriverName && allInternalDrivers.length > 0) {
      // Buscar primero uno que tenga domicilios en la fecha seleccionada
      const driverWithOrders = allInternalDrivers.find(d => (driverDeliveryCounts[d.name.toLowerCase()] || 0) > 0);
      const chosen = driverWithOrders || allInternalDrivers[0];
      setSelectedDriverName(chosen.name);
      setDriverPhone(chosen.phone || '');
    }
  }, [allInternalDrivers, selectedDriverName, driverDeliveryCounts]);

  // Al cambiar de domiciliario, actualizar teléfono si está disponible
  const handleDriverChange = (driverName) => {
    setSelectedDriverName(driverName);
    const found = allInternalDrivers.find(d => d.name.toLowerCase() === driverName.toLowerCase());
    if (found && found.phone) {
      setDriverPhone(found.phone);
    }
  };

  // 5. Órdenes específicas del domiciliario seleccionado en la fecha elegida
  const driverOrders = useMemo(() => {
    if (!selectedDriverName) return [];
    const selLower = selectedDriverName.trim().toLowerCase();
    return ordersInDate.filter(o => {
      const isInternal = !o.external_company_name && (o.delivery_provider_type === 'own' || o.delivery_driver_name);
      return isInternal && o.delivery_driver_name && o.delivery_driver_name.trim().toLowerCase() === selLower;
    }).sort((a, b) => Number(a.id) - Number(b.id));
  }, [ordersInDate, selectedDriverName]);

  // Seleccionar todas las órdenes del domiciliario por defecto al cambiar lista
  useEffect(() => {
    setSelectedOrderIds(driverOrders.map(o => o.id));
  }, [driverOrders]);

  const toggleOrderSelection = (id) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllOrders = () => {
    setSelectedOrderIds(driverOrders.map(o => o.id));
  };

  const deselectAllOrders = () => {
    setSelectedOrderIds([]);
  };

  // Obtener la tarifa real de cada orden (ej: $7.000, $6.000 o tarifa base)
  const getOrderDeliveryFee = (o) => {
    if (o && o.delivery_fee !== undefined && o.delivery_fee !== null && Number(o.delivery_fee) > 0) {
      return Number(o.delivery_fee);
    }
    return Number(feePerDelivery || 6000);
  };

  // 6. Órdenes efectivamente seleccionadas para la liquidación
  const activeOrdersForReport = useMemo(() => {
    return driverOrders.filter(o => selectedOrderIds.includes(o.id));
  }, [driverOrders, selectedOrderIds]);

  const totalDeliveries = activeOrdersForReport.length;

  // Desglose de cuántos domicilios fueron de 6.000, 7.000, etc.
  const feeBreakdown = useMemo(() => {
    const counts = {};
    activeOrdersForReport.forEach(o => {
      const fee = getOrderDeliveryFee(o);
      counts[fee] = (counts[fee] || 0) + 1;
    });
    return Object.entries(counts).map(([feeStr, count]) => {
      const fee = Number(feeStr);
      return {
        fee,
        count,
        subtotal: fee * count
      };
    }).sort((a, b) => a.fee - b.fee);
  }, [activeOrdersForReport, feePerDelivery]);

  // Total a pagar considerando las tarifas reales individuales de cada orden
  const totalAmountToPay = useMemo(() => {
    return activeOrdersForReport.reduce((acc, o) => acc + getOrderDeliveryFee(o), 0);
  }, [activeOrdersForReport, feePerDelivery]);

  // Actualizar tarifa en localStorage al editar
  const handleFeeChange = (val) => {
    const num = Math.max(0, Number(val) || 0);
    setFeePerDelivery(num);
    try {
      localStorage.setItem('distrito_driver_fee_rate', String(num));
    } catch (e) {}
  };

  // 7. Generar el texto exacto con el formato solicitado para WhatsApp
  const reportMessage = useMemo(() => {
    const formattedDate = formatDateDisplay(date);

    let ordersListText = '';
    if (activeOrdersForReport.length > 0) {
      ordersListText = activeOrdersForReport.map((o, idx) => {
        const orderIdPadded = String(o.id).padStart(4, '0');
        const mainAddress = [o.address, o.barrio].filter(Boolean).join(', ') || 'Dirección no especificada';
        const complements = [
          o.delivery_apartment && `Apto: ${o.delivery_apartment}`,
          o.delivery_tower && `Torre: ${o.delivery_tower}`,
          o.delivery_reference && `Ref: ${o.delivery_reference}`
        ].filter(Boolean).join(' · ');
        const fullAddress = complements ? `${mainAddress} (${complements})` : mainAddress;
        
        const rawMethod = String(o.payment_method || 'efectivo').trim().toLowerCase();
        const paymentMethodLabel = rawMethod === 'transferencia' 
          ? 'Transferencia' 
          : rawMethod === 'compartido' 
            ? 'Compartido' 
            : 'Efectivo';

        const orderFee = getOrderDeliveryFee(o);

        return `${idx + 1}. *Orden #${orderIdPadded}* – Domicilio: *$${formatCOP(orderFee)}* – Direc: ${fullAddress} – Pago: *${paymentMethodLabel}*`;
      }).join('\n');
    } else {
      ordersListText = '(No hay órdenes seleccionadas)';
    }

    let feeSummarySection = '';
    if (feeBreakdown.length > 1) {
      const breakdownLines = feeBreakdown.map(b => `• ${b.count} ${b.count === 1 ? 'domicilio' : 'domicilios'} de $${formatCOP(b.fee)} = $${formatCOP(b.subtotal)}`);
      feeSummarySection = `💰 *Desglose de Tarifas:*\n${breakdownLines.join('\n')}\n`;
    } else if (feeBreakdown.length === 1) {
      feeSummarySection = `💰 Valor por domicilio: $${formatCOP(feeBreakdown[0].fee)}\n`;
    } else {
      feeSummarySection = `💰 Valor por domicilio: $${formatCOP(feePerDelivery)}\n`;
    }

    return (
`🏍️ *REPORTE DE DOMICILIOS – DISTRIC HOUSE*

📅 Fecha: ${formattedDate}

📦 *Total de domicilios realizados:* ${totalDeliveries}

*Detalle de órdenes:*

${ordersListText}

${feeSummarySection}
💵 *TOTAL A PAGAR: $${formatCOP(totalAmountToPay)}*

Gracias por su trabajo y compromiso.`
    );
  }, [date, activeOrdersForReport, totalDeliveries, feePerDelivery, totalAmountToPay, feeBreakdown]);

  // 8. Enviar a WhatsApp
  const handleSendWhatsApp = () => {
    if (!driverPhone.trim()) {
      alert('Por favor ingresa el número de WhatsApp del domiciliario.');
      return;
    }
    const digits = driverPhone.replace(/\D/g, '');
    const fullPhone = digits.length === 10 ? `57${digits}` : digits;
    const url = `https://api.whatsapp.com/send/?phone=${fullPhone}&text=${encodeURIComponent(reportMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 9. Copiar al portapapeles
  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      alert('No se pudo copiar el texto automáticamente. Puedes seleccionarlo manualmente.');
    }
  };

  return (
    <div 
      className="ds-modal-overlay" 
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 9999 }}
    >
      <div 
        className="ds-modal ds-modal-lg" 
        role="dialog" 
        aria-modal="true"
        style={{
          maxHeight: '92dvh',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '850px',
          width: '95%',
          overflow: 'hidden'
        }}
      >
        {/* Header Modal */}
        <div className="ds-modal-header" style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              backgroundColor: 'rgba(16, 185, 129, 0.15)', 
              color: '#10B981', 
              padding: '8px', 
              borderRadius: '10px',
              display: 'grid',
              placeItems: 'center'
            }}>
              <Bike size={22} />
            </div>
            <div>
              <span className="ds-page-kicker">Liquidación de Domicilios Internos</span>
              <h2 className="ds-modal-title" style={{ margin: 0, fontSize: '18px' }}>
                Reporte de Domicilios – Distric House
              </h2>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="ds-btn ds-btn-ghost ds-btn-icon"
            style={{ borderRadius: '50%' }}
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo del Modal con scroll */}
        <div style={{ overflowY: 'auto', padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Fila 1: Filtros de Fecha, Domiciliario y Tarifa */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '14px',
            backgroundColor: 'var(--ds-bg-surface)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--ds-border)'
          }}>
            {/* Fecha del Reporte */}
            <div className="ds-form-group" style={{ margin: 0 }}>
              <label className="ds-form-label" style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} color="var(--ds-primary)" /> Fecha de domicilios:
              </label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="ds-input"
                style={{ height: '40px', fontSize: '13px', colorScheme: 'light' }}
              />
            </div>

            {/* Selector de Domiciliario Interno */}
            <div className="ds-form-group" style={{ margin: 0 }}>
              <label className="ds-form-label" style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bike size={14} color="#10B981" /> Domiciliario Interno:
              </label>
              <select 
                value={selectedDriverName} 
                onChange={e => handleDriverChange(e.target.value)}
                className="ds-select"
                style={{ height: '40px', fontSize: '13px' }}
              >
                {allInternalDrivers.length === 0 ? (
                  <option value="">No hay domiciliarios registrados</option>
                ) : (
                  allInternalDrivers.map(d => {
                    const count = driverDeliveryCounts[d.name.toLowerCase()] || 0;
                    return (
                      <option key={d.name} value={d.name}>
                        {d.name} {count > 0 ? `(${count} ${count === 1 ? 'domicilio' : 'domicilios'})` : '(0 domicilios)'}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* Teléfono WhatsApp del Domiciliario */}
            <div className="ds-form-group" style={{ margin: 0 }}>
              <label className="ds-form-label" style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={14} color="#22C55E" /> WhatsApp del domiciliario:
              </label>
              <input 
                type="tel" 
                placeholder="Ej: 3001234567"
                value={driverPhone} 
                onChange={e => setDriverPhone(e.target.value)}
                className="ds-input"
                style={{ height: '40px', fontSize: '13px' }}
              />
            </div>

            {/* Tarifa / Valor por Domicilio */}
            <div className="ds-form-group" style={{ margin: 0 }}>
              <label className="ds-form-label" style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={14} color="#F59E0B" /> Valor por domicilio ($):
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--ds-text-secondary)', fontWeight: 600 }}>$</span>
                <input 
                  type="number" 
                  step="500"
                  min="0"
                  placeholder="4000"
                  value={feePerDelivery} 
                  onChange={e => handleFeeChange(e.target.value)}
                  className="ds-input"
                  style={{ height: '40px', paddingLeft: '26px', fontSize: '14px', fontWeight: 700 }}
                />
              </div>
            </div>
          </div>

          {/* Tarjetas de Resumen KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div style={{ 
              padding: '14px 16px', 
              borderRadius: '12px', 
              backgroundColor: 'var(--ds-bg-elevated)', 
              border: '1px solid var(--ds-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--ds-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Domicilios
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#10B981' }}>{totalDeliveries}</span>
                <span style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>de {driverOrders.length} asignados</span>
              </div>
            </div>

            <div style={{ 
              padding: '14px 16px', 
              borderRadius: '12px', 
              backgroundColor: 'var(--ds-bg-elevated)', 
              border: '1px solid var(--ds-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--ds-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                Tarifas de Domicilio
              </span>
              {feeBreakdown.length === 0 ? (
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ds-text-primary)' }}>
                  ${formatCOP(feePerDelivery)}
                </span>
              ) : feeBreakdown.length === 1 ? (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ds-text-primary)' }}>
                    ${formatCOP(feeBreakdown[0].fee)}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>({feeBreakdown[0].count} ord.)</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                  {feeBreakdown.map((b) => (
                    <span 
                      key={b.fee} 
                      className="ds-badge" 
                      style={{
                        backgroundColor: b.fee >= 7000 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                        color: b.fee >= 7000 ? '#DC2626' : '#D97706',
                        border: b.fee >= 7000 ? '1px solid rgba(239, 68, 68, 0.28)' : '1px solid rgba(245, 158, 11, 0.28)',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 7px'
                      }}
                      title={`${b.count} domicilios a $${formatCOP(b.fee)} = $${formatCOP(b.subtotal)}`}
                    >
                      {b.count}x ${formatCOP(b.fee)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ 
              padding: '14px 16px', 
              borderRadius: '12px', 
              backgroundColor: 'rgba(16, 185, 129, 0.08)', 
              border: '1.5px solid rgba(16, 185, 129, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 800, textTransform: 'uppercase' }}>
                Total a Pagar al Domiciliario
              </span>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#10B981' }}>
                ${formatCOP(totalAmountToPay)}
              </span>
            </div>
          </div>

          {/* Fila 2: Split entre Tabla de Órdenes y Vista Previa del Mensaje */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            
            {/* Lista y Selección de Órdenes */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              border: '1px solid var(--ds-border)', 
              borderRadius: '12px', 
              overflow: 'hidden',
              backgroundColor: 'var(--ds-bg-surface)'
            }}>
              <div style={{ 
                padding: '12px 14px', 
                borderBottom: '1px solid var(--ds-border)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                backgroundColor: 'var(--ds-bg-elevated)'
              }}>
                <div>
                  <strong style={{ fontSize: '13px' }}>Órdenes Asignadas ({driverOrders.length})</strong>
                  <div style={{ fontSize: '11px', color: 'var(--ds-text-muted)' }}>
                    Marca o desmarca órdenes para el reporte
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    type="button" 
                    onClick={selectAllOrders} 
                    className="ds-btn ds-btn-ghost ds-btn-sm" 
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                  >
                    Todas
                  </button>
                  <button 
                    type="button" 
                    onClick={deselectAllOrders} 
                    className="ds-btn ds-btn-ghost ds-btn-sm" 
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                  >
                    Ninguna
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '8px 12px' }}>
                {driverOrders.length === 0 ? (
                  <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--ds-text-muted)' }}>
                    <AlertCircle size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '13px' }}>
                      No se encontraron domicilios de <strong>{selectedDriverName || 'este domiciliario'}</strong> en la fecha <strong>{formatDateDisplay(date)}</strong>.
                    </p>
                  </div>
                ) : (
                  driverOrders.map((ord, idx) => {
                    const isChecked = selectedOrderIds.includes(ord.id);
                    const orderNum = String(ord.id).padStart(4, '0');
                    const orderFee = getOrderDeliveryFee(ord);
                    return (
                      <label 
                        key={ord.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: isChecked ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
                          border: isChecked ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid transparent',
                          marginBottom: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOrderSelection(ord.id)}
                          style={{ marginTop: '3px', accentColor: '#10B981', cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--ds-text-primary)' }}>
                              #{idx + 1}. Orden #{orderNum}
                            </strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                              {/* Tarifa del domicilio ($6.000, $7.000, etc.) */}
                              <span 
                                className="ds-badge" 
                                style={{
                                  backgroundColor: orderFee >= 7000 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                  color: orderFee >= 7000 ? '#DC2626' : '#D97706',
                                  border: orderFee >= 7000 ? '1px solid rgba(239, 68, 68, 0.28)' : '1px solid rgba(245, 158, 11, 0.28)',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '2px 6px'
                                }}
                                title={`Tarifa de este domicilio: $${formatCOP(orderFee)}`}
                              >
                                Dom: ${formatCOP(orderFee)}
                              </span>

                              {/* Método de pago */}
                              <span className="ds-badge" style={{
                                backgroundColor: String(ord.payment_method || '').toLowerCase() === 'transferencia' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: String(ord.payment_method || '').toLowerCase() === 'transferencia' ? '#8B5CF6' : '#10B981',
                                fontSize: '10px',
                                fontWeight: 700
                              }}>
                                {String(ord.payment_method || '').toLowerCase() === 'transferencia' ? 'Transferencia' : (String(ord.payment_method || '').toLowerCase() === 'compartido' ? 'Compartido' : 'Efectivo')}
                              </span>

                              {/* Estado del pedido */}
                              <span className="ds-badge ds-badge-neutral" style={{ fontSize: '10px' }}>
                                {ord.status}
                              </span>

                              {/* Botón Ver Orden */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setViewingOrder(ord);
                                }}
                                className="ds-btn ds-btn-ghost ds-btn-sm"
                                style={{
                                  padding: '2px 8px',
                                  height: '22px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: 'var(--ds-primary, #B30401)',
                                  backgroundColor: 'rgba(179, 4, 1, 0.08)',
                                  border: '1px solid rgba(179, 4, 1, 0.22)',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                                title={`Ver detalles completos de la Orden #${orderNum}`}
                              >
                                <Eye size={12} />
                                <span>Ver orden</span>
                              </button>
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={11} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {[ord.address, ord.barrio].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Vista Previa del Mensaje para WhatsApp */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              border: '1px solid var(--ds-border)', 
              borderRadius: '12px', 
              overflow: 'hidden',
              backgroundColor: 'var(--ds-bg-surface)'
            }}>
              <div style={{ 
                padding: '12px 14px', 
                borderBottom: '1px solid var(--ds-border)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                backgroundColor: 'var(--ds-bg-elevated)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageCircle size={15} color="#22C55E" />
                  <strong style={{ fontSize: '13px' }}>Vista Previa para WhatsApp</strong>
                </div>
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="ds-btn ds-btn-secondary ds-btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', fontSize: '11px' }}
                >
                  {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                  <span>{copied ? '¡Copiado!' : 'Copiar texto'}</span>
                </button>
              </div>

              {/* Burbuja estilo WhatsApp */}
              <div style={{ 
                padding: '14px', 
                flex: 1, 
                backgroundColor: 'rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <pre style={{
                  margin: 0,
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--ds-bg-elevated)',
                  border: '1px solid var(--ds-border)',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontSize: '12.5px',
                  lineHeight: '1.5',
                  color: 'var(--ds-text-primary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '260px',
                  overflowY: 'auto'
                }}>
                  {reportMessage}
                </pre>
              </div>
            </div>

          </div>

        </div>

        {/* Footer del Modal con Botones de Acción */}
        <div className="ds-modal-footer" style={{ 
          padding: '14px 20px', 
          borderTop: '1px solid var(--ds-border)', 
          backgroundColor: 'var(--ds-bg-elevated)', 
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <button 
            type="button" 
            onClick={onClose} 
            className="ds-btn ds-btn-ghost"
            style={{ fontWeight: 600 }}
          >
            Cerrar
          </button>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              type="button" 
              onClick={handleCopyReport} 
              className="ds-btn ds-btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
              <span>{copied ? '¡Reporte Copiado!' : 'Copiar Reporte'}</span>
            </button>

            <button 
              type="button" 
              onClick={handleSendWhatsApp} 
              disabled={totalDeliveries === 0 || !driverPhone.trim()}
              className="ds-btn ds-btn-success"
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontWeight: 700, 
                backgroundColor: '#22C55E',
                opacity: (totalDeliveries === 0 || !driverPhone.trim()) ? 0.6 : 1,
                cursor: (totalDeliveries === 0 || !driverPhone.trim()) ? 'not-allowed' : 'pointer'
              }}
              title={!driverPhone.trim() ? 'Escribe el número de WhatsApp del domiciliario' : 'Abrir chat y enviar reporte por WhatsApp'}
            >
              <MessageCircle size={18} />
              <span>Enviar por WhatsApp</span>
            </button>
          </div>
        </div>

      </div>

      {/* Modal Emergente para Ver Orden en Detalle */}
      {viewingOrder && (
        <div 
          className="ds-modal-overlay" 
          style={{ zIndex: 10005, backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
          onMouseDown={(e) => e.target === e.currentTarget && setViewingOrder(null)}
        >
          <div 
            className="ds-modal"
            role="dialog"
            aria-modal="true"
            style={{
              maxWidth: '560px',
              width: '92%',
              maxHeight: '88vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '16px',
              boxShadow: '0 20px 45px rgba(0,0,0,0.45)',
              border: '1px solid var(--ds-border)',
              backgroundColor: 'var(--ds-bg-surface)'
            }}
          >
            {/* Header */}
            <div className="ds-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--ds-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-primary)' }}>
                  Detalle del Pedido
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: 800, color: 'var(--ds-text-primary)' }}>
                  Orden #{String(viewingOrder.id).padStart(4, '0')}
                </h3>
              </div>
              <button 
                type="button" 
                className="ds-btn ds-btn-ghost ds-btn-icon" 
                onClick={() => setViewingOrder(null)}
                style={{ borderRadius: '50%' }}
                title="Cerrar detalle"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido con scroll */}
            <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Estado y Pago */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--ds-bg-elevated)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--ds-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="ds-badge ds-badge-success">{viewingOrder.status}</span>
                  <span className="ds-badge" style={{
                    backgroundColor: String(viewingOrder.payment_method || '').toLowerCase() === 'transferencia' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: String(viewingOrder.payment_method || '').toLowerCase() === 'transferencia' ? '#8B5CF6' : '#10B981',
                    fontWeight: 700
                  }}>
                    {String(viewingOrder.payment_method || '').toLowerCase() === 'transferencia' ? '💳 Transferencia' : '💵 Efectivo'}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>
                  {viewingOrder.created_at ? new Date(viewingOrder.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>

              {/* Datos del Cliente y Dirección */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: 'var(--ds-bg-surface)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--ds-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong style={{ fontSize: '14px', color: 'var(--ds-text-primary)' }}>{viewingOrder.customer_name || 'Cliente'}</strong>
                  {viewingOrder.customer_phone && (
                    <a 
                      href={`https://wa.me/${viewingOrder.customer_phone.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ fontSize: '12px', color: '#10B981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                    >
                      <Phone size={12} /> {viewingOrder.customer_phone}
                    </a>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '2px' }}>
                  <MapPin size={15} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--ds-primary)' }} />
                  <span>
                    {[viewingOrder.address, viewingOrder.barrio].filter(Boolean).join(', ')}
                    {viewingOrder.delivery_apartment && ` · Apto: ${viewingOrder.delivery_apartment}`}
                    {viewingOrder.delivery_tower && ` · Torre: ${viewingOrder.delivery_tower}`}
                  </span>
                </div>
                {viewingOrder.delivery_reference && (
                  <div style={{ fontSize: '12px', color: 'var(--ds-text-muted)', marginLeft: '21px' }}>
                    📍 Ref: {viewingOrder.delivery_reference}
                  </div>
                )}
                {viewingOrder.notes && (
                  <div style={{ fontSize: '12px', color: '#D97706', backgroundColor: 'rgba(245, 158, 11, 0.08)', padding: '6px 10px', borderRadius: '6px', marginTop: '4px' }}>
                    📝 <strong>Nota:</strong> {viewingOrder.notes}
                  </div>
                )}
              </div>

              {/* Productos del Pedido */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ds-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Productos ({Array.isArray(viewingOrder.cart_json) ? viewingOrder.cart_json.reduce((acc, it) => acc + (it.quantity || 1), 0) : 0})
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(Array.isArray(viewingOrder.cart_json) ? viewingOrder.cart_json : []).map((it, pIdx) => (
                    <div 
                      key={pIdx} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'baseline',
                        padding: '8px 10px',
                        backgroundColor: 'var(--ds-bg-elevated)',
                        borderRadius: '8px',
                        fontSize: '13px'
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--ds-text-primary)' }}>{it.quantity}x {it.title}</strong>
                        {it.notes && <div style={{ fontSize: '11px', color: 'var(--ds-text-muted)' }}>({it.notes})</div>}
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--ds-text-primary)' }}>
                        ${formatCOP((Number(it.price) || 0) * (Number(it.quantity) || 1))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desglose Financiero */}
              <div style={{ borderTop: '1px solid var(--ds-border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ds-text-secondary)' }}>
                  <span>Subtotal Productos:</span>
                  <span>${formatCOP(Math.max(0, (Number(viewingOrder.total) || 0) - getOrderDeliveryFee(viewingOrder)))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#D97706', fontWeight: 700 }}>
                  <span>🛵 Tarifa Domicilio:</span>
                  <span style={{ backgroundColor: getOrderDeliveryFee(viewingOrder) >= 7000 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)', color: getOrderDeliveryFee(viewingOrder) >= 7000 ? '#DC2626' : '#D97706', padding: '2px 8px', borderRadius: '4px' }}>
                    ${formatCOP(getOrderDeliveryFee(viewingOrder))}
                  </span>
                </div>
                {viewingOrder.change_required !== null && viewingOrder.change_required !== undefined && viewingOrder.change_required > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--ds-text-muted)' }}>
                    <span>Cambio Requerido:</span>
                    <span>${formatCOP(viewingOrder.change_required)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 900, color: 'var(--ds-text-primary)', borderTop: '1px dashed var(--ds-border)', paddingTop: '8px', marginTop: '2px' }}>
                  <span>Total Pedido:</span>
                  <span style={{ color: 'var(--ds-primary)' }}>${formatCOP(viewingOrder.total)}</span>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--ds-border)', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--ds-bg-elevated)' }}>
              <button 
                type="button" 
                className="ds-btn ds-btn-secondary" 
                onClick={() => setViewingOrder(null)}
                style={{ fontWeight: 600, padding: '6px 18px' }}
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
