import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const db = getFirestore();
const NOTIFICATION_COLLECTION = 'notifications';

/**
 * Creates an in-app notification
 */
export const createNotification = async (userId, title, message, type, link = null) => {
  try {
    const notificationData = {
      userId,
      title,
      message,
      type,
      link,
      // Include a friendly redirectTo fallback for parts of the app that use it
      // e.g., '/studentProfile' -> 'profile'
      redirectTo: (() => {
        if (!link) return null;
        if (link.startsWith('/studentProfile')) return 'profile';
        if (link.startsWith('/studentRequest')) return 'request';
        if (link.startsWith('/studentDashboard')) return 'dashboard';
        return null;
      })(),
      read: false,
      createdAt: new Date(),
    };

    const docRef = await addDoc(collection(db, NOTIFICATION_COLLECTION), notificationData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Sends a notification when student profile is updated
 */
export const sendProfileUpdateNotification = async (userId, changes) => {
  const message = `Your profile has been updated. Changes include: ${changes}`;
  await createNotification(userId, 'Profile Updated', message, 'profile', '/studentProfile');
};

/**
 * Sends a notification for new announcements
 */
export const sendAnnouncementNotification = async (userId, announcementTitle) => {
  const message = `New announcement: ${announcementTitle}`;
  await createNotification(userId, 'New Announcement', message, 'announcement', '/');
};

/**
 * Sends a notification for new events
 */
export const sendEventNotification = async (userId, eventTitle) => {
  const message = `New event: ${eventTitle}`;
  await createNotification(userId, 'New Event', message, 'event', '/');
};

/**
 * Gets all notifications for a user
 */
export const getUserNotifications = async (userId) => {
  try {
    const q = query(
      collection(db, NOTIFICATION_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Marks a single notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, NOTIFICATION_COLLECTION, notificationId);
    await updateDoc(notificationRef, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Marks all notifications for a user as read
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const q = query(
      collection(db, NOTIFICATION_COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(doc =>
      updateDoc(doc.ref, { read: true })
    );
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Deletes a single notification
 */
export const deleteNotification = async (notificationId) => {
  try {
    await deleteDoc(doc(db, NOTIFICATION_COLLECTION, notificationId));
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Deletes all notifications for a user
 */
export const clearAllNotifications = async (userId) => {
  try {
    const q = query(
      collection(db, NOTIFICATION_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc =>
      deleteDoc(doc.ref)
    );
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error clearing all notifications:', error);
    throw error;
  }
};
