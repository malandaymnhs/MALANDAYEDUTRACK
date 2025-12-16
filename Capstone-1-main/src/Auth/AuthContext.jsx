import { createContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, deleteDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { ActivityLogger, ACTIVITY_TYPES } from '../services/activityLogService';
import useIdleTimer from '../hooks/useIdleTimer';


const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Idle/logout UX state
  const [showIdleModal, setShowIdleModal] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(30); // seconds
  
  // Use shared Firebase instances to avoid multi-app mismatches in production

  // Function to automatically set disable period for students after login
  const setStudentDisablePeriod = async (email, userRole) => {
    try {
      // Only apply disable period to students
      if (userRole !== 'student') return;
      
      console.log('Checking document types and setting disable period for student:', email);
      
      // Find existing request document for this student
      const requestsQuery = query(collection(db, "requests"), where("email", "==", email));
      const requestsSnapshot = await getDocs(requestsQuery);
      
      if (requestsSnapshot.empty) {
        console.log(`No request document found for ${email}, no disable period will be set`);
        return;
      }
      
      const requestDoc = requestsSnapshot.docs[0];
      const requestData = requestDoc.data();
      
      // Check if the student requested Form 137 or Form 138
      const documentsToDisable = ["Form 137 (SF10)", "Form 138"];
      const hasDisableDocument = requestData.documents?.some(doc => 
        documentsToDisable.includes(doc.documentType)
      );
      
      if (!hasDisableDocument) {
        console.log(`Student ${email} did not request Form 137 or Form 138, no disable period will be set`);
        return;
      }
      
      console.log(`Student ${email} requested Form 137 or Form 138, setting 3-month disable period`);
      
      const now = new Date();
      let shouldSetNewDisablePeriod = true;
      
      // Check if there's already an active disable period
      if (requestData.disableDate) {
        let existingDisableDate;
        // Handle Firestore Timestamp
        if (requestData.disableDate.toDate && typeof requestData.disableDate.toDate === 'function') {
          existingDisableDate = requestData.disableDate.toDate();
        } else if (requestData.disableDate.seconds) {
          existingDisableDate = new Date(requestData.disableDate.seconds * 1000);
        } else if (typeof requestData.disableDate === 'string') {
          existingDisableDate = new Date(requestData.disableDate);
        } else if (requestData.disableDate instanceof Date) {
          existingDisableDate = requestData.disableDate;
        } else {
          console.warn('Unknown disableDate format in AuthContext:', requestData.disableDate);
          return;
        }
        
        // If the existing disable period is still in the future (active), don't override it
        if (existingDisableDate > now) {
          console.log(`Student ${email} already has an active disable period until:`, existingDisableDate.toLocaleString());
          shouldSetNewDisablePeriod = false;
        }
      }
      
      // Only set new disable period if there isn't an active one
      if (shouldSetNewDisablePeriod) {
        // Set disable period for 3 months from now
        const disableDate = new Date(now);
        disableDate.setMonth(disableDate.getMonth() + 3); // 3 months in the future
        const firestoreTimestamp = Timestamp.fromDate(disableDate);
        
        await updateDoc(doc(db, "requests", requestDoc.id), {
          disableDate: firestoreTimestamp,
          activePeriodSetBy: 'system_login',
          activePeriodSetAt: serverTimestamp(),
          activeReason: "3-month period set automatically on login for Form 137/138 request"
        });
        
        console.log(`Student ${email} will be disabled at:`, disableDate.toLocaleString());
      }
    } catch (error) {
      console.error("Error setting student disable period:", error);
      // Don't block login if disable period setting fails
    }
  };

  // Helper function to get current user data
  const getCurrentUserData = async (email) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data();
      }
      return null;
    } catch (error) {
      console.error("Error getting user data:", error);
      return null;
    }
  };

  // Check if user account exists and is active
  const checkUserAccountStatus = async (email) => {
    try {
      console.log('Checking account status for:', email);
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('No user document found for email:', email);
        return { exists: false, status: null, message: 'Account not found.' };
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      console.log('User data found:', { uid: userDoc.id, role: userData.role, status: userData.status, isActive: userData.isActive });
      
      // Check if account has been deleted
      if (userData.status === 'deleted') {
        console.log('Account marked as deleted for:', email);
        return { exists: true, status: 'deleted', message: 'Account has been deleted.' };
      }
      
      // Check if account is active (for backward compatibility)
      if (userData.isActive === false) {
        console.log('Account marked as inactive for:', email);
        return { exists: true, status: 'inactive', message: 'Account is inactive.' };
      }
      
      // Check for disable periods in requests collection (for students)
      if (userData.role === 'student') {
        const requestsRef = collection(db, "requests");
        const requestsQuery = query(requestsRef, where("email", "==", email));
        const requestsSnapshot = await getDocs(requestsQuery);
        
        if (!requestsSnapshot.empty) {
          const requestData = requestsSnapshot.docs[0].data();
          if (requestData.disableDate) {
            let disableDate;
            // Handle Firestore Timestamp
            if (requestData.disableDate.toDate && typeof requestData.disableDate.toDate === 'function') {
              disableDate = requestData.disableDate.toDate();
            } else if (requestData.disableDate.seconds) {
              disableDate = new Date(requestData.disableDate.seconds * 1000);
            } else if (typeof requestData.disableDate === 'string') {
              disableDate = new Date(requestData.disableDate);
            } else if (requestData.disableDate instanceof Date) {
              disableDate = requestData.disableDate;
            } else {
              console.warn('Unknown disableDate format in checkUserAccountStatus:', requestData.disableDate);
              // Continue with login if format is unknown
            }
            
            const now = new Date();
            if (disableDate <= now) {
              // Account's active period has expired, now disabled
              console.log(`Account active period expired for ${email}`);
              return { 
                exists: true, 
                status: 'disabled', 
                message: `Your Account has been Disabled, Please contact an administrator to request access.`,
                disableUntil: disableDate
              };
            }
            // If disableDate > now, account is still in active period, allow login
          }
        }
      }
      
      console.log('Account is active for:', email);
      return { exists: true, status: 'active', message: 'Account is active.' };
    } catch (err) {
      console.error("Error checking user account status:", err);
      return { exists: false, status: null, message: 'Error checking account status.' };
    }
  };

  // Restore a deleted admin account (super admin only)
  const restoreAdminAccount = async (userId) => {
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        status: 'active',
        restoredAt: new Date(),
        restoredBy: currentUser?.uid
      });
      return true;
    } catch (err) {
      console.error("Error restoring admin account:", err);
      return false;
    }
  };

  // Permanently delete an admin account (super admin only)
  const permanentlyDeleteAdminAccount = async (userId) => {
    try {
      await deleteDoc(doc(db, "users", userId));
      return true;
    } catch (err) {
      console.error("Error permanently deleting admin account:", err);
      return false;
    }
  };

  // Fetch user role from Firestore - useCallback to fix dependency issue
  const fetchUserRole = useCallback(async (uid) => {
    try {
      // Primary: fetch by UID document id
      const userDocRef = doc(db, "users", uid);
      let userSnapshot = await getDoc(userDocRef);
      
      // Fallback: if no UID doc, try by email (for legacy records)
      if (!userSnapshot.exists()) {
        const email = auth.currentUser?.email;
        if (email) {
          const q = query(collection(db, 'users'), where('email', '==', email));
          const qs = await getDocs(q);
          if (!qs.empty) {
            userSnapshot = qs.docs[0];
          }
        }
      }

      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        
        // Check if account has been deleted
        if (userData.status === 'deleted') {
          console.log('Account has been deleted, logging out user');
          await logout();
          setError('Account has been deleted.');
          return null;
        }
        
        const role = userData.role || 'user'; // Default to 'user' if role isn't set
        setUserRole(role);
        
        // Automatically set disable period for students on login/role fetch
        if (role === 'student' && userData.email) {
          await setStudentDisablePeriod(userData.email, role);
        }
        
        console.log('=== USER DETAILS FROM FIRESTORE ===');
        console.log('User ID:', uid);
        console.log('Role:', role);
        console.log('Status:', userData.status || 'active');
        
        
        if (userData.displayName) console.log('Name:', userData.displayName);
        if (userData.email) console.log('Email:', userData.email);
        if (userData.studentId) console.log('Student ID:', userData.studentId);
        if (userData.createdAt) console.log('Account created:', userData.createdAt.toDate ? userData.createdAt.toDate().toLocaleString() : userData.createdAt);
        console.log('===================================');
        
        return role;
      } else {
        
        console.log('No user document found. Creating new user document with default role "user"');
        await setDoc(userDocRef, { 
          role: 'user',
          status: 'active',
          createdAt: new Date()
        });
        setUserRole('user');
        
        console.log('=== NEW USER CREATED ===');
        console.log('User ID:', uid);
        console.log('Default role: user');
        console.log('Status: active');
        console.log('========================');
        
        return 'user';
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
      setError('Failed to fetch user role');
      return 'user'; // Default role on error
    }
  }, [db]);

 
  const signup = async (email, password, userData = {}) => {
    try {
      setError('');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Save additional user data to Firestore with a default role of 'user'
      const userDataToSave = {
        ...userData,
        role: userData.role || 'user',
        email,
        status: 'active',
        createdAt: new Date()
      };
      
      await setDoc(doc(db, "users", user.uid), userDataToSave);
      
      console.log('=== USER SIGNUP SUCCESSFUL ===');
      console.log('User ID:', user.uid);
      console.log('Email:', email);
      console.log('Role:', userDataToSave.role);
      console.log('Status: active');
      console.log('==============================');
      
      return user;
    } catch (err) {
      console.error('Signup error:', err.message);
      setError(err.message);
      throw err;
    }
  };

  
  // Login function with account status checking
  const login = async (email, password) => {
    try {
      setError('');
      console.log('Login attempt for:', email);
      
      // First check if the account exists and is active
      const accountStatus = await checkUserAccountStatus(email);
      console.log('Account status check result:', accountStatus);
      
      if (!accountStatus.exists) {
        console.log('Login failed: Account not found');
        throw new Error('Account not found.');
      }
      
      if (accountStatus.status === 'deleted') {
        console.log('Login failed: Account has been deleted');
        throw new Error('Account has been deleted.');
      }
      
      if (accountStatus.status === 'inactive') {
        console.log('Login failed: Account is inactive');
        throw new Error('Account is inactive.');
      }
      
      if (accountStatus.status === 'disabled') {
        console.log('Login failed: Account is Already disabled');
        throw new Error(accountStatus.message);
      }
      
      // If account is active, proceed with Firebase authentication
      console.log('Proceeding with Firebase authentication for:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);

      // Log login activity
      try {
        const uid = result?.user?.uid;
        // Store login time for session duration calculation
        sessionStorage.setItem('loginTime', Date.now().toString());
        sessionStorage.setItem('sessionId', `session_${Date.now()}_${uid}`);
        
        await ActivityLogger.login(uid, email, {
          loginMethod: 'email',
          userAgent: navigator.userAgent,
          sessionId: sessionStorage.getItem('sessionId'),
        });
      } catch (e) {
        console.warn('Login activity log failed', e);
      }
      
      console.log('=== USER LOGIN SUCCESSFUL ===');
      console.log('User ID:', result.user.uid);
      console.log('Email:', email);
      console.log('Status: active');
      console.log('============================');
      
      return result;
    } catch (err) {
      console.error('Login error:', err.message, err.code);
      // Map Firebase codes to clearer messages
      const code = err?.code || '';
      let friendly;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        friendly = 'Wrong Password';
      } else if (code === 'auth/user-not-found') {
        friendly = 'Account not found.';
      } else if (code === 'auth/too-many-requests') {
        friendly = 'Too many attempts. Please try again later.';
      } else {
        friendly = err.message;
      }
      setError(friendly);
      // Throw error with friendly message for UI
      throw new Error(friendly);
    }
  };

  
  const logout = (reason = 'manual') => {
    setError('');
    console.log('=== USER LOGGED OUT ===');
    if (currentUser) {
      console.log('User ID:', currentUser.uid);
      console.log('Email:', currentUser.email);
    }
    console.log('======================');
    // Fire and forget logging
    (async () => {
      try {
        await ActivityLogger.logout(currentUser?.uid || null, currentUser?.email || null, {
          logoutMethod: reason,
          sessionDuration: sessionStorage.getItem('loginTime') ? 
            Date.now() - parseInt(sessionStorage.getItem('loginTime')) : null,
        });
      } catch {}
    })();
    return signOut(auth);
  };

 
  const resetPassword = (email) => {
    setError('');
    console.log('Password reset email sent to:', email);
    return sendPasswordResetEmail(auth, email);
  };

  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        console.log('=== AUTH STATE CHANGED: USER LOGGED IN ===');
        console.log('User ID:', user.uid);
        console.log('Email:', user.email);
        console.log('Display Name:', user.displayName || 'Not set');
        console.log('Email Verified:', user.emailVerified);
        console.log('Phone Number:', user.phoneNumber || 'Not set');
        console.log('Last Sign-in Time:', user.metadata.lastSignInTime);
        console.log('========================================');
        
        await fetchUserRole(user.uid);
      } else {
        console.log('=== AUTH STATE CHANGED: NO USER LOGGED IN ===');
        console.log('=============================================');
        setUserRole(null);
      }
      
      setLoading(false);
    });

    
    return unsubscribe;
  }, [auth, fetchUserRole]);

  const value = {
    currentUser,
    userRole,
    loading,
    error,
    signup,
    login,
    logout,
    resetPassword,
    fetchUserRole,
    checkUserAccountStatus,
    restoreAdminAccount,
    permanentlyDeleteAdminAccount
  };

  // Idle detection: show warning after 90s (grace 30s), total 2 minutes
  const idleEnabled = !!currentUser && ['admin', 'superAdmin', 'student'].includes(userRole || '');
  const warningMs = 90000; // 1.5 minutes
  const graceSeconds = 30; // countdown window

  // Wire idle timer
  useIdleTimer({
    timeout: idleEnabled ? warningMs : 2147483647, // effectively disabled when not enabled
    onIdle: () => {
      if (!idleEnabled) return;
      setShowIdleModal(true);
      setIdleCountdown(graceSeconds);
    },
    onActivity: () => {
      // Any activity dismisses the modal and resets countdown
      if (showIdleModal) {
        setShowIdleModal(false);
      }
    }
  });

  // Auto-logout countdown when modal is visible
  useEffect(() => {
    if (!showIdleModal) return;
    let intervalId = null;
    intervalId = setInterval(() => {
      setIdleCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          setShowIdleModal(false);
          // Perform logout due to idle
          logout('idle');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showIdleModal]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && (
        <>
          {children}
          {/* Idle Warning Modal (no external deps to avoid side-effects) */}
          {showIdleModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-blue-900">Are you still there?</h3>
                  <p className="text-sm text-gray-700 mt-1">
                    You have been inactive. You will be logged out for security in
                    <span className="font-semibold"> {idleCountdown}s</span>.
                  </p>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => {
                      setShowIdleModal(false);
                      // Activity will be picked up by the idle timer listeners
                    }}
                    className="px-4 py-2 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800"
                  >
                    Stay Logged In
                  </button>
                  <button
                    onClick={() => {
                      setShowIdleModal(false);
                      logout('idle');
                    }}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
                  >
                    Logout Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AuthContext.Provider>
  );
};


AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthContext;