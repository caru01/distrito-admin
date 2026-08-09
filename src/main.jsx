import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'

import './styles/design-system.css'

const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'))
const AdminCategorias = lazy(() => import('./pages/AdminCategorias.jsx'))
const AdminPedidos = lazy(() => import('./pages/AdminPedidos.jsx'))
const AdminProductos = lazy(() => import('./pages/AdminProductos.jsx'))
const AdminInventario = lazy(() => import('./pages/AdminInventario.jsx'))
const AdminReportes = lazy(() => import('./pages/AdminReportes.jsx'))
const AdminGastos = lazy(() => import('./pages/AdminGastos.jsx'))
const AdminCierreContable = lazy(() => import('./pages/AdminCierreContable.jsx'))
const AdminAnuncios = lazy(() => import('./pages/AdminAnuncios.jsx'))
const AdminConfiguracion = lazy(() => import('./pages/AdminConfiguracion.jsx'))
const AdminHorarios = lazy(() => import('./pages/AdminHorarios.jsx'))
const TomarPedido = lazy(() => import('./pages/TomarPedido.jsx'))
const Perfil = lazy(() => import('./pages/Perfil.jsx'))
const AdminAuditoria = lazy(() => import('./pages/AdminAuditoria.jsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'))
const AdminUsuarios = lazy(() => import('./pages/AdminUsuarios.jsx'))
const AdminRoles = lazy(() => import('./pages/AdminRoles.jsx'))
const AdminDeliveryMap = lazy(() => import('./pages/AdminDeliveryMap.jsx'))
const AdminClientes = lazy(() => import('./pages/AdminClientes.jsx'))
const AdminDeliveryCompanies = lazy(() => import('./pages/AdminDeliveryCompanies.jsx'))
const AdminCRM = lazy(() => import('./pages/AdminCRM.jsx'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="admin-route-loading">Cargando módulo…</div>}>
          <Routes>
          <Route path="/" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="pedidos" element={<AdminPedidos />} />
            <Route path="mapa-domicilios" element={<AdminDeliveryMap />} />
            <Route path="empresas-domicilios" element={<AdminDeliveryCompanies />} />
            <Route path="productos" element={<AdminProductos />} />
            <Route path="categorias" element={<AdminCategorias />} />
            <Route path="usuarios" element={<AdminUsuarios />} />
            <Route path="roles" element={<AdminRoles />} />
            <Route path="clientes" element={<AdminClientes />} />
            <Route path="crm/*" element={<AdminCRM />} />
            <Route path="inventario" element={<AdminInventario />} />
            <Route path="reportes" element={<AdminReportes />} />
            <Route path="gastos" element={<AdminGastos />} />
            <Route path="cierre-contable" element={<AdminCierreContable />} />
            <Route path="anuncios" element={<AdminAnuncios />} />
            <Route path="configuracion" element={<AdminConfiguracion />} />
            <Route path="horarios" element={<AdminHorarios />} />
            <Route path="tomar-pedido" element={<TomarPedido />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="auditoria" element={<AdminAuditoria />} />
          </Route>
          </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
)
