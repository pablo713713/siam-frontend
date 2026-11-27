import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './routes/PrivateRoute';
import { MainLayout }      from './components/layout/MainLayout';
import { Login }           from './pages/Login';
import { Dashboard }       from './pages/Dashboard';
import { Roles }           from './pages/Roles';
import { AsignarRol }      from './pages/AsignarRol';
import { Busqueda }        from './pages/Busqueda';
import { DetalleProducto } from './pages/DetalleProducto';
import { PerfilCliente }   from './pages/PerfilCliente';
import { useAuth } from './context/AuthContext';
import { NuevaVenta } from './pages/NuevaVenta';
import { KardexProducto } from './pages/KardexProducto';
import { Kardex } from './pages/Kardex';
import { TipoCambio } from './pages/TipoCambio';
import { VentasRealizadas } from './pages/VentasRealizadas';
import { ConfirmarVenta } from './pages/ConfirmarVentas';
import { Devoluciones } from './pages/Devoluciones';
import { Creditos } from './pages/Creditos';
import { MovimientosAlmacen } from './pages/MovimientosAlmacen';
import { HistorialTraspasos } from './pages/HistorialTraspasos';
import { HistorialProductos } from './pages/HistorialProductos';
import { CreditosAbiertos } from './pages/CreditosAbiertos';
import { Auditoria } from './pages/Auditoria';


function RoleRoute({ role, children }: { role: string | string[]; children: React.ReactNode }) {
  const { usuario, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Con una lista, basta con tener uno de los roles
  const permitidos = Array.isArray(role) ? role : [role];
  if (!usuario?.roles?.some((r) => permitidos.includes(r))) return <Navigate to="/busqueda" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Administrador */}
          <Route path="/dashboard" element={<RoleRoute role="Administrador"><MainLayout><Dashboard /></MainLayout></RoleRoute>} />
          <Route path="/roles" element={<RoleRoute role="Administrador"><MainLayout><Roles /></MainLayout></RoleRoute>} />
          <Route path="/asignar-rol" element={<RoleRoute role="Administrador"><MainLayout><AsignarRol /></MainLayout></RoleRoute>} />
          <Route path="/tipo-cambio" element={<RoleRoute role="Administrador"><MainLayout><TipoCambio /></MainLayout></RoleRoute>} />
          <Route path="/auditoria" element={<RoleRoute role="Administrador"><MainLayout><Auditoria /></MainLayout></RoleRoute>} />

          {/* Inventario */}
          <Route path="/busqueda" element={<PrivateRoute><MainLayout><Busqueda /></MainLayout></PrivateRoute>} />
          <Route path="/kardex" element={<PrivateRoute><MainLayout><Kardex /></MainLayout></PrivateRoute>} />
          <Route path="/productos/movimientos" element={<PrivateRoute><MainLayout><MovimientosAlmacen /></MainLayout></PrivateRoute>} />
          <Route path="/productos/historial" element={<RoleRoute role="Administrador"><MainLayout><HistorialProductos /></MainLayout></RoleRoute>} />
          <Route path="/productos/traspasos" element={<RoleRoute role={['Administrador', 'Encargado de Almacen']}><MainLayout><HistorialTraspasos /></MainLayout></RoleRoute>} />
          <Route path="/productos/:id" element={<PrivateRoute><MainLayout><DetalleProducto /></MainLayout></PrivateRoute>} />
          <Route path="/productos/:id/kardex" element={<PrivateRoute><MainLayout><KardexProducto /></MainLayout></PrivateRoute>} />

          {/* Clientes */}
          <Route path="/clientes" element={<PrivateRoute><MainLayout><PerfilCliente /></MainLayout></PrivateRoute>} />

          {/* Ventas */}
          <Route path="/ventas/nueva" element={<RoleRoute role={['Vendedor', 'Administrador']}><MainLayout><NuevaVenta /></MainLayout></RoleRoute>} />
          <Route path="/ventas/confirmar" element={<RoleRoute role={['Vendedor', 'Administrador']}><MainLayout><ConfirmarVenta /></MainLayout></RoleRoute>} />
          <Route path="/ventas" element={<RoleRoute role="Administrador"><MainLayout><VentasRealizadas /></MainLayout></RoleRoute>} />
          <Route path="/creditos" element={<RoleRoute role={['Vendedor', 'Administrador']}><MainLayout><Creditos /></MainLayout></RoleRoute>} />
          <Route path="/creditos/abiertos" element={<RoleRoute role={['Vendedor', 'Administrador']}><MainLayout><CreditosAbiertos /></MainLayout></RoleRoute>} />

          {/* Devoluciones */}
          <Route path="/devoluciones" element={<RoleRoute role="Administrador"><MainLayout><Devoluciones /></MainLayout></RoleRoute>} />

          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function DefaultRedirect() {
  const { usuario, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (usuario?.roles?.includes('Administrador')) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/busqueda" replace />;
}
