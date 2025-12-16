import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../../../config/firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import QRCode from "qrcode";
import { Upload, AlertCircle, FileUp, Check, X } from 'lucide-react';
import PrivacyAgreement from "../../../../Misc/PrivacyAgreement.jsx";
import { FiInfo } from "react-icons/fi";
import { CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET } from "../../../../config/cloudinary";
import { ActivityLogger, ACTIVITY_TYPES } from "../../../../services/activityLogService";
import { useAuth } from '../../../../Auth/useAuth';

export default function StudentRequest() {
  // Modified form data state to handle multiple documents
  const [formData, setFormData] = useState({
    // Personal Information
    lrn: "",
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    currentYearLevel: "",
    strand: "",
    role: "student",
    
    documents: [
      {
        id: 1,
        documentType: "",
        purpose: "",
        copies: 1,
        status: "pending",
        qrCode: null,
        gradeYear: ""
      }
    ],
    preferredDate: "",
    preferredTime: "",
  });

  const [currentTab, setCurrentTab] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [showPrivacyAgreement, setShowPrivacyAgreement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isNextButtonLoading, setIsNextButtonLoading] = useState(false);

  const auth = getAuth();
  const { user } = useAuth();

  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        const user = auth.currentUser;
        
        if (!user) {
          setLoading(false);
          return;
        }
        
        setUserLoggedIn(true);
        
        
        const userDocRef = doc(db, "users", user.uid);
        let userSnapshot = await getDoc(userDocRef);
        
       
        if (!userSnapshot.exists() && user.email) {
          const usersRef = collection(db, "users");
          const emailQuery = query(usersRef, where("email", "==", user.email));
          const querySnapshot = await getDocs(emailQuery);
          
          if (!querySnapshot.empty) {
            userSnapshot = querySnapshot.docs[0];
          }
        }
        
        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();
          
        
          setFormData(prevData => ({
            ...prevData,
            lrn: userData.lrn || "",
            firstName: userData.firstName || "",
            middleName: userData.middleName || "",
            lastName: userData.lastName || "",
            birthDate: userData.birthDate || "",
            email: userData.email || user.email || "",
          phoneNumber: userData.phoneNumber || "",
          currentYearLevel: userData.currentYearLevel || userData.yearLevel || "",
          strand: userData.strand || "",

          preferredDate: prevData.preferredDate,
          preferredTime: prevData.preferredTime
        }));

         
        const personalFields = document.querySelectorAll('.personal-info-field');
        personalFields.forEach(field => {
          field.setAttribute('disabled', 'true');
        });
        }

        // If strand or grade are still empty, try to prefill from the latest request document
        // This mirrors StudentProfile logic and improves consistency for new/old accounts
        const needStrand = !String((prev => prev)(formData).strand || '').trim();
        const needGrade = !String((prev => prev)(formData).currentYearLevel || '').trim();
        if (needStrand || needGrade) {
          try {
            const requestsRef = collection(db, "requests");
            const queries = [];
            if (user?.uid) queries.push(query(requestsRef, where("userId", "==", user.uid)));
            if (user?.email) queries.push(query(requestsRef, where("email", "==", user.email)));

            let allDocs = [];
            for (const q of queries) {
              const snap = await getDocs(q);
              allDocs = allDocs.concat(snap.docs);
            }

            if (allDocs.length > 0) {
              const latest = allDocs
                .slice()
                .sort((a, b) => {
                  const ad = a.data();
                  const bd = b.data();
                  const aT = (
                    ad.lastUpdated?.toMillis?.() || ad.lastUpdated?.seconds * 1000 ||
                    ad.updatedAt?.toMillis?.() || ad.updatedAt?.seconds * 1000 ||
                    ad.createdAt?.toMillis?.() || ad.createdAt?.seconds * 1000 || 0
                  );
                  const bT = (
                    bd.lastUpdated?.toMillis?.() || bd.lastUpdated?.seconds * 1000 ||
                    bd.updatedAt?.toMillis?.() || bd.updatedAt?.seconds * 1000 ||
                    bd.createdAt?.toMillis?.() || bd.createdAt?.seconds * 1000 || 0
                  );
                  return bT - aT;
                })[0].data();

              setFormData(prev => ({
                ...prev,
                currentYearLevel: prev.currentYearLevel || latest.currentYearLevel || "",
                strand: prev.strand || latest.strand || "",
              }));
            }
          } catch (e) {
            console.error("Error prefilling from latest request:", e);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        alert("Failed to load user data. Some features may be limited.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [auth]);

  
  const getEasterSunday = (year) => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  };

 
  const getPhilippineHolidays = (year) => {
    const holidays = [
      // Fixed Date Holidays
      `${year}-01-01`, // New Year's Day
      `${year}-04-09`, // Day of Valor
      `${year}-05-01`, // Labor Day
      `${year}-06-12`, // Independence Day
      `${year}-08-26`, // National Heroes Day
      `${year}-11-30`, // Bonifacio Day
      `${year}-12-25`, // Christmas Day
      `${year}-12-30`, // Rizal Day
      `${year}-12-31`, // New Year's Eve
    ];

   
    const chineseNewYear = [
      '2024-02-10', '2025-01-29', '2026-02-17', '2027-02-06', '2028-01-26',
      '2029-02-13', '2030-02-03', '2031-01-23', '2032-02-11', '2033-01-31'
    ];
    const cny = chineseNewYear.find(date => date.startsWith(year.toString()));
    if (cny) holidays.push(cny);

    holidays.push(`${year}-02-25`);

    const easterSunday = getEasterSunday(year);
    const maundyThursday = new Date(easterSunday);
    maundyThursday.setDate(easterSunday.getDate() - 3);
    const goodFriday = new Date(easterSunday);
    goodFriday.setDate(easterSunday.getDate() - 2);
    const blackSaturday = new Date(easterSunday);
    blackSaturday.setDate(easterSunday.getDate() - 1);

    holidays.push(
      maundyThursday.toISOString().split('T')[0],
      goodFriday.toISOString().split('T')[0],
      blackSaturday.toISOString().split('T')[0],
      easterSunday.toISOString().split('T')[0]
    );

    return holidays;
  };

  const currentYear = new Date().getFullYear();
  const philippineHolidays = getPhilippineHolidays(currentYear);

  const isWeekend = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
  };

  const isHoliday = (dateString) => {
    return philippineHolidays.includes(dateString);
  };

  const isDateDisabled = (dateString) => {
    return isWeekend(dateString) || isHoliday(dateString);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'preferredDate') {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        alert("Past dates are not allowed.");
        e.target.value = "";
        setFormData(prev => ({
          ...prev,
          [name]: ""
        }));
        return;
      }

      if (isWeekend(value)) {
        alert("Weekends are not allowed. Please choose a weekday.");
        e.target.value = "";
        setFormData(prev => ({
          ...prev,
          [name]: ""
        }));
        return;
      }

      if (isHoliday(value)) {
        alert("This date is a holiday. Please choose a different date.");
        e.target.value = "";
        setFormData(prev => ({
          ...prev,
          [name]: ""
        }));
        return;
      }
    }

    if (userLoggedIn && ['preferredDate', 'preferredTime'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else if (!userLoggedIn) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const getMinDate = () => {
    let date = new Date();
    date.setDate(date.getDate() + 1); // Start from tomorrow
    
    while (isDateDisabled(date.toISOString().split('T')[0])) {
      date.setDate(date.getDate() + 1);
    }
    
    return date.toISOString().split('T')[0];
  };

  
  const handlePrivacyCheckbox = () => {
    setPrivacyChecked(!privacyChecked);
  };

  const areAllFieldsFilled = () => {
    if (currentTab === 1 && !userLoggedIn) {
      const requiredFields = [
        "firstName", "lastName", "email", "phoneNumber", "currentYearLevel"
      ];
      
      for (let field of requiredFields) {
        if (!formData[field].trim()) {
          return false;
        }
      }
      // If Grade 11 or 12, require strand
      if ((formData.currentYearLevel === '11' || formData.currentYearLevel === '12') && !String(formData.strand || '').trim()) {
        return false;
      }
      return true;
    }
    
    const currentForm = document.querySelector(".form-tab.active");
    if (!currentForm) return false;
    
    const requiredFields = currentForm.querySelectorAll("[required]"); 
    for (let field of requiredFields) {
      if (!field.value.trim()) {
        return false;
      }
    }
    return true;
  };

  const addDocument = () => {
    setFormData({
      ...formData,
      documents: [
        ...formData.documents,
        {
          id: formData.documents.length + 1,
          documentType: "",
          purpose: "",
          copies: 1,
          status: "pending",
          qrCode: null,
          gradeYear: ""
        }
      ]
    });
  };

  const removeDocument = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    if (formData.documents.length > 1) {
      const updatedDocuments = formData.documents.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        documents: updatedDocuments
      });
    }
  };

  const handleDocumentChange = (index, field, value) => {
    const updatedDocuments = formData.documents.map((doc, i) => {
      if (i === index) {
        if (field === 'documentType' && value !== 'Copy of Grades') {
          return { ...doc, [field]: value, gradeYear: '' };
        }
        return { ...doc, [field]: value };
      }
      return doc;
    });
    setFormData({ ...formData, documents: updatedDocuments });
  };

  const getAvailableDocuments = (currentIndex) => {
    const selectedDocuments = formData.documents.map((doc, index) => 
      index !== currentIndex ? doc.documentType : null
    ).filter(type => type);

    return documentOptions.filter(option => 
      !selectedDocuments.includes(option.value)
    );
  };

  const hasAvailableDocuments = () => {
    const selectedDocuments = formData.documents.map(doc => doc.documentType).filter(Boolean);
    return documentOptions.some(option => !selectedDocuments.includes(option.value));
  };

  const isWeekday = (date) => {
    const day = new Date(date).getDay();
    return day !== 0 && day !== 6;
  };

  const saveToFirebase = async () => {
    try {
      setIsSubmitting(true);

      // Upload images to Cloudinary and get URLs
      const uploadedImageUrls = [];
      for (const img of images) {
        if (img.imageFile) {
          const url = await uploadImageToCloudinary(img.imageFile);
          uploadedImageUrls.push(url);
        }
      }

      const documentsWithQR = await Promise.all(
        formData.documents.map(async (doc) => {
          const qrData = {
            student: {
              name: `${formData.lastName}, ${formData.firstName} ${formData.middleName || ''}`.trim(),
              lrn: formData.lrn,
              currentYearLevel: formData.currentYearLevel,
              strand: formData.strand || "",
              email: formData.email,
              phoneNumber: formData.phoneNumber
            },
            document: {
              type: doc.documentType,
              purpose: doc.purpose,
              copies: doc.copies,
              gradeYear: doc.gradeYear
            },
            request: {
              dateRequested: new Date().toISOString(),
              preferredDate: formData.preferredDate,
              preferredTime: formData.preferredTime,
              status: "pending",
              requestId: `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }
          };

          try {
            const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData));
            return {
              ...doc,
              qrCode: qrCodeUrl,
              qrCodeData: qrData 
            };
          } catch (err) {
            console.error("Error generating QR code:", err);
            return {
              ...doc,
              qrCode: null,
              qrCodeData: null
            };
          }
        })
      );

      const user = auth.currentUser;
      const disableTriggerDocs = ["Form 137 (SF10)", "Form 138"];
      const hasDisableTrigger = userLoggedIn && formData.documents.some(doc => 
        disableTriggerDocs.includes(doc.documentType)
      );
      let disablePeriodTimestamp = null;
      if (hasDisableTrigger) {
        const disablePeriod = new Date();
        disablePeriod.setMonth(disablePeriod.getMonth() + 3);
        disablePeriodTimestamp = Timestamp.fromDate(disablePeriod);
      }
      
      const dataToSave = {
        ...formData,
        documents: documentsWithQR,
        userId: user?.uid || "anonymous",
        userEmail: user?.email || formData.email,
        createdAt: serverTimestamp(),
        status: "pending",
        lastUpdated: serverTimestamp(),
        requestId: `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        imageUrls: uploadedImageUrls,
      };

      if (disablePeriodTimestamp) {
        dataToSave.disableDate = disablePeriodTimestamp;
        dataToSave.activePeriodSetBy = 'student_request_form';
        dataToSave.activePeriodSetAt = serverTimestamp();
        dataToSave.activeReason = 'Automatic 3-month active period set on student request for Form 137/138';
      }
      
      const docRef = await addDoc(collection(db, "requests"), dataToSave);
      console.log("Document request saved with ID: ", docRef.id);

      // --- Add notification for another request ---
      await addDoc(collection(db, "notifications"), {
        userId: user?.uid || "anonymous",
        type: "document_request",
        message: "Your another request was sent to Registrar.",
        createdAt: serverTimestamp(),
        read: false,
        redirectTo: "history"
      });

      // Log request submission activity
      try {
        await ActivityLogger.requestSubmitted(user?.uid || "anonymous", user?.email || formData.email, {
          requestId: docRef.id,
          documentCount: formData.documents.length,
          documents: formData.documents.map(d => ({ type: d.documentType, copies: d.copies })),
          studentName: `${formData.firstName} ${formData.lastName}`.trim(),
          totalCopies: formData.documents.reduce((sum, doc) => sum + (doc.copies || 1), 0),
        });
      } catch (error) {
        console.error('Error logging request activity:', error);
      }
      
      return true;
    } catch (error) {
      console.error("Error saving to Firebase:", error);
      alert("Failed to submit your request. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!privacyChecked) {
      alert("Please agree to the Privacy Agreement before submitting.");
      return;
    }
    
    const saved = await saveToFirebase();
    if (saved) {
      setIsSubmitted(true);
    }
  };

  const closeSuccessModal = () => {
    setIsSubmitted(false);
    setFormData({
      ...formData,
      documents: [
        {
          id: 1,
          documentType: "",
          purpose: "",
          copies: 1,
          status: "pending",
          qrCode: null,
          gradeYear: ""
        }
      ],
      preferredDate: "",
      preferredTime: ""
    });
    setCurrentTab(1);
  };

  const handleNextTab = () => {
    if (isNextButtonLoading) return; // Prevent multiple clicks
    
    // Set loading state
    setIsNextButtonLoading(true);
    
    // Clear any previous photo errors
    setPhotoError("");
    
    // Check if at least one photo is uploaded when moving from tab 2 (document selection) to tab 3 (scheduling)
    if (currentTab === 2) {
      const hasPhoto = images.some(image => image.imageFile !== null);
      if (!hasPhoto) {
        setPhotoError("Please upload a photo before proceeding to the next step.");
        setShowPhotoModal(true);
        setIsNextButtonLoading(false);
        return;
      }
    }
    
    if (areAllFieldsFilled()) {
      // Use setTimeout to ensure the loading state is visible and prevent double clicks
      setTimeout(() => {
        setCurrentTab((prevTab) => {
          setIsNextButtonLoading(false);
          return prevTab + 1;
        });
      }, 300);
    } else {
      alert("Please fill in all required fields before proceeding.");
      setIsNextButtonLoading(false);
    }
  };

  const handlePrevTab = () => {
    setCurrentTab((prevTab) => prevTab - 1);
  };

  const pageVariants = {
    initial: { opacity: 0, x: 100 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -100 }
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.5
  };

  const documentOptions = [
    { value: "Form 137 (SF10)", label: "Form 137 (SF10)" },
    { value: "Certificate of Good Moral Character", label: "Certificate of Good Moral Character" },
    { value: "Certificate of Enrollment", label: "Certificate of Enrollment" },
    { value: "Certificate of Completion (Grade 10)", label: "Certificate of Completion (Grade 10)" },
    { value: "Letter of Recommendation", label: "Letter of Recommendation" },
    { value: "Certificate of Graduation (Grade 12)", label: "Certificate of Graduation (Grade 12)" },
    { value: "Diploma (Grade 12)", label: "Diploma (Grade 12)" },
    { value: "Lost ID", label: "Lost ID" }
  ];
 const [images, setImages] = useState([
    { imageFile: null, filePreview: null, fileError: null }
  ]);

  const handleFileUpload = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      const updatedImages = [...images];
      updatedImages[index] = {
        ...updatedImages[index],
        fileError: 'Please upload only JPG or PNG images.'
      };
      setImages(updatedImages);
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      const updatedImages = [...images];
      updatedImages[index] = {
        ...updatedImages[index],
        fileError: 'File size exceeds 5MB limit.'
      };
      setImages(updatedImages);
      return;
    }

    const filePreview = URL.createObjectURL(file);

    const updatedImages = [...images];
    updatedImages[index] = {
      imageFile: file,
      filePreview,
      fileError: null
    };
    
    if (index === images.length - 1) {
      updatedImages.push({ imageFile: null, filePreview: null, fileError: null });
    }
    
    setImages(updatedImages);
  };

  const removeFile = (index) => {
    const updatedImages = [...images];
    
    if (updatedImages[index].filePreview) {
      URL.revokeObjectURL(updatedImages[index].filePreview);
    }
    
    updatedImages[index] = {
      imageFile: null,
      filePreview: null,
      fileError: null
    };
    
    if (index !== images.length - 1 && images.length > 1 && !images[images.length - 1].imageFile) {
      updatedImages.splice(index, 1);
    }
    
    setImages(updatedImages);
  }; 

  const uploadImageToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Image upload failed");
    const data = await response.json();
    return data.secure_url;
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden p-6 text-center">
        <div className="animate-pulse flex flex-col items-center justify-center py-12">
          <div className="h-12 w-12 rounded-full bg-blue-100 mb-4"></div>
          <div className="h-4 bg-blue-100 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-blue-100 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-w-screen">
      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">📸 Photo Upload Required</h3>
              <p className="text-sm text-gray-600 mb-6">
                Please upload at least one photo to continue with your request. This is required for document verification purposes.
              </p>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="w-full px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 font-medium"
              >
                Got it, I'll upload a photo
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isSubmitted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl p-8 max-w-md w-full text-center shadow-xl"
          >
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="text-emerald-600 text-3xl">✓</div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Request Submitted</h2>
            <p className="text-gray-600 mb-6">Your document request has been successfully submitted.</p>
            <button 
              onClick={closeSuccessModal}
              className="px-6 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors shadow-md"
            >
              Request Another Document
            </button>
          </motion.div>
        </div>
      )}

           {showPrivacyAgreement && (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
               <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl">
                 <div className="flex justify-between items-center mb-4"></div>
     
                 <PrivacyAgreement
                   isOverlay={true}
                   onClose={() => setShowPrivacyAgreement(false)}
                 />
               </div>
             </div>
           )}
           
      <div className="max-w-screen mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 p-8">
          <div className="flex justify-center mb-6">
            <img 
              src="logo natin.png" 
              alt="Logo" 
              className="h-24 w-auto drop-shadow-md"
            />
          </div>
          <h1 className="text-2xl font-bold text-white text-center">Document Request Form</h1>
          {!userLoggedIn && (
            <p className="text-blue-100 mt-2">
              You are using this form as a guest. For a better experience, please log in.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          <div className="flex justify-between mb-8">
            {[1, 2, 3].map((tab) => (
              <div key={tab} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentTab === tab
                    ? 'bg-blue-700 text-white shadow-md'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab}
                </div>
                <span className={`text-sm mt-2 ${
                  currentTab === tab 
                    ? 'text-blue-700 font-medium'
                    : 'text-gray-500'
                }`}>
                  {tab === 1 ? 'Personal' : tab === 2 ? 'Document Details' : 'Review'}
                </span>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {currentTab === 1 && (
              <motion.div 
                key="personal"
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="space-y-6 form-tab active"
              >
                <h2 className="text-xl font-semibold border-b pb-2 text-blue-800 border-blue-100">
                  Personal Information
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Learner Reference Number (LRN)
                    </label>
                    <input
                      name="lrn"
                      value={formData.lrn}
                      onChange={userLoggedIn ? undefined : handleChange}
                      maxLength="12"
                      pattern="[0-9]{12}"
                      placeholder="Enter your 12-digit LRN"
                      className={`personal-info-field w-full px-4 py-2 border border-gray-300 rounded-lg ${
                        userLoggedIn ? "bg-gray-50 cursor-not-allowed" : "bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      }`}
                      disabled={userLoggedIn}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Please enter your 12-digit Learner Reference Number
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name{!userLoggedIn && "*"}
                      </label>
                      <input
                        name="lastName"
                        value={formData.lastName}
                        onChange={userLoggedIn ? undefined : handleChange}
                        required={!userLoggedIn}
                        className={`personal-info-field w-full px-4 py-2 border border-gray-300 rounded-lg ${
                          userLoggedIn ? "bg-gray-50 cursor-not-allowed" : "bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        }`}
                        disabled={userLoggedIn}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name{!userLoggedIn && "*"}
                      </label>
                      <input
                        name="firstName"
                        value={formData.firstName}
                        onChange={userLoggedIn ? undefined : handleChange}
                        required={!userLoggedIn}
                        className={`personal-info-field w-full px-4 py-2 border border-gray-300 rounded-lg ${
                          userLoggedIn ? "bg-gray-50 cursor-not-allowed" : "bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        }`}
                        disabled={userLoggedIn}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Middle Name
                      </label>
                      <input
                        name="middleName"
                        value={formData.middleName}
                        onChange={userLoggedIn ? undefined : handleChange}
                        className={`personal-info-field w-full px-4 py-2 border border-gray-300 rounded-lg ${
                          userLoggedIn ? "bg-gray-50 cursor-not-allowed" : "bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        }`}
                        disabled={userLoggedIn}
                      />
                    </div>
                  </div>

                  {/* Current Year Level with updated styling */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Grade Level{!userLoggedIn && "*"}
                    </label>
                    <select
                      name="currentYearLevel"
                      value={formData.currentYearLevel}
                      onChange={userLoggedIn ? undefined : handleChange}
                      required={!userLoggedIn}
                      className={`personal-info-field w-full px-4 py-2 border border-gray-300 rounded-lg ${
                        userLoggedIn ? "bg-gray-50 cursor-not-allowed" : "bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      }`}
                      disabled={userLoggedIn}
                    >
                      <option value="">Select grade level</option>
                      <option value="7">Grade 7</option>
                      <option value="8">Grade 8</option>
                      <option value="9">Grade 9</option>
                      <option value="10">Grade 10</option>
                      <option value="11">Grade 11</option>
                      <option value="12">Grade 12</option>
                    </select>
                    {(formData.currentYearLevel === '11' || formData.currentYearLevel === '12') && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Senior High Strand{!userLoggedIn && "*"}
                      </label>
                      <select
                        name="strand"
                        value={formData.strand}
                        onChange={userLoggedIn ? undefined : handleChange}
                        required={!userLoggedIn}
                        className={`personal-info-field w-full px-4 py-2 border border-gray-300 rounded-lg ${
                          userLoggedIn ? "bg-gray-50 cursor-not-allowed" : "bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        }`}
                        disabled={userLoggedIn}
                      >
                        <option value="">Select strand</option>
                        <option value="GAS">GAS</option>
                        <option value="ABM">ABM</option>
                      </select>
                    </div>
                  )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email{!userLoggedIn && "*"}
                      </label>
                      <input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={userLoggedIn ? undefined : handleChange}
                        required={!userLoggedIn}
                        className={`personal-info-field w-full px-4 py-2 border border-gray-300 rounded-lg ${
                          userLoggedIn ? "bg-gray-50 cursor-not-allowed" : "bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        }`}
                        disabled={userLoggedIn}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number{!userLoggedIn && "*"}
                      </label>
                      <input
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={userLoggedIn ? undefined : handleChange}
                        required={!userLoggedIn}
                        className={`personal-info-field w-full px-4 py-2 border border-gray-300 rounded-lg ${
                          userLoggedIn ? "bg-gray-50 cursor-not-allowed" : "bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        }`}
                        disabled={userLoggedIn}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={handleNextTab}
                    disabled={isNextButtonLoading}
                    className={`px-6 py-2 text-white rounded-lg transition-colors shadow-md ${
                      isNextButtonLoading 
                        ? 'bg-blue-500 cursor-not-allowed' 
                        : 'bg-blue-700 hover:bg-blue-800'
                    }`}
                  >
                    {isNextButtonLoading ? 'Processing...' : 'Next'}
                  </button>
                </div>
              </motion.div>
            )}

            {currentTab === 2 && (
              <motion.div
                key="document"
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="space-y-6 form-tab active"
              >
                <h2 className="text-xl font-semibold border-b pb-2 text-blue-800 border-blue-100">
                  Document Requests
                </h2>

                {formData.documents.map((doc, index) => (
                  <div key={doc.id} className="bg-gray-50 rounded-lg p-6 relative">
                    {formData.documents.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => removeDocument(e, index)}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-red-500 transition-colors"
                        aria-label="Remove document"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Document Type*
                        </label>
                        <select
                          value={doc.documentType}
                          onChange={(e) => handleDocumentChange(index, "documentType", e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        >
                          <option value="">Select document type</option>
                          {getAvailableDocuments(index).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Purpose*
                        </label>
                        <select
                          value={doc.purpose}
                          onChange={(e) => handleDocumentChange(index, "purpose", e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        >
                          <option value="">Select purpose</option>
                          <option value="Scholarship Application">Scholarship Application</option>
                          <option value="Financial Assistance">Financial Assistance / Subsidy Application</option>
                          <option value="Personal Record">For Personal Copy / File</option>
                          <option value="Other">Other (Please Specify)</option>
                        </select>
                        {doc.purpose === "Scholarship Application" && (
                          <p className="flex items-start text-sm text-gray-500 mt-2">
                            <FiInfo className="text-blue-500 mr-2 mt-0.5 w-5 h-5" />
                            Note: Submit a copy of the scholarship application form or sponsor&apos;s endorsement letter.
                          </p>
                        )}
                        {doc.purpose === "Enrollment or Transfer" && (
                          <p className="flex items-start text-sm text-gray-500 mt-2">
                            <FiInfo className="text-blue-500 mr-2 mt-0.5 w-5 h-5" />
                            Note: Provide an endorsement letter or admission slip from the receiving school.
                          </p>
                        )}
                        {doc.purpose === "Academic Requirement" && (
                          <p className="flex items-start text-sm text-gray-500 mt-2">
                            <FiInfo className="text-blue-500 mr-2 mt-0.5 w-5 h-5" />
                            Note: Present a letter from your teacher or a subject requirement checklist.
                          </p>
                        )}
                        {doc.purpose === "School Competition or Event" && (
                          <p className="flex items-start text-sm text-gray-500 mt-2">
                            <FiInfo className="text-blue-500 mr-2 mt-0.5 w-5 h-5" />
                            Note: Submit an invitation or official communication from the organizing body.
                          </p>
                        )}
                        {doc.purpose === "Parent/Guardian Request" && (
                          <p className="flex items-start text-sm text-gray-500 mt-2">
                            <FiInfo className="text-blue-500 mr-2 mt-0.5 w-5 h-5" />
                            Note: Present a signed request letter from the parent or guardian with valid ID.
                          </p>
                        )}
                        {doc.purpose === "Financial Assistance" && (
                          <p className="flex items-start text-sm text-gray-500 mt-2">
                            <FiInfo className="text-blue-500 mr-2 mt-0.5 w-5 h-5" />
                            Note: Provide proof of financial assistance application or referral from a guidance counselor.
                          </p>
                        )}
                        {doc.purpose === "Lost Document Replacement" && (
                          <p className="flex items-start text-sm text-gray-500 mt-2">
                            <FiInfo className="text-blue-500 mr-2 mt-0.5 w-5 h-5" />
                            Note: Submit an affidavit of loss and valid ID.
                          </p>
                        )}
                        {doc.purpose === "Personal Record" && (
                          <p className="flex items-start text-sm text-gray-500 mt-2">
                            <FiInfo className="text-blue-500 mr-2 mt-0.5 w-5 h-5" />
                            Note: Bring a valid student ID or any school-issued document for verification.
                          </p>
                        )}
                        {doc.purpose === "Other" && (
                          <div className="mt-2">
                            <label className="flex items-start text-sm text-gray-700 mb-1">
                              <FiInfo className="text-blue-500 mr-2 mt-0.5 w-5 h-5" />
                              Please specify your purpose and bring any supporting documents related to your request.
                            </label>
                            <textarea
                              value={doc.otherDescription || ""}
                              onChange={e => {
                                const input = e.target.value;
                                const words = input.split(/\s+/).filter(Boolean);
                                let error = "";
                                if (words.length > 20) {
                                  error = "Maximum of 20 words only.";
                                }
                                // Save error and value in document object
                                handleDocumentChange(index, "otherDescriptionError", error);
                                // Only allow up to 50 words in the textarea
                                if (words.length <= 50) {
                                  handleDocumentChange(index, "otherDescription", input);
                                } else {
                                  // If user tries to type more, keep only the first 50 words
                                  handleDocumentChange(index, "otherDescription", words.slice(0, 50).join(" "));
                                }
                              }}
                              className={`mt-1 w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-600 min-h-[140px] resize-vertical text-base ${
                                doc.otherDescriptionError ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-blue-600"
                              }`}
                              placeholder="Describe your purpose (max 20 words)"
                              required
                              maxLength={1000}
                            />
                            <div className="text-xs text-gray-500 mt-1 text-right">
                              {doc.otherDescription ? doc.otherDescription.trim().split(/\s+/).filter(Boolean).length : 0}/20 words
                            </div>
                            {doc.otherDescriptionError && (
                              <div className="text-xs text-red-600 mt-1">{doc.otherDescriptionError}</div>
                            )}
                          </div>
                        )}
                      </div>

                      

                      {doc.documentType === "Copy of Grades" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Grade Level for Copy of Grades*
                          </label>
                          <select
                            value={doc.gradeYear}
                            onChange={(e) => handleDocumentChange(index, "gradeYear", e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          >
                            <option value="">Select grade level</option>
                            <option value="Grade 7">Grade 7</option>
                            <option value="Grade 8">Grade 8</option>
                            <option value="Grade 9">Grade 9</option>
                            <option value="Grade 10">Grade 10</option>
                            <option value="Grade 11">Grade 11</option>
                            <option value="Grade 12">Grade 12</option>
                          </select>
                        </div>
                      )}

                      <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Number of Copies</label>
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleDocumentChange(
                              index,
                              "copies",
                              Math.max(
                                1,
                                doc.copies - 1
                              )
                            )
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-black-600 hover:bg-gray-50"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={
                            [
                              "Certificate of Graduation (Grade 12)",
                              "Certificate of Completion (Grade 10)",
                              "Lost ID",
                              "Form 137 (SF10)",
                              "Diploma (Grade 12)"
                            ].includes(doc.documentType)
                              ? 1
                              : 5
                          }
                          value={doc.copies}
                          onChange={(e) =>
                            handleDocumentChange(
                              index,
                              "copies",
                              Math.min(
                                [
                                  "Certificate of Graduation (Grade 12)",
                                  "Certificate of Completion (Grade 10)",
                                  "Lost ID",
                                  "Form 137 (SF10)",
                                  "Diploma (Grade 12)"
                                ].includes(doc.documentType)
                                  ? 1
                                  : 5,
                                Math.max(1, parseInt(e.target.value) || 1)
                              )
                            )
                          }
                          className="w-16 text-center px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-800 focus:border-green-800"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleDocumentChange(
                              index,
                              "copies",
                              Math.min(
                                [
                                  "Certificate of Graduation (Grade 12)",
                                  "Certificate of Completion (Grade 10)",
                                  "Lost ID",
                                  "Form 137 (SF10)",
                                  "Diploma (Grade 12)"
                                ].includes(doc.documentType)
                                  ? 1
                                  : 5,
                                doc.copies + 1
                              )
                            )
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                        >
                          +
                        </button>
                        <span className="text-sm text-gray-500">
                          (Max: {
                            [
                              "Certificate of Graduation (Grade 12)",
                              "Certificate of Completion (Grade 10)",
                              "Lost ID",
                              "Form 137 (SF10)",
                              "Diploma (Grade 12)"
                            ].includes(doc.documentType)
                              ? 1
                              : 5
                          })
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 italic">
                        {[
                          "Certificate of Graduation (Grade 12)",
                          "Certificate of Completion (Grade 10)",
                          "Lost ID",
                          "Form 137 (SF10)",
                          "Diploma (Grade 12)"
                        ].includes(doc.documentType)
                          ? "Note: Only 1 copy is allowed per request for this document."
                          : "Note: A maximum of 5 copies per request is allowed for this document type."
                        }
                      </p>
                    </div>
                        </div>
                      </div>
                    ))}
      <div className="mb-6">
        {images.map((image, index) => (
          <div key={index} className="mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Image 
                <span className="ml-1 text-gray-500 text-xs">(JPG, PNG only, max 5MB)</span>
              </label>

              {!image.imageFile ? (
                <div className="mt-1 relative">
                  <label 
                    className="flex flex-col items-center justify-center w-full h-32 px-4 py-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-800 focus:border-transparent transition-all duration-200"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="mb-1 text-sm text-gray-500 text-center">
                        <span className="font-medium">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        Upload an image
                      </p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => handleFileUpload(index, e)}
                      accept=".jpg,.jpeg,.png"
                    />
                  </label>
                  
                  {image.fileError && (
                    <div className="mt-2 flex items-start text-red-500">
                      <AlertCircle className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                      <p className="text-xs">{image.fileError}</p>
                    </div>
                  )}
                  {photoError && (
                    <motion.div
                      className="bg-red-50 border border-red-200 rounded-lg p-4 mt-2"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                          <svg
                            className="h-5 w-5 text-red-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            📸 Photo Upload Required
                          </h3>
                          <div className="mt-1 text-sm text-red-700">
                            <p>
                              Please upload a photo before proceeding to the next step.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="mt-1 relative">
                  <div className="flex items-start p-4 border border-gray-300 rounded-lg bg-white">
                    <div className="flex-shrink-0 mr-3">
                      {image.filePreview ? (
                        <div className="w-16 h-16 border border-gray-200 rounded-md overflow-hidden">
                          <img 
                            src={image.filePreview} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center">
                          <FileUp className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {image.imageFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(image.imageFile.size / 1024).toFixed(1)} KB • {image.imageFile.type.split('/')[1].toUpperCase()}
                      </p>
                      <div className="mt-1 flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-xs text-green-600">Image uploaded successfully</span>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <p className="text-xs font-semibold text-amber-600 mt-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>Reminder: Upload a supporting document or any valid ID for verification.</span>
        </p>
      </div>

                <button
                  type="button"
                  onClick={addDocument}
                  disabled={!hasAvailableDocuments()}
                  className={`mt-4 w-full py-2 px-4 border-2 rounded-lg flex items-center justify-center transition-colors ${
                    hasAvailableDocuments()
                      ? "border-blue-600 text-blue-600 hover:bg-blue-50"
                      : "border-gray-300 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  {hasAvailableDocuments() ? "Add Another Document" : "All document types selected"}
                </button>

                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    Schedule Pickup
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preferred Pickup Date*
                      </label>
                      <input
                        type="date"
                        name="preferredDate"
                        value={formData.preferredDate}
                        onChange={handleChange}
                        min={getMinDate()}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Select a weekday (Monday-Friday). Weekends and holidays are not available.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preferred Pickup Time*
                      </label>
                      <select
                        name="preferredTime"
                        value={formData.preferredTime}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      >
                        <option value="">Select time slot</option>
                        <option value="09:00-10:00">9:00 AM - 10:00 AM</option>
                        <option value="10:00-11:00">10:00 AM - 11:00 AM</option>
                        <option value="11:00-12:00">11:00 AM - 12:00 PM</option>
                        <option value="13:00-14:00">1:00 PM - 2:00 PM</option>
                        <option value="14:00-15:00">2:00 PM - 3:00 PM</option>
                        <option value="15:00-16:00">3:00 PM - 4:00 PM</option>
                      </select>
                      <p className="mt-1 text-sm text-gray-500">
                        Office hours: 6:00 AM - 3:00 PM
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={handlePrevTab}
                    className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={handleNextTab}
                    disabled={isNextButtonLoading}
                    className={`px-6 py-2 text-white rounded-lg transition-colors shadow-md ${
                      isNextButtonLoading 
                        ? 'bg-blue-500 cursor-not-allowed' 
                        : 'bg-blue-700 hover:bg-blue-800'
                    }`}
                  >
                    {isNextButtonLoading ? 'Processing...' : 'Next'}
                  </button>
                </div>
              </motion.div>
            )}

            {currentTab === 3 && (
              <motion.div
                key="review"
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="space-y-6 form-tab active"
              >
                <h2 className="text-xl font-semibold border-b pb-2 text-blue-800 border-blue-100">
                  Review Request
                </h2>
                
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Request Summary</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Student Information</h4>
                        <p className="text-gray-900">
                          {formData.firstName} {formData.middleName} {formData.lastName}
                        </p>
                        <p className="text-gray-600 text-sm">LRN: {formData.lrn}</p>
                        <p className="text-gray-600 text-sm">Grade/Year: {formData.currentYearLevel}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Pickup Schedule</h4>
                        <p className="text-gray-900">
                          {formData.preferredDate ? new Date(formData.preferredDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : ''}
                        </p>
                        <p className="text-gray-600 text-sm">Time: {formData.preferredTime}</p>
                      </div>
                    </div>
                  </div>

                  {formData.documents.map((doc, index) => (
                    <div key={index} className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-500">Document {index + 1}</h4>
                      <p className="text-gray-700 mt-1">Type: {doc.documentType}</p>
                      <p className="text-gray-700 mt-1">Purpose: {doc.purpose}</p>
                      <p className="text-gray-700 mt-1">Copies: {doc.copies}</p>
                      <p className="text-gray-700 mt-1">Grade/Year: {doc.gradeYear}</p>
                    </div>
                  ))}
                </div>

                {/* Important note box */}
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-amber-800">Important Note</h3>
                      <div className="mt-1 text-sm text-amber-700">
                        <p>Please arrive on time with a valid ID for document pickup. Processing may take 1-5 business days.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="privacy"
                        name="privacy"
                        type="checkbox"
                        checked={privacyChecked}
                        onChange={handlePrivacyCheckbox}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="privacy" className="font-medium text-gray-700">
                      I have read and understood the above information. 
                      I consent to the collection and use of my personal data as outlined.{" "}
                        <button
                          type="button"
                          onClick={() => setShowPrivacyAgreement(true)}
                          className="text-blue-700 hover:text-blue-800 font-semibold underline"
                        >
                          Privacy Agreement
                        </button>
                        *
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={handlePrevTab}
                    className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-2 text-white rounded-lg transition-colors shadow-md ${
                      isSubmitting || !privacyChecked ? "opacity-50 cursor-not-allowed" : ""
                    } bg-blue-700 hover:bg-blue-800`}
                    disabled={isSubmitting || !privacyChecked}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}