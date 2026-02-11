import { useState, useEffect } from "react";
import { X, Edit, Save, Check, Lock } from "lucide-react";
import PropTypes from "prop-types";
import { collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { ActivityLogger, ACTIVITY_TYPES } from "../../../../services/activityLogService";
import { db } from "../../../../config/firebase";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { Modal } from "antd";
import { useDisableMonitor } from "../../../../hooks/useDisableMonitor";

export default function StudentProfile({ user }) {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState({
    lrn: "",
    firstName: "",
    middleName: "",
    lastName: "",
    birthDate: "",
    email: user?.email || "",
    phoneNumber: user?.phoneNumber || "",
    currentYearLevel: "",
    strand: "",
    guardianName: "",
    guardianPhoneNumber: "",
    guardianRelationship: "",
    docId: "",
    disableDate: null
  });  
  const [originalData, setOriginalData] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Monitor for account disable status
  useDisableMonitor();

  // Sanitize name fields: keep letters, spaces, and ñ/Ñ
  const sanitizeName = (value) => {
    if (!value) return '';
    return String(value).replace(/[^A-Za-zñÑ\s]/g, '').trim();
  };

  // Normalize PH mobile numbers to +63 format
  // 09289803105 -> +639289803105
  // +639289803105 -> +639289803105
  // 9289803105 -> +639289803105
  const normalizePhonePH = (input) => {
    if (!input) return '';
    const digits = String(input).replace(/\D/g, '');
    if (digits.startsWith('63') && digits.length === 12) return `+${digits}`;
    if (digits.length === 11 && digits.startsWith('0')) return `+63${digits.slice(1)}`;
    if (digits.length === 10) return `+63${digits}`;
    if (String(input).startsWith('+63') && digits.length === 12) return `+${digits}`;
    return String(input).startsWith('+') ? `+${digits}` : digits;
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user?.email && !user?.uid) return;

    const requestsRef = collection(db, "requests");
    const listeners = [];

    const handleSnapshot = (querySnapshot) => {
      try {
        console.log('=== StudentProfile: Fetching request data for', user.email || user.uid, '===');
        if (!querySnapshot.empty) {
          const docs = querySnapshot.docs.slice().sort((a, b) => {
            const ad = a.data();
            const bd = b.data();
            const aTime = (
              ad.lastUpdated?.toMillis?.() || ad.lastUpdated?.seconds * 1000 ||
              ad.updatedAt?.toMillis?.() || ad.updatedAt?.seconds * 1000 ||
              ad.createdAt?.toMillis?.() || ad.createdAt?.seconds * 1000 || 0
            );
            const bTime = (
              bd.lastUpdated?.toMillis?.() || bd.lastUpdated?.seconds * 1000 ||
              bd.updatedAt?.toMillis?.() || bd.updatedAt?.seconds * 1000 ||
              bd.createdAt?.toMillis?.() || bd.createdAt?.seconds * 1000 || 0
            );
            return bTime - aTime;
          });
          const latestDoc = docs[0];
          const docData = latestDoc.data();
          const docId = latestDoc.id;
          console.log('Request document found:', docId);
          console.log('Full request data:', docData);

          // Convert Firestore Timestamp to JavaScript Date for disableDate
          let disableDate = null;
          if (docData.disableDate) {
            console.log('✅ disableDate field EXISTS in request document');
            console.log('Raw disableDate from Firestore:', docData.disableDate);
            if (docData.disableDate.toDate && typeof docData.disableDate.toDate === 'function') {
              disableDate = docData.disableDate.toDate();
            } else if (docData.disableDate.seconds) {
              disableDate = new Date(docData.disableDate.seconds * 1000);
            } else if (typeof docData.disableDate === 'string') {
              disableDate = new Date(docData.disableDate);
            } else if (docData.disableDate instanceof Date) {
              disableDate = docData.disableDate;
            } else {
              console.warn('⚠️ Unknown disableDate format:', docData.disableDate, typeof docData.disableDate);
            }
          } else {
            console.log('❌ No disableDate field found in request document for', user.email || user.uid);
            console.log('Request document keys:', Object.keys(docData));
          }

          const newData = {
            docId,
            lrn: docData.lrn || "",
            firstName: docData.firstName || "",
            middleName: docData.middleName || "",
            lastName: docData.lastName || "",
            birthDate: docData.birthDate || "",
            email: docData.email || user?.email || "",
            phoneNumber: docData.phoneNumber || user?.phoneNumber || "",
            currentYearLevel: docData.currentYearLevel || "",
            strand: docData.strand || "",
            guardianName: docData.guardianName || "",
            guardianPhoneNumber: docData.guardianPhoneNumber || "",
            guardianRelationship: docData.guardianRelationship || "",
            disableDate: disableDate,
            lastUpdated: docData.updatedAt || docData.lastUpdated || docData.createdAt
          };

          console.log('=== Final userData.disableDate value:', newData.disableDate, '===');
          console.log('Will display:', newData.disableDate ? 'Date with badge' : '"No disable period set"');

          setUserData(prev => {
            if (prev.lastUpdated && newData.lastUpdated > prev.lastUpdated && docData.lastUpdatedBy === 'admin') {
              Modal.success({
                title: 'Profile Updated',
                content: 'Your profile information has been updated by the admin.',
                className: 'custom-modal',
                okButtonProps: { 
                  className: 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white' 
                }
              });
            }
            return { ...prev, ...newData };
          });
          setOriginalData(newData);
        }
      } catch (err) {
        console.error("❌ Error processing user data:", err);
        setError("Failed to load user data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    // Listen by email (legacy)
    if (user?.email) {
      const byEmail = query(requestsRef, where("email", "==", user.email));
      listeners.push(onSnapshot(byEmail, handleSnapshot, (error) => {
        console.error("❌ Error setting up real-time listener (email):", error);
      }));
    }
    // Listen by uid (newer docs)
    if (user?.uid) {
      const byUid = query(requestsRef, where("userId", "==", user.uid));
      listeners.push(onSnapshot(byUid, handleSnapshot, (error) => {
        console.error("❌ Error setting up real-time listener (uid):", error);
      }));
    }

    // Cleanup subscriptions
    return () => {
      listeners.forEach(unsub => unsub && unsub());
    };
  }, [user]);

  // Real-time listener for users collection to sync admin updates into requests
  useEffect(() => {
    if (!user?.email && !user?.uid) return;

    const usersQuery = query(collection(db, "users"), where("email", "==", user.email));
    const unsubscribeUsers = onSnapshot(usersQuery, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === "modified") {
          const changed = change.doc.data();
          if (changed.lastUpdatedBy === 'admin') {
            try {
              // Find corresponding request document by uid first, fallback to email
              const requestsRef = collection(db, "requests");
              let reqQuery = null;
              if (user?.uid) {
                reqQuery = query(requestsRef, where("userId", "==", user.uid));
              } else if (user?.email) {
                reqQuery = query(requestsRef, where("email", "==", user.email));
              }
              if (!reqQuery) return;
              const requestsSnapshot = await getDocs(reqQuery);
              if (!requestsSnapshot.empty) {
                const requestDoc = requestsSnapshot.docs[0];
                await updateDoc(doc(db, "requests", requestDoc.id), {
                  firstName: changed.firstName || '',
                  lastName: changed.lastName || '',
                  middleName: changed.middleName || '',
                  lrn: changed.lrn || '',
                  currentYearLevel: changed.gradeLevel || changed.currentYearLevel || '',
                  strand: changed.strand || '',
                  phoneNumber: changed.contact || changed.phoneNumber || '',
                  guardianName: changed.guardianName || '',
                  guardianPhoneNumber: changed.guardianPhone || '',
                  guardianRelationship: changed.guardianRelationship || '',
                  updatedAt: serverTimestamp(),
                  lastUpdatedBy: 'admin',
                  lastSyncedFromUsers: serverTimestamp()
                });
              }
            } catch (error) {
              console.error("Error syncing users to requests collection:", error);
            }
          }
        }
      }
    });

    return () => unsubscribeUsers();
  }, [user]);

  const handleEditToggle = () => {
    setEditMode(!editMode);
  };

  const handleSaveUserData = async () => {
    try {
      if (!userData.docId) {
        throw new Error("Document ID not found");
      }

      const userDocRef = doc(db, "requests", userData.docId);

      // Sanitize names and normalize phone numbers
      const cleanFirstName = sanitizeName(userData.firstName);
      const cleanMiddleName = sanitizeName(userData.middleName);
      const cleanLastName = sanitizeName(userData.lastName);
      const cleanGuardianName = sanitizeName(userData.guardianName);
      const normalizedPhone = normalizePhonePH(userData.phoneNumber);
      const normalizedGuardianPhone = normalizePhonePH(userData.guardianPhoneNumber);

      // Validate LRN: digits only and exactly 12 digits
      const lrnDigits = String(userData.lrn || '').replace(/\D/g, '');
      if (lrnDigits.length !== 12) {
        setError({ type: 'error', message: 'LRN must be exactly 12 digits (numbers only).' });
        return;
      }

      if (!cleanFirstName || !cleanLastName) {
        throw new Error('First name and Last name must contain only letters and cannot be empty.');
      }

      const updateData = {
        lrn: lrnDigits,
        firstName: cleanFirstName,
        middleName: cleanMiddleName,
        lastName: cleanLastName,
        birthDate: userData.birthDate,
        phoneNumber: normalizedPhone,
        currentYearLevel: userData.currentYearLevel,
        strand: userData.strand || '',
        guardianName: cleanGuardianName,
        guardianPhoneNumber: normalizedGuardianPhone,
        guardianRelationship: userData.guardianRelationship,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: 'student'
      };

      // Update requests collection
      await updateDoc(userDocRef, updateData);

      // Also update users collection to keep both in sync
      try {
        const usersQuery = query(collection(db, "users"), where("email", "==", user.email));
        const usersSnapshot = await getDocs(usersQuery);
        
        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          await updateDoc(doc(db, "users", userDoc.id), {
            firstName: cleanFirstName,
            lastName: cleanLastName,
            middleName: cleanMiddleName,
            lrn: userData.lrn,
            gradeLevel: userData.currentYearLevel,
            strand: userData.strand || '',
            contact: normalizedPhone,
            guardianName: cleanGuardianName,
            guardianPhone: normalizedGuardianPhone,
            guardianRelationship: userData.guardianRelationship,
            updatedAt: serverTimestamp(),
            lastUpdatedBy: 'student',
            lastSyncedFromRequests: serverTimestamp()
          });
        }
      } catch (error) {
        console.error("Error updating users collection:", error);
      }

      setEditMode(false);
      setError(null);

      // Log profile update
      try {
        await ActivityLogger.profileUpdated(user?.uid || null, user?.email || null, {
          updatedFields: Object.keys(updateData),
          studentName: `${userData.firstName} ${userData.lastName}`.trim(),
          changes: updateData,
        });
      } catch (error) {
        console.error('Error logging profile update activity:', error);
      }

      // Notify user
      await addDoc(collection(db, "notifications"), {
        userId: user?.uid,
        type: "profile_update",
        message: "Your profile was updated successfully.",
        createdAt: serverTimestamp(),
        read: false,
        redirectTo: "profile",
        link: "/studentProfile"
      });
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile. Please try again.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "phoneNumber" || name === "guardianPhoneNumber") {
      // Digits only while typing (11 max). Normalization to +63 happens on save.
      const digitsOnly = value.replace(/\D/g, '').slice(0, 11);
      setUserData(prev => ({ ...prev, [name]: digitsOnly }));
    } else if (name === "firstName" || name === "middleName" || name === "lastName" || name === "guardianName") {
      // Allow only letters and spaces including ñ/Ñ while typing
      const lettersOnly = value.replace(/[^A-Za-zñÑ\s]/g, '');
      setUserData(prev => ({ ...prev, [name]: lettersOnly }));
    } else if (name === "lrn") {
      // LRN: numbers only, max 12 digits while typing
      const lrnOnly = value.replace(/\D/g, '').slice(0, 12);
      setUserData(prev => ({ ...prev, [name]: lrnOnly }));
    } else {
      setUserData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCancel = () => {
    if (editMode) {
      setUserData(prev => ({
        ...prev,
        ...originalData
      }));
      setEditMode(false);
    }
    setError(null);
  };

  const handlePasswordReset = async () => {
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, user.email);
      setError({
        type: 'success',
        message: 'Password reset email sent. Please check your inbox.'
      });
    } catch (err) {
      console.error("Error sending password reset:", err);
      setError({
        type: 'error',
        message: 'Failed to send password reset email. Please try again.'
      });
    }
  };

  const getFullName = () => {
    if (userData.firstName || userData.lastName) {
      return `${userData.firstName} ${userData.middleName ? userData.middleName + ' ' : ''}${userData.lastName}`;
    }
    return user.email;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const profileFields = [
  { label: "LRN", value: userData.lrn, name: "lrn"  },
  { label: "First Name", value: userData.firstName, name: "firstName"},
  { label: "Middle Name", value: userData.middleName, name: "middleName" },
  { label: "Last Name", value: userData.lastName, name: "lastName" },
  { label: "Birth Date", value: userData.birthDate, name: "birthDate", disabled: true },
  { 
    label: "Email", 
    value: (
      <div className="flex items-center">
        {userData.email}
        {user.emailVerified ? (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Check className="h-3 w-3 mr-1" />
            Verified
          </span>
        ) : (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-yellow-800">
            <X className="h-3 w-3 mr-1" />
            Not Verified
          </span>
        )}
        {!user.emailVerified && (
          <span className="text-xs text-gray-500 mt-1 sm:mt-0 sm:ml-4">
            To verify, please change your password and log in again. 
          </span>
        )}
      </div>
    ),
    name: "email",
    custom: true
  },
  { label: "Phone Number", value: userData.phoneNumber, name: "phoneNumber" },
  { label: "Grade Level", value: userData.currentYearLevel, name: "currentYearLevel" },
  { label: "Guardian's Name", value: userData.guardianName, name: "guardianName" },
  { label: "Guardian's Phone", value: userData.guardianPhoneNumber, name: "guardianPhoneNumber" },
  { label: "Guardian's Relationship", value: userData.guardianRelationship, name: "guardianRelationship" },
  { 
    label: "Account Disable Period", 
    value: userData.disableDate ? (
      <div className="flex items-center">
        <div className="text-red-600 font-medium">
          {(() => {
            const date = userData.disableDate;
            const now = new Date();
            const isStillActive = date > now;
            
            return (
              <div className="flex flex-col">
                <span className={isStillActive ? 'text-green-600' : 'text-red-600'}>
                  {isStillActive ? 'Active until' : 'Account disabled since'}: {date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
                <span className={`text-xs mt-1 ${isStillActive ? 'text-green-600' : 'text-red-600'}`}>
                  {isStillActive ? 'You can access your account until the date above' : 'Your account is currently disabled'}
                </span>
              </div>
            );
          })()}
        </div>
        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          (() => {
            const date = userData.disableDate;
            const now = new Date();
            const isStillActive = date > now;
            return isStillActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
          })()
        }`}>
          {(() => {
            const date = userData.disableDate;
            const now = new Date();
            const isStillActive = date > now;
            return isStillActive ? 'Active' : 'Disabled';
          })()}
        </span>
      </div>
    ) : (
      <span className="text-gray-400">No disable period set</span>
    ),
    name: "disableDate",
    custom: true,
    disabled: true
  }
];

// Show Strand if Grade 11/12 OR strand value exists (to mirror request data)
if (String(userData.currentYearLevel) === '11' || String(userData.currentYearLevel) === '12' || String(userData.strand || '').trim() !== '') {
  profileFields.splice(8, 0, { label: "Strand (for Grade 11/12)", value: userData.strand, name: "strand" });
}


  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 mx-2 sm:mx-0">

      <div className="px-4 sm:px-6 py-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-white text-blue-600 text-2xl sm:text-3xl md:text-4xl font-bold shadow-lg">
            {userData.firstName ? userData.firstName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">
              {getFullName()}
            </h2>
            <p className="text-blue-100 mt-1 text-sm sm:text-base">
              Grade {userData.currentYearLevel || "Not specified"}
            </p>
            <p className="text-blue-100 text-xs sm:text-sm mt-1">
              LRN: {userData.lrn || "Not specified"}
            </p>
          </div>
        </div>
      </div>

      
      {error && (
        <div className={`mx-2 sm:mx-4 mt-4 p-3 rounded-lg border-l-4 ${
          error.type === 'success' 
            ? 'bg-green-50 border-green-500' 
            : 'bg-yellow-50 border-yellow-500'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              {error.type === 'success' ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <X className="h-5 w-5 text-yellow-600" />
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className={`text-sm ${
                error.type === 'success' 
                  ? 'text-green-700' 
                  : 'text-yellow-700'
              }`}>
                {error.message}
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-3"
            >
              <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
            </button>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {editMode ? (
            <>
              <button
                onClick={handleSaveUserData}
                className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md text-sm sm:text-base"
              >
                <Save size={16} className="shrink-0" />
                <span>Save</span>
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors shadow-md text-sm sm:text-base"
              >
                <X size={16} className="shrink-0" />
                <span>Cancel</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEditToggle}
                className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors shadow-md text-sm sm:text-base"
              >
                <Edit size={16} className="shrink-0" />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={handlePasswordReset}
                className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md text-sm sm:text-base"
              >
                <Lock size={16} className="shrink-0" />
                <span>Change Password</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="px-2 sm:px-4 md:px-6 py-4 sm:py-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="mb-6 sm:mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 pb-2 border-b border-gray-200">
            <h3 className="text-lg sm:text-xl font-bold text-blue-800">
              Personal Information
            </h3>
            {editMode && (
              <span className="text-xs sm:text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full mt-1 sm:mt-0">
                Editing Mode
              </span>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
            {isMobile ? (
              
              <div className="divide-y divide-gray-100">
                {profileFields.map((field) => (
                  <div key={field.name} className="p-3 hover:bg-gray-50 transition-colors">
                    <div className="text-xs font-medium text-gray-700 mb-1">
                      {field.label}
                    </div>
                    <div className="text-sm text-gray-900">
                      {editMode && !field.custom ? (
                  field.disabled ? (
               <input
                 type={field.name === 'birthDate' ? 'date' : 'text'}
                 name={field.name}
                 value={field.value}
                 disabled
                 onChange={handleInputChange}
                 className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-1 px-2"
                 {...(field.name === 'lrn' ? { inputMode: 'numeric', pattern: '\\d{12}', maxLength: 12 } : {})}
               />
               ) : field.name === 'currentYearLevel' ? (
           <select
                 name={field.name}
                 value={field.value}
                 onChange={handleInputChange}
                 className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-1 px-2"
                >
                  <option value="">Select Grade</option>
                  <option value="7">Grade 7</option>
                  <option value="8">Grade 8</option>
                  <option value="9">Grade 9</option>
                  <option value="10">Grade 10</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>
                  ) : field.name === 'guardianRelationship' ? (
               <select
                 name={field.name}
                 value={field.value}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-1 px-2"
                  >
                    <option value="">Select Relationship</option>
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Cousin">Cousin</option>
                    <option value="Aunt">Aunt</option>
                    <option value="Uncle">Uncle</option>
                    <option value="Nephew">Nephew</option>
                    <option value="Grandfather">Grandfather</option>
                    <option value="Grandmother">Grandmother</option>
                    
                </select>
                   ) : (
                    <input
                     type={field.name.includes('Phone') ? 'tel' : 'text'}
                     name={field.name}
                     value={field.value}
                     onChange={handleInputChange}
                     className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-1 px-2"
                     {...(field.name === 'lrn' ? { inputMode: 'numeric', pattern: '\\d{12}', maxLength: 12 } : {})}
                    />
                  )
                   ) : field.custom ? (
                      field.value
                    ) : (
                   field.value || <span className="text-gray-400">Not provided</span>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            ) : (
             
              <table className="min-w-full divide-y divide-gray-100">
                <tbody className="divide-y divide-gray-100">
                  {profileFields.map((field) => (
                    <tr key={field.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 w-1/3 text-sm font-medium text-gray-700">
                        {field.label}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                       {editMode && !field.custom ? (
                   field.disabled ? (
                <input
                  type={field.name === 'birthDate' ? 'date' : 'text'}
                  name={field.name}
                  value={field.value}
                  disabled
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-1 px-2"
                  {...(field.name === 'lrn' ? { inputMode: 'numeric', pattern: '\\d{12}', maxLength: 12 } : {})}
              />
             ) : field.name === 'currentYearLevel' ? (
          <select
              name={field.name}
              value={field.value}
              onChange={handleInputChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-1 px-2"
                >
           <option value="">Select Grade</option>
           <option value="7">Grade 7</option>
           <option value="8">Grade 8</option>
           <option value="9">Grade 9</option>
           <option value="10">Grade 10</option>
           <option value="11">Grade 11</option>
            <option value="12">Grade 12</option>
      </select>
             ) : field.name === 'guardianRelationship' ? (
         <select
              name={field.name}
               value={field.value}
               onChange={handleInputChange}
               className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-1 px-2"
              >
             <option value="">Select Relationship</option>
             <option value="Mother">Mother</option>
             <option value="Father">Father</option>
             <option value="Guardian">Guardian</option>
             <option value="Aunt">Aunt</option>
             <option value="Uncle">Uncle</option>
             <option value="Sibling">Sibling</option>
             <option value="Other">Other</option>
          </select>
             ) : (
             <input
               type={field.name.includes('Phone') ? 'tel' : 'text'}
               name={field.name}
               value={field.value}
               onChange={handleInputChange}
               className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-1 px-2"
               {...(field.name === 'lrn' ? { inputMode: 'numeric', pattern: '\\d{12}', maxLength: 12 } : {})}
            />
           )
        ) : field.custom ? (
            field.value
             ) : (
             field.value || <span className="text-gray-400">Not provided</span>
                       )}

                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

StudentProfile.propTypes = {
  user: PropTypes.shape({
    displayName: PropTypes.string,
    phoneNumber: PropTypes.string,
    email: PropTypes.string.isRequired,
    emailVerified: PropTypes.bool,
    uid: PropTypes.string.isRequired
  }).isRequired
};