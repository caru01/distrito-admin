import React, { useCallback, useEffect, useRef, useState, useContext } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Package, List, Users, Archive, BarChart3, Settings, LogOut, Megaphone, Menu, X, DollarSign, FileSpreadsheet, Clock, Zap, MapPin, BellRing, Building2, Contact, AlertTriangle, ChevronRight } from 'lucide-react';
import { API_URL } from '../config/api';
import { AuthContext } from '../context/AuthContext';
import { playAttentionAlert, speakNotification, unlockNotificationAudio } from '@distrito/shared-ui';

export default function AdminLayout() {
  const token = sessionStorage.getItem('distrito_admin_token');
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, logout: contextLogout, isAuthenticated, loading, settings } = useContext(AuthContext);
  // Los hooks deben ejecutarse siempre en el mismo orden, incluso mientras se
  // restaura una sesión guardada. Si quedan después de los retornos de carga o
  // redirección, React detiene el render al pasar de "cargando" a autenticado.
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [inventoryAlertsData, setInventoryAlertsData] = useState(null);
  const [showInventoryAlert, setShowInventoryAlert] = useState(false);
  const mainContentRef = useRef(null);
  const alertTimer = useRef(null);
  const inventoryAlertTimer = useRef(null);
  const inventoryPollInterval = useRef(null);

  const announceNewOrder = useCallback((data = {}) => {
    playAttentionAlert({ cycles: 5 });
    window.setTimeout(() => speakNotification('new_order', settings || {}), 320);
    setNewOrderAlert({ id: Number(data.orderId) || null, source: data.source || 'Web' });
    window.clearTimeout(alertTimer.current);
    alertTimer.current = window.setTimeout(() => setNewOrderAlert(null), 12_000);
    if (document.visibilityState !== 'visible' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Nuevo Pedido', {
        body: data.orderId ? `Pedido #${data.orderId} recibido por ${data.source || 'Web'}` : 'Se recibió un pedido nuevo',
        icon: '/favicon.png',
        tag: data.orderId ? `admin-order-${data.orderId}` : 'admin-new-order',
      });
    }
  }, [settings]);

  const handleLogout = async () => {
    const token = sessionStorage.getItem('distrito_admin_token');
    if (token) {
      try {
        await fetch(`${API_URL}/admin/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {}
    }
    contextLogout();
    window.location.href = '/admin/login';
  };

  useEffect(() => {
    if (sessionStorage.getItem('must_change_password') === 'true' && location.pathname !== '/admin/perfil') {
      navigate('/admin/perfil?force_password_change=true');
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (loading) return;
    const navEntries = window.performance?.getEntriesByType?.('navigation');
    const isPerfReload = navEntries?.[0]?.type === 'reload';
    const isLegacyReload = window.performance?.navigation?.type === 1;
    const isSessionReload = sessionStorage.getItem('distrito_page_reloaded') === 'true';

    if ((isPerfReload || isLegacyReload || isSessionReload) && location.pathname !== '/admin') {
      try { sessionStorage.removeItem('distrito_page_reloaded'); } catch (e) {}
      navigate('/admin', { replace: true });
    }
  }, [loading, location.pathname, navigate]);

  useEffect(() => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAuthenticated || !token) return undefined;
    const controller = new AbortController();
    let reconnectTimer;
    const connect = async () => {
      try {
        const response = await fetch(`${API_URL}/realtime/stream`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('distrito_admin_token')}` },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error('Canal de pedidos no disponible');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const packets = buffer.split('\n\n');
          buffer = packets.pop() || '';
          for (const packet of packets) {
            if (!packet || packet.startsWith(':')) continue;
            const eventName = packet.match(/^event:\s*(.+)$/m)?.[1] || 'message';
            if (eventName !== 'order_created') continue;
            const raw = packet.match(/^data:\s*(.+)$/m)?.[1];
            try { announceNewOrder(raw ? JSON.parse(raw) : {}); } catch { announceNewOrder(); }
          }
        }
        if (!controller.signal.aborted) reconnectTimer = window.setTimeout(connect, 3000);
      } catch (error) {
        if (error.name !== 'AbortError') reconnectTimer = window.setTimeout(connect, 4000);
      }
    };
    const unlock = () => { unlockNotificationAudio().catch(() => {}); };
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    connect();
    return () => {
      controller.abort();
      window.clearTimeout(reconnectTimer);
      window.clearTimeout(alertTimer.current);
      window.removeEventListener('pointerdown', unlock);
    };
  }, [announceNewOrder, isAuthenticated, token]);

  // Consultar alertas de insumos periódicamente (cada 10 minutos)
  const checkInventoryAlerts = useCallback(async () => {
    const adminToken = sessionStorage.getItem('distrito_admin_token');
    if (!adminToken) return;
    try {
      const res = await fetch(`${API_URL}/admin/inventory/alerts`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.hasAlerts && data.count > 0) {
        setInventoryAlertsData(data);
        setShowInventoryAlert(true);
        // Auto-dismiss tras 35 segundos para no invadir permanentemente
        window.clearTimeout(inventoryAlertTimer.current);
        inventoryAlertTimer.current = window.setTimeout(() => {
          setShowInventoryAlert(false);
        }, 35_000);
      } else {
        setShowInventoryAlert(false);
        setInventoryAlertsData(null);
      }
    } catch (err) {
      // Ignorar errores de red silenciosamente
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) return undefined;

    // Chequeo inicial a los 2.5 segundos de cargar el panel
    const initialTimer = window.setTimeout(() => {
      checkInventoryAlerts();
    }, 2500);

    // Repetir exactamente cada 10 minutos (10 * 60 * 1000 = 600.000 ms)
    const TEN_MINUTES_MS = 10 * 60 * 1000;
    inventoryPollInterval.current = window.setInterval(() => {
      checkInventoryAlerts();
    }, TEN_MINUTES_MS);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(inventoryPollInterval.current);
      window.clearTimeout(inventoryAlertTimer.current);
    };
  }, [checkInventoryAlerts, isAuthenticated, token]);

  if (loading) {
    return <div className="admin-route-loading">Verificando sesión…</div>;
  }

  if (!token || !isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} />, module: 'Dashboard' },
    { name: 'Tomar Pedido', path: '/admin/tomar-pedido', icon: <Zap size={20} />, module: 'Pedidos' },
    { name: 'Pedidos', path: '/admin/pedidos', icon: <ShoppingBag size={20} />, module: 'Pedidos' },
    { name: 'Mapa de Domicilios', path: '/admin/mapa-domicilios', icon: <MapPin size={20} />, module: 'Domicilios' },
    { name: 'Empresas de Domicilios', path: '/admin/empresas-domicilios', icon: <Building2 size={20} />, module: 'Empresas Domicilios', fallbackModule: 'Domicilios' },
    { name: 'Categorías', path: '/admin/categorias', icon: <List size={20} />, module: 'Categorias' },
    { name: 'Productos', path: '/admin/productos', icon: <Package size={20} />, module: 'Productos' },
    { name: 'Clientes', path: '/admin/clientes', icon: <Users size={20} />, module: 'Clientes' },
    { name: 'CRM', path: '/admin/crm', icon: <Contact size={20} />, module: 'CRM' },
    { name: 'Inventario', path: '/admin/inventario', icon: <Archive size={20} />, module: 'Inventario' },
    { name: 'Gastos', path: '/admin/gastos', icon: <DollarSign size={20} />, module: 'Gastos' },
    { name: 'Cierre Contable', path: '/admin/cierre-contable', icon: <FileSpreadsheet size={20} />, module: 'Cierre Contable' },
    { name: 'Reportes', path: '/admin/reportes', icon: <BarChart3 size={20} />, module: 'Reportes' },
    { name: 'Anuncios', path: '/admin/anuncios', icon: <Megaphone size={20} />, module: 'Anuncios', fallbackModule: 'Configuracion' },
    { name: 'Configuración', path: '/admin/configuracion', icon: <Settings size={20} />, module: 'Configuracion' },
    { name: 'Horarios', path: '/admin/horarios', icon: <Clock size={20} />, module: 'Horarios', fallbackModule: 'Configuracion' },
  ];

  const profileItems = [
    { name: 'Mi Perfil', path: '/admin/perfil', icon: <Users size={20} />, module: 'Perfil' },
    { name: 'Usuarios', path: '/admin/usuarios', icon: <Users size={20} />, module: 'Usuarios' },
    { name: 'Roles', path: '/admin/roles', icon: <Settings size={20} />, module: 'Roles' },
    { name: 'Auditoría', path: '/admin/auditoria', icon: <Settings size={20} />, module: 'Auditoria' },
  ];

  return (
    <div className="admin-layout-root">

      {/* Mobile Header */}
      <div className="admin-mobile-header">
        <div className="admin-mobile-logo">
          <div className="admin-mobile-logo-icon">{settings?.admin_logo ? <img src={settings.admin_logo} alt="" /> : 'D'}</div>
          {settings?.admin_sidebar_title || settings?.restaurant_name || 'Distrito Admin'}
        </div>
        <button
          className="admin-hamburger"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Cerrar menú principal' : 'Abrir menú principal'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="admin-sidebar"
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      <div className="admin-layout-body">

        {/* Overlay for mobile sidebar */}
        <div
          className={`admin-overlay ${isMobileMenuOpen ? 'open' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>

        {/* Sidebar */}
        <div
          id="admin-sidebar"
          className={`admin-sidebar ${isMobileMenuOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}
          style={{ width: isSidebarCollapsed ? '72px' : undefined }}
        >
          <div className="admin-sidebar-logo" style={{ justifyContent: isSidebarCollapsed ? 'center' : 'space-between', padding: isSidebarCollapsed ? '16px 8px' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="admin-sidebar-logo-icon">{settings?.admin_logo ? <img src={settings.admin_logo} alt="" /> : 'D'}</div>
              {!isSidebarCollapsed && <span className="admin-sidebar-logo-text">{settings?.admin_sidebar_title || settings?.restaurant_name || 'Distrito Admin'}</span>}
            </div>
            <button
              className="admin-sidebar-toggle"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              aria-label={isSidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
              title={isSidebarCollapsed ? "Expandir menú" : "Ocultar menú"}
              style={{ background: 'none', border: 'none', color: 'var(--ds-text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {isSidebarCollapsed ? <Menu size={18} /> : <X size={18} />}
            </button>
          </div>

          <nav className="admin-sidebar-nav" style={{ padding: isSidebarCollapsed ? '12px 6px' : undefined }}>
            {navItems.filter(item => hasPermission(item.module, 'ver') || (item.fallbackModule && hasPermission(item.fallbackModule, 'ver'))).map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  title={isSidebarCollapsed ? item.name : undefined}
                  className={`admin-nav-link ${isActive ? 'active' : ''}`}
                  style={{ justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', padding: isSidebarCollapsed ? '10px' : undefined }}
                >
                  <span className="admin-nav-link-icon">{item.icon}</span>
                  {!isSidebarCollapsed && <span className="admin-nav-link-text">{item.name}</span>}
                </Link>
              )
            })}
          </nav>

          <div className="admin-sidebar-footer" style={{ padding: isSidebarCollapsed ? '12px 6px' : undefined }}>
            {!isSidebarCollapsed && (
              <div className="admin-sidebar-section-label">
                Seguridad
              </div>
            )}
            {profileItems.filter(item => hasPermission(item.module, 'ver')).map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  title={isSidebarCollapsed ? item.name : undefined}
                  className={`admin-nav-link ${isActive ? 'active' : ''}`}
                  style={{ justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', padding: isSidebarCollapsed ? '10px' : undefined }}
                >
                  <span className="admin-nav-link-icon">{item.icon}</span>
                  {!isSidebarCollapsed && <span className="admin-nav-link-text">{item.name}</span>}
                </Link>
              )
            })}

            <div className="ds-mt-md">
              <button
                className="admin-logout-btn"
                onClick={handleLogout}
                title={isSidebarCollapsed ? "Cerrar Sesión" : undefined}
                style={{ justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', padding: isSidebarCollapsed ? '10px' : undefined }}
              >
                <LogOut size={20} />
                {!isSidebarCollapsed && <span className="admin-logout-btn-text">Cerrar Sesión</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main
          id="admin-main-content"
          ref={mainContentRef}
          className="admin-main-content"
          style={{ marginLeft: isSidebarCollapsed ? '72px' : undefined, transition: 'margin-left 0.3s ease' }}
        >
          <Outlet />
        </main>
      </div>

      {newOrderAlert && (
        <div className="admin-new-order-alert" role="status" aria-live="assertive">
          <span><BellRing size={23} /></span>
          <div><strong>Nuevo Pedido</strong><small>{newOrderAlert.id ? `Pedido #${newOrderAlert.id} · ${newOrderAlert.source}` : 'Revisa la cola de pedidos'}</small></div>
          <Link to="/admin/pedidos" onClick={() => setNewOrderAlert(null)}>Ver pedido</Link>
        </div>
      )}

      {/* NOTIFICACIÓN FLOTANTE INFERIOR DERECHA: ALERTAS DE INSUMOS (CADA 10 MINUTOS) */}
      {showInventoryAlert && inventoryAlertsData && (
        <aside
          className="admin-inventory-stock-alert"
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            right: '24px',
            bottom: newOrderAlert ? '120px' : '24px',
            zIndex: 145,
            display: 'flex',
            flexDirection: 'column',
            width: 'min(390px, calc(100vw - 32px))',
            padding: '16px',
            borderRadius: '16px',
            background: 'var(--ds-bg-surface, #FFFFFF)',
            color: 'var(--ds-text-primary, #0F172A)',
            border: (inventoryAlertsData.summary?.criticos > 0 || inventoryAlertsData.summary?.agotados > 0)
              ? '1px solid #FCA5A5'
              : '1px solid #FDE68A',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.05)',
            transition: 'bottom 0.3s ease, opacity 0.3s ease',
            animation: 'slideInUpNotification 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={() => {
            window.clearTimeout(inventoryAlertTimer.current);
          }}
          onMouseLeave={() => {
            inventoryAlertTimer.current = window.setTimeout(() => {
              setShowInventoryAlert(false);
            }, 12_000);
          }}
        >
          {/* Header con icono, título, badge y botón cerrar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                display: 'grid',
                placeItems: 'center',
                background: (inventoryAlertsData.summary?.criticos > 0 || inventoryAlertsData.summary?.agotados > 0)
                  ? '#FEE2E2'
                  : '#FEF3C7',
                color: (inventoryAlertsData.summary?.criticos > 0 || inventoryAlertsData.summary?.agotados > 0)
                  ? '#DC2626'
                  : '#D97706',
                flexShrink: 0
              }}>
                <AlertTriangle size={20} />
              </span>
              <div>
                <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ds-text-primary, #0F172A)' }}>
                  Alerta de Insumos
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: (inventoryAlertsData.summary?.criticos > 0 || inventoryAlertsData.summary?.agotados > 0) ? '#DC2626' : '#D97706',
                    color: '#FFFFFF'
                  }}>
                    {inventoryAlertsData.count} {inventoryAlertsData.count === 1 ? 'insumo' : 'insumos'}
                  </span>
                </strong>
                <small style={{ color: 'var(--ds-text-secondary, #64748B)', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                  {inventoryAlertsData.summary?.criticos > 0
                    ? `${inventoryAlertsData.summary.criticos} en nivel crítico`
                    : 'Stock próximo a agotarse'} · Aviso cada 10 min
                </small>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowInventoryAlert(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ds-text-muted, #64748B)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                borderRadius: '6px'
              }}
              title="Cerrar notificación"
            >
              <X size={16} />
            </button>
          </div>

          {/* Lista de insumos con alerta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '12px 0 14px 0' }}>
            {inventoryAlertsData.alerts.slice(0, 3).map((item) => {
              const isCrit = item.alert_level === 'agotado' || item.alert_level === 'critico';
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--ds-bg-elevated, #F8FAFC)',
                    border: '1px solid var(--ds-border, #E2E8F0)',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    borderLeft: `4px solid ${isCrit ? '#DC2626' : '#D97706'}`
                  }}
                >
                  <span style={{ color: 'var(--ds-text-primary, #0F172A)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '210px' }} title={item.name}>
                    {item.name}
                  </span>
                  <span style={{
                    color: isCrit ? '#DC2626' : '#D97706',
                    fontWeight: '700',
                    fontSize: '11.5px',
                    whiteSpace: 'nowrap',
                    marginLeft: '8px'
                  }}>
                    {Number(item.stock).toLocaleString('es-CO')} {item.unit}
                  </span>
                </div>
              );
            })}
            {inventoryAlertsData.count > 3 && (
              <span style={{ fontSize: '11px', color: 'var(--ds-text-muted, #64748B)', textAlign: 'center', marginTop: '2px' }}>
                +{inventoryAlertsData.count - 3} insumo{inventoryAlertsData.count - 3 !== 1 ? 's' : ''} más por revisar
              </span>
            )}
          </div>

          {/* Footer acción */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--ds-text-muted, #64748B)' }}>
              Revisa o registra compras
            </span>
            <Link
              to="/admin/inventario?tab=alertas"
              onClick={() => setShowInventoryAlert(false)}
              className="ds-btn ds-btn-primary ds-btn-sm"
              style={{
                height: '32px',
                fontSize: '12px',
                padding: '0 12px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>Ver en Inventario</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </aside>
      )}

    </div>
  );
}
