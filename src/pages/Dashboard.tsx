import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>SIAM</h1>
        <div className="user-info">
          <span>{usuario?.nombre} {usuario?.apellido}</span>
          <span className="rol">{usuario?.rol ?? 'Sin rol'}</span>
          <button onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </header>
      <main>
        <h2>Bienvenido, {usuario?.nombre}</h2>
      </main>
    </div>
  );
}