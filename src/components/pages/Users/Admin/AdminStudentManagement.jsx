import { useState, useEffect, useMemo } from "react";
import { Table, Button, Modal, Form, Input, message, Popconfirm, Tabs, Alert } from "antd";
import { collection, getDocs, doc, deleteDoc, query, where, setDoc, serverTimestamp, updateDoc, addDoc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../../../../config/firebase";
import { logActivity, ACTIVITY_TYPES } from "../../../../services/activityLogService";
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Select } from 'antd';

const { Option } = Select;
const { TabPane } = Tabs;

const STUDENT_PAGE_SIZE = 10;
const DISABLED_STUDENT_PAGE_SIZE = 10;

const UserManagement = () => {
  const [students, setStudents] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [deletedAdmins, setDeletedAdmins] = useState([]);
  const [studentDisablePeriods, setStudentDisablePeriods] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [isDisableModalVisible, setIsDisableModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentAction, setCurrentAction] = useState(null);
  const [currentRole, setCurrentRole] = useState("student");
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [form] = Form.useForm();
  const [authForm] = Form.useForm();
  const [disableForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [studentPage, setStudentPage] = useState(1);
  const [disabledStudentPage, setDisabledStudentPage] = useState(1);
  const auth = getAuth();
  const activeStudents = useMemo(() => {
    return students.filter(student => {
      const disablePeriod = studentDisablePeriods[student.email];
      if (!disablePeriod) return true;
      const now = new Date();
      return disablePeriod.disableUntil > now;
    });
  }, [students, studentDisablePeriods]);

  const disabledStudents = useMemo(() => {
    return students
      .map(student => ({
        ...student,
        disablePeriod: studentDisablePeriods[student.email] || null
      }))
      .filter(student => {
        if (!student.disablePeriod) return false;
        const now = new Date();
        return student.disablePeriod.disableUntil <= now;
      });
  }, [students, studentDisablePeriods]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(activeStudents.length / STUDENT_PAGE_SIZE));
    setStudentPage(prev => (prev > totalPages ? totalPages : prev));
  }, [activeStudents.length]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(disabledStudents.length / DISABLED_STUDENT_PAGE_SIZE));
    setDisabledStudentPage(prev => (prev > totalPages ? totalPages : prev));
  }, [disabledStudents.length]);

  // Helper function to handle letter-only input validation (allows ñ and Ñ)
  const handleLettersOnlyInput = (e) => {
    // Allow only letters (A-Z, a-z, ñ, Ñ) and spaces, remove any other characters
    const value = e.target.value.replace(/[^A-Za-zñÑ\s]/g, '');
    e.target.value = value;
  };

  
  const validateLettersOnly = (_, value) => {
    if (!value) return Promise.resolve();
    if (!/^[A-Za-zñÑ\s]*$/.test(value)) {
      return Promise.reject(new Error('Only letters and spaces are allowed'));
    }
    return Promise.resolve();
  };

  // Sanitize name fields: keep letters, spaces, and ñ/Ñ
  const sanitizeName = (value) => {
    if (!value) return '';
    return String(value).replace(/[^A-Za-zñÑ\s]/g, '').trim();
  };

  // Normalize PH mobile numbers to +63 format
  // Examples:
  // 09289803105 -> +639289803105
  // +639289803105 -> +639289803105 (unchanged)
  // 9289803105 -> +639289803105 (if missing leading 0)
  const normalizePhonePH = (input) => {
    if (!input) return '';
    const digits = String(input).replace(/\D/g, '');
    if (digits.startsWith('63') && digits.length === 12) {
      return `+${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('0')) {
      return `+63${digits.slice(1)}`;
    }
    if (digits.length === 10) {
      return `+63${digits}`;
    }
    // Fallback: if already has +63 and 10 digits
    if (String(input).startsWith('+63') && digits.length === 12) {
      return `+${digits}`;
    }
    // Otherwise, return as-is but stripped to avoid invalid characters
    return String(input).startsWith('+') ? `+${digits}` : digits;
  };

  // Function to send profile update notification
  const sendProfileUpdateNotification = async (userId, changes) => {
    try {
      await addDoc(collection(db, "notifications"), {
        userId: userId,
        type: "profile_update_admin",
        message: `Your profile was updated by an administrator.`,
        createdAt: serverTimestamp(),
        read: false,
        redirectTo: "profile",
        link: "/studentProfile"
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  // Function to fetch disable periods for students
  const fetchStudentDisablePeriods = async () => {
    try {
      const requestsSnapshot = await getDocs(collection(db, "requests"));
      const disablePeriods = {};
      
      requestsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.email && data.disableDate) {
          let disableDate;
          // Handle Firestore Timestamp
          if (data.disableDate.toDate && typeof data.disableDate.toDate === 'function') {
            disableDate = data.disableDate.toDate();
          } else if (data.disableDate.seconds) {
            disableDate = new Date(data.disableDate.seconds * 1000);
          } else if (typeof data.disableDate === 'string') {
            disableDate = new Date(data.disableDate);
          } else if (data.disableDate instanceof Date) {
            disableDate = data.disableDate;
          } else {
            console.warn('Unknown disableDate format:', data.disableDate);
            return;
          }
          
          const now = new Date();
          disablePeriods[data.email] = {
            disableUntil: disableDate,
            isActive: disableDate > now, // Account is ACTIVE until disableDate, then becomes disabled
            requestId: doc.id
          };
        }
      });
      
      setStudentDisablePeriods(disablePeriods);
    } catch (error) {
      console.error("Error fetching disable periods:", error);
    }
  };

  // Function to clear disable period
  const handleClearDisablePeriod = async (studentEmail, requestId) => {
    await handleActionWithAuth(async () => {
      try {
        setLoading(true);
        await updateDoc(doc(db, "requests", requestId), {
          disableDate: null,
          disablePeriodClearedBy: auth.currentUser.uid,
          disablePeriodClearedAt: serverTimestamp()
        });
        
        message.success("Disable period cleared successfully");
        await fetchStudentDisablePeriods();
      } catch (error) {
        console.error("Error clearing disable period:", error);
        message.error("Failed to clear disable period");
      } finally {
        setLoading(false);
      }
    });
  };

  // Function to give student 3 months of active time (then disable)
  const handleGiveStudent5MinAccess = async (student) => {
    await handleActionWithAuth(async () => {
      try {
        setLoading(true);
        
        // Set active period for 3 months from now, then disable
        const now = new Date();
        const activeUntil = new Date(now);
        activeUntil.setMonth(activeUntil.getMonth() + 3); // 3 months in the future
        const firestoreTimestamp = Timestamp.fromDate(activeUntil);
        
        // Find or create request document for this student
        const requestsQuery = query(collection(db, "requests"), where("email", "==", student.email));
        const requestsSnapshot = await getDocs(requestsQuery);
        
        if (!requestsSnapshot.empty) {
          // Update existing request document
          const requestDoc = requestsSnapshot.docs[0];
          await updateDoc(doc(db, "requests", requestDoc.id), {
            disableDate: firestoreTimestamp, // This is when they'll be disabled (after 3 months)
            activePeriodSetBy: auth.currentUser.uid,
            activePeriodSetAt: serverTimestamp(),
            activeReason: "3-month access granted by admin"
          });
        } else {
          // Create new request document if none exists
          await addDoc(collection(db, "requests"), {
            email: student.email,
            firstName: student.firstName || '',
            lastName: student.lastName || '',
            lrn: student.lrn || '',
            disableDate: firestoreTimestamp, // This is when they'll be disabled (after 3 months)
            activePeriodSetBy: auth.currentUser.uid,
            activePeriodSetAt: serverTimestamp(),
            activeReason: "3-month access granted by admin"
          });
        }
        
        message.success(`${student.firstName} ${student.lastName} has been given 3 months of access`);
        await fetchStudentDisablePeriods();
      } catch (error) {
        console.error("Error setting active period:", error);
        message.error("Failed to set active period");
      } finally {
        setLoading(false);
      }
    });
  };

  // Function to modify disable period
  const handleModifyDisablePeriod = (student) => {
    setSelectedStudent(student);
    const disablePeriod = studentDisablePeriods[student.email];
    if (disablePeriod) {
      disableForm.setFieldsValue({
        disableUntil: disablePeriod.disableUntil.toISOString().slice(0, 16)
      });
    }
    setIsDisableModalVisible(true);
  };

  // Function to save modified disable period
  const handleSaveDisablePeriod = async () => {
    try {
      setLoading(true);
      const values = await disableForm.validateFields();
      const disablePeriod = studentDisablePeriods[selectedStudent.email];
      
      if (disablePeriod) {
        // Convert the datetime-local string to a Firestore Timestamp
        const disableUntil = new Date(values.disableUntil);
        const firestoreTimestamp = Timestamp.fromDate(disableUntil);
        
        await updateDoc(doc(db, "requests", disablePeriod.requestId), {
          disableDate: firestoreTimestamp,
          disablePeriodModifiedBy: auth.currentUser.uid,
          disablePeriodModifiedAt: serverTimestamp()
        });
        
        message.success("Disable period updated successfully");
        setIsDisableModalVisible(false);
        await fetchStudentDisablePeriods();
      }
    } catch (error) {
      console.error("Error updating disable period:", error);
      message.error("Failed to update disable period");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUserRole();
    
    const studentQuery = query(collection(db, "users"), where("role", "==", "student"));
    const unsubscribeStudents = onSnapshot(studentQuery, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentData);
    });

    // Real-time listener for student requests collection to sync profile updates and disable periods
    const requestsQuery = collection(db, "requests");
    const unsubscribeRequests = onSnapshot(requestsQuery, async (snapshot) => {
      let shouldRefetchDisablePeriods = false;
      
      // When a student updates their profile in requests collection,
      // we need to sync it to the users collection
      for (const change of snapshot.docChanges()) {
        if (change.type === "modified" || change.type === "added") {
          const requestData = change.doc.data();
          const requestId = change.doc.id;
          
          // Check if disableDate was modified
          if (requestData.disableDate !== undefined) {
            shouldRefetchDisablePeriods = true;
          }
          
          try {
            // Find corresponding user by email
            const userQuery = query(collection(db, "users"), where("email", "==", requestData.email));
            const userSnapshot = await getDocs(userQuery);
            
            if (!userSnapshot.empty) {
              const userDoc = userSnapshot.docs[0];
              const userId = userDoc.id;
              
              // Update users collection with data from requests
              await updateDoc(doc(db, "users", userId), {
                firstName: requestData.firstName || '',
                lastName: requestData.lastName || '',
                middleName: requestData.middleName || '',
                lrn: requestData.lrn || '',
                gradeLevel: requestData.currentYearLevel || '',
                contact: requestData.phoneNumber || '',
                guardianName: requestData.guardianName || '',
                guardianPhone: requestData.guardianPhoneNumber || '',
                guardianRelationship: requestData.guardianRelationship || '',
                updatedAt: serverTimestamp(),
                lastSyncedFromRequests: serverTimestamp()
              });
            }
          } catch (error) {
            console.error("Error syncing request to users collection:", error);
          }
        }
      }
      
      // Refresh disable periods if any disableDate was modified
      if (shouldRefetchDisablePeriods) {
        console.log('Disable period detected in requests, refreshing...');
        await fetchStudentDisablePeriods();
      }
    });

    // Real-time listener for admins
    const adminQuery = query(collection(db, "users"), where("role", "==", "admin"));
    const unsubscribeAdmins = onSnapshot(adminQuery, (snapshot) => {
      const adminData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(admin => admin.status !== 'deleted');
      setAdmins(adminData);
      const deletedAdminData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(admin => admin.status === 'deleted');
      setDeletedAdmins(deletedAdminData);
    });

    // Fetch disable periods initially and set up periodic refresh
    fetchStudentDisablePeriods();
    const disablePeriodInterval = setInterval(fetchStudentDisablePeriods, 30000); // Refresh every 30 seconds

    return () => {
      unsubscribeStudents();
      unsubscribeRequests();
      unsubscribeAdmins();
      clearInterval(disablePeriodInterval);
    };
  }, []);

  const checkUserRole = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDocs(query(collection(db, "users"), where("email", "==", user.email)));
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          setCurrentUserRole(userData.role);
        }
      }
    } catch (error) {
      console.error("Error checking user role:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      setTableLoading(true);
     
      const studentQuery = query(collection(db, "users"), where("role", "==", "student"));
      const studentSnapshot = await getDocs(studentQuery);
      const studentData = studentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentData);
      
      
      const adminQuery = query(collection(db, "users"), where("role", "==", "admin"));
      const adminSnapshot = await getDocs(adminQuery);
      const adminData = adminSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(admin => admin.status !== 'deleted'); // Filter out deleted admin accounts
      setAdmins(adminData);

      // Fetch deleted admin accounts
      const deletedAdminData = adminSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(admin => admin.status === 'deleted');
      setDeletedAdmins(deletedAdminData);
    } catch (error) {
      console.error("Error fetching users:", error);
      message.error("Failed to fetch users");
    } finally {
      setTableLoading(false);
    }
  };

  const checkEmailExists = async (email) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      if (currentUser) {
        
        return querySnapshot.docs.some(doc => doc.id !== currentUser.id);
      }
      
      
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking email:", error);
      return false;
    }
  };

  const verifyAdmin = async () => {
    try {
      setAuthLoading(true);
      const values = await authForm.validateFields();
      const { email, password } = values;

      const current = auth.currentUser;
      if (!current) {
        message.error("No authenticated admin session.");
        return false;
      }
      // Enforce that the confirmation is done with the same signed-in admin account
      if (email !== current.email) {
        message.error("Please confirm using your own admin email (same as the signed-in account).");
        return false;
      }

      const credential = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(current, credential);
      return true;
    } catch (error) {
      // Map common Firebase auth errors to friendly messages
      const code = error?.code || '';
      let msg = "Authentication failed. Please try again.";
      if (code.includes('auth/invalid-email')) msg = "Invalid email format.";
      else if (code.includes('auth/user-disabled')) msg = "Admin account is disabled.";
      else if (code.includes('auth/user-not-found')) msg = "Admin account not found.";
      else if (code.includes('auth/wrong-password')) msg = "Incorrect password.";
      else if (error?.message) msg = error.message;
      message.error(msg);
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const handleActionWithAuth = async (action, ...args) => {
    setCurrentAction(() => () => action(...args));
    setIsAuthModalVisible(true);
  };

  const confirmAction = async () => {
    const isVerified = await verifyAdmin();
    if (isVerified) {
      setIsAuthModalVisible(false);
      authForm.resetFields();
      if (currentAction) {
        await currentAction();
      }
    }
  };

  const handleAddUser = (role) => {
    setCurrentUser(null);
    setCurrentRole(role);
    form.resetFields();
    form.setFieldsValue({ role: role });
    setIsModalVisible(true);
  };

  const handleEditUser = async (user, role) => {
    setCurrentUser(user);
    setCurrentRole(role);
    form.setFieldsValue({
      ...user,
      password: '',
      confirmPassword: ''
    });
    setIsModalVisible(true);
  };

  const handleDeleteUser = async (id) => {
    await handleActionWithAuth(async () => {
      try {
        setLoading(true);
        
        // For admin accounts, use soft delete (set status to 'deleted')
        // For student accounts, use hard delete as before
        const userToDelete = [...students, ...admins].find(user => user.id === id);
        
        if (userToDelete && userToDelete.role === 'admin') {
          // Soft delete for admin accounts
          await updateDoc(doc(db, "users", id), {
            status: 'deleted',
            deletedAt: serverTimestamp(),
            deletedBy: auth.currentUser.uid
          });
          message.success("Admin account deleted successfully");
        } else {
          // Hard delete for student accounts
          await deleteDoc(doc(db, "users", id));
          message.success("User deleted successfully");
        }
        
        fetchUsers();
      } catch (error) {
        console.error("Error deleting user:", error);
        message.error("Failed to delete user");
      } finally {
        setLoading(false);
      }
    });
  };

  const handleRestoreAdmin = async (id) => {
    await handleActionWithAuth(async () => {
      try {
        setLoading(true);
        await updateDoc(doc(db, "users", id), {
          status: 'active',
          restoredAt: serverTimestamp(),
          restoredBy: auth.currentUser.uid
        });
        message.success("Admin account restored successfully");
        fetchUsers();
      } catch (error) {
        console.error("Error restoring admin account:", error);
        message.error("Failed to restore admin account");
      } finally {
        setLoading(false);
      }
    });
  };

  const handlePermanentlyDeleteAdmin = async (id) => {
    await handleActionWithAuth(async () => {
      try {
        setLoading(true);
        await deleteDoc(doc(db, "users", id));
        message.success("Admin account permanently deleted");
        fetchUsers();
      } catch (error) {
        console.error("Error permanently deleting admin account:", error);
        message.error("Failed to permanently delete admin account");
      } finally {
        setLoading(false);
      }
    });
  };

  const hashEmail = (email) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    const hiddenName = name.length > 2 
      ? name.substring(0, 2) + '*'.repeat(name.length - 2)
      : '*'.repeat(name.length);
    return `${hiddenName}@${domain}`;
  };

  const validateAdminForm = async (values) => {
    if (!values.firstName?.trim()) return "First name is required";
    if (!values.lastName?.trim()) return "Last name is required";
    if (!values.email?.trim()) return "Email is required";
    if (!values.password) return "Password is required";
    if (values.password?.length < 6) return "Password must be at least 6 characters";
    if (values.password !== values.confirmPassword) return "Passwords do not match";
    
    // Check if email exists
    const emailExists = await checkEmailExists(values.email);
    if (emailExists) return "Email already exists";
    
    return null;
  };

  const handleSubmit = async () => {
    // If editing an existing student, update and refresh
    if (currentUser && currentRole === "student") {
      await handleActionWithAuth(async () => {
        try {
          setLoading(true);
          const values = await form.validateFields();

          // Sanitize names and normalize phones
          const cleanFirstName = sanitizeName(values.firstName);
          const cleanLastName = sanitizeName(values.lastName);
          const cleanMiddleName = sanitizeName(values.middleName || '');
          const cleanGuardianName = sanitizeName(values.guardianName || '');
          const normalizedContact = normalizePhonePH(values.contact);
          const normalizedGuardianPhone = normalizePhonePH(values.guardianPhone);

          if (!cleanFirstName || !cleanLastName) {
            throw new Error('First name and Last name must contain only letters and cannot be empty.');
          }
          
          // Update student data in both users and requests collections
          const updateData = {
            firstName: cleanFirstName,
            lastName: cleanLastName,
            middleName: cleanMiddleName,
            lrn: values.lrn,
            gradeLevel: values.gradeLevel,
            contact: normalizedContact,
            guardianName: cleanGuardianName,
            guardianPhone: normalizedGuardianPhone,
            guardianRelationship: values.guardianRelationship,
            updatedAt: serverTimestamp(),
            lastUpdatedBy: 'admin'
          };

          // Update users collection
          await updateDoc(doc(db, "users", currentUser.id), updateData);

          // Also update requests collection to keep both in sync
          try {
            const requestsQuery = query(collection(db, "requests"), where("email", "==", currentUser.email));
            const requestsSnapshot = await getDocs(requestsQuery);
            
            if (!requestsSnapshot.empty) {
              const requestDoc = requestsSnapshot.docs[0];
              await updateDoc(doc(db, "requests", requestDoc.id), {
                firstName: cleanFirstName,
                lastName: cleanLastName,
                middleName: cleanMiddleName,
                lrn: values.lrn,
                currentYearLevel: values.gradeLevel,
                phoneNumber: normalizedContact,
                guardianName: cleanGuardianName,
                guardianPhoneNumber: normalizedGuardianPhone,
                guardianRelationship: values.guardianRelationship,
                updatedAt: serverTimestamp(),
                lastUpdatedBy: 'admin'
              });
            }
          } catch (error) {
            console.error("Error updating requests collection:", error);
          }

          // Send notification to the student
          const cleanedForDiff = {
            ...values,
            firstName: cleanFirstName,
            lastName: cleanLastName,
            middleName: cleanMiddleName,
            contact: normalizedContact,
            guardianName: cleanGuardianName,
            guardianPhone: normalizedGuardianPhone,
          };

          const changes = Object.keys(cleanedForDiff)
            .filter(key => cleanedForDiff[key] !== currentUser[key])
            .map(key => `${key}: ${cleanedForDiff[key]}`)
            .join(", ");
          
          if (changes) {
            await sendProfileUpdateNotification(currentUser.id, changes);
          }

          // Always fetch the latest student data and update the UI
          await fetchUsers();

          // Show success popup
          Modal.success({
            title: "Success",
            content: "Successfully updated the information of this student.",
            className: "custom-modal",
            okButtonProps: { 
              className: "bg-blue-600 hover:bg-blue-700 border-blue-600 text-white" 
            }
          });

          setIsModalVisible(false);
          
          // Log admin user update with student's name
          try {
            const admin = auth.currentUser;
            const fullName = `${cleanFirstName} ${cleanLastName}`.trim();
            await logActivity({
              type: ACTIVITY_TYPES.USER_UPDATE,
              userId: admin?.uid || null,
              userEmail: admin?.email || null,
              role: 'admin',
              description: `Admin was Update the Information (${fullName})`,
              category: 'admin',
              metadata: {
                updatedUserId: currentUser.id,
                updatedUserEmail: currentUser.email,
                updatedFields: Object.keys(updateData),
              },
            });
          } catch {}
        } catch (error) {
          console.error("Failed to update student:", error);
          Modal.error({
            title: "Error",
            content: error.message || "Failed to update student information",
            className: "custom-modal"
          });
        } finally {
          setLoading(false);
        }
      });
      return;
    }
    // If editing an existing admin, allow update of names and contact
    if (currentUser && currentRole === "admin") {
      await handleActionWithAuth(async () => {
        try {
          setLoading(true);
          const values = await form.validateFields();

          // Sanitize names and normalize contact
          const cleanFirstName = sanitizeName(values.firstName);
          const cleanLastName = sanitizeName(values.lastName);
          const cleanMiddleName = sanitizeName(values.middleName || '');
          const normalizedContact = normalizePhonePH(values.contact);

          if (!cleanFirstName || !cleanLastName) {
            throw new Error('First name and Last name must contain only letters and cannot be empty.');
          }

          await updateDoc(doc(db, "users", currentUser.id), {
            firstName: cleanFirstName,
            lastName: cleanLastName,
            middleName: cleanMiddleName,
            contact: normalizedContact,
          });
          // Log the update for audit
          await addDoc(collection(db, "admin_update_logs"), {
            adminId: currentUser.id,
            updatedBy: auth.currentUser ? auth.currentUser.uid : null,
            updatedAt: serverTimestamp(),
            changes: {
              firstName: values.firstName,
              lastName: values.lastName,
              middleName: values.middleName || '',
              contact: values.contact,
            }
          });
          await fetchUsers();
          message.success("Admin profile updated successfully");
          setIsModalVisible(false);
        } catch (error) {
          console.error("Failed to update admin:", error);
          message.error(error.message || "Failed to update admin");
        } finally {
          setLoading(false);
        }
      });
      return;
    }
    // For admin add, keep authentication
    await handleActionWithAuth(async () => {
      try {
        setLoading(true);
        const values = await form.validateFields();
        // Validate form
        const validationError = await validateAdminForm(values);
        if (validationError) {
          throw new Error(validationError);
        }
        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          values.email,
          values.password
        );
        // Save admin data to Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
          firstName: values.firstName,
          lastName: values.lastName,
          middleName: values.middleName || '',
          email: values.email,
          contact: values.contact,
          role: 'admin',
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser.uid,
          isActive: true,
          status: 'active' // Added status field
        });
        message.success("Admin account created successfully");
        setIsModalVisible(false);
        fetchUsers();
      } catch (error) {
        console.error("Operation failed:", error);
        message.error(error.message || "Failed to create admin account");
      } finally {
        setLoading(false);
      }
    });
  };

  const studentColumns = [
    {
      title: 'Full Name',
      key: 'fullName',
      render: (_, record) => (
        <span className="font-medium text-gray-800 transition-colors duration-200 hover:text-blue-600">
          {`${record.lastName || ''}, ${record.firstName || ''} ${record.middleName || ''}`}
        </span>
      )
    },
    {
      title: 'LRN',
      dataIndex: 'lrn',
      key: 'lrn',
      render: (text) => <span className="text-gray-600">{text}</span>
    },
    {
      title: 'Email',
      key: 'email',
      render: (_, record) => (
        <span className="text-gray-500 italic">
          {hashEmail(record.email)}
        </span>
      )
    },
    {
      title: 'Contact',
      dataIndex: 'contact',
      key: 'contact',
      render: (text) => <span className="text-gray-600">{text}</span>
    },
    {
      title: 'Grade Level',
      dataIndex: 'gradeLevel',
      key: 'gradeLevel',
      render: (text) => <span className="text-gray-600">{text || 'N/A'}</span>
    },
    {
      title: 'Strand',
      dataIndex: 'strand',
      key: 'strand',
      render: (text, record) => {
        const isGrade11or12 = record.gradeLevel === 'Grade 11' || record.gradeLevel === 'Grade 12';
        return isGrade11or12 ? (
          <span className="text-gray-600 font-medium">{text || 'N/A'}</span>
        ) : (
          <span className="text-gray-400 italic">N/A</span>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div className="flex gap-2">
          <Button 
            type="text" 
            icon={<EditOutlined className="text-blue-500 hover:text-blue-700 transition-colors duration-200" />}
            onClick={() => handleEditUser(record, "student")}
            className="hover:bg-blue-50 rounded-lg transition-all duration-200"
            title="Edit Student"
          />
        </div>
      ),
    },
  ];

  const adminColumns = [
    {
      title: 'Full Name',
      key: 'fullName',
      render: (_, record) => (
        <span className="font-medium text-gray-800 transition-colors duration-200 hover:text-blue-600">
          {`${record.lastName || ''}, ${record.firstName || ''} ${record.middleName || ''}`}
        </span>
      )
    },
    {
      title: 'Email',
      key: 'email',
      render: (_, record) => (
        <span className="text-gray-500 italic">
          {hashEmail(record.email)}
        </span>
      )
    },
    {
      title: 'Contact',
      dataIndex: 'contact',
      key: 'contact',
      render: (text) => <span className="text-gray-600">{text}</span>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div className="flex gap-2">
          <Button 
            type="text" 
            icon={<EditOutlined className="text-blue-500 hover:text-blue-700 transition-colors duration-200" />}
            onClick={() => handleEditUser(record, "admin")}
            className="hover:bg-blue-50 rounded-lg transition-all duration-200"
          />
          <Popconfirm
            title="Are you sure to delete this admin?"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ className: "bg-red-500 hover:bg-red-600" }}
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined className="hover:text-red-700 transition-colors duration-200" />} 
              className="hover:bg-red-50 rounded-lg transition-all duration-200"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const deletedAdminColumns = [
    {
      title: 'Full Name',
      key: 'fullName',
      render: (_, record) => (
        <span className="font-medium text-gray-800 transition-colors duration-200 hover:text-blue-600">
          {`${record.lastName || ''}, ${record.firstName || ''} ${record.middleName || ''}`}
        </span>
      )
    },
    {
      title: 'Email',
      key: 'email',
      render: (_, record) => (
        <span className="text-gray-500 italic">
          {hashEmail(record.email)}
        </span>
      )
    },
    {
      title: 'Deleted Date',
      key: 'deletedAt',
      render: (_, record) => (
        <span className="text-gray-600">
          {record.deletedAt ? new Date(record.deletedAt.toDate()).toLocaleDateString() : 'N/A'}
        </span>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div className="flex gap-2">
          <Button 
            type="text" 
            icon={<EditOutlined className="text-green-500 hover:text-green-700 transition-colors duration-200" />}
            onClick={() => handleRestoreAdmin(record.id)}
            className="hover:bg-green-50 rounded-lg transition-all duration-200"
            title="Restore Account"
          >
            Restore
          </Button>
          <Popconfirm
            title="Are you sure to permanently delete this admin? This action cannot be undone."
            onConfirm={() => handlePermanentlyDeleteAdmin(record.id)}
            okText="Yes, Delete Permanently"
            cancelText="No"
            okButtonProps={{ className: "bg-red-600 hover:bg-red-700" }}
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined className="hover:text-red-700 transition-colors duration-200" />} 
              className="hover:bg-red-50 rounded-lg transition-all duration-200"
              title="Permanently Delete"
            >
              Delete Permanently
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const StudentTable = () => {
    return (
      <div className="overflow-hidden rounded-2xl shadow-lg border-t-8 border-[#FFC30B] bg-white">
        <div className="flex justify-between items-center px-6 pt-6 pb-2">
          <h2 className="text-2xl font-extrabold text-[#014F86] tracking-tight flex items-center gap-2">
            <span className="text-[#FFC30B]">Active Student</span>
            <span className="text-[#4169E1]">Records</span>
          </h2>
        </div>
        <Table
          columns={studentColumns}
          dataSource={activeStudents}
          rowKey="id"
          bordered={false}
          pagination={{
            current: studentPage,
            pageSize: STUDENT_PAGE_SIZE,
            position: ['bottomCenter'],
            className: "pt-4",
            showSizeChanger: false,
            onChange: (page) => setStudentPage(page)
          }}
          loading={tableLoading}
          scroll={{ x: 800 }}
          className="!bg-white !rounded-b-2xl"
          rowClassName={(_, idx) =>
            idx % 2 === 0
              ? "bg-[#F8FAFC] hover:bg-[#E3F0FF] transition-colors duration-150"
              : "bg-white hover:bg-[#E3F0FF] transition-colors duration-150"
          }
          // Custom header styling
          components={{
            header: {
              cell: (props) => (
                <th
                  {...props}
                  className="!bg-[#014F86] !text-white !font-bold !text-base !py-3 !px-4"
                />
              ),
            },
            body: {
              cell: (props) => (
                <td
                  {...props}
                  className="!py-3 !px-4 !text-[#014F86] group-hover:!bg-[#E3F0FF] transition-colors duration-150"
                />
              ),
            },
          }}
        />
      </div>
    );
  };

  const AdminTable = () => {
    if (currentUserRole !== 'superAdmin') {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <Alert
            message="Access Restricted"
            description="Only Super Administrators can view and manage administrator accounts."
            type="info"
            showIcon
            className="max-w-lg mb-4"
          />
          <img 
            src="/lock-icon.png" 
            alt="Restricted Access" 
            className="w-32 h-32 opacity-50 mb-4"
          />
        </div>
      );
    }

    return (
      <div className="overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Admin Accounts</h2>
          <Button 
            type="primary" 
            onClick={() => handleAddUser("admin")}
            className="bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            Add New Admin
          </Button>
        </div>
        <Table 
          columns={adminColumns} 
          dataSource={admins} 
          rowKey="id"
          bordered
          pagination={{ 
            pageSize: 10,
            position: ['bottomCenter'],
            className: "pt-4"
          }}
          loading={tableLoading}
          scroll={{ x: 800 }} 
          className="shadow-sm"
          rowClassName={() => "hover:bg-gray-50 transition-colors duration-150"}
        />
      </div>
    );
  };

  const DeletedAdminsTable = () => {
    if (currentUserRole !== 'superAdmin') {
      return null;
    }

    return (
      <div className="overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Deleted Admin Accounts</h2>
          <div className="text-sm text-gray-500">
            {deletedAdmins.length} deleted account{deletedAdmins.length !== 1 ? 's' : ''}
          </div>
        </div>
        {deletedAdmins.length > 0 ? (
          <Table 
            columns={deletedAdminColumns} 
            dataSource={deletedAdmins} 
            rowKey="id"
            bordered
            pagination={{ 
              pageSize: 10,
              position: ['bottomCenter'],
              className: "pt-4"
            }}
            loading={tableLoading}
            scroll={{ x: 800 }} 
            className="shadow-sm"
            rowClassName={() => "hover:bg-gray-50 transition-colors duration-150"}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            No deleted admin accounts found.
          </div>
        )}
      </div>
    );
  };

  // Separate Student Disable Management Table
  const StudentDisableManagementTable = () => {
    // Calculate disable period statistics
    const totalStudents = students.length;
    const studentsWithActivePeriods = Object.keys(studentDisablePeriods).length;
    const currentlyActivePeriods = Object.values(studentDisablePeriods).filter(period => period.isActive).length;
    const expiredPeriods = studentsWithActivePeriods - currentlyActivePeriods;

    const disableManagementColumns = [
      {
        title: 'Student Name',
        key: 'fullName',
        render: (_, record) => (
          <div>
            <span className="font-medium text-gray-800">
              {`${record.lastName || ''}, ${record.firstName || ''} ${record.middleName || ''}`}
            </span>
            <div className="text-sm text-gray-500">{record.lrn}</div>
          </div>
        )
      },
      {
        title: 'Email',
        key: 'email',
        render: (_, record) => (
          <span className="text-gray-500 text-sm">
            {record.email}
          </span>
        )
      },
      {
        title: 'Disable Status',
        key: 'disableStatus',
        render: (_, record) => {
          const disablePeriod = record.disablePeriod;
          if (!disablePeriod) {
            return (
              <div className="flex items-center">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  ACCOUNT DISABLED
                </span>
              </div>
            );
          }
          
          const { disableUntil } = disablePeriod;
          return (
            <div className="flex flex-col space-y-1">
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                ACCOUNT DISABLED
              </span>
              <span className="text-xs text-gray-500">
                Expired: {disableUntil.toLocaleDateString()} at {disableUntil.toLocaleTimeString()}
              </span>
            </div>
          );
        }
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, record) => {
          const disablePeriod = record.disablePeriod;
          return (
            <div className="flex gap-2 items-center">
              {disablePeriod ? (
                <>
                  <Button 
                    type="text" 
                    size="small"
                    onClick={() => handleModifyDisablePeriod(record)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    title="Modify Disable Period"
                  >
                    Modify
                  </Button>
                  <Button 
                    type="text" 
                    size="small"
                    onClick={() => handleClearDisablePeriod(record.email, disablePeriod.requestId)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-200"
                    title="Clear Disable Period"
                  >
                    Clear
                  </Button>
                </>
              ) : (
                <span className="text-gray-400 text-sm">No actions available</span>
              )}
            </div>
          );
        },
      },
    ];

    return (
      <div className="space-y-6">
        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
            <div className="text-3xl font-bold text-blue-600">{totalStudents}</div>
            <div className="text-sm text-blue-800 font-medium">Total Students</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
            <div className="text-3xl font-bold text-red-600">{expiredPeriods}</div>
            <div className="text-sm text-red-800 font-medium">Disabled Students</div>
          </div>
        </div>

        {/* Student Disable Management Table */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-800">Student Disable Period Management</h3>
              <Button 
                onClick={fetchStudentDisablePeriods}
                className="text-blue-600 hover:text-blue-700"
                type="text"
                size="small"
              >
                Refresh Status
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Monitor and manage student account disable periods
            </p>
          </div>
          
          <Table
            columns={disableManagementColumns}
            dataSource={disabledStudents}
            rowKey="id"
            pagination={{
              current: disabledStudentPage,
              pageSize: DISABLED_STUDENT_PAGE_SIZE,
              position: ['bottomCenter'],
              className: "pt-4",
              showSizeChanger: false,
              onChange: (page) => setDisabledStudentPage(page)
            }}
            loading={tableLoading}
            scroll={{ x: 800 }}
            rowClassName={(record) => {
              const hasActivePeriod = record.disablePeriod?.isActive;
              return hasActivePeriod 
                ? "bg-red-50 hover:bg-red-100 transition-colors duration-150" 
                : "hover:bg-gray-50 transition-colors duration-150";
            }}
          />
        </div>
      </div>
    );
  };

  const tabItems = [
    {
      key: "users",
      label: <span className="text-lg font-medium">User Management</span>,
      children: <StudentTable />,
    },
    {
      key: "student_management",
      label: <span className="text-lg font-medium">Student Disable Management</span>,
      children: <StudentDisableManagementTable />,
    },
  ];

  const renderAdminForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Form.Item
          name="firstName"
          label="First Name"
          rules={[{ required: true, message: 'Please input first name!' }]}
        >
          <Input className="hover:border-blue-400 focus:border-blue-500" />
        </Form.Item>

        <Form.Item
          name="middleName"
          label="Middle Name"
        >
          <Input className="hover:border-blue-400 focus:border-blue-500" />
        </Form.Item>

        <Form.Item
          name="lastName"
          label="Last Name"
          rules={[{ required: true, message: 'Please input last name!' }]}
        >
          <Input className="hover:border-blue-400 focus:border-blue-500" />
        </Form.Item>
      </div>

      <Form.Item
        name="email"
        label="Email"
        rules={[
          { required: true, message: 'Please input email!' },
          { type: 'email', message: 'Please enter a valid email!' }
        ]}
      >
        <Input 
          placeholder="Email"
          className="hover:border-blue-400 focus:border-blue-500"
        />
      </Form.Item>

      <Form.Item
        name="contact"
        label="Contact"
        rules={[
          { required: true, message: 'Please input contact number!' },
          { pattern: /^\d{11}$/, message: 'Contact must be 11 digits!' }
        ]}
      >
        <Input 
          maxLength={11}
          className="hover:border-blue-400 focus:border-blue-500" 
        />
      </Form.Item>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: 'Please input password!' },
            { min: 6, message: 'Password must be at least 6 characters!' }
          ]}
        >
          <Input.Password className="hover:border-blue-400 focus:border-blue-500" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm Password"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm password!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match!'));
              },
            }),
          ]}
        >
          <Input.Password className="hover:border-blue-400 focus:border-blue-500" />
        </Form.Item>
      </div>
    </div>
  );

  const renderStudentForm = () => (
    <div className="bg-white rounded-2xl shadow-lg border-t-8 border-[#FFC30B] p-8">
      <h2 className="text-2xl font-extrabold text-[#014F86] mb-6 tracking-tight flex items-center gap-2">
        <span className="text-[#FFC30B]">Student</span>
        <span className="text-[#4169E1]">Registration</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Form.Item
          name="firstName"
          label={<span className="font-semibold text-[#4169E1]">First Name</span>}
          className="mb-0"
          rules={[
            { required: true, message: 'Please input Firstname' },
            { validator: validateLettersOnly }
          ]}
        >
          <Input 
            onInput={handleLettersOnlyInput}
            placeholder="Enter first name (letters only)"
            className="rounded-xl border-2 border-[#014F86]/20 focus:border-[#4169E1] focus:ring-2 focus:ring-[#FFC30B]/40 transition" 
          />
        </Form.Item>
        <Form.Item
          name="middleName"
          label={<span className="font-semibold text-[#4169E1]">Middle Name</span>}
          className="mb-0"
          rules={[{ validator: validateLettersOnly }]}
        >
          <Input 
            onInput={handleLettersOnlyInput}
            placeholder="Enter middle name (letters only)"
            className="rounded-xl border-2 border-[#014F86]/20 focus:border-[#4169E1] focus:ring-2 focus:ring-[#FFC30B]/40 transition" 
          />
        </Form.Item>
        <Form.Item
          name="lastName"
          label={<span className="font-semibold text-[#4169E1]">Last Name</span>}
          className="mb-0"
          rules={[
            { required: true, message: 'Please input Last Name' },
            { validator: validateLettersOnly }
          ]}
        >
          <Input 
            onInput={handleLettersOnlyInput}
            placeholder="Enter last name (letters only)"
            className="rounded-xl border-2 border-[#014F86]/20 focus:border-[#4169E1] focus:ring-2 focus:ring-[#FFC30B]/40 transition" 
          />
        </Form.Item>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Form.Item
          name="email"
          label={<span className="font-semibold text-[#4169E1]">Email</span>}
          className="mb-0"
        >
          <Input
            placeholder="Email"
            disabled
            className="rounded-xl border-2 border-[#014F86]/20 bg-gray-100 text-gray-500"
          />
        </Form.Item>
        <Form.Item
          name="lrn"
          label={<span className="font-semibold text-[#4169E1]">Learner Reference Number (LRN)</span>}
          rules={[
            { required: true, message: 'Please input LRN!' },
            { pattern: /^\d{12}$/, message: 'LRN must be exactly 12 digits' }
          ]}
          className="mb-0"
        >
          <Input
            maxLength={12}
            minLength={12}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            onInput={e => {
              e.target.value = e.target.value.replace(/\D/g, '').slice(0, 12);
            }}
            className="rounded-xl border-2 border-[#014F86]/20 focus:border-[#4169E1] focus:ring-2 focus:ring-[#FFC30B]/40 transition"
          />
        </Form.Item>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Form.Item
          name="birthday"
          label={<span className="font-semibold text-[#4169E1]">Birthday</span>}
          className="mb-0"
        >
          <Input
            type="date"
            disabled
            className="rounded-xl border-2 border-[#014F86]/20 bg-gray-100 text-gray-500"
          />
        </Form.Item>
        <Form.Item
          name="gradeLevel"
          label={<span className="font-semibold text-[#4169E1]">Grade Level</span>}
          className="mb-0"
        >
          <Select
            placeholder="Select Grade Level"
            className="rounded-xl border-2 border-[#014F86]/20 focus:border-[#4169E1] focus:ring-2 focus:ring-[#FFC30B]/40 transition"
            onChange={(value) => {
              // Clear strand if not Grade 11/12
              if (value !== 'Grade 11' && value !== 'Grade 12') {
                form.setFieldsValue({ strand: undefined });
              }
            }}
          >
            <Option value="Grade 7">Grade 7</Option>
            <Option value="Grade 8">Grade 8</Option>
            <Option value="Grade 9">Grade 9</Option>
            <Option value="Grade 10">Grade 10</Option>
            <Option value="Grade 11">Grade 11</Option>
            <Option value="Grade 12">Grade 12</Option>
          </Select>
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.gradeLevel !== currentValues.gradeLevel}
        >
          {({ getFieldValue }) => {
            const gradeLevel = getFieldValue('gradeLevel');
            const isGrade11or12 = gradeLevel === 'Grade 11' || gradeLevel === 'Grade 12';
            return isGrade11or12 ? (
              <Form.Item
                name="strand"
                label={<span className="font-semibold text-[#4169E1]">Senior High Strand</span>}
                className="mb-0"
                rules={[
                  { required: true, message: 'Please select a strand for Grade 11/12 students' }
                ]}
              >
                <Select
                  placeholder="Select Strand"
                  className="rounded-xl border-2 border-[#014F86]/20 focus:border-[#4169E1] focus:ring-2 focus:ring-[#FFC30B]/40 transition"
                >
                  <Option value="GAS">GAS</Option>
                  <Option value="ABM">ABM</Option>
                </Select>
              </Form.Item>
            ) : null;
          }}
        </Form.Item>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Form.Item
          name="contact"
          label={<span className="font-semibold text-[#4169E1]">Contact</span>}
          className="mb-0"
          // No required rule for editing or adding
          rules={[]}
        >
          <Input
            maxLength={11}
            inputMode="numeric"
            pattern="\d*"
            placeholder="Enter 11-digit number"
            onKeyPress={e => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }}
            onChange={e => {
              const onlyDigits = e.target.value.replace(/\D/g, "");
              e.target.value = onlyDigits;
              e.target.dispatchEvent(new Event("input", { bubbles: true }));
            }}
            className="rounded-xl border-2 border-[#014F86]/20 focus:border-[#4169E1] focus:ring-2 focus:ring-[#FFC30B]/40 transition"
          />
        </Form.Item>
        <Form.Item
          name="guardianName"
          label={<span className="font-semibold text-[#4169E1]">Guardian&apos;s Name</span>}
          className="mb-0"
          // No required rule for editing or adding
          rules={[{ validator: validateLettersOnly }]}
        >
          <Input 
            onInput={handleLettersOnlyInput}
            placeholder="Enter guardian's name (letters only)"
            className="rounded-xl border-2 border-[#014F86]/20 focus:border-[#4169E1] focus:ring-2 focus:ring-[#FFC30B]/40 transition" 
          />
        </Form.Item>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Form.Item
          name="guardianPhone"
          label={<span className="font-semibold text-[#4169E1]">Guardian&apos;s Phone</span>}
          className="mb-0"
          // No required rule for editing or adding
          rules={[]}
        >
          <Input
            maxLength={11}
            inputMode="numeric"
            pattern="\d*"
            placeholder="Enter 11-digit number"
            onKeyPress={e => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }}
            onChange={e => {
              const onlyDigits = e.target.value.replace(/\D/g, "");
              e.target.value = onlyDigits;
              e.target.dispatchEvent(new Event("input", { bubbles: true }));
            }}
            className="rounded-xl border-2 border-[#014F86]/20 focus:border-[#4169E1] focus:ring-2 focus:ring-[#FFC30B]/40 transition"
          />
        </Form.Item>
        <Form.Item
          name="guardianRelationship"
          label={<span className="font-semibold text-[#4169E1]">Guardian&apos;s Relationship</span>}
          className="mb-0"
        >
          <Select
            placeholder="Select Relationship"
            className="rounded-xl border-2 border-[#014F86]/20 focus:border-[#4169E1] focus:ring-2 focus:ring-[#FFC30B]/40 transition"
          >
            <Option value="Mother">Mother</Option>
            <Option value="Father">Father</Option>
            <Option value="Cousin">Cousin</Option>
            <Option value="Aunt">Aunt</Option>
            <Option value="Uncle">Uncle</Option>
            <Option value="Nephew">Nephew</Option>
            <Option value="Grandfather">Grandfather</Option>
            <Option value="Grandmother">Grandmother</Option>
          </Select>
        </Form.Item>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-white rounded-lg">
      <Tabs items={tabItems} defaultActiveKey="students" />

      <Modal
        title={currentUser 
          ? `Edit ${currentRole === "admin" ? "Admin" : "Student"}` 
          : `Add New ${currentRole === "admin" ? "Admin" : "Student"}`}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        okText={currentUser ? "Update" : "Add"}
        width={700}
        confirmLoading={loading}
        footer={[
          <Button 
            key="back" 
            onClick={() => setIsModalVisible(false)}
            className="hover:bg-gray-100 transition-colors duration-200"
          >
            Cancel
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={loading}
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            {loading ? (currentUser ? "Updating..." : "Adding...") : (currentUser ? "Update" : "Add")}
          </Button>,
        ]}
        className="rounded-lg"
      >
        <Form form={form} layout="vertical">
          {currentRole === "admin" ? renderAdminForm() : renderStudentForm()}
          <Form.Item name="role" hidden><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Admin Authentication Required"
        open={isAuthModalVisible}
        onOk={confirmAction}
        onCancel={() => setIsAuthModalVisible(false)}
        okText="Confirm"
        cancelText="Cancel"
        confirmLoading={authLoading}
        footer={[
          <Button 
            key="back" 
            onClick={() => setIsAuthModalVisible(false)}
            className="hover:bg-gray-100 transition-colors duration-200"
          >
            Cancel
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={authLoading}
            onClick={confirmAction}
            className="bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            Confirm
          </Button>,
        ]}
        className="rounded-lg"
        zIndex={2000}
      >
        <p className="mb-6 text-gray-700">Please enter your admin credentials to confirm this action:</p>
        <Form form={authForm} layout="vertical">
          <Form.Item
            name="email"
            label="Admin Email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
            className="mb-4"
          >
            <Input className="hover:border-blue-400 focus:border-blue-500 transition-colors duration-200" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please input your password!' }]}
            className="mb-4"
          >
            <Input.Password className="hover:border-blue-400 focus:border-blue-500 transition-colors duration-200" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Disable Period Management Modal */}
      <Modal
        title={`Manage Disable Period - ${selectedStudent?.firstName} ${selectedStudent?.lastName}`}
        open={isDisableModalVisible}
        onOk={handleSaveDisablePeriod}
        onCancel={() => setIsDisableModalVisible(false)}
        okText="Update Disable Period"
        cancelText="Cancel"
        confirmLoading={loading}
        className="rounded-lg"
      >
        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            Current disable period for <strong>{selectedStudent?.email}</strong>
          </p>
          {selectedStudent && studentDisablePeriods[selectedStudent.email] && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Current Status:</strong> {studentDisablePeriods[selectedStudent.email].isActive ? 'Active' : 'Expired'}
              </p>
              <p className="text-sm text-yellow-800">
                <strong>Until:</strong> {studentDisablePeriods[selectedStudent.email].disableUntil.toLocaleString()}
              </p>
            </div>
          )}
        </div>
        
        <Form form={disableForm} layout="vertical">
          <Form.Item
            name="disableUntil"
            label="Disable Until"
            rules={[
              { required: true, message: 'Please select disable end date and time!' }
            ]}
          >
            <Input 
              type="datetime-local"
              className="hover:border-blue-400 focus:border-blue-500 transition-colors duration-200"
            />
          </Form.Item>
        </Form>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Modifying the disable period will immediately affect the student's ability to log in and make requests.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;