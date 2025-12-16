import { useState, useRef, useEffect } from "react";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { getAuth } from 'firebase/auth';
import { db } from "../../../config/firebase";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import QrScanner from 'qr-scanner';
import { ActivityLogger } from '../../../services/activityLogService';


import { 
  Upload, 
  Camera, 
  CheckCircle, 
  Search, 
  X, 
  Loader, 
  RefreshCw 
} from "lucide-react";

function VerifyDocument({ onClose }) {
  const [image, setImage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requestData, setRequestData] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState(null);
  const auth = getAuth();

  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const letterRef = useRef(null);
  const html2CanvasLoadedRef = useRef(false);

  useEffect(() => {
    // Clean up on unmount
    return () => {
      stopCamera();
    };
  }, []);

  // Token-based deep-link verification (?token=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const snap = await getDoc(doc(db, 'qr_tokens', token));
        if (!snap.exists()) {
          throw new Error('Invalid or expired token.');
        }
        const data = snap.data() || {};
        // Optional expiry/used flags if you maintain them
        if (data.expiresAt) {
          const exp = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
          if (isFinite(exp?.getTime()) && exp < new Date()) {
            throw new Error('This verification link has expired.');
          }
        }
        const verifiedPayload = {
          firstName: data.firstName || data.student?.firstName || '',
          lastName: data.lastName || data.student?.lastName || '',
          middleName: data.middleName || data.student?.middleName || '',
          documentType: data.documentType || data.document?.type || '',
          purpose: data.purpose || data.document?.purpose || '',
          lrn: data.lrn || data.student?.lrn || 'N/A',
          gradeYear: data.gradeYear || data.document?.gradeYear || '',
          copies: data.copies || data.document?.copies || 1,
          scheduledDate: data.scheduledDate || data.preferredDate || ''
        };
        setRequestData(verifiedPayload);
        setShowResults(true);
        // Log activity
        try {
          const current = auth.currentUser;
          const userName = (data.userName || `${verifiedPayload.firstName} ${verifiedPayload.middleName ? verifiedPayload.middleName + ' ' : ''}${verifiedPayload.lastName}` || '').trim();
          const detectedRole = (data.role || data.userRole || data.student?.role || (data.student ? 'student' : (data.alumni ? 'alumni' : null))) || null;
          const detectedEmail = current?.email 
            || data.email 
            || data.userEmail 
            || data.student?.email 
            || data.contactEmail 
            || null;
          await ActivityLogger.qrChecked({
            detectedUserName: userName || 'Unknown User',
            detectedUserId: current?.uid || null,
            detectedUserEmail: detectedEmail,
            detectedRole,
            documentType: verifiedPayload.documentType,
            purpose: verifiedPayload.purpose,
            lrn: verifiedPayload.lrn,
            loggedIn: !!current,
          });
        } catch {}
      } catch (e) {
        setError(e?.message || 'Failed to verify token.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [auth]);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    },
    exit: { opacity: 0, y: -20 }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
    tap: { scale: 0.98 }
  };

  const verifyQRCode = async (qrData) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Raw QR Data:', qrData);

      let parsedData;
      try {
        parsedData = JSON.parse(qrData);
        console.log('Parsed QR data:', parsedData);
        
        // Backward-compatible normalization for legacy QR payloads
        const studentObj = parsedData.student || {};
        const documentObj = parsedData.document || {};
        const requestObj = parsedData.request || {};

        // Name normalization
        let firstName = studentObj.firstName || parsedData.firstName || '';
        let middleName = studentObj.middleName || parsedData.middleName || '';
        let lastName = studentObj.lastName || parsedData.lastName || '';
        if ((!firstName || !lastName) && typeof studentObj.name === 'string' && studentObj.name.trim().length > 0) {
          const nameStr = studentObj.name.trim();
          if (nameStr.includes(',')) {
            const parts = nameStr.split(',');
            const ln = (parts[0] || '').trim();
            const rest = parts.slice(1).join(',').trim();
            const restParts = rest.split(' ').filter(Boolean);
            lastName = lastName || ln;
            firstName = firstName || (restParts[0] || '');
            middleName = middleName || (restParts.slice(1).join(' ') || '');
          } else {
            const segs = nameStr.split(' ').filter(Boolean);
            if (segs.length >= 2) {
              firstName = firstName || segs[0];
              lastName = lastName || segs[segs.length - 1];
              middleName = middleName || segs.slice(1, -1).join(' ');
            } else {
              firstName = firstName || nameStr;
            }
          }
        }

        // LRN normalization (initial)
        const pickFirst = (...vals) => vals.find(v => typeof v === 'string' && v.trim().length > 0) || '';
        let resolvedLRN = pickFirst(
          studentObj.lrn,
          studentObj.LRN,
          parsedData.lrn,
          parsedData.LRN,
          parsedData.studentLrn,
          parsedData.studentLRN,
          studentObj.idNumber,
          parsedData.idNumber
        );

        // Document fields normalization
        const documentType = documentObj.type || parsedData.documentType || documentObj.documentType || parsedData.type || '';
        const purpose = documentObj.purpose || parsedData.purpose || parsedData.reason || '';
        const copies = documentObj.copies || parsedData.copies || 1;
        const gradeYear = documentObj.gradeYear || parsedData.gradeYear || studentObj.currentYearLevel || parsedData.currentYearLevel || parsedData.grade || '';

        // Schedule normalization
        const normalizeDate = (val) => {
          if (!val) return '';
          try {
            if (typeof val === 'string' || typeof val === 'number') {
              const d = new Date(val);
              return isNaN(d.getTime()) ? '' : d.toISOString();
            }
            if (val && typeof val === 'object') {
              if (typeof val._seconds === 'number') return new Date(val._seconds * 1000).toISOString();
              if (typeof val.toDate === 'function') return val.toDate().toISOString();
            }
          } catch (_) { /* ignore */ }
          return '';
        };
        // Candidate fields for schedule/request dates
        const rawScheduleCandidates = [
          requestObj.preferredDate,
          parsedData.preferredDate,
          parsedData.scheduleDate,
          parsedData.scheduledDate,
          requestObj.scheduleDate,
          // Fallback to requested/created timestamps if schedule not set
          requestObj.dateRequested,
          parsedData.dateRequested,
          parsedData.createdAt,
          requestObj.createdAt
        ];
        let scheduledDate = '';
        for (const cand of rawScheduleCandidates) {
          const norm = normalizeDate(cand);
          if (norm) { scheduledDate = norm; break; }
        }

        // Use requestId to resolve from database if available
        const qrRequestId = requestObj.requestId || parsedData.requestId || '';
        if (qrRequestId) {
          try {
            const q = query(collection(db, 'requests'), where('requestId', '==', qrRequestId));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const docData = snap.docs[0].data() || {};
              const dbScheduleCandidates = [
                docData.preferredDate,
                docData.scheduleDate,
                docData.scheduledDate,
                docData.request?.preferredDate,
                docData.request?.scheduleDate,
                docData.createdAt,
                docData.dateRequested
              ];
              for (const cand of dbScheduleCandidates) {
                const norm = normalizeDate(cand);
                if (norm) { scheduledDate = norm; break; }
              }
              // Resolve LRN from database if missing
              if (!resolvedLRN) {
                const dbStudent = docData.student || {};
                const tryDocs = Array.isArray(docData.documents) ? docData.documents : [];
                const lrnFromDocs = tryDocs.map(x => (
                  pickFirst(x?.lrn, x?.ownerLRN, x?.student?.lrn, x?.student?.LRN, x?.idNumber)
                )).find(v => v);
                resolvedLRN = pickFirst(
                  docData.lrn,
                  docData.LRN,
                  dbStudent.lrn,
                  dbStudent.LRN,
                  docData.ownerLRN,
                  docData.idNumber,
                  dbStudent.idNumber,
                  lrnFromDocs
                );
              }
            }
          } catch (dbErr) {
            console.warn('Failed to resolve schedule from database by requestId:', dbErr);
          }
          // Fallback: scan requests for nested documents[].requestId match
          if (!scheduledDate || !resolvedLRN) {
            try {
              const allSnap = await getDocs(collection(db, 'requests'));
              for (const d of allSnap.docs) {
                const data = d.data() || {};
                const docsArr = Array.isArray(data.documents) ? data.documents : [];
                const match = docsArr.find(x => x && (x.requestId === qrRequestId));
                if (match) {
                  if (!scheduledDate) {
                    const cands = [
                      data.preferredDate,
                      data.scheduleDate,
                      data.scheduledDate,
                      data.request?.preferredDate,
                      data.request?.scheduleDate,
                      data.createdAt,
                      data.dateRequested
                    ];
                    for (const cand of cands) {
                      const norm = normalizeDate(cand);
                      if (norm) { scheduledDate = norm; break; }
                    }
                  }
                  if (!resolvedLRN) {
                    const dbStudent = data.student || {};
                    const tryDocs2 = Array.isArray(data.documents) ? data.documents : [];
                    const lrnFromDocs2 = tryDocs2.map(x => (
                      pickFirst(x?.lrn, x?.ownerLRN, x?.student?.lrn, x?.student?.LRN, x?.idNumber)
                    )).find(v => v);
                    resolvedLRN = pickFirst(
                      data.lrn,
                      data.LRN,
                      dbStudent.lrn,
                      dbStudent.LRN,
                      data.ownerLRN,
                      data.idNumber,
                      dbStudent.idNumber,
                      lrnFromDocs2
                    );
                  }
                  break;
                }
              }
            } catch (scanErr) {
              console.warn('Failed scanning requests for nested requestId match:', scanErr);
            }
          }
        }

        const combinedName = `${firstName || ''}${middleName ? ' ' + middleName : ''}${lastName ? ' ' + lastName : ''}`.trim();
        const verifiedPayload = {
          firstName: firstName || '',
          lastName: lastName || '',
          middleName: middleName || '',
          documentType,
          purpose,
          lrn: resolvedLRN || 'N/A',
          gradeYear,
          copies,
          scheduledDate
        };
        setRequestData(verifiedPayload);
        // Log QR verification
        try {
          const current = auth.currentUser;
          const userName = (combinedName || current?.displayName || parsedData?.student?.name || parsedData?.name || '').trim();
          const detectedRole = (
            parsedData?.role || parsedData?.userRole || (typeof studentObj === 'object' ? studentObj.role : null) || (gradeYear ? 'student' : null)
          ) || null;
          const detectedEmail = current?.email 
            || parsedData?.email 
            || parsedData?.userEmail 
            || studentObj?.email 
            || null;
          await ActivityLogger.qrChecked({
            detectedUserName: userName || 'Unknown User',
            detectedUserId: current?.uid || null,
            detectedUserEmail: detectedEmail,
            detectedRole,
            documentType,
            purpose,
            lrn: verifiedPayload.lrn,
            loggedIn: !!current,
          });
        } catch (_) { /* non-blocking */ }
        setShowResults(true);
      } catch (error) {
        console.error('JSON parsing error:', error);
        throw new Error('Invalid QR code: This QR code is not from MNHS document system. Please scan a valid MNHS document QR code.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsLoading(true);
      try {
        if (file.size > 5000000) { 
          throw new Error('Image is too large. Please select a smaller image.');
        }
        console.log('Scanning uploaded image...'); 
        const result = await QrScanner.scanImage(file);
        console.log('Scan result:', result); 
        
        if (!result) {
          throw new Error('No QR code found in image');
        }
        
        await verifyQRCode(result);
        setImage(URL.createObjectURL(file));
      } catch (error) {
        console.error('Upload error:', error); 
        setError(`Failed to read QR code: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleQrScan = (result) => {
    if (result) {
      setIsScanning(false);
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }
      verifyQRCode(result.data);
    }
  };

  const startCamera = async () => {
    setIsScanning(true);
    setError(null);
    setImage(null);
    setRequestData(null);
    setShowResults(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera access is not supported in your browser');
      setIsScanning(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => resolve();
        });

        
        qrScannerRef.current = new QrScanner(
          videoRef.current,
          result => {
            console.log('QR detected:', result); 
            handleQrScan(result);
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 5, 
            returnDetailedScanResult: true,
            preferredCamera: 'environment',
            calculateScanRegion: (video) => {
              const smallestDimension = Math.min(video.videoWidth, video.videoHeight);
              const scanRegionSize = Math.round(smallestDimension * 0.6); // Reduced scan area for better focus
              
              return {
                x: Math.round((video.videoWidth - scanRegionSize) / 2),
                y: Math.round((video.videoHeight - scanRegionSize) / 2),
                width: scanRegionSize,
                height: scanRegionSize,
              };
            },
          }
        );

        console.log('Starting QR scanner...'); 
        await qrScannerRef.current.start();
        console.log('QR scanner started'); 

        
        setTimeout(() => {
          if (isScanning && !requestData) {
            console.log('Scanner health check...'); 
            qrScannerRef.current.hasFlash().then(hasFlash => {
              if (hasFlash) {
                qrScannerRef.current.tryPlayVideoDevice();
              }
            });
          }
        }, 3000);

      }
    } catch (error) {
      console.error('Camera initialization error:', error);
      let errorMessage = 'Failed to initialize camera. Please try again.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please enable camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please ensure your device has a working camera.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is in use by another application. Please close other apps using the camera.';
      }
      
      setError(errorMessage);
      setIsScanning(false);
      
      
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  };

  const stopCamera = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const resetVerification = () => {
    setImage(null);
    setRequestData(null);
    setShowResults(false);
    setError(null);
    stopCamera();
  };

  // Ensure html2canvas script is loaded once (via CDN) for pixel-perfect export
  const ensureHtml2Canvas = () => new Promise((resolve, reject) => {
    if (html2CanvasLoadedRef.current && window.html2canvas) return resolve(window.html2canvas);
    const existing = document.querySelector('script[data-html2canvas-cdn]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.html2canvas));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.async = true;
    script.defer = true;
    script.setAttribute('data-html2canvas-cdn', 'true');
    script.onload = () => { html2CanvasLoadedRef.current = true; resolve(window.html2canvas); };
    script.onerror = reject;
    document.body.appendChild(script);
  });

  // Download Authentication Letter exactly as displayed (preserve styles)
  const downloadLetterAsPng = async () => {
    try {
      if (!requestData || !letterRef.current) return;
      const html2canvas = await ensureHtml2Canvas();
      // Increase scale for sharper image, include background and CORS resources
      const canvas = await html2canvas(letterRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true,
        windowWidth: document.documentElement.scrollWidth,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'Valenzuela_SF10.png';
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl bg-white"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-full bg-blue-700 hover:bg-blue-600 text-white transition-colors z-10"
        >
          <X size={24} />
        </button>

        <div className="relative bg-gradient-to-r from-blue-800 to-blue-700 p-6">
          <div className="absolute inset-0 bg-grid-white/[0.05] backdrop-blur-[1px]"></div>
          <div className="relative flex flex-col items-center">
            <img 
              src="logo natin.png" 
              alt="MNHS Logo" 
              className="h-16 mb-3 transform transition-transform duration-300 hover:scale-105"
            />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
              Document Verification
            </h1>
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {!showResults ? (
              <motion.div
                key="upload-section"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="mb-6"
              >
                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-3 text-gray-800">
                  Verify Document Authenticity
                </h2>

                <motion.div 
                  variants={cardVariants}
                  className="p-5 rounded-xl bg-gray-50 border border-gray-200 shadow-sm"
                >
                  <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <label className="flex-1 flex flex-col items-center justify-center p-5 rounded-lg cursor-pointer transition-all duration-300 bg-white hover:bg-blue-50 border border-gray-200 shadow-sm">
                      <Upload className="text-blue-600 mb-2" size={24} />
                      <span className="font-medium text-gray-700">Upload QR Code</span>
                      <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                    </label>
                    
                    <div className="flex items-center justify-center my-2 md:my-0 md:mx-3">
                      <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600 font-medium">
                        OR
                      </span>
                    </div>
                    
                    <button 
                      onClick={isScanning ? stopCamera : startCamera}
                      className={`flex-1 flex flex-col items-center justify-center p-5 rounded-lg transition-all duration-300 
                        ${isScanning 
                          ? "bg-red-50 hover:bg-red-100 border border-red-200" 
                          : "bg-white hover:bg-blue-50 border border-gray-200"} 
                        shadow-sm`}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader className="text-blue-600 mb-2 animate-spin" size={24} />
                      ) : (
                        <Camera className={`mb-2 ${isScanning ? "text-red-500" : "text-blue-600"}`} size={24} />
                      )}
                      <span className="font-medium text-gray-700">
                        {isScanning ? "Stop Scanning" : "Scan QR Code"}
                      </span>
                    </button>
                  </div>
                  
                  {isScanning && (
                    <div className="mt-5 relative">
                      <div className="aspect-video w-full max-w-sm mx-auto">
                        <video 
                          ref={videoRef}
                          className="w-full h-full rounded-lg"
                        />
                        <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none animate-pulse"></div>
                      </div>
                      <div className="mt-3 flex items-center justify-center text-gray-600 text-sm">
                        <Search className="mr-2" size={16} />
                        <span>Align QR code within frame</span>
                      </div>
                    </div>
                  )}
                  
                  {image && !isScanning && (
                    <div className="mt-5 flex justify-center">
                      <img 
                        src={image} 
                        alt="Uploaded QR Code" 
                        className="max-w-xs max-h-48 rounded-lg border border-gray-300 shadow-sm"
                      />
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      {error}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="results-section"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Verification Results
                  </h2>
                  <button 
                    onClick={resetVerification}
                    className="text-sm px-3 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center"
                  >
                    <RefreshCw size={14} className="mr-1" />
                    Verify Another Document
                  </button>
                </div>
                
                <div className="rounded-xl overflow-hidden transition-all duration-300 bg-green-50 border border-green-200">
                  <div className="p-3 flex items-center bg-green-100">
                    <CheckCircle className="text-green-600 mr-2" size={20} />
                    <span className="font-semibold text-green-800">Authentication Successful</span>
                  </div>
                  
                  <div className="p-5">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-10">
                        <Loader className="text-blue-600 mb-4 animate-spin" size={32} />
                        <p className="text-gray-600">Processing QR code...</p>
                      </div>
                    ) : requestData ? (
                      <div className="bg-white p-4 sm:p-6 text-gray-900 rounded-lg shadow-sm border border-gray-200">
                        <div ref={letterRef} className="border border-gray-300 p-4 sm:p-6">
                          <div className="text-center mb-5">
                            <div className="flex justify-center items-center mb-2">
                              <img 
                                src="/mnhslogo.jpg" 
                                alt="School Logo" 
                                className="w-12 h-12" 
                              />
                            </div>
                            <h1 className="text-lg sm:text-xl md:text-2xl font-bold uppercase">Malanday National High School</h1>
                            <p className="text-sm sm:text-base italic">M.H. Del Pilar St. Malanday Valenzuela City</p>
                          </div>

                          <h2 className="text-center text-base sm:text-lg font-bold uppercase mb-4">Certificate of Authentication</h2>

                          <p className="mb-3 text-sm">
                            This is to certify that the document associated with this authentication is an official record issued by
                            <b> Malanday National High School</b> for
                            <span className="font-bold uppercase"> {`${requestData.firstName} ${requestData.middleName ? requestData.middleName + ' ' : ''}${requestData.lastName}`}</span>, bearing
                            <span className="font-bold"> LRN </span>
                            <span className="underline font-bold">{requestData.lrn || 'N/A'}</span>, for the issuance of
                            <span className="font-bold underline"> {requestData.documentType}</span> intended for
                            <span className="font-bold"> {requestData.purpose}</span>.
                          </p>

                          <p className="mb-3 text-sm">
                            This document has been verified and authenticated by the
                            <span className="font-bold"> Registrar&apos;s Office</span>. Any alterations or unauthorized reproduction of this authentication will render it invalid.
                          </p>

                          <p className="mb-4 text-sm">
                            Issued on <span className="font-bold underline">{requestData.scheduledDate ? new Date(requestData.scheduledDate).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'}) : 'N/A'}</span>.
                          </p>

                          <div className="mt-6 text-sm">
                            <p className="font-bold mb-1">Certified by:</p>
                            <p className="font-bold underline">Digna Acuna Manlapaz</p>
                            <p className="font-bold">Registrar / School Administrator</p>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={downloadLetterAsPng}
                            className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 text-sm"
                          >
                            Download Authentication Letter
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

VerifyDocument.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default VerifyDocument;