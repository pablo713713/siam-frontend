import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './routes/PrivateRoute';
import { MainLayout } from './components/layout/MainLayout';
import { Login }           from './pages/Login';
import { Dashboard }       from './pages/Dashboard';
import { Roles }           from './pages/Roles';
import { AsignarRol }      from './pages/AsignarRol';
import { Busqueda }        from './pages/Busqueda';
import { DetalleProducto } from './pages/DetalleProducto';
import { PerfilCliente }   from './pages/PerfilCliente';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {}
          <Route path="/login" element={<Login />} />

          {}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <MainLayout><Dashboard /></MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/roles"
            element={
              <PrivateRoute>
                <MainLayout><Roles /></MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/asignar-rol"
            element={
              <PrivateRoute>
                <MainLayout><AsignarRol /></MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/busqueda"
            element={
              <PrivateRoute>
                <MainLayout><Busqueda /></MainLayout>
              </PrivateRoute>
            }
          />

          {}
          <Route
            path="/productos/:id"
            element={
              <PrivateRoute>
                <MainLayout><DetalleProducto /></MainLayout>
              </PrivateRoute>
            }
          />

          {}
          <Route
            path="/clientes"
            element={
              <PrivateRoute>
                <MainLayout><PerfilCliente /></MainLayout>
              </PrivateRoute>
            }
          />

          {}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
