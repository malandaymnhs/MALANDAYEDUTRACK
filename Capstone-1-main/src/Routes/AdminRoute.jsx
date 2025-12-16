// src/routes/AdminRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../Auth/useAuth';
import { useEffect, useState } from 'react';

export function AdminRoute() {
  const { currentUser, userRole, loading, checkUserAccountStatus, logout } = useAuth();
  const [accountStatus, setAccountStatus] = useState(null);

  useEffect(() => {
    const checkAccountStatus = async () => {
      if (currentUser && currentUser.email) {
        const status = await checkUserAccountStatus(currentUser.email);
        setAccountStatus(status);
        
        // If account is deleted, log out the user immediately
        if (status.status === 'deleted') {
          await logout();
        }
      }
    };

    if (currentUser) {
      checkAccountStatus();
    }
  }, [currentUser, checkUserAccountStatus, logout]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Check if account has been deleted
  if (accountStatus && accountStatus.status === 'deleted') {
    return <Navigate to="/login" />;
  }

  return currentUser && userRole === 'admin' 
    ? <Outlet /> 
    : <Navigate to={currentUser ? "/dashboard" : "/login"} />;
}