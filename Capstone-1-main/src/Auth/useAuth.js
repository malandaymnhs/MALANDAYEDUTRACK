import { useContext } from 'react';
import AuthContext from './AuthContext';

// Custom hook for using auth context
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Fallback shape to avoid destructuring crash if Provider isn't mounted yet
    return {
      currentUser: null,
      userRole: null,
      loading: true,
      error: '',
      signup: async () => { throw new Error('AuthProvider not mounted'); },
      login: async () => { throw new Error('AuthProvider not mounted'); },
      logout: () => {},
      resetPassword: async () => { throw new Error('AuthProvider not mounted'); },
      fetchUserRole: async () => null,
      checkUserAccountStatus: async () => ({ exists: false, status: null }),
      restoreAdminAccount: async () => false,
      permanentlyDeleteAdminAccount: async () => false,
    };
  }
  return ctx;
};