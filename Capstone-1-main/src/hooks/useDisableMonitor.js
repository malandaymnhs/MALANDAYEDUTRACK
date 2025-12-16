import { useEffect, useCallback } from 'react';
import { useAuth } from '../Auth/useAuth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { message } from 'antd';

export const useDisableMonitor = () => {
  const { currentUser, userRole, logout } = useAuth();

  const handleForceLogout = useCallback(async (reason) => {
    message.warning({
      content: reason,
      duration: 5,
      key: 'disable-warning'
    });
    
    // Wait a moment for the message to show
    setTimeout(async () => {
      await logout();
      // Force redirect to login page
      window.location.href = '/login';
    }, 2000);
  }, [logout]);

  useEffect(() => {
    // Only monitor students
    if (!currentUser || !currentUser.email || userRole !== 'student') {
      return;
    }

    console.log('Setting up disable period monitor for:', currentUser.email);

    // Monitor the requests collection for disable period changes
    const requestsRef = collection(db, "requests");
    const q = query(requestsRef, where("email", "==", currentUser.email));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;
      
      const requestData = snapshot.docs[0].data();
      if (!requestData.disableDate) return;
      
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
        console.warn('Unknown disableDate format in useDisableMonitor:', requestData.disableDate);
        return;
      }
      
      const now = new Date();
      
      // If the active period has expired (disableDate <= now)
      if (disableDate <= now) {
        console.log('Account active period expired, logging out user.');
        
        handleForceLogout(
          'Your Account has been Disabled, Please contact an administrator to request access.'
        
        );
      }
    }, (error) => {
      console.error("Error monitoring disable status:", error);
    });

    return () => {
      console.log('Cleaning up disable period monitor');
      unsubscribe();
    };
  }, [currentUser, userRole, handleForceLogout]);

  // Set up periodic check every 30 seconds as backup
  useEffect(() => {
    if (!currentUser || !currentUser.email || userRole !== 'student') {
      return;
    }

    const checkDisableStatus = async () => {
      try {
        const requestsRef = collection(db, "requests");
        const q = query(requestsRef, where("email", "==", currentUser.email));
        
        // Use onSnapshot for real-time updates instead of getDocs
        const unsubscribe = onSnapshot(q, (snapshot) => {
          if (snapshot.empty) return;
          
          const requestData = snapshot.docs[0].data();
          if (!requestData.disableDate) return;
          
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
            console.warn('Unknown disableDate format in periodic check:', requestData.disableDate);
            return;
          }
          
          const now = new Date();
          
          if (disableDate <= now) {
            console.log('Periodic check: Account active period expired');
            
            handleForceLogout(
              'Your Account has been Disabled, Please contact an administrator to request access.'
            );
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error in periodic disable check:", error);
      }
    };

    const interval = setInterval(checkDisableStatus, 30000); // Check every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [currentUser, userRole, handleForceLogout]);
};