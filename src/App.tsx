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
import { TipoCambio } from './pages/TipoCambio';
import { VerVentas } from './pages/VerVentas';
import { Devoluciones } from './pages/Devoluciones';


function RoleRoute({ role, children }: { role: string; children: React.ReactNode }) {
  const { usuario, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!usuario?.roles?.includes(role)) return <Navigate to="/busqueda" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {}
          <Route path="/dashboard" element={<RoleRoute role="Administrador"><MainLayout><Dashboard /></MainLayout></RoleRoute>} />
          <Route path="/roles" element={<RoleRoute role="Administrador"><MainLayout><Roles /></MainLayout></RoleRoute>} />
          <Route path="/asignar-rol" element={<RoleRoute role="Administrador"><MainLayout><AsignarRol /></MainLayout></RoleRoute>} />
          <Route path="/tipo-cambio" element={<RoleRoute role="Administrador"><MainLayout><TipoCambio /></MainLayout></RoleRoute>} />

          {}
          <Route path="/busqueda" element={<PrivateRoute><MainLayout><Busqueda /></MainLayout></PrivateRoute>} />
          <Route path="/productos/:id" element={<PrivateRoute><MainLayout><DetalleProducto /></MainLayout></PrivateRoute>} />
          <Route path="/productos/:id/kardex" element={<PrivateRoute><MainLayout><KardexProducto /></MainLayout></PrivateRoute>} />

          {}
          <Route path="/clientes" element={<PrivateRoute><MainLayout><PerfilCliente /></MainLayout></PrivateRoute>} />

          {}
          <Route path="/ventas/nueva" element={<PrivateRoute><MainLayout><NuevaVenta /></MainLayout></PrivateRoute>} />
          <Route path="/ventas" element={<PrivateRoute><MainLayout><VerVentas /></MainLayout></PrivateRoute>} />

          {}
          <Route path="/devoluciones" element={<PrivateRoute><MainLayout><Devoluciones /></MainLayout></PrivateRoute>} />

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
