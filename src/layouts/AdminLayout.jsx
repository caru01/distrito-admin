import React, { useCallback, useEffect, useRef, useState, useContext } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Package, List, Users, Archive, BarChart3, Settings, LogOut, Megaphone, Menu, X, DollarSign, FileSpreadsheet, Clock, Zap, MapPin, BellRing, Building2, Contact } from 'lucide-react';
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
  const mainContentRef = useRef(null);
  const alertTimer = useRef(null);

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
    { name: 'Empresas de Domicilios', path: '/admin/empresas-domicilios', icon: <Building2 size={20} />, module: 'Domicilios' },
    { name: 'Categorías', path: '/admin/categorias', icon: <List size={20} />, module: 'Categorias' },
    { name: 'Productos', path: '/admin/productos', icon: <Package size={20} />, module: 'Productos' },
    { name: 'Clientes', path: '/admin/clientes', icon: <Users size={20} />, module: 'Clientes' },
    { name: 'CRM', path: '/admin/crm', icon: <Contact size={20} />, module: 'CRM' },
    { name: 'Inventario', path: '/admin/inventario', icon: <Archive size={20} />, module: 'Inventario' },
    { name: 'Gastos', path: '/admin/gastos', icon: <DollarSign size={20} />, module: 'Gastos' },
    { name: 'Cierre Contable', path: '/admin/cierre-contable', icon: <FileSpreadsheet size={20} />, module: 'Cierre Contable' },
    { name: 'Reportes', path: '/admin/reportes', icon: <BarChart3 size={20} />, module: 'Reportes' },
    { name: 'Anuncios', path: '/admin/anuncios', icon: <Megaphone size={20} />, module: 'Configuracion' },
    { name: 'Configuración', path: '/admin/configuracion', icon: <Settings size={20} />, module: 'Configuracion' },
    { name: 'Horarios', path: '/admin/horarios', icon: <Clock size={20} />, module: 'Configuracion' },
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
            {navItems.filter(item => hasPermission(item.module, 'ver')).map(item => {
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

    </div>
  );
}
