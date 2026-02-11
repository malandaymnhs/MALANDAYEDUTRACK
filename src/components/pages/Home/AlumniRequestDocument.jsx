import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../../config/firebase.js";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import PrivacyAgreement from "../../../Misc/PrivacyAgreementAlumni.jsx";
import { motion } from "framer-motion";
import { FaUser, FaGraduationCap, FaCalendarAlt } from "react-icons/fa";
import { ChevronLeft } from "lucide-react";
import QRCode from "qrcode";
import { FiInfo } from "react-icons/fi";
import { Upload, AlertCircle, FileUp, Check, X } from 'lucide-react';
import { CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET } from "../../../config/cloudinary";
import { Form, Input, Button, message } from 'antd';
import { logActivity, ACTIVITY_TYPES } from "../../../services/activityLogService";

const AlumniRequestDocument = () => {
  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    middleName: "",
    lrn: "", 
    email: "",
    phoneNumber: "",
    graduationYear: "",
    employmentStatus: "",
    company: "",
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
        qrCode: null
      }
    ]
  });

  const [isPrivacyChecked, setIsPrivacyChecked] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [emailStatus, setEmailStatus] = useState({ isValid: true, message: "" });
  const [phoneStatus, setPhoneStatus] = useState({ isValid: true, message: "" });
  const [photoError, setPhotoError] = useState("");
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [dateWarningMessage, setDateWarningMessage] = useState("");
  const [showDateWarningModal, setShowDateWarningModal] = useState(false);

  const navigate = useNavigate();

  
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

  
  const isWeekend = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6; 
  };

  
  const isHoliday = (dateString) => {
    return philippineHolidays.includes(dateString);
  };

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;

    // Validate name fields - only allow letters and spaces
    if (name === "firstName" || name === "lastName" || name === "middleName") {
      const namePattern = /^[A-Za-z\s]*$/;
      if (!namePattern.test(value)) {
        // Prevent non-letter characters from being entered
        return;
      }
    }

    
    if (name === "email") {
      const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      if (!emailPattern.test(value)) {
        setEmailStatus({
          isValid: false,
          message: 'Email must contain "@" and a valid domain (e.g., ".com")'
        });
      } else {
        setEmailStatus({
          isValid: true,
          message: "Email is Valid."
        });
      }
    }

    
    if (name === "phoneNumber") {
      const phonePattern = /^[0-9]{11}$/;
      if (!phonePattern.test(value)) {
        setPhoneStatus({
          isValid: false,
          message: "Phone number must be 11 digits (numbers only, e.g., 09XXXXXXXXX)"
        });
      } else {
        setPhoneStatus({
          isValid: true,
          message: "Phone number is valid."
        });
      }
    }

    if (name === 'preferredDate') {
      const selectedDate = new Date(value);
      const day = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        setDateWarningMessage("Past dates are not allowed. Please choose a future date.");
        setShowDateWarningModal(true);
        e.target.value = "";
        setFormData(prev => ({
          ...prev,
          [name]: ""
        }));
        return;
      }

      if (day === 0 || day === 6) {
        setDateWarningMessage("Weekends are not allowed. Please choose a weekday.");
        setShowDateWarningModal(true);
        e.target.value = "";
        setFormData(prev => ({
          ...prev,
          [name]: ""
        }));
        return;
      }

      
      if (isHoliday(value)) {
        setDateWarningMessage("This date is a holiday. Please choose a different date.");
        setShowDateWarningModal(true);
        e.target.value = "";
        setFormData(prev => ({
          ...prev,
          [name]: ""
        }));
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'file' ? files[0] : value
    }));
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
            qrCode: null
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

  const validateForm = async () => {
    const requiredFields = [
      'lastName', 'firstName', 'email', 'phoneNumber',
      'graduationYear', 'preferredDate', 'preferredTime'
    ];

    const emptyFields = requiredFields.filter(field => !formData[field]);
    if (emptyFields.length > 0) {
      return false;
    }

    if (!isPrivacyChecked) {
      return false;
    }

    return true;
  };

  const uploadImagesToCloudinary = async () => {
    const urls = [];
    for (const img of images) {
      if (img.imageFile) {
        const formData = new FormData();
        formData.append("file", img.imageFile);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        const res = await fetch(CLOUDINARY_UPLOAD_URL, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.secure_url) {
          urls.push(data.secure_url);
        }
      }
    }
    return urls;
  };

  const saveToFirebase = async () => {
    try {
      setIsSubmitting(true);

      
      const imageUrls = await uploadImagesToCloudinary();

      
      const documentsWithQR = await Promise.all(
        formData.documents.map(async (doc) => {
          const qrData = {
            student: {
              name: `${formData.lastName}, ${formData.firstName} ${formData.middleName}`,
              role: "alumni",
              graduationYear: formData.graduationYear
            },
            document: {
              type: doc.documentType,
              purpose: doc.purpose,
              copies: doc.copies
            },
            request: {
              dateRequested: new Date().toISOString(),
              status: "pending",
              requestId: `${formData.graduationYear}-${Date.now()}-${doc.documentType.replace(/\s+/g, '')}`
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
        status: "pending",
        role: "alumni",
        imageUrls // <-- Save Cloudinary URLs
      };

      delete dataToSave.identificationImage;

      await addDoc(collection(db, "requests"), dataToSave);
      return true;
    } catch (error) {
      console.error("Error saving to Firebase:", error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear any previous photo errors
    setPhotoError("");
    
    // Check if at least one photo is uploaded first
    const hasPhoto = images.some(image => image.imageFile !== null);
    if (!hasPhoto) {
      setPhotoError("Please upload a photo before submitting your request.");
      setShowPhotoModal(true);
      return;
    }
    
    const isValid = await validateForm();
    if (!isValid) return;

    const success = await saveToFirebase();
    if (success) {
      setSuccessMessage("Request submitted successfully!\n\nReminder: Please monitor your email for updates about your document request.");
      setShowSuccessOverlay(true);
    } else {
      setSuccessMessage("Failed to submit request. Please try again.");
      setShowSuccessOverlay(true);
    }
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const goBackToUserTypeSelection = () => {
    navigate("/");
  };

  const documentTypeOptions = [
    { value: "Form 137 (SF10)", label: "Form 137 (SF10)" },
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

    return documentTypeOptions.filter(option => 
      !selectedDocuments.includes(option.value)
    );
  };

  const hasAvailableDocuments = () => {
    const selectedDocuments = formData.documents.map(doc => doc.documentType).filter(Boolean);
    return documentTypeOptions.some(option => !selectedDocuments.includes(option.value));
  };
const [images, setImages] = useState([
    { imageFile: null, filePreview: null, fileError: null }
  ]);

  const handleFileUpload = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Allow JPG, PNG, and PDF
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      const updatedImages = [...images];
      updatedImages[index] = {
        ...updatedImages[index],
        fileError: 'Please upload only JPG, PNG, or PDF files.'
      };
      setImages(updatedImages);
      return;
    }

    const maxSize = 5 * 1024 * 1024; 
    if (file.size > maxSize) {
      const updatedImages = [...images];
      updatedImages[index] = {
        ...updatedImages[index],
        fileError: 'File size exceeds 5MB limit.'
      };
      setImages(updatedImages);
      return;
    }

    const filePreview = file.type === 'application/pdf' ? null : URL.createObjectURL(file);

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
  return (
  <div className="min-h-screen bg-gradient-to-b from-[#0A2463] to-white py-8 text-[#0A2463] font-sans font-normal">
      
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
                className="w-full px-4 py-2 bg-[#274690] text-white rounded-lg hover:bg-[#0A2463] transition-colors duration-200 font-medium"
              >
                Got it, I'll upload a photo
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showDateWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                <svg className="h-8 w-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Date Selection Warning</h3>
              <p className="text-sm text-gray-600 mb-6">
                {dateWarningMessage}
              </p>
              <button
                onClick={() => setShowDateWarningModal(false)}
                className="w-full px-4 py-2 bg-[#274690] text-white rounded-lg hover:bg-[#0A2463] transition-colors duration-200 font-medium"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showSuccessOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Success!</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line mb-6">
                {successMessage}
              </p>
              <div className="mt-4">
                <button
                  onClick={() => {
                    setShowSuccessOverlay(false);
                    navigate("/");
                  }}
                  className="w-full inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-6 left-6 z-20">
        <button 
          onClick={goBackToUserTypeSelection}
          className=" mt-5 flex items-center justify-center group bg-white/90 hover:bg-white text-[#0A2463] hover:text-[#0A2463] backdrop-blur-sm rounded-full p-2 shadow-lg transition-all duration-300 hover:shadow-xl"
        >
          <ChevronLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-0.5" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out">
            <span className="pl-1 pr-1">Back</span>
          </span>
        </button>
      </div>

      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto relative">
            <button
              onClick={() => setShowPrivacyModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <PrivacyAgreement 
              isOpen={showPrivacyModal}
              onClose={() => setShowPrivacyModal(false)}
            />
          </div>
        </div>
      )}

      <motion.div 
        className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
  <div className="bg-[#274690] p-8 text-center text-white flex flex-col items-center font-sans font-normal">
          <img src="/logo natin1.png" alt="Alumni Logo" className="h-20 w-20 mb-4 rounded-full border-4 border-white shadow-lg bg-white object-contain" />
          <h1 className="text-3xl text-white tracking-wide font-sans font-normal">Alumni Document Request</h1>
          <p className="text-blue-100 mt-2 font-sans font-normal">Please fill out the form below to request your documents</p>
        </div>

  <form onSubmit={handleSubmit} className="p-8 space-y-8 text-[#0A2463] font-sans font-normal">
          <motion.section
            className="space-y-4"
            {...fadeIn}
          >
            <div className="flex items-center space-x-2 mb-4 font-sans font-normal">
              <FaUser className="w-5 h-5 text-[#0A2463]" />
              <h2 className="text-xl text-[#111111] font-sans font-normal">Personal Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">Last Name*</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#274690] focus:border-[#274690]"
                  pattern="[A-Za-z\s]+"
                  title="Last name should only contain letters and spaces"
                  placeholder="Enter last name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">First Name*</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#274690] focus:border-[#274690]"
                  pattern="[A-Za-z\s]+"
                  title="First name should only contain letters and spaces"
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">Middle Name (Optional)</label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#274690] focus:border-[#274690]"
                  pattern="[A-Za-z\s]*"
                  title="Middle name should only contain letters and spaces"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-[#111111]">Learner Reference Number </span>
                </label>
                <input
                  type="text"
                  name="lrn"
                  value={formData.lrn}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    handleInputChange({ target: { name: "lrn", value } });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#274690] focus:border-[#274690]"
                  maxLength={12}
                  pattern="[0-9]{12}"
                  placeholder="Optional"
                />
              </div>
            </div>
          </motion.section>

          <motion.section
            className="space-y-4"
            {...fadeIn}
          >
            <div className="flex items-center space-x-2 mb-4">
              <FaGraduationCap className="w-5 h-5 text-[#0A2463]" />
              <h2 className="text-xl font-semibold text-[#111111]">Alumni Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">Email*</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`mt-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#274690] focus:border-[#274690]
                    ${formData.email && !emailStatus.isValid ? 'border-red-500' : emailStatus.isValid && formData.email ? 'border-green-500' : 'border-gray-300'}`}
                  required
                />
                {formData.email && (
                  <p className={`mt-1 text-sm ${!emailStatus.isValid ? 'text-red-500' : 'text-green-500'}`}>
                    {emailStatus.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">Phone Number*</label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => {
                
                const value = e.target.value.replace(/\D/g, "");
                handleInputChange({ target: { name: "phoneNumber", value } });
              }}
              maxLength={11}
              className={`mt-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#274690] focus:border-[#274690]
                ${formData.phoneNumber && !phoneStatus.isValid ? 'border-red-500' : phoneStatus.isValid && formData.phoneNumber ? 'border-green-500' : 'border-gray-300'}`}
              required
              
            />
                {formData.phoneNumber && (
                  <p className={`mt-1 text-sm ${!phoneStatus.isValid ? 'text-red-500' : 'text-green-500'}`}>
                    {phoneStatus.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-[#111111]">Graduation Year*</span>
                </label>
                <select
                  name="graduationYear"
                  value={formData.graduationYear}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#274690] focus:border-[#274690]"
                >
                  <option value="">Select year</option>
                  {Array.from({ length: new Date().getFullYear() - 2015 + 1 }, (_, i) => {
                    const year = 2015 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  }).reverse()}
                </select>
              </div>
            </div>
          </motion.section>

          <motion.section
            className="space-y-4"
            {...fadeIn}
          >
            <div className="flex items-center space-x-2 mb-4">
              <svg className="w-5 h-5 text-[#0A2463]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-xl font-semibold text-[#111111]">Document Request Details</h2>
            </div>
          </motion.section>

          {formData.documents.map((doc, index) => (
            <div key={doc.id} className="bg-gray-50 rounded-lg p-6 relative mb-4">
              {formData.documents.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => removeDocument(e, index)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#111111] mb-1">Document Type*</label>
                  <select
                    value={doc.documentType}
                    onChange={(e) => handleDocumentChange(index, "documentType", e.target.value)}
                    required
                    className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#274690] focus:border-[#274690]"
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
                  <label className="block text-sm font-medium text-[#111111] mb-1">Purpose*</label>
                  <select
                    value={doc.purpose}
                    onChange={(e) => handleDocumentChange(index, "purpose", e.target.value)}
                    required
                    className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#274690] focus:border-[#274690]"
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
                      <span className="text-[#111111]">Please specify your purpose and bring any supporting documents related to your request.</span>
                    </label>
                    <textarea
                      value={doc.otherDescription || ""}
                      onChange={e => {
                        // Limit to 50 words and filter cursing words
                        const input = e.target.value;
                        const words = input.split(/\s+/).filter(Boolean);
                        const badWords = [
                          "fuck", "shit", "bitch", "asshole", "bastard", "damn", "crap", "pakyu",
                        ];
                        const foundBad = words.find(word =>
                          badWords.includes(word.toLowerCase())
                        );
                        if (foundBad) {
                          alert("Inappropriate language detected. Please remove any cursing words.");
                          return;
                        }
                         if (words.length <= 25) {
                            handleDocumentChange(index, "otherDescription", input);
                          }
                        }}
                        className="mt-1 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#274690] focus:border-[#274690] min-h-[140px] resize-vertical text-base"
                        placeholder="Describe your purpose (max 25 words)"
                        required
                        maxLength={1000}
                      />
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        {doc.otherDescription ? doc.otherDescription.trim().split(/\s+/).filter(Boolean).length : 0}/25 words
                      </div>
                    </div>
                )}
                </div>


                <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">Number of Copies</label>
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
                  className="w-16 text-center px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#274690] focus:border-[#274690]"
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
                    className="flex flex-col items-center justify-center w-full h-32 px-4 py-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#274690] focus:border-transparent transition-all duration-200"
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
                      accept=".jpg,.jpeg,.png,.pdf"
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
                              Please upload a photo before submitting your request.
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
                      {image.imageFile && image.imageFile.type === 'application/pdf' ? (
                        <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center">
                          <FileUp className="w-8 h-8 text-red-400" />
                          <span className="text-xs text-red-600 ml-2">PDF</span>
                        </div>
                      ) : image.filePreview ? (
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
                        <Check className="w-4 h-4 text-blue-500 mr-1" />
                        <span className="text-xs text-blue-600">Image uploaded successfully</span>
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
            {hasAvailableDocuments() ? "Add Another Document" : "Maximum documents added"}
          </button>

          <motion.section
            className="space-y-4"
            {...fadeIn}
          >
            <div className="flex items-center space-x-2 mb-4">
              <FaCalendarAlt className="w-5 h-5 text-[#0A2463]" />
              <h2 className="text-xl font-semibold text-[#111111]">Schedule Pickup</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">Preferred Date*</label>
                <input
                  type="date"
                  name="preferredDate"
                  value={formData.preferredDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split("T")[0]}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#274690] focus:border-[#274690]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">Preferred Time*</label>
                <select
                  name="preferredTime"
                  value={formData.preferredTime}
                  onChange={handleInputChange}
                  required
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#274690] focus:border-[#274690]"
                >
                  <option value="">Select time slot</option>
                  <option value="06:00-07:00">06:00 AM - 07:00 AM</option>
                  <option value="07:00-08:00">06:00 AM - 07:00 AM</option>
                  <option value="08:00-09:00">08:00 AM - 09:00 AM</option>
                  <option value="09:00-10:00">09:00 AM - 10:00 AM</option>
                  <option value="10:00-11:00">10:00 AM - 11:00 AM</option>
                  <option value="11:00-12:00">11:00 AM - 12:00 PM</option>
                  <option value="13:00-14:00">01:00 PM - 02:00 PM</option>
                  <option value="14:00-15:00">02:00 PM - 03:00 PM</option>
                </select>
              </div>
            </div>
          </motion.section>

          <motion.div 
            className="flex items-start space-x-2 bg-[#d9e9fc] p-4 rounded-lg"
            {...fadeIn}
          >
            <input
              type="checkbox"
              id="privacy"
              checked={isPrivacyChecked}
              onChange={() => setIsPrivacyChecked(!isPrivacyChecked)}
              className="mt-1 rounded text-[#274690] focus:ring-[#274690]"
              required
            />
            <label htmlFor="privacy" className="text-sm text-gray-700">
            I have read and understood the above information. 
            I consent to the collection and use of my personal data as outlined.{" "}
              <button
                type="button"
                onClick={() => setShowPrivacyModal(true)}
                className="text-[#0A2463] hover:text-blue-900 underline"
              >
                Privacy Policy
              </button>
            </label>
          </motion.div>

          {/* Account Creation Notice */}
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
                  Notice
                </h3>
                <div className="mt-1 text-sm text-blue-700">
                  <p>

                    Updates on your requests will be sent via email, 
                    depending on manual processing by the admin. 
                    Please check your email regularly.
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
                {formData.lrn || "N/A"}
              </div>
              <div>
                <span className="font-medium">Email:</span>{" "}
                {formData.email}
              </div>
              <div>
                <span className="font-medium">Phone:</span>{" "}
                {formData.phoneNumber}
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

          <motion.div 
            className="flex justify-end space-x-4"
            {...fadeIn}
          >
            <button
              type="button"
              onClick={() => navigate("/")}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isPrivacyChecked}
              className="px-6 py-2.5 text-sm font-medium text-white bg-[#274690] rounded-lg hover:bg-[#0A2463] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#274690] disabled:opacity-50 disabled:hover:bg-[#274690] transition-colors duration-200"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                "Submit Request"
              )}
            </button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
};

export default AlumniRequestDocument;