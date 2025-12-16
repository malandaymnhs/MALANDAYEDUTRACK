import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, doc, updateDoc, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../../../config/firebase";
import { logActivity, ACTIVITY_TYPES } from "../../../../services/activityLogService";
import { Table, Tag, Select, Modal, Button, message } from "antd";
import { motion } from "framer-motion";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { FiInfo } from "react-icons/fi";
import { CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET } from "../../../../config/cloudinary";

const colorPalette = {
  deepSeaBlue: "#0A2463",
  honeyYellow: "#FFD166",
  royalBlue: "#1D4ED8",
  white: "#fff",
  gray: "#f3f4f6"
};

const statusConfig = {
  pending: { color: "orange", label: "Pending" },
  approved: { color: "green", label: "Approved" },
  claimed: { color: "blue", label: "Claimed" },
  cancelled: { color: "gray", label: "Cancelled" }
};

const documentOptions = [
  { value: "Report Card (Form 138)", label: "Report Card (Form 138)" },
  { value: "Form 137 (SF10)", label: "Form 137 (SF10)" },
  { value: "Certificate of Good Moral Character", label: "Certificate of Good Moral Character" },
  { value: "Certificate of Enrollment", label: "Certificate of Enrollment" },
  { value: "Certificate of Completion (Grade 10)", label: "Certificate of Completion (Grade 10)" },
  { value: "Letter of Recommendation", label: "Letter of Recommendation" },
  { value: "LRN Certificate", label: "LRN Certificate" },
  { value: "Certificate of Graduation (Grade 12)", label: "Certificate of Graduation (Grade 12)" },
  { value: "Certificate of Participation", label: "Certificate of Participation" },
  { value: "Certificate of Recognition", label: "Certificate of Recognition" },
  { value: "Diploma (Grade 12)", label: "Diploma (Grade 12)" },
  { value: "Transcript of Records", label: "Transcript of Records" },
  { value: "Lost ID", label: "Lost ID" }
];

const purposeOptions = [
  { value: "Scholarship Application", label: "Scholarship Application", note: "Submit a copy of the scholarship application form or sponsor's endorsement letter." },
  { value: "Enrollment or Transfer", label: "Enrollment / School Transfer", note: "Provide an endorsement letter or admission slip from the receiving school." },
  { value: "Academic Requirement", label: "Academic Requirement (e.g., Projects, Portfolio)", note: "Present a letter from your teacher or a subject requirement checklist." },
  { value: "School Competition or Event", label: "Participation in School Competition or Event", note: "Submit an invitation or official communication from the organizing body." },
  { value: "Parent/Guardian Request", label: "Parent/Guardian Official Request", note: "Present a signed request letter from the parent or guardian with valid ID." },
  { value: "Financial Assistance", label: "Financial Assistance / Subsidy Application", note: "Provide proof of financial assistance application or referral from a guidance counselor." },
  { value: "Lost Document Replacement", label: "Lost Document Replacement", note: "Submit an affidavit of loss and valid ID." },
  { value: "Personal Record", label: "For Personal Copy / File", note: "Bring a valid student ID or any school-issued document for verification." },
  { value: "Other", label: "Other (Please Specify)", note: "Specify your purpose and bring any supporting documents related to your request." }
];

// --- Helper for holidays/weekends ---
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
    `${year}-01-01`, `${year}-04-09`, `${year}-05-01`, `${year}-06-12`, `${year}-08-26`,
    `${year}-11-30`, `${year}-12-25`, `${year}-12-30`, `${year}-12-31`, `${year}-02-25`
  ];
  const chineseNewYear = [
    '2024-02-10', '2025-01-29', '2026-02-17', '2027-02-06', '2028-01-26',
    '2029-02-13', '2030-02-03', '2031-01-23', '2032-02-11', '2033-01-31'
  ];
  const cny = chineseNewYear.find(date => date.startsWith(year.toString()));
  if (cny) holidays.push(cny);
  const easterSunday = getEasterSunday(year);
  const maundyThursday = new Date(easterSunday); maundyThursday.setDate(easterSunday.getDate() - 3);
  const goodFriday = new Date(easterSunday); goodFriday.setDate(easterSunday.getDate() - 2);
  const blackSaturday = new Date(easterSunday); blackSaturday.setDate(easterSunday.getDate() - 1);
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
const isHoliday = (dateString) => philippineHolidays.includes(dateString);
const isWeekend = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDay();
  return day === 0 || day === 6;
};

// --- Main Component ---
export default function StudentTransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // Only allow claim on/after the scheduled preferredDate
  const isOnOrAfterPreferredDate = () => {
    if (!selectedTransaction?.preferredDate) return false;
    const preferred = new Date(selectedTransaction.preferredDate);
    const today = new Date();
    preferred.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return today.getTime() >= preferred.getTime();
  };

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editImages, setEditImages] = useState([]);
  const [editImageUrls, setEditImageUrls] = useState([]);
  const [editImageIds, setEditImageIds] = useState([]);
  const [editWarning, setEditWarning] = useState({ show: false, message: "" });

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser || (!currentUser.email && !currentUser.uid)) {
      setError("No authenticated user found");
      setLoading(false);
      return;
    }

    setLoading(true);
    const requestsRef = collection(db, "requests");
    const listeners = [];

    const applySnapshot = (snapshot) => {
      try {
        const incoming = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            preferredDate: data.preferredDate?.toDate?.() || data.preferredDate,
            lastUpdated: data.lastUpdated || data.updatedAt || data.createdAt
          };
        });

        setTransactions(prev => {
          const map = new Map(prev.map(item => [item.id, item]));
          for (const item of incoming) {
            map.set(item.id, { ...(map.get(item.id) || {}), ...item });
          }
          const merged = Array.from(map.values());
          merged.sort((a, b) => {
            const aT = (a.lastUpdated?.toMillis?.() || a.lastUpdated?.seconds * 1000 || new Date(a.createdAt).getTime() || 0);
            const bT = (b.lastUpdated?.toMillis?.() || b.lastUpdated?.seconds * 1000 || new Date(b.createdAt).getTime() || 0);
            return bT - aT;
          });
          return merged;
        });
      } finally {
        setLoading(false);
      }
    };

    if (currentUser.email) {
      const byEmail = query(requestsRef, where("email", "==", currentUser.email));
      listeners.push(onSnapshot(byEmail, applySnapshot, (err) => {
        console.error("Error in real-time listener (email):", err);
      }));
    }
    if (currentUser.uid) {
      const byUid = query(requestsRef, where("userId", "==", currentUser.uid));
      listeners.push(onSnapshot(byUid, applySnapshot, (err) => {
        console.error("Error in real-time listener (uid):", err);
      }));
    }

    return () => listeners.forEach(unsub => unsub && unsub());
  }, []);

  const handleView = (record) => {
    setSelectedTransaction(record);
    setIsViewModalOpen(true);
  };

  const handleStatusUpdate = async (documentId) => {
    try {
      setUpdatingStatus(true);
      const requestRef = doc(db, "requests", selectedTransaction.id);
      
      const updatedDocuments = selectedTransaction.documents.map(doc => {
        if (doc.id === documentId) {
          return { ...doc, status: 'cancelled' };
        }
        return doc;
      });

      await updateDoc(requestRef, {
        documents: updatedDocuments,
        updatedAt: new Date()
      });

      // --- Notify user ---
      const auth = getAuth();
      const user = auth.currentUser;
      await addDoc(collection(db, "notifications"), {
        userId: user?.uid,
        type: "document_status",
        message: "Your document request was Canceled on Transaction History.", // or declined, cancelled, etc.
        createdAt: serverTimestamp(),
        read: false,
        redirectTo: "history"
      });

      setSelectedTransaction(prev => ({
        ...prev,
        documents: updatedDocuments
      }));

      setTransactions(prev =>
        prev.map(t =>
          t.id === selectedTransaction.id
            ? { ...t, documents: updatedDocuments }
            : t
        )
      );

      message.success('Document status updated to cancelled');
      // Log canceled request with student name
      try {
        const studentName = `${selectedTransaction.firstName} ${selectedTransaction.lastName}`.trim();
        await logActivity({
          type: ACTIVITY_TYPES.CANCELED_REQUEST,
          userId: user?.uid || null,
          userEmail: user?.email || null,
          role: 'student',
          description: `${studentName} Canceled his/her Request Document.`,
          category: 'request',
          metadata: {
            requestId: selectedTransaction.id,
            documentId,
            studentName,
          },
        });
      } catch {}
    } catch (err) {
      console.error("Error updating status:", err);
      message.error('Failed to update document status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleClaim = async (documentId, docIndex) => {
    try {
      // Guard: only allow on/after scheduled date
      if (!isOnOrAfterPreferredDate()) {
        message.warning('You can only claim on your scheduled date.');
        return;
      }
      setUpdatingStatus(true);
      const requestRef = doc(db, "requests", selectedTransaction.id);

      // Try update by id; if no id match, fallback to index
      let matched = false;
      const updatedDocuments = selectedTransaction.documents.map((d, i) => {
        if (d?.id && d.id === documentId) {
          matched = true;
          return { ...d, status: 'claimed' };
        }
        if (!matched && typeof docIndex === 'number' && i === docIndex) {
          return { ...d, status: 'claimed' };
        }
        return d;
      });

      await updateDoc(requestRef, {
        documents: updatedDocuments,
        updatedAt: new Date()
      });

      // In-app notification for student
      const auth = getAuth();
      const user = auth.currentUser;
      await addDoc(collection(db, "notifications"), {
        userId: user?.uid,
        type: "document_status",
        message: "Successfully claimed your request document on the regiestrar",
        createdAt: serverTimestamp(),
        read: false,
        redirectTo: "history"
      });

      // Update local state
      setSelectedTransaction(prev => ({
        ...prev,
        documents: updatedDocuments
      }));
      setTransactions(prev =>
        prev.map(t =>
          t.id === selectedTransaction.id ? { ...t, documents: updatedDocuments } : t
        )
      );

      message.success('Document marked as claimed');

      // Log claimed activity
      try {
        const studentName = `${selectedTransaction.firstName} ${selectedTransaction.lastName}`.trim();
        await logActivity({
          type: ACTIVITY_TYPES.STATUS_UPDATED,
          userId: user?.uid || null,
          userEmail: user?.email || null,
          role: 'student',
          description: `${studentName} claimed his/her request document`,
          category: 'request',
          metadata: {
            requestId: selectedTransaction.id,
            documentId,
            studentName,
            newStatus: 'claimed'
          },
        });
      } catch {}
    } catch (err) {
      console.error("Error updating status to claimed:", err);
      message.error(`Failed to mark as claimed${err?.message ? `: ${err.message}` : ''}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) return 'Not available';
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (statusFilter === "all") return true;
    return transaction.status?.toLowerCase() === statusFilter.toLowerCase();
  });

  const mobileColumns = [
    {
      title: <span className="text-orange-500 font-semibold">Request</span>,
      key: "mobileView",
      render: (_, record) => (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-3 "
        >
          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold text-orange-500">Documents</h4>
            {record.documents?.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="group hover:bg-blue-50 bg-gray-50 p-1 rounded-md border border-gray-100 transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-gray-900 truncate text-sm">
                        {doc.documentType}
                      </span>
                      <Tag 
                        color={statusConfig[doc.status]?.color || "default"}
                        className="text-[10px] leading-4 px-1.5 mr-auto"
                      >
                        {doc.status?.toUpperCase()}
                      </Tag>
                    </div>
                    <div className="text-[11px] text-gray-600 mt-1">
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <span className="font-medium">Purpose:</span>
                          <span className="truncate">{doc.purpose}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="font-medium">Copies:</span>
                          <span>{doc.copies}</span>
                        </span>
                      </div>
                      {doc.gradeYear && (
                        <div className="font-medium mt-1">
                          Grade Year: {doc.gradeYear}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-1 text-orange-500">Schedule</h4>
            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
              <div className="font-medium text-blue-900">
                {record.preferredDate ? new Date(record.preferredDate).toLocaleDateString() : 'Not set'}
              </div>
              <div className="text-xs text-blue-700 mt-1">
                {record.preferredTime || 'No time set'}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => handleView(record)}
              className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors duration-200"
            >
              View
            </button>
          </div>
        </motion.div>
      ),
    }
  ];

  const desktopColumns = [
    {
      title: <span className="text-orange-500 font-semibold">Documents</span>,
      key: "documents",
      width: '50%',
      render: (_, record) => (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-1.5 p-1"
        >
          {record.documents?.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="group hover:bg-blue-50 bg-gray-50 p-1.5 rounded-md border border-gray-100 transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-900 truncate text-sm">
                      {doc.documentType}
                    </span>
                    <Tag 
                      color={statusConfig[doc.status]?.color || "default"}
                      className="text-[10px] leading-4 px-1.5 ml-auto"
                    >
                      {doc.status?.toUpperCase()}
                    </Tag>
                  </div>
                  <div className="text-[11px] text-gray-600 mt-0.5">
                    <div className="flex items-center gap-x-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="font-medium">Purpose:</span>
                        <span className="truncate">{doc.purpose}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="font-medium">Copies:</span>
                        <span>{doc.copies}</span>
                      </span>
                    </div>
                    {doc.gradeYear && (
                      <div className="font-medium mt-0.5">
                        Grade Year: {doc.gradeYear}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ),
    },
    {
      title: <span className="text-orange-500 font-semibold">Schedule</span>,
      key: "schedule",
      width: '30%',
      render: (_, record) => (
        <div className="p-2">
          <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
            <div className="font-medium text-blue-900">
              {record.preferredDate ? new Date(record.preferredDate).toLocaleDateString() : 'Not set'}
            </div>
            <div className="text-xs text-blue-700 mt-1">
              {record.preferredTime || 'No time set'}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: <span className="text-orange-500 font-semibold">Actions</span>,
      key: "actions",
      width: '20%',
      render: (_, record) => (
        <div className="space-x-2">
          <button
            onClick={() => handleView(record)}
            className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors duration-200"
          >
            View
          </button>
        </div>
      ),
    }
  ];

  const columns = screenWidth < 768 ? mobileColumns : desktopColumns;

  const openEditModal = () => {
    setEditForm({
      ...selectedTransaction,
      documents: selectedTransaction.documents.map(doc => ({ ...doc })),
    });
    setEditImageUrls(selectedTransaction.imageUrls || []);
    setEditImageIds(selectedTransaction.imageIds || []);
    setEditImages([]);
    setIsEditModalOpen(true);
  };

  const handleEditInput = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditDocChange = (idx, field, value) => {
    setEditForm(prev => ({
      ...prev,
      documents: prev.documents.map((doc, i) =>
        i === idx ? { ...doc, [field]: value } : doc
      )
    }));
  };

  const handleEditImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setEditWarning({ show: true, message: "Only JPG/PNG images allowed." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setEditWarning({ show: true, message: "Max file size is 5MB." });
      return;
    }
    try {
      // Show loading indicator if you want
      const url = await uploadImageToCloudinary(file);
      setEditImageUrls([url]);
    } catch (err) {
      setEditWarning({ show: true, message: "Failed to upload image." });
    }
  };

  const handleEditDate = (e) => {
    const value = e.target.value;
    if (isWeekend(value)) {
      setEditWarning({ show: true, message: "Weekends are not allowed." });
      return;
    }
    if (isHoliday(value)) {
      setEditWarning({ show: true, message: "This date is a holiday." });
      return;
    }
    setEditForm(prev => ({ ...prev, preferredDate: value }));
  };

  const handleEditSubmit = async () => {
    try {
      if (!editForm.lastName || !editForm.firstName || !editForm.lrn || !editForm.preferredDate || !editForm.preferredTime) {
        setEditWarning({ show: true, message: "Please fill all required fields." });
        return;
      }
      for (const doc of editForm.documents) {
        if (!doc.documentType || !doc.purpose || !doc.copies) {
          setEditWarning({ show: true, message: "Please complete all document fields." });
          return;
        }
      }
      const requestRef = doc(db, "requests", editForm.id);
      await updateDoc(requestRef, {
        ...editForm,
        imageUrls: editImageUrls,
        imageIds: editImageIds,
        updatedAt: new Date()
      });

      // --- Add in-app notification for edit request ---
      const auth = getAuth();
      const user = auth.currentUser;
      await addDoc(collection(db, "notifications"), {
        userId: user?.uid,
        type: "document_request",
        message: "Successfully edit for Request Document",
        createdAt: serverTimestamp(),
        read: false,
        redirectTo: "history"
      });

      // --- Log edit request activity ---
      try {
        const studentName = `${editForm.firstName} ${editForm.lastName}`.trim();
        await logActivity({
          type: ACTIVITY_TYPES.EDIT_REQUEST,
          userId: user?.uid || null,
          userEmail: user?.email || editForm.email || null,
          role: 'student',
          description: `Successfully Edit the Request Document.`,
          category: 'request',
          metadata: {
            requestId: editForm.id,
            studentName,
            updatedFields: ['documents', 'schedule', 'personal info']
          },
        });
      } catch (error) {
        console.error('Error logging edit request activity:', error);
      }

      setTransactions(prev =>
        prev.map(t => t.id === editForm.id ? { ...t, ...editForm, imageUrls: editImageUrls, imageIds: editImageIds } : t)
      );
      setSelectedTransaction({ ...editForm, imageUrls: editImageUrls, imageIds: editImageIds });
      setIsEditModalOpen(false);
      message.success("Request updated!");
    } catch (err) {
      setEditWarning({ show: true, message: "Failed to update request." });
    }
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

  return (
    <div className="relative z-0 bg-transparent">
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading transactions...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-white rounded-lg shadow-lg overflow-hidden min-h-[85vh] overflow-y-auto"
        >
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No transactions found</p>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={filteredTransactions}
              rowKey="id"
              loading={loading}
              scroll={{ x: true }}
              pagination={{
                pageSize: 10,
                responsive: true,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '30'],
                className: 'px-4',
                showTotal: (total) => (
                  <span className="text-gray-600">
                    Total {total} requests
                  </span>
                )
              }}
              className="w-full"
              rowClassName={(record, index) =>
                `${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} 
                 hover:bg-blue-50 transition-colors duration-200`
              }
            />
          )}
        </motion.div>
      )}

      <Modal
        title={<span className="font-bold text-lg text-[#1D4ED8]">Request Details</span>}
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={[
          (selectedTransaction && selectedTransaction.documents.some(doc => doc.status === "pending")) && (
            <Button
              key="edit"
              className="bg-[#1D4ED8] text-white border-none hover:bg-[#2563eb] shadow-md"
              onClick={openEditModal}
            >
              Edit Request
            </Button>
          )
        ]}
        width={Math.min(700, screenWidth - 40)}
        className="!p-0 "
      >
        {selectedTransaction && (
          <div className="space-y-6 bg-[#F3F4F6] p-6 rounded-b-lg">
            {selectedTransaction.imageUrls && selectedTransaction.imageUrls.length > 0 && (
              <div className="bg-white border-l-4 border-[#FFD166] p-4 rounded-lg shadow">
                <h3 className="font-semibold text-lg text-[#0A2463] mb-2">Uploaded Images</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedTransaction.imageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Uploaded document ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border-2 border-[#1D4ED8] shadow"
                        onClick={() => window.open(url, '_blank')}
                      />
                      <div className="absolute inset-0 bg-[#0A2463]/60 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-lg flex items-center justify-center">
                        <button
                          onClick={() => window.open(url, '_blank')}
                          className="bg-[#FFD166] text-[#0A2463] px-4 py-2 rounded-md text-sm font-semibold shadow hover:bg-[#ffe08a]"
                        >
                          View Full Image
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border-l-4 border-[#1D4ED8] p-4 rounded-lg shadow">
              <h3 className="font-semibold text-lg text-[#0A2463] mb-2">Student Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-[#1D4ED8]">Name</p>
                  <p className="text-[#0A2463]">{`${selectedTransaction.lastName}, ${selectedTransaction.firstName} ${
                    selectedTransaction.middleName ? selectedTransaction.middleName.charAt(0) + '.' : ''
                  }`}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1D4ED8]">LRN</p>
                  <p className="text-[#0A2463]">{selectedTransaction.lrn || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1D4ED8]">Grade Level</p>
                  <p className="text-[#0A2463]">{selectedTransaction.currentYearLevel || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1D4ED8]">Email</p>
                  <p className="text-[#0A2463]">{selectedTransaction.email}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border-l-4 border-[#FFD166] p-4 rounded-lg shadow">
              <h3 className="font-semibold text-lg text-[#0A2463] mb-2">Requested Documents</h3>
              <div className="space-y-2">
                {selectedTransaction.documents?.map((doc, index) => (
                  <div key={index} className="border-b pb-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-[#1D4ED8]">{doc.documentType}</span>
                      <div className="flex items-center gap-2">
                        <Tag color={statusConfig[doc.status]?.color || "default"}>
                          {doc.status?.toUpperCase()}
                        </Tag>
                        {doc.status === 'pending' && (
                          <Button
                            size="small"
                            danger
                            onClick={() => handleStatusUpdate(doc.id)}
                            loading={updatingStatus}
                            className="border-none bg-[#FFD166] text-[#0A2463] hover:bg-[#ffe08a]"
                          >
                            Cancel
                          </Button>
                        )}
                        {doc.status === 'approved' && isOnOrAfterPreferredDate() && (
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => handleClaim(doc.id, index)}
                            loading={updatingStatus}
                            className="border-none bg-[#1D4ED8] text-white hover:bg-[#2563eb]"
                          >
                            Claim
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-[#0A2463]">Purpose: <span className="text-[#1D4ED8]">{doc.purpose}</span></p>
                    <p className="text-sm text-[#0A2463]">Copies: <span className="text-[#1D4ED8]">{doc.copies}</span></p>
                    <p className="text-sm text-[#0A2463]">Requested On: <span className="text-[#1D4ED8]">{formatDateTime(selectedTransaction.createdAt)}</span></p>
                    {doc.gradeYear && (
                      <p className="text-sm text-[#0A2463]">Grade Year: <span className="text-[#1D4ED8]">{doc.gradeYear}</span></p>
                    )}
                    {doc.status === "cancelled" && doc.cancelReason && (
                      <div className="flex items-center gap-2 mt-2 text-red-600">
                        <ExclamationCircleOutlined className="text-lg" />
                        <span className="font-semibold">Important message:</span>
                        <span>{doc.cancelReason}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border-l-4 border-[#1D4ED8] p-4 rounded-lg shadow">
              <h3 className="font-semibold text-lg text-[#0A2463] mb-2">Schedule Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-[#1D4ED8]">Preferred Date</p>
                  <p className="text-[#0A2463]">{selectedTransaction.preferredDate ? new Date(selectedTransaction.preferredDate).toLocaleDateString() : 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1D4ED8]">Preferred Time</p>
                  <p className="text-[#0A2463]">{selectedTransaction.preferredTime || 'No time set'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title={<span className="font-bold text-lg text-[#1D4ED8]">Edit Request Details</span>}
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        onOk={handleEditSubmit}
        okText="Save Changes"
        width={700}
        styles={{ body: { background: colorPalette.gray } }}
        className="!p-0"
      >
        {editWarning.show && (
          <div className="mb-4 p-3 rounded bg-yellow-100 text-yellow-800 flex items-center gap-2">
            <ExclamationCircleOutlined className="text-yellow-500" />
            <span>{editWarning.message}</span>
            <button className="ml-auto text-xs text-blue-700" onClick={() => setEditWarning({ show: false, message: "" })}>Close</button>
          </div>
        )}
        {editForm && (
          <div className="space-y-6">
            <div>
              <label className="block font-semibold text-[15px] text-[#0A2463] mb-1">Change Image</label>
              <input
                type="file"
                accept="image/*"
                className="block w-full border border-[#FFD166] rounded p-2"
                onChange={handleEditImageUpload}
              />
              {editImageUrls.length > 0 && (
                <img src={editImageUrls[0]} alt="Preview" className="w-32 h-32 mt-2 object-cover rounded border-2 border-[#FFD166]" />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                className="border border-[#FFD166] p-2 rounded focus:ring-2 focus:ring-[#1D4ED8]"
                value={editForm.lastName}
                onChange={e => handleEditInput({ target: { name: "lastName", value: e.target.value } })}
                placeholder="Last Name"
                required
              />
              <input
                className="border border-[#FFD166] p-2 rounded focus:ring-2 focus:ring-[#1D4ED8]"
                value={editForm.firstName}
                onChange={e => handleEditInput({ target: { name: "firstName", value: e.target.value } })}
                placeholder="First Name"
                required
              />
              <input
                className="border border-[#FFD166] p-2 rounded focus:ring-2 focus:ring-[#1D4ED8]"
                value={editForm.middleName}
                onChange={e => handleEditInput({ target: { name: "middleName", value: e.target.value } })}
                placeholder="Middle Name"
              />
            </div>
            <input
              className="border border-[#FFD166] p-2 rounded w-full focus:ring-2 focus:ring-[#1D4ED8]"
              value={editForm.lrn}
              onChange={e => handleEditInput({ target: { name: "lrn", value: e.target.value.replace(/\D/g, "") } })}
              placeholder="LRN"
              maxLength={12}
              required
            />

            <div>
              <label className="block font-semibold text-[15px] text-[#0A2463] mb-1">Requested Documents</label>
              {editForm.documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="border-2 border-[#FFD166] rounded-xl p-4 mb-4 bg-white shadow-[0_2px_8px_0_rgba(29,78,216,0.07)] transition-all duration-200"
                >
                  <select
                    className="border-2 border-[#1D4ED8] rounded-lg p-2 mb-2 w-full focus:ring-2 focus:ring-[#FFD166] font-medium text-[#0A2463] bg-[#F3F4F6] hover:border-[#0A2463] transition"
                    value={doc.documentType}
                    onChange={e => handleEditDocChange(idx, "documentType", e.target.value)}
                    required
                  >
                    <option value="">Select document</option>
                    {documentOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <select
                    className="border-2 border-[#1D4ED8] rounded-lg p-2 mb-2 w-full focus:ring-2 focus:ring-[#FFD166] font-medium text-[#0A2463] bg-[#F3F4F6] hover:border-[#0A2463] transition"
                    value={doc.purpose}
                    onChange={e => handleEditDocChange(idx, "purpose", e.target.value)}
                    required
                  >
                    <option value="">Select purpose</option>
                    {purposeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {purposeOptions.find(opt => opt.value === doc.purpose)?.note && (
                    <div className="flex items-start text-xs text-[#1D4ED8] mb-2 bg-[#E8F0FE] rounded px-2 py-1">
                      <FiInfo className="mr-1 mt-0.5" />
                      {purposeOptions.find(opt => opt.value === doc.purpose)?.note}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-[#0A2463]">Copies:</label>
                    <input
                      type="number"
                      min={1}
                      max={3}
                      value={doc.copies}
                      onChange={e => handleEditDocChange(idx, "copies", Math.min(3, Math.max(1, Number(e.target.value))))}
                      className="border-2 border-[#FFD166] rounded-lg p-1 w-16 text-center font-semibold text-[#1D4ED8] bg-[#FFFBEA] focus:ring-2 focus:ring-[#1D4ED8]"
                      required
                    />
                    <span className="text-xs text-[#1D4ED8] font-medium">(Max: 3)</span>
                  </div>
                  {doc.documentType === "Copy of Grades" && (
                    <select
                      className="border-2 border-[#FFD166] rounded-lg p-2 mt-2 w-full focus:ring-2 focus:ring-[#1D4ED8] font-medium text-[#0A2463] bg-[#F3F4F6]"
                      value={doc.gradeYear || ""}
                      onChange={e => handleEditDocChange(idx, "gradeYear", e.target.value)}
                      required
                    >
                      <option value="">Select grade level</option>
                      <option value="7">Grade 7</option>
                      <option value="8">Grade 8</option>
                      <option value="9">Grade 9</option>
                      <option value="10">Grade 10</option>
                      <option value="11">Grade 11</option>
                      <option value="12">Grade 12</option>
                    </select>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <input
                type="date"
                className="border-2 border-[#1D4ED8] p-2 rounded-lg focus:ring-2 focus:ring-[#FFD166] font-medium text-[#0A2463] bg-[#F3F4F6] hover:border-[#FFD166] transition"
                value={editForm.preferredDate ? editForm.preferredDate.toString().slice(0, 10) : ""}
                onChange={handleEditDate}
                min={new Date().toISOString().split("T")[0]}
                required
              />
              <select
                className="border-2 border-[#1D4ED8] p-2 rounded-lg focus:ring-2 focus:ring-[#FFD166] font-medium text-[#0A2463] bg-[#F3F4F6] hover:border-[#FFD166] transition"
                value={editForm.preferredTime}
                onChange={e => setEditForm(prev => ({ ...prev, preferredTime: e.target.value }))}
                required
              >
                <option value="">Select time slot</option>
                <option value="06:00-07:00">06:00 AM - 07:00 AM</option>
                <option value="07:00-08:00">07:00 AM - 08:00 AM</option>
                <option value="08:00-09:00">08:00 AM - 09:00 AM</option>
                <option value="09:00-10:00">09:00 AM - 10:00 AM</option>
                <option value="10:00-11:00">10:00 AM - 11:00 AM</option>
                <option value="11:00-12:00">11:00 AM - 12:00 PM</option>
                <option value="13:00-14:00">01:00 PM - 02:00 PM</option>
                <option value="14:00-15:00">02:00 PM - 03:00 PM</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}