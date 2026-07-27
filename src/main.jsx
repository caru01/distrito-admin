import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import AdminLayout from './layouts/AdminLayout.jsx';

import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminCategorias from './pages/AdminCategorias.jsx';
import AdminPedidos from './pages/AdminPedidos.jsx';
import AdminProductos from './pages/AdminProductos.jsx';
import AdminInventario from './pages/AdminInventario.jsx';
import AdminReportes from './pages/AdminReportes.jsx';
import AdminRendimientos from './pages/AdminRendimientos.jsx';
import AdminRecetas from './pages/AdminRecetas.jsx';
import AdminGastos from './pages/AdminGastos.jsx';
import AdminCierreContable from './pages/AdminCierreContable.jsx';
import AdminAnuncios from './pages/AdminAnuncios.jsx';
import AdminConfiguracion from './pages/AdminConfiguracion.jsx';
import AdminHorarios from './pages/AdminHorarios.jsx';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>

        {/* Redirige la raíz al login */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />

        {/* Login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Panel Administrativo */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="pedidos" element={<AdminPedidos />} />
          <Route path="productos" element={<AdminProductos />} />
          <Route path="categorias" element={<AdminCategorias />} />
          <Route
            path="clientes"
            element={
              <div style={{ padding: 20 }}>
                Vista de Clientes (En construcción)
              </div>
            }
          />
          <Route path="inventario" element={<AdminInventario />} />
          <Route path="reportes" element={<AdminReportes />} />
          <Route path="rendimientos" element={<AdminRendimientos />} />
          <Route path="recetas" element={<AdminRecetas />} />
          <Route path="gastos" element={<AdminGastos />} />
          <Route
            path="cierre-contable"
            element={<AdminCierreContable />}
          />
          <Route path="anuncios" element={<AdminAnuncios />} />
          <Route
            path="configuracion"
            element={<AdminConfiguracion />}
          />
          <Route path="horarios" element={<AdminHorarios />} />
        </Route>

        {/* Cualquier ruta inválida */}
        <Route path="*" element={<Navigate to="/admin/login" replace />} />

      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);