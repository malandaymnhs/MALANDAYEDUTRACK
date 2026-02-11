import { addDoc, collection, serverTimestamp, query, orderBy, getDoc, getDocs, setDoc, deleteDoc, doc, onSnapshot, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export const ACTIVITY_TYPES = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  QR_CHECKED: 'successful qr checked',
  REQUEST_SUBMITTED: 'request submitted',
  REQUEST_APPROVED: 'request approved',
  REQUEST_REJECTED: 'request rejected',
  REQUEST_PENDING: 'request pending',
  STATUS_UPDATED: 'status updated',
  PROFILE_UPDATED: 'profile updated',
  TAB_ACCESSED: 'tab accessed',
  DOCUMENT_VIEWED: 'document viewed',
  ANNOUNCEMENT_CREATED: 'announcement created',
  ANNOUNCEMENT_UPDATED: 'announcement updated',
  ANNOUNCEMENT_DELETED: 'announcement deleted',
  EVENT_CREATED: 'event created',
  EVENT_UPDATED: 'event updated',
  EVENT_DELETED: 'event deleted',
  STUDENT_MANAGED: 'student managed',
  PASSWORD_CHANGED: 'password changed',
  ACCOUNT_DELETED: 'account deleted',
  ACCOUNT_RESTORED: 'account restored',
  PERMISSION_CHANGED: 'permission changed',
  BULK_ACTION: 'bulk action',
  // Generic content lifecycle actions
  PUBLISH: 'publish',
  DRAFT: 'draft',
  // Admin-managed updates
  USER_UPDATE: 'user update',
  SCHEDULE_UPDATED: 'update schedule',
  UPDATE_INFO: 'update info',
  DISABLE_ACCOUNT: 'disable account',
  PERMANENTLY_DELETED: 'permanently deleted',
  CANCELED_REQUEST: 'canceled request',
  SEND_EMAIL: 'send email',
  EDIT_REQUEST: 'edit request',
};

// Helper function to get user role from Firestore
export async function getUserRole(userId) {
  if (!userId) return null;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.role || userData.userType || 'user';
    }
  } catch (error) {
    console.error('Error getting user role:', error);
  }
  return null;
}

// Helper function to get user name from Firestore
export async function getUserName(userId) {
  if (!userId) return null;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.firstName && userData.lastName) {
        return `${userData.firstName} ${userData.lastName}`;
      } else if (userData.name) {
        return userData.name;
      }
    }
  } catch (error) {
    console.error('Error getting user name:', error);
  }
  return null;
}

// Enhanced activity logging with better metadata
export async function logActivity(activity) {
  try {
    // Get user details if userId is provided but role/name are not
    let role = activity.role;
    let userName = activity.userName;
    
    if (activity.userId && (!role || !userName)) {
      if (!role) {
        role = await getUserRole(activity.userId);
      }
      if (!userName) {
        userName = await getUserName(activity.userId);
      }
    }

    // Add session and browser information
    const sessionInfo = {
      sessionId: sessionStorage.getItem('sessionId') || `session_${Date.now()}`,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer,
    };

    const payload = {
      timestamp: serverTimestamp(),
      userId: activity.userId || null,
      userEmail: activity.userEmail || null,
      userName: userName || 'Unknown User',
      role: role || 'unknown',
      type: activity.type,
      description: activity.description || '',
      metadata: {
        ...activity.metadata,
        sessionInfo,
        actionDetails: activity.actionDetails || null,
        affectedUsers: activity.affectedUsers || null,
        changes: activity.changes || null,
        ipAddress: activity.ipAddress || null,
      },
      severity: activity.severity || 'info', // info, warning, error, critical
      category: activity.category || 'general', // auth, request, admin, user, system
    };

    await addDoc(collection(db, 'activity_logs'), payload);
    
    // Dispatch custom event for real-time updates
    window.dispatchEvent(new CustomEvent('activityLogged', { detail: payload }));
    
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw to avoid blocking UX
  }
}

// Real-time logs listener with callback
export function subscribeToLogs(callback, options = {}) {
  const { 
    limit = 100, 
    orderByField = 'timestamp', 
    orderDirection = 'desc',
    filters = {} 
  } = options;

  let q = query(
    collection(db, 'activity_logs'), 
    orderBy(orderByField, orderDirection)
  );

  // Apply filters if provided
  if (filters.type) {
    q = query(q, where('type', '==', filters.type));
  }
  if (filters.role) {
    q = query(q, where('role', '==', filters.role));
  }
  if (filters.userId) {
    q = query(q, where('userId', '==', filters.userId));
  }

  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(logs);
  }, (error) => {
    console.error('Error listening to logs:', error);
    callback([], error);
  });
}

// Get logs with pagination
export function buildLogsQuery({ 
  sort = 'desc', 
  limit = 50, 
  filters = {} 
} = {}) {
  let q = query(collection(db, 'activity_logs'), orderBy('timestamp', sort));
  
  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      q = query(q, where(key, '==', value));
    }
  });
  
  return q;
}

// Enhanced activity logging for specific actions
export const ActivityLogger = {
  // Authentication activities
  login: (userId, userEmail, metadata = {}) => 
    logActivity({
      type: ACTIVITY_TYPES.LOGIN,
      userId,
      userEmail,
      description: 'User logged in Malanday Edutrack',
      category: 'auth',
      metadata: { ...metadata, loginMethod: 'email' }
    }),

  logout: (userId, userEmail, metadata = {}) => 
    logActivity({
      type: ACTIVITY_TYPES.LOGOUT,
      userId,
      userEmail,
      description: metadata.description 
        || (metadata.logoutMethod === 'idle' 
            ? 'log out due idle 2mins' 
            : 'User logged out from Malanday Edutrack'),
      category: 'auth',
      metadata: { ...metadata, logoutMethod: metadata.logoutMethod || 'manual' }
    }),

  // QR verification/scanning (works even if logged out)
  qrChecked: ({
    detectedUserName,
    detectedUserId = null,
    detectedUserEmail = null,
    detectedRole = null,
    documentType,
    purpose,
    lrn,
    loggedIn,
  }) => logActivity({
    type: ACTIVITY_TYPES.QR_CHECKED,
    userId: detectedUserId || null,
    userEmail: detectedUserEmail || null,
    userName: detectedUserName || undefined,
    role: detectedRole || undefined,
    description: `${detectedUserName || 'Unknown User'} has successfully verified a ${documentType || 'document'} via QR Code.`,
    category: 'verification',
    metadata: {
      documentType,
      purpose,
      lrn,
      loggedIn: !!loggedIn,
    }
  }),

  // Request activities
  requestSubmitted: (userId, userEmail, requestData) => 
    logActivity({
      type: ACTIVITY_TYPES.REQUEST_SUBMITTED,
      userId,
      userEmail,
      description: `Student submitted ${requestData.documentCount || 1} document request(s)`,
      category: 'request',
      metadata: {
        requestId: requestData.requestId,
        documents: requestData.documents,
        studentName: requestData.studentName,
        totalCopies: requestData.totalCopies || 1,
      }
    }),

  requestApproved: (adminId, adminEmail, requestData) => 
    logActivity({
      type: ACTIVITY_TYPES.REQUEST_APPROVED,
      userId: adminId,
      userEmail: adminEmail,
      description: `Admin approved document request for ${requestData.studentName}`,
      category: 'admin',
      metadata: {
        requestId: requestData.requestId,
        documentId: requestData.documentId,
        documentType: requestData.documentType,
        studentName: requestData.studentName,
        approvalReason: requestData.reason,
      }
    }),

  requestRejected: (adminId, adminEmail, requestData) => 
    logActivity({
      type: ACTIVITY_TYPES.REQUEST_REJECTED,
      userId: adminId,
      userEmail: adminEmail,
      description: `Admin rejected document request for ${requestData.studentName}`,
      category: 'admin',
      severity: 'warning',
      metadata: {
        requestId: requestData.requestId,
        documentId: requestData.documentId,
        documentType: requestData.documentType,
        studentName: requestData.studentName,
        rejectionReason: requestData.reason,
      }
    }),

  // Profile activities
  profileUpdated: (userId, userEmail, profileData) => 
    logActivity({
      type: ACTIVITY_TYPES.PROFILE_UPDATED,
      userId,
      userEmail,
      description: 'User updated personal information',
      category: 'user',
      metadata: {
        updatedFields: profileData.updatedFields,
        studentName: profileData.studentName,
        changes: profileData.changes,
      }
    }),

  // Admin activities
  tabAccessed: (userId, userEmail, tabData) => 
    logActivity({
      type: ACTIVITY_TYPES.TAB_ACCESSED,
      userId,
      userEmail,
      description: `${tabData.userRole === 'superAdmin' ? 'Super Admin' : 'Admin'} accessed ${tabData.tabName} tab`,
      metadata: {
        tabName: tabData.tabName,
        previousTab: tabData.previousTab,
        accessTime: new Date().toISOString(),
      }
    }),

  // System activities
  accountDeleted: (adminId, adminEmail, accountData) => 
    logActivity({
      type: ACTIVITY_TYPES.ACCOUNT_DELETED,
      userId: adminId,
      userEmail: adminEmail,
      description: `Admin deleted account for ${accountData.deletedUserName}`,
      category: 'admin',
      severity: 'warning',
      metadata: {
        deletedUserId: accountData.deletedUserId,
        deletedUserName: accountData.deletedUserName,
        deletedUserRole: accountData.deletedUserRole,
        deletionReason: accountData.reason,
      }
    }),

  accountRestored: (adminId, adminEmail, accountData) => 
    logActivity({
      type: ACTIVITY_TYPES.ACCOUNT_RESTORED,
      userId: adminId,
      userEmail: adminEmail,
      description: `Admin restored account for ${accountData.restoredUserName}`,
      category: 'admin',
      metadata: {
        restoredUserId: accountData.restoredUserId,
        restoredUserName: accountData.restoredUserName,
        restoredUserRole: accountData.restoredUserRole,
        restorationReason: accountData.reason,
      }
    }),
};



