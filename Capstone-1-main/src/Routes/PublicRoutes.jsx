import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../Auth/useAuth';

export function PublicRoute() {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (currentUser) {
   
    if (userRole === 'admin') {
      return <Navigate to="/admin" />;
    }
    return <Navigate to="/dashboard" />;
  }

  return <Outlet />;
}