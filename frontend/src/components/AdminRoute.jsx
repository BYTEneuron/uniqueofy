import { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function AdminRoute() {
  const { isAuthenticated, isInitializing: loading, user } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-fallback" style={{ minHeight: '100vh' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ next: location.pathname }} replace />;
  }

  const isProfileIncomplete = !user?.firstName;
  if (isProfileIncomplete) {
    return <Navigate to="/profile-setup" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