// One-time migration utility: Move logs from legacy 'activityLogs' to canonical 'activity_logs'
// Usage (e.g. from a dev-only button or console):
//   await migrateLegacyActivityLogs({ dryRun: false, deleteAfterCopy: true })
export async function migrateLegacyActivityLogs({ dryRun = true, deleteAfterCopy = false, onProgress } = {}) {
  const src = 'activityLogs';
  const dest = 'activity_logs';
  try {
    const snap = await getDocs(collection(db, src));
    const total = snap.size;
    let copied = 0;
    let skipped = 0;
    const errors = [];

    for (const docSnap of snap.docs) {
      const id = docSnap.id;
      const data = docSnap.data();
      try {
        if (!dryRun) {
          // Preserve original IDs by writing with the same doc ID
          await setDoc(doc(db, dest, id), data, { merge: true });
          if (deleteAfterCopy) {
            await deleteDoc(doc(db, src, id));
          }
        }
        copied++;
      } catch (e) {
        errors.push({ id, error: e?.message || String(e) });
      }

      if (typeof onProgress === 'function') {
        try { onProgress({ copied, skipped, total }); } catch {}
      }
    }

    return { total, copied, skipped, errorsCount: errors.length, errors, dryRun, deleteAfterCopy };
  } catch (e) {
    console.error('Migration failed:', e);
    return { total: 0, copied: 0, skipped: 0, errorsCount: 1, errors: [{ error: e?.message || String(e) }], dryRun, deleteAfterCopy };
  }
}
