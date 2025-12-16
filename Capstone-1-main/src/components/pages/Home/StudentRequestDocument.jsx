import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PrivacyAgreement from "../../../Misc/PrivacyAgreement.jsx";
import Login from "../../../Auth/Login.jsx";
import { db } from "../../../config/firebase.js";
import { collection, addDoc, serverTimestamp, doc, setDoc, query, where, getDocs } from "firebase/firestore"; 
import { ActivityLogger, ACTIVITY_TYPES } from "../../../services/activityLogService";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { ChevronLeft } from "lucide-react"; 
import { FiInfo } from "react-icons/fi";
import QRCode from "qrcode";
import { Upload, AlertCircle, FileUp, Check, X } from 'lucide-react';
const StudentRequestDocument = () => {
  
  const [warning, setWarning] = useState({
    show: false,
    message: '',
  });

  const [showPhotoRequiredModal, setShowPhotoRequiredModal] = useState(false);

 
  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    middleName: "",
    email: "",
    phoneNumber: "",
    birthDate: "", 
    lrn: "",
    currentYearLevel: "",
    identificationImage: null, 
    preferredDate: "",
    preferredTime: "",
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
    ]
  });

  // State to store account credentials
  const [accountCredentials, setAccountCredentials] = useState({
    email: "",
    password: ""
  });

 
  const [showLogin, setShowLogin] = useState(false); 
  const [currentTab, setCurrentTab] = useState(1); 
  const [isSubmitted, setIsSubmitted] = useState(false); 
  const [showPrivacyAgreement, setShowPrivacyAgreement] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [privacyChecked, setPrivacyChecked] = useState(false); 
  const [emailStatus, setEmailStatus] = useState({ isValid: true, message: '' });
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [uploadedImageUrls, setUploadedImageUrls] = useState([]);
  const [uploadedImageIds, setUploadedImageIds] = useState([]);
  const [phoneStatus, setPhoneStatus] = useState({ isValid: true, message: '' });
  const [errorMessage, setErrorMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const navigate = useNavigate(); // React Router hook for navigation


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
      `${year}-01-01`, 
      `${year}-04-09`, 
      `${year}-05-01`, 
      `${year}-06-12`, 
      `${year}-08-26`, 
      `${year}-11-30`, 
      `${year}-12-25`, 
      `${year}-12-30`, 
      `${year}-12-31`, 
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

  
  const isHoliday = (dateString) => {
    return philippineHolidays.includes(dateString);
  };

  
  const isWeekend = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  
  const generateDateList = () => {
    const dates = [];
    const today = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 1);
    
    for (let d = new Date(); d <= nextYear; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (isWeekend(dateStr)) {
        dates.push(dateStr);
      }
    }
    return dates;
  };

  
  const weekendDates = generateDateList();

  
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      input[type="date"]::-webkit-calendar-picker-indicator {
        cursor: pointer;
      }
      /* Style for weekend dates in the calendar */
      input[type="date"]::-webkit-calendar-picker {
        ${weekendDates.map(date => `[value="${date}"] { color: #F97316; }`).join('\n')}
      }
      /* Disable weekend dates */
      input[type="date"] {
        ${weekendDates.map(date => `&[value="${date}"] { color: #F97316; cursor: not-allowed; }`).join('\n')}
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, [weekendDates]);

  
  const handleChange = async (e) => {
    const { name, value } = e.target;

    // Remove numbers from name fields
    let processedValue = value;
    if (name === 'firstName' || name === 'middleName' || name === 'lastName') {
      processedValue = value.replace(/\d/g, ''); // Remove all digits
    }

    if (name === 'preferredDate') {
      const selectedDate = new Date(processedValue);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        setWarning({
          show: true,
          message: "Past dates are not allowed."
        });
        e.target.value = "";
        setFormData(prev => ({
          ...prev,
          [name]: ""
        }));
        return;
      }

      if (isWeekend(value)) {
        setWarning({
          show: true,
          message: "Weekends are not allowed. Please choose a weekday."
        });
        e.target.value = "";
        setFormData(prev => ({
          ...prev,
          [name]: ""
        }));
        return;
      }

      
      if (isHoliday(value)) {
        setWarning({
          show: true,
          message: "This date is a holiday. Please choose a different date."
        });
        e.target.value = "";
        setFormData(prev => ({
          ...prev,
          [name]: ""
        }));
        return;
      }
    }

    if (name === 'email') {
      const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.com$/i;
      if (!emailPattern.test(value)) {
        setEmailStatus({
          isValid: false,
          message: 'Email must contain "@" and end with ".com"'
        });
      } else {
        await checkEmailExists(value);
      }
    }

    if (name === 'phoneNumber') {
      
      const phonePattern = /^[0-9]{11}$/;
      if (!phonePattern.test(value)) {
        setPhoneStatus({
          isValid: false,
          message: 'Phone number must be 11 digits (numbers only, e.g., 09XXXXXXXXX)'
        });
      } else {
        setPhoneStatus({
          isValid: true,
          message: 'Phone number is valid.'
        });
      }
    }

    setFormData({ ...formData, [name]: processedValue });
  };

 
  const handleDocumentChange = (index, field, value) => {
    const updatedDocuments = formData.documents.map((doc, i) => {
      if (i === index) {
        return { ...doc, [field]: value };
      }
      return doc;
    });
    setFormData({ ...formData, documents: updatedDocuments });
  };

  
  const addDocument = () => {
    if (formData.documents.length < 5) {
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
            gradeYear: "" // Add this field
          }
        ]
      });
    }
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

 
  const handlePrivacyCheckbox = () => {
    setPrivacyChecked(!privacyChecked);
  };

  
  const areAllFieldsFilled = () => {
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

 
  const formatBirthDateForPassword = (birthDate) => {
    if (!birthDate) return "";
    const date = new Date(birthDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());
    return `${day}${month}${year}`; // This will format as ddmmyyyy (e.g., 13122001)
  };

 
  const checkEmailExists = async (email) => {
    if (!email) return;

    setIsCheckingEmail(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setEmailStatus({
          isValid: false,
          message: "This email is already registered. Please use a different email."
        });
        return true;
      } else {
        setEmailStatus({
          isValid: true,
          message: "Email is available."
        });
        return false;
      }
    } catch (error) {
      console.error("Error checking email:", error);
      setEmailStatus({
        isValid: false,
        message: "Error checking email availability."
      });
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  
  const createUserAccount = async () => {
    try {
      // Check email one final time before account creation
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        return null;
      }

      const auth = getAuth();
      const password = formatBirthDateForPassword(formData.birthDate);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        password
      );

      setAccountCredentials({
        email: formData.email,
        password: password
      });

    
      await setDoc(doc(db, "users", userCredential.user.uid), {
        userId: userCredential.user.uid,
        email: formData.email,
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        birthDate: formData.birthDate,
        phoneNumber: formData.phoneNumber,
        lrn: formData.lrn,
        currentYearLevel: formData.currentYearLevel,
        role: "student", // This will ensure role is set to student
        createdAt: serverTimestamp()
      });

      console.log("Student account created with ID:", userCredential.user.uid);
      return userCredential.user.uid;
    } catch (error) {
      console.error("Error creating user account:", error);

      // Handle specific auth errors
      if (error.code === "auth/email-already-in-use") {
        alert("An account already exists with this email. Please login instead.");
      } else {
        alert("Failed to create account. Please try again.");
      }

      return null;
    }
  };

  
  const saveToFirebase = async (userId) => {
    try {
      setIsSubmitting(true);
     
      const validImageUrls = uploadedImageUrls.filter(url => url);
      const validImageIds = uploadedImageIds.filter(id => id);

           const documentsWithQR = await Promise.all(
            formData.documents.map(async (doc) => {
              const qrData = {
                student: {
                  name: `${formData.lastName}, ${formData.firstName} ${formData.middleName}`,
                  lrn: formData.lrn,
                  currentYearLevel: formData.currentYearLevel,
                  strand: (formData.currentYearLevel === '11' || formData.currentYearLevel === '12') ? (formData.strand || '') : ''
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
              requestId: `${formData.lrn}-${Date.now()}-${doc.documentType.replace(/\s+/g, '')}`
            }
          };

          try {
            const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData));
            return {
              ...doc,
              status: "pending",
              qrCode: qrCodeUrl,
              requestId: qrData.request.requestId
            };
          } catch (err) {
            console.error("Error generating QR code:", err);
            return {
              ...doc,
              status: "pending",
              qrCode: null
            };
          }
        })
      );

      const dataToSave = {
        ...formData,
        documents: documentsWithQR,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        status: "pending",
        role: "student",
        userId: userId,
        strand: formData.strand || "",
        
        ...(validImageUrls.length > 0 && { imageUrls: validImageUrls }),
        ...(validImageIds.length > 0 && { imageIds: validImageIds })
      };

      
      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === undefined || dataToSave[key] === null) {
          delete dataToSave[key];
        }
      });

      
      delete dataToSave.identificationImage;

      const docRef = await addDoc(collection(db, "requests"), dataToSave);
      console.log("Document saved with ID: ", docRef.id);

      // Log request submission
      try {
        await ActivityLogger.requestSubmitted(userId, formData.email, {
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

  
  const uploadToCloudinary = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Cloudinary Error:', errorData);
        throw new Error(`Upload failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return {
        url: data.secure_url,
        publicId: data.public_id,
      };
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw error;
    }
  };

  
  const handleSubmit = async (e) => {
    e.preventDefault();

    
    if (!privacyChecked) {
      alert("Please agree to the Privacy Agreement before submitting.");
      return;
    }

    
    if (!formData.birthDate) {
      alert("Please enter your birth date to continue.");
      return;
    }

    // Check for photo requirement before submission
    if (!hasUploadedPhoto()) {
      setShowPhotoRequiredModal(true);
      return;
    }

    try {
      setIsSubmitting(true);

      
      const userId = await createUserAccount();

      if (userId) {
       
        const saved = await saveToFirebase(userId);

        if (saved) {
          setIsSubmitted(true); // Shows success modal if save was successful
        }
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("An error occurred during submission. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  
  const closeSuccessModal = () => {
    setIsSubmitted(false);
    navigate("/"); 
  };

  
  const handleNextTab = () => {
    // Use state-driven validation instead of DOM query
    if (!validateFields()) {
      setErrorMessage("Please fill in all required fields before proceeding.");
      setShowErrorModal(true);
      return;
    }

    // Check for photo requirement when going from tab 2 (Document Selection) to tab 3 (Review & Submit)
    if (currentTab === 2 && !hasUploadedPhoto()) {
      setShowPhotoRequiredModal(true);
      return;
    }

    setErrorMessage("");
    setCurrentTab((prevTab) => prevTab + 1);
  };

  // Validation logic: ensure required fields for each tab are filled
  const validateFields = () => {
    // Define required fields per step/tab
    const requiredByTab = {
      1: [
        "lastName",
        "firstName",
        // middleName can be optional depending on policy; keep required if starred in UI
        "email",
        "phoneNumber",
        "birthDate",
        "lrn",
        "currentYearLevel",
      ],
      2: ["documents"],
      3: ["preferredDate", "preferredTime"],
    };

    const required = requiredByTab[currentTab] || [];

    // Top-level checks
    const topLevelOk = required
      .filter((f) => f !== "documents")
      .every((field) => (formData[field]?.toString().trim?.() ?? String(formData[field] ?? "")).trim() !== "");
    if (!topLevelOk) return false;

    // Documents checks for tab 2
    if (required.includes("documents")) {
      if (!Array.isArray(formData.documents) || formData.documents.length === 0) return false;
      const allDocsOk = formData.documents.every((doc) => {
        const hasType = (doc.documentType ?? "").toString().trim() !== "";
        const hasPurpose = (doc.purpose ?? "").toString().trim() !== "";
        const hasCopies = Number(doc.copies) >= 1;
        return hasType && hasPurpose && hasCopies;
      });
      if (!allDocsOk) return false;
    }

    return true;
  };

  const handlePrevTab = () => {
    setCurrentTab((prevTab) => prevTab - 1);
  };

  // ... rest of your code remains the same ...
  
  const goBackToUserTypeSelection = () => {
    navigate("/");
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

  
  const studentDocumentOptions = [
    { value: "Form 137 (SF10)", label: "Form 137 (SF10)" },
    { value: "Form 138", label: "Form 138" },
    { value: "Certificate of Good Moral Character", label: "Certificate of Good Moral Character" },
    { value: "Certificate of Enrollment", label: "Certificate of Enrollment" },
    { value: "Certificate of Completion (Grade 10)", label: "Certificate of Completion (Grade 10)" },
    { value: "Letter of Recommendation", label: "Letter of Recommendation" },
    { value: "Certificate of Graduation (Grade 12)", label: "Certificate of Graduation (Grade 12)" },
    { value: "Diploma (Grade 12)", label: "Diploma (Grade 12)" },
    { value: "Lost ID", label: "Lost ID" }
  ];

  
  const getAvailableDocuments = (currentIndex) => {
    const selectedDocuments = formData.documents.map((doc, index) =>
      index !== currentIndex ? doc.documentType : null
    ).filter(type => type);

    return studentDocumentOptions.filter(option =>
      !selectedDocuments.includes(option.value)
    );
  };

  
  const hasAvailableDocuments = () => {
    const selectedDocuments = formData.documents.map(doc => doc.documentType).filter(Boolean);
    return studentDocumentOptions.some(option => !selectedDocuments.includes(option.value));
  };

  // Function to check if at least one photo is uploaded
  const hasUploadedPhoto = () => {
    return images.some(img => img.imageFile !== null && img.cloudinaryUrl);
  };

  const [images, setImages] = useState([
    { imageFile: null, filePreview: null, fileError: null }
  ]);

  const handleFileUpload = async (index, e) => {
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

    try {
      
      const uploadResult = await uploadToCloudinary(file);
      
      
      const filePreview = URL.createObjectURL(file);

    
      const updatedImages = [...images];
      updatedImages[index] = {
        imageFile: file,
        filePreview,
        fileError: null,
        cloudinaryUrl: uploadResult.url,
        publicId: uploadResult.publicId
      };
      
      
      if (index === images.length - 1) {
        updatedImages.push({ imageFile: null, filePreview: null, fileError: null });
      }
      
      setImages(updatedImages);
      
      
      setUploadedImageUrls(prev => [...prev, uploadResult.url]);
      setUploadedImageIds(prev => [...prev, uploadResult.publicId]);
    } catch (error) {
      console.error('Upload failed:', error);
      const updatedImages = [...images];
      updatedImages[index] = {
        ...updatedImages[index],
        fileError: 'Failed to upload image. Please try again.'
      };
      setImages(updatedImages);
    }
  };

  const removeFile = async (index) => {
    try {
      const updatedImages = [...images];
      
      
      if (updatedImages[index].filePreview) {
        URL.revokeObjectURL(updatedImages[index].filePreview);
      }

      
      if (updatedImages[index].cloudinaryUrl) {
        const urlIndex = uploadedImageUrls.indexOf(updatedImages[index].cloudinaryUrl);
        if (urlIndex > -1) {
          const newUrls = [...uploadedImageUrls];
          const newIds = [...uploadedImageIds];
          newUrls.splice(urlIndex, 1);
          newIds.splice(urlIndex, 1);
          setUploadedImageUrls(newUrls);
          setUploadedImageIds(newIds);
        }
      }
      
      
      updatedImages[index] = {
        imageFile: null,
        filePreview: null,
        fileError: null,
        cloudinaryUrl: null,
        publicId: null
      };
      
      
      if (index !== images.length - 1 && images.length > 1 && !images[images.length - 1].imageFile) {
        updatedImages.splice(index, 1);
      }
      
      setImages(updatedImages);
    } catch (error) {
      console.error('Error removing file:', error);
    }
  };

  return (
    <div className="min-h-screen relative bg-[#0A2463] py-8">
      {/* Add Warning Modal */}
      {warning.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-center mb-2">Date Selection Warning</h3>
            <p className="text-gray-600 text-center mb-6">{warning.message}</p>
            <button
              onClick={() => setWarning({ show: false, message: '' })}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              OK
            </button>
          </motion.div>
        </div>
      )}

      {/* Validation Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-center mb-2">Incomplete Fields</h3>
            <p className="text-gray-600 text-center mb-6">
              {errorMessage || "Please fill in all required fields before proceeding."}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Photo Required Modal */}
      {showPhotoRequiredModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">!</span>
                </div>
              </div>
            </div>
            
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-gray-600 mr-2" />
                <h3 className="text-xl font-bold text-gray-900">Photo Upload Required</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Please upload at least one photo to continue with your request. 
                This is required for document verification purposes.
              </p>
            </div>

            <button
              onClick={() => setShowPhotoRequiredModal(false)}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-md"
            >
              Got it, I'll upload a photo
            </button>
          </motion.div>
        </div>
      )}

      
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={goBackToUserTypeSelection}
          className="flex items-center justify-center group bg-white/90 hover:bg-white text-[#0A2463] hover:text-[#0A2463] backdrop-blur-sm rounded-full p-2 shadow-lg transition-all duration-300 hover:shadow-xl"
        >
          <ChevronLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-0.5" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out">
            <span className="pl-1 pr-1">Back</span>
          </span>
        </button>
      </div>

    
      {showLogin && <Login setShowLogin={setShowLogin} />}

      
      {isSubmitted && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl"
          >
            
            <div className="mb-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                className="w-20 h-20 bg-green-100 rounded-full mx-auto flex items-center justify-center"
              >
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="w-10 h-10 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </motion.svg>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-gray-900 mt-6 mb-2"
              >
                Request Submitted
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-gray-600"
              >
                Your document request has been successfully submitted and is being processed.
              </motion.p>
            </div>

           
            <div className="bg-blue-50 p-4 rounded-lg mb-6 text-left">
              <h3 className="text-blue-800 font-bold mb-2">Account Created Successfully!</h3>
              <p className="text-gray-700 mb-2">An account has been created with:</p>
              <div className="space-y-1 text-gray-700">
                <p>
                  <span className="font-semibold">Email:</span> {accountCredentials.email}
                </p>
                <p>
                  <span className="font-semibold">Password:</span> Your birthdate (ddmmyyyy)
                </p>
              </div>
              <div className="mt-3 text-sm text-blue-700">
                <p>Please keep these credentials for tracking your document request status.</p>
              </div>
            </div>

            
            <div className="mt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Documents Requested:</h3>
              <div className="space-y-2">
                {formData.documents.map((doc, index) => (
                  <div key={index} className="text-gray-600">
                    • {doc.documentType} ({doc.copies} {doc.copies > 1 ? 'copies' : 'copy'})
                  </div>
                ))}
              </div>
            </div>

            
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={closeSuccessModal}
              className="w-full mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md flex items-center justify-center space-x-2 group"
            >
              <span>Return to Home</span>
              <svg
                className="w-5 h-5 transform transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </motion.button>
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

      
      <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">
       
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-800 to-blue-600 p-8">
            <div className="flex justify-center mb-6">
              <img
                src="logo natin.png"
                alt="Logo"
                className="h-24 w-auto"
                style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.2))' }}
              />
            </div>
            <h1 className="text-3xl font-bold text-white text-center">
              Student Document Request Portal
            </h1>
          </div>

          
          <div className="px-8 py-4 bg-blue-50">
            <div className="flex justify-between relative">
              {[1, 2, 3].map((tab) => (
                <div key={tab} className="flex flex-col items-center z-10">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      currentTab === tab
                        ? "bg-blue-600 text-white"
                        : currentTab > tab
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {currentTab > tab ? "✓" : tab}
                  </div>
                  <span className="text-sm mt-2 font-medium">
                    {tab === 1
                      ? "Personal Details"
                      : tab === 2
                      ? "Document Selection"
                      : "Review & Submit"}
                  </span>
                </div>
              ))}
              
              <div className="absolute top-6 left-0 h-1 bg-gray-200 w-full -z-10">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${((currentTab - 1) / 2) * 100}%` }}
                />
              </div>
            </div>
          </div>

          
          <div className="p-8">
            <form onSubmit={handleSubmit}>
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
                     
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name*
                          </label>
                          <input
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name*
                          </label>
                          <input
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Middle Name
                          </label>
                          <input
                            name="middleName"
                            value={formData.middleName}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          />
                        </div>
                      </div>

                     
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Learner Reference Number (LRN)*
                        </label>
                        <input
                          name="lrn"
                          type="text"
                          value={formData.lrn}
                          onChange={(e) => {
                            // Only allow digits
                            const value = e.target.value.replace(/\D/g, "");
                            handleChange({ target: { name: "lrn", value } });
                          }}
                          required
                          maxLength="12"
                          pattern="[0-9]{12}"
                          placeholder="Enter your 12-digit LRN"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        />
                        <p className="text-xs text-blue-500 mt-1 italic">
                          Note: Please enter your 12-digit Learner Reference Number
                        </p>
                      </div>

                      {/* Add Current Grade Level field */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Current Grade Level*
                        </label>
                        <select
                          name="currentYearLevel"
                          value={formData.currentYearLevel}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
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
                              Senior High Strand*
                            </label>
                            <select
                              name="strand"
                              value={formData.strand}
                              onChange={handleChange}
                              required
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                            >
                              <option value="">Select Strand</option>
                              <option value="GAS">GAS</option>
                              <option value="ABM">ABM</option>
                            </select>
                          </div>
                        )}
                      </div>

                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Birth Date*
                        </label>
                        <input
                          name="birthDate"
                          type="date"
                          value={formData.birthDate}
                          onChange={handleChange}
                          required
                          max={new Date().toISOString().split("T")[0]}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        />
                        <p className="flex items-start text-xs text-blue-500 mt-1 italic">
                          Note: Your birth date will be used for account creation (format: ddmmyyyy)
                        </p>
                      </div>

                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email*
                        </label>
                        <div className="relative">
                          <input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            inputMode="email"
                            required
                            pattern="^[^@\s]+@[^@\s]+\.[^@\s]+$"
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600
                              ${!emailStatus.isValid ? 'border-red-500' : emailStatus.isValid && formData.email ? 'border-green-500' : 'border-gray-300'}`}
                          />
                          {isCheckingEmail && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </div>
                          )}
                        </div>
                        {formData.email && (
                          <p className={`mt-1 text-sm ${!emailStatus.isValid ? 'text-red-500' : 'text-green-500'}`}>
                            {emailStatus.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number*
                        </label>
                        <input
                          name="phoneNumber"
                          type="tel"
                          pattern="^[0-9]{11}$"
                          maxLength={11}
                          value={formData.phoneNumber}
                           onChange={(e) => {
                      // Only allow digits
                        const value = e.target.value.replace(/\D/g, "");
                       handleChange({ target: { name: "phoneNumber", value } });
                       }}
                        required
                        placeholder="Enter your 11-digit phone number"
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-ge-600
                        ${!phoneStatus.isValid ? 'border-red-500' : phoneStatus.isValid && formData.phoneNumber ? 'border-green-500' : 'border-gray-300'}`}
                          />
                        {formData.phoneNumber && (
                          <p className={`mt-1 text-sm ${!phoneStatus.isValid ? 'text-red-500' : 'text-green-500'}`}>
                            {phoneStatus.message}
                          </p>
                        )}

                      </div>
                    </div>

                    
                    <div className="flex justify-end pt-4">
                      <button
                        type="button"
                        onClick={handleNextTab}
                        className="px-6 py-2 text-white rounded-lg transition-colors shadow-md bg-blue-700 hover:bg-blue-800"
                      >
                        Next
                      </button>
                    </div>
                  </motion.div>
                )}

                
                {currentTab === 2 && (
                  <motion.div
                    key="documents"
                    initial="initial"
                    animate="in"
                    exit="out"
                    variants={pageVariants}
                    transition={pageTransition}
                    className="space-y-6 form-tab active"
                  >
                    <h2 className="text-xl font-semibold text-blue-800 mb-6">
                      Document Requests
                    </h2>

                    {formData.documents.map((doc, index) => (
                      <div key={doc.id} className="bg-gray-50 rounded-lg p-6 relative">
                        {formData.documents.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => removeDocument(e, index)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-red-500 transition-colors z-10"
                            aria-label="Remove document"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
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
                              onChange={(e) =>
                                handleDocumentChange(index, "documentType", e.target.value)
                              }
                              required
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                            >
                              <option value="">Select document</option>
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
                              onChange={(e) =>
                                handleDocumentChange(index, "purpose", e.target.value)
                              }
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
                                      error = "Maximum of  words only.";
                                    }
                                    // Save error and value in document object
                                    handleDocumentChange(index, "otherDescriptionError", error);
                                    // Only allow up to 50 words in the textarea
                                    if (words.length <= 20) {
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
                                Grade Level*
                              </label>
                              <select
                                value={doc.gradeYear || ""}
                                onChange={(e) =>
                                  handleDocumentChange(index, "gradeYear", e.target.value)
                                }
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                              >
                                <option value="">Select grade level</option>
                                <option value="7">Grade 7</option>
                                <option value="8">Grade 8</option>
                                <option value="9">Grade 9</option>
                                <option value="10">Grade 10</option>
                                <option value="11">Grade 11</option>
                                <option value="12">Grade 12</option>
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
                      <p className="mt-2 text-xs font-semibold text-amber-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Reminder: Upload a supporting document or any valid ID for request verification.</span>
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
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {hasAvailableDocuments() ? "Add Another Document" : "All document types selected"}
                    </button>

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
                        className="px-6 py-2 text-white rounded-lg transition-colors shadow-md bg-blue-700 hover:bg-blue-800"
                      >
                        Next
                      </button>
                    </div>
                  </motion.div>
                )}

                
                {currentTab === 3 && (
                  <motion.div
                    key="scheduling"
                    initial="initial"
                    animate="in"
                    exit="out"
                    variants={pageVariants}
                    transition={pageTransition}
                    className="space-y-6 form-tab active"
                  >
                    <h2 className="text-xl font-semibold border-b pb-2 text-blue-800 border-blue-100">
                      Schedule Document Pickup
                    </h2>

                    <div className="space-y-4">
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Preferred Date*
                        </label>
                        <input
                          name="preferredDate"
                          type="date"
                          value={formData.preferredDate}
                          onChange={handleChange}
                          required
                          min={new Date().toISOString().split('T')[0]} // Cannot select dates in the past
                          data-weekend={isWeekend(formData.preferredDate)}
                          className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 ${
                            isWeekend(formData.preferredDate) ? 'text-orange-500 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>

                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Preferred Time*
                        </label>
                        <select
                          name="preferredTime"
                          value={formData.preferredTime}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        >
                          <option value="">Select time slot</option>
                          <option value="06:00-07:00">06:00 AM - 07:00 AM</option>
                          <option value="07:00-08:00">07:00 AM - 08:00 AM</option>
                          <option value="08:00-09:00">08:00 AM - 09:00 PM</option>
                          <option value="09:00-10:00">09:00 AM - 10:00 PM</option>
                          <option value="10:00-11:00">10:00 AM - 11:00 PM</option>
                          <option value="11:00-12:00">11:00 AM - 12:00 PM</option>
                          <option value="13:00-14:00">01:00 PM - 02:00 PM</option>
                          <option value="14:00-16:00">02:00 PM - 03:00 PM</option>
                        </select>
                        <p className="text-sm text-gray-500 mt-2">
                          <FiInfo className="inline text-yellow-500 mr-1 mb-1 w-4 h-4" />
                          <span>
                            Note: The school administration may adjust your preferred schedule if there is a conflict,
                            school event, emergency, or other valid reason.
                          </span>
                        </p>
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
                            <label
                              htmlFor="privacy"
                              className="font-medium text-gray-700"
                            >
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

                      
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 pt-0.5">
                            <svg
                              className="h-5 w-5 text-blue-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">
                              Account Creation
                            </h3>
                            <div className="mt-1 text-sm text-blue-700">
                              <p>
                                Submitting this form will create an account
                                using your email with your birthdate (format:
                                ddmmyyyy) as the password.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-800 mb-2">
                          Request Summary
                        </h3>
                        <div className="text-sm text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <span className="font-medium">Name:</span>{" "}
                            {formData.firstName}{" "}
                            {formData.middleName
                              ? formData.middleName + " "
                              : ""}
                            {formData.lastName}
                          </div>
                          <div>
                            <span className="font-medium">LRN:</span>{" "}
                            {formData.lrn}
                          </div>
                          <div>
                            <span className="font-medium">
                              Grade and Section:
                            </span>{" "}
                            {formData.currentYearLevel}
                          </div>
                          <div>
                            <span className="font-medium">Pickup Date:</span>{" "}
                            {formData.preferredDate
                              ? new Date(
                                  formData.preferredDate
                                ).toLocaleDateString()
                              : "Not selected"}
                          </div>
                          <div>
                            <span className="font-medium">Pickup Time:</span>{" "}
                            {formData.preferredTime}
                          </div>
                          <div>
                            <span className="font-medium">Birth Date:</span>{" "}
                            {formData.birthDate
                              ? new Date(
                                  formData.birthDate
                                ).toLocaleDateString()
                              : "Not selected"}
                          </div>
                        </div>
                        <div className="mt-4">
                          <h4 className="text-md font-medium text-gray-800 mb-2">
                            Documents Requested:
                          </h4>
                          {formData.documents.map((doc, index) => (
                            <div
                              key={index}
                              className="text-sm text-gray-600 mb-2"
                            >
                              <span className="font-medium">
                                Document Type:
                              </span>{" "}
                              {doc.documentType},{" "}
                              <span className="font-medium">Purpose:</span>{" "}
                              {doc.purpose},{" "}
                              <span className="font-medium">Copies:</span>{" "}
                              {doc.copies}
                              {doc.documentType === "Copy of Grades" && (
                                <>
                                  , <span className="font-medium">Grade Level:</span> {doc.gradeYear}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                     
                      <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 pt-0.5">
                            <svg
                              className="h-5 w-5 text-amber-400"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-amber-800">
                              Important Note
                            </h3>
                            <div className="mt-1 text-sm text-amber-700">
                              <p>
                                Please arrive on time with a valid ID and Support documents.
                                Processing may take 1-5 business days.
                              </p>
                            </div>
                          </div>
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
                          isSubmitting || !privacyChecked
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        } bg-blue-700 hover:bg-blue-800`}
                        disabled={isSubmitting || !privacyChecked}
                      >
                        {isSubmitting ? "Submitting..." : "Submit"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentRequestDocument;