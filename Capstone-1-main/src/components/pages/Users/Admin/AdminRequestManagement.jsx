import { useState, useEffect } from "react";
import { 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form,
  Input,
  Select,
  message,
  DatePicker,
  Tooltip,
  Row,
  Col,
  Tag,
  Statistic,
  Card,
  Tabs
} from 'antd';
import { 
  EyeOutlined, 
  EditOutlined,
  CalendarOutlined,
  MailOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { addDoc, collection, getDocs, query, orderBy, doc, updateDoc, serverTimestamp, where } from "firebase/firestore";
import { getAuth } from 'firebase/auth';
import { logActivity, ACTIVITY_TYPES } from "../../../../services/activityLogService";
import { db } from "../../../../config/firebase";
import moment from "moment";
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from "react-countup";
import 'react-toastify/dist/ReactToastify.css';

const { Option } = Select;

const RequestManagement = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isEditScheduleModalVisible, setIsEditScheduleModalVisible] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [editScheduleForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState("all");
  const [filteredRows, setFilteredRows] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    students: 0,
    alumni: 0,
    pending: 0,
    approved: 0,
    claimed: 0,
    cancelled: 0,
    documents: {
      pending: [],
      approved: [],
      claimed: [],
      cancelled: []
    }
  });
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingSchedule, setUpdatingSchedule] = useState(false);
  const [cancelModal, setCancelModal] = useState({ visible: false, docId: null });
  const [cancelReason, setCancelReason] = useState("");
  const commonReasons = [
    "Incomplete requirements, Please request again",
    "Incorrect or invalid information, Please request again",
    "Duplicate request, Please request again",
    "Unclear or unsupported documents, Please request again",
  ];

  const statusConfig = {
    pending: { color: "orange", label: "Pending" },
    approved: { color: "green", label: "Approved" },
    claimed: { color: "blue", label: "Claimed" },
    cancelled: { color: "gray", label: "Cancelled" }
  };

  const colors = {
    background: "#1A365D",
    header: "#F4A261",
    text: "#0A2463",
    card: "#FFFFFF",
    highlight: "#FFD166"
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // FIX: Make sure roleFilter is defined before useEffect
  const [roleFilter, setRoleFilter] = useState("all");
  // Search query for filtering students and alumni
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const normalize = (val) => (val ?? "").toString().toLowerCase();
    const q = normalize(searchQuery);

    const matchesSearch = (row) => {
      if (!q) return true;
      const name = `${row.lastName || ''}, ${row.firstName || ''} ${row.middleName ? row.middleName.charAt(0) + '.' : ''}`;
      const email = row.email;
      const lrn = row.lrn;
      const gradYear = row.graduationYear;
      const docBlob = (row.documents || [])
        .map(d => [d.documentType, d.purpose, d.gradeYear].filter(Boolean).join(' '))
        .join(' ');
      return [name, email, lrn, gradYear, docBlob].some(field => normalize(field).includes(q));
    };

    if (activeTab === "all") {
      const filteredByRoleAndSearch = rows
        .filter(row => (roleFilter === 'all' || row.role === roleFilter))
        .filter(matchesSearch);
      setFilteredRows(filteredByRoleAndSearch);
    } else {
      const filteredRequests = rows.filter(row => {
        const expandedDocs = row.documents?.map(doc => ({
          ...doc,
          ownerName: `${row.lastName}, ${row.firstName} ${row.middleName ? row.middleName.charAt(0) + '.' : ''}`,
          ownerRole: row.role,
          ownerLRN: row.lrn
        })) || [];

        const roleMatch = roleFilter === 'all' || row.role === roleFilter;
        const statusMatch = expandedDocs.some(doc => doc.status === activeTab);
        return roleMatch && statusMatch && matchesSearch(row);
      });

      filteredRequests.sort((a, b) => a.lastName.localeCompare(b.lastName));
      setFilteredRows(filteredRequests);
    }
  }, [rows, activeTab, roleFilter, searchQuery]);

  useEffect(() => {
    if (rows.length > 0) {
      const documentStats = {
        total: rows.length,
        students: rows.filter(row => row.role === "student").length,
        alumni: rows.filter(row => row.role === "alumni").length,
        pending: 0,
        approved: 0,
        claimed: 0,
        cancelled: 0,
        documents: {
          pending: [],
          approved: [],
          claimed: [],
          cancelled: []
        }
      };

      rows.forEach(row => {
        const ownerInfo = {
          name: `${row.lastName}, ${row.firstName} ${row.middleName ? row.middleName.charAt(0) + '.' : ''}`,
          role: row.role,
          lrn: row.lrn
        };

        row.documents?.forEach(doc => {
          if (doc.status) {
            documentStats[doc.status]++;
            documentStats.documents[doc.status].push({
              ...doc,
              owner: ownerInfo
            });
          }
        });
      });

      setStats(documentStats);
    }
  }, [rows]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const requestsCollection = collection(db, "requests");
      const requestsQuery = query(requestsCollection, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(requestsQuery);
      
      if (querySnapshot.empty) {
        setRows([]);
        message.info("No requests found.");
        return;
      }

      const requestsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
      }));
      
      setRows(requestsData);
    } catch (error) {
      console.error("Error fetching requests:", error);
      message.error("Failed to load requests data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = (record) => {
    setCurrentRequest(record);
    setIsViewModalVisible(true);
  };

  const updateStatus = async (documentId, newStatus, reason = undefined) => {
    try {
      setUpdatingStatus(true);

      const requestRef = doc(db, "requests", currentRequest.id);

      const updatedDocuments = currentRequest.documents.map(doc => {
        if (doc.id === documentId) {
          return { ...doc, status: newStatus, ...(reason && { cancelReason: reason }) };
        }
        return doc;
      });

      await updateDoc(requestRef, {
        documents: updatedDocuments,
        updatedAt: new Date()
      });

      // Find the request and student UID
      const request = rows.find(row => row.documents.some(doc => doc.id === documentId));
      const studentUid = request?.userId; // Make sure userId is present

      // Compose notification message
      let statusMsg = "";
      if (newStatus === "approved") statusMsg = "Your document request was approved by Registrar.";
      else if (newStatus === "cancelled") statusMsg = "Your document request was cancelled by Registrar.";
      else if (newStatus === "pending") statusMsg = "Your document request was pending, wait for Approval.";
      else if (newStatus === "claimed") statusMsg = "Your document request is already Claimed in the Registrar.";
      else statusMsg = `Your document request status was updated to ${newStatus}.`;

      // Add notification for student
      if (studentUid) {
        try {
          await addDoc(collection(db, "notifications"), {
            userId: studentUid,
            type: "document_status",
            documentId,
            message: statusMsg,
            createdAt: serverTimestamp(),
            read: false,
            redirectTo: "history"
          });
          console.log("✓ Notification sent to student:", studentUid, "Status:", newStatus);
        } catch (notifError) {
          console.error("✗ Error sending notification:", notifError);
        }
      } else {
        console.warn("⚠ No studentUid found for notification");
      }

      const updatedRequest = {
        ...currentRequest,
        documents: updatedDocuments
      };
      setCurrentRequest(updatedRequest);

      const updatedRows = rows.map(row => {
        if (row.id === currentRequest.id) {
          return updatedRequest;
        }
        return row;
      });
      setRows(updatedRows);

      message.success(`Document status updated to ${newStatus}`);

      try {
        const auth = getAuth();
        const admin = auth.currentUser;
        const activityType = newStatus === 'approved' ? ACTIVITY_TYPES.REQUEST_APPROVED : 
                           newStatus === 'rejected' ? ACTIVITY_TYPES.REQUEST_REJECTED : 
                           newStatus === 'cancelled' ? ACTIVITY_TYPES.REQUEST_REJECTED :
                           ACTIVITY_TYPES.STATUS_UPDATED;
        
        await logActivity({
          type: activityType,
          userId: admin?.uid || null,
          userEmail: admin?.email || null,
          description: `Admin ${newStatus} document request for ${currentRequest.firstName} ${currentRequest.lastName}`,
          metadata: {
            requestId: currentRequest.id,
            documentId,
            newStatus,
            reason: reason || null,
            studentName: `${currentRequest.firstName} ${currentRequest.lastName}`,
            documentType: currentRequest.documents?.find(d => d.id === documentId)?.documentType || 'Unknown',
          }
        });
      } catch (error) {
        console.error('Error logging status update activity:', error);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      message.error("Failed to update document status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleStatusUpdate = (documentId, newStatus) => {
    if (newStatus === "cancelled") {
      setCancelModal({ visible: true, docId: documentId });
      setCancelReason("");
      return;
    }
    updateStatus(documentId, newStatus);
  };

  const confirmCancel = async () => {
    if (!cancelReason) {
      message.warning("Please select a reason for cancellation.");
      return;
    }
    await updateStatus(cancelModal.docId, "cancelled", cancelReason);
    setCancelModal({ visible: false, docId: null });
    setCancelReason("");
  };

  const downloadQRCode = (qrCode, documentType, ownerName) => {
    const link = document.createElement('a');
    link.download = `QR_${documentType}_${ownerName}.png`.replace(/\s+/g, '_');
    link.href = qrCode;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewQRCode = (qrCode) => {
    if (qrCode) {
      setPreviewQR({ visible: true, url: qrCode });
    } else {
      message.error("No QR code available to view");
    }
  };

  const showEditScheduleModal = (record) => {
    editScheduleForm.setFieldsValue({
     preferredDate: null,
      preferredTime: null
    });
    setCurrentRequest(record);
    setIsEditScheduleModalVisible(true);
  };

  const handleUpdateSchedule = async () => {
    console.log("Update Schedule button clicked"); // Debugging log
    try {
      setUpdatingSchedule(true);
      const values = await editScheduleForm.validateFields();

      const updatedRequest = {
        ...currentRequest,
        preferredDate: values.preferredDate ? values.preferredDate.format('YYYY-MM-DD') : null,
        preferredTime: values.preferredTime,
        updatedAt: new Date(),
      };

      const requestRef = doc(db, "requests", currentRequest.id);
      await updateDoc(requestRef, {
        preferredDate: updatedRequest.preferredDate,
        preferredTime: updatedRequest.preferredTime,
        updatedAt: updatedRequest.updatedAt,
      });

      // Notify the student about the schedule update
      try {
        const studentUid = currentRequest?.userId;
        if (studentUid) {
          await addDoc(collection(db, "notifications"), {
            userId: studentUid,
            type: "schedule_update",
            title: "Schedule Updated",
            message: `Your pickup schedule was updated to ${
              updatedRequest.preferredDate || 'TBD'
            } ${updatedRequest.preferredTime ? `at ${updatedRequest.preferredTime}` : ''}.`,
            createdAt: serverTimestamp(),
            read: false,
            redirectTo: "history",
            link: "/studentDashboard"
          });
        }
      } catch (notifyErr) {
        console.error("Failed to send schedule update notification:", notifyErr);
      }

      const updatedRows = rows.map(row =>
        row.id === currentRequest.id ? updatedRequest : row
      );

      setRows(updatedRows);
      setCurrentRequest(updatedRequest);
      setIsEditScheduleModalVisible(false);
      message.success("Schedule updated successfully!");
      // Log schedule update with student name
      try {
        const auth = getAuth();
        const admin = auth.currentUser;
        const studentName = `${currentRequest.firstName} ${currentRequest.lastName}`.trim();
        await logActivity({
          type: ACTIVITY_TYPES.SCHEDULE_UPDATED,
          userId: admin?.uid || null,
          userEmail: admin?.email || null,
          role: 'admin',
          description: `Admin changed the Schedule (${studentName})`,
          category: 'admin',
          metadata: {
            requestId: currentRequest.id,
            preferredDate: updatedRequest.preferredDate,
            preferredTime: updatedRequest.preferredTime,
            studentName,
          },
        });
      } catch {}
    } catch (error) {
      console.error("Error updating schedule:", error);
      message.error("Failed to update schedule.");
    } finally {
      setUpdatingSchedule(false);
    }
  };

  const [previewQR, setPreviewQR] = useState({ visible: false, url: null });
  const [previewImage, setPreviewImage] = useState({ visible: false, url: null });

  const handleSendEmail = async (email) => {
    if (!email) {
      message.error("No email address found for this user.");
      return;
    }
    // Resolve alumni name and log BEFORE opening Gmail to ensure log is captured
    try {
      let alumniName = email;
      try {
        const usersRef = collection(db, 'users');
        const qUsers = query(usersRef, where('email', '==', email));
        const snap = await getDocs(qUsers);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          alumniName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || email;
        }
      } catch {}

      const auth = getAuth();
      const admin = auth.currentUser;
      await logActivity({
        type: ACTIVITY_TYPES.SEND_EMAIL,
        userId: admin?.uid || null,
        userEmail: admin?.email || null,
        role: 'admin',
        description: `Admin Message (${alumniName}).`,
        category: 'admin',
        metadata: { recipientEmail: email, recipientName: alumniName },
      });
    } catch {}

    const gmailUrl = `https://mail.google.com/mail/u/0/#inbox?compose=new&to=${encodeURIComponent(email)}`;
    // Use $BROWSER for dev container (Ubuntu), otherwise fallback to window.open
    if (typeof window === "undefined") {
      // Node.js environment (dev container)
      require('child_process').exec(`"$BROWSER" "${gmailUrl}"`);
    } else {
      window.open(gmailUrl, '_blank');
    }
  };

  const NotificationMessage = ({ type, title, message }) => (
    <div className={`flex items-center gap-3 p-4 rounded-lg shadow-lg border ${
      type === 'success' 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        type === 'success' ? 'bg-green-100' : 'bg-red-100'
      }`}>
        <span className={`text-xl ${
          type === 'success' ? 'text-green-600' : 'text-red-600'
        }`}>
          {type === 'success' ? '✓' : '✕'}
        </span>
      </div>
      <div className="flex-grow">
        <h4 className={`font-semibold ${
          type === 'success' ? 'text-green-800' : 'text-red-800'
        }`}>
          {title}
        </h4>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );

  const columns = [
    {
      title: <span className="text-[#F4A261] font-semibold">Student Info</span>,
      key: "studentInfo",
      fixed: 'left',
      width: 280,
      render: (_, record) => (
        <div className="p-2">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-gray-900 text-base">
              {`${record.lastName || ''}, ${record.firstName || ''} ${record.middleName ? record.middleName.charAt(0) + '.' : ''}`}
            </div>
            <Tag color={record.role === 'student' ? 'blue' : 'purple'} className="uppercase text-xs">
              {record.role}
            </Tag>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
            <div>
              <span className="font-medium">{record.role === 'student' ? 'LRN:' : 'Graduation Year:'}</span>
              <br/>{record.role === 'student' ? (record.lrn || 'N/A') : record.graduationYear}
            </div>
          </div>
          <div className="mt-1 text-xs text-blue-600">
            {record.email}
          </div>
        </div>
      ),
    },
    {
      title: <span className="text-[#F4A261] font-semibold">Documents</span>,
      key: "documents",
      width: 280,
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
          {(!record.documents || record.documents.length === 0) && (
            <div className="text-gray-400 text-xs text-center py-2">
              No documents
            </div>
          )}
        </motion.div>
      ),
    },
    {
      title: <span className="text-[#F4A261] font-semibold">Schedule</span>,
      key: "schedule",
      width: 160,
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
      title: <span className="text-[#F4A261] font-semibold">Actions</span>,
      key: "action",
      fixed: 'right',
      width: 120,
      render: (_, record) => {
        // Check if all documents are approved, claimed, or cancelled
        const hasOnlyFinalizedDocs = record.documents?.every(doc => 
          ['approved', 'claimed', 'cancelled'].includes(doc.status)
        );
        
        return (
          <Space direction="vertical" size="small" className="w-full">
            <motion.div whileHover={{ scale: 1.02 }} className="w-full">
              <Button 
                type="primary" 
                icon={<EyeOutlined />}
                onClick={() => handleViewRequest(record)}
                size="small"
                className="bg-[#F4A261] border-[#F4A261] w-full hover:bg-[#FFD166] hover:border-[#FFD166]"
              >
                View
              </Button>
            </motion.div>
            {/* Hide Edit Schedule button if all documents are approved, claimed, or cancelled */}
            {!hasOnlyFinalizedDocs && (
              <motion.div whileHover={{ scale: 1.02 }} className="w-full">
                <Button
                  type="default"
                  icon={<EditOutlined />}
                  onClick={() => showEditScheduleModal(record)}
                  size="small"
                  className="w-full"
                >
                  Edit Schedule
                </Button>
              </motion.div>
            )}
            {record.role === 'alumni' && (
              <motion.div whileHover={{ scale: 1.02 }} className="w-full">
                <Button
                  type="primary"
                  icon={<MailOutlined />}
                  onClick={() => handleSendEmail(record.email)}
                  size="small"
                  className="bg-[#1A365D] border-[#1A365D] w-full hover:bg-[#155724] hover:border-[#155724]"
                >
                  Send Email
                </Button>
              </motion.div>
            )}
          </Space>
        );
      },
    }
  ];

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    
    try {
      if (timestamp instanceof Date) {
        return timestamp.toLocaleString();
      } else if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString();
      } else {
        return new Date(timestamp).toLocaleString();
      }
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid Date";
    }
  };

  const renderViewModalContent = (request) => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
          <div>
            <span className="text-gray-500">Name:</span>
            <p className="font-medium">{`${request.lastName}, ${request.firstName} ${request.middleName || ''}`}</p>
          </div>
          <div>
            <span className="text-gray-500">Role:</span>
            <p className="font-medium capitalize">{request.role}</p>
          </div>
          {request.role === 'student' && (
            <>
              <div>
                <span className="text-gray-500">LRN:</span>
                <p className="font-medium">{request.lrn}</p>
              </div>
              <div>
                <span className="text-gray-500">Grade Level:</span>
                <p className="font-medium">{request.currentYearLevel}</p>
              </div>
            </>
          )}
          {request.role === 'alumni' && (
            <div>
              <span className="text-gray-500">LRN:</span>
              <p className="font-medium">{request.lrn || 'N/A'}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500">Email:</span>
            <p className="font-medium">{request.email}</p>
          </div>
          <div>
            <span className="text-gray-500">Phone:</span>
            <p className="font-medium">{request.phoneNumber || 'N/A'}</p>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Document Requests</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {request.documents?.map((doc) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">{doc.documentType}</h4>
                  <Select
                    value={doc.status}
                    style={{ width: 120 }}
                    onChange={(value) => handleStatusUpdate(doc.id, value)}
                    disabled={updatingStatus}
                  >
                    {Object.entries(statusConfig).map(([key, { label, color }]) => (
                      <Option key={key} value={key}>
                        <Tag color={color}>{label}</Tag>
                      </Option>
                    ))}
                  </Select>
                </div>

                <div className="flex justify-center my-4">
                  {doc.qrCode ? (
                    <div className="relative group">
                      <img 
                        src={doc.qrCode} 
                        alt="QR Code" 
                        className="w-32 h-32 object-contain rounded-lg shadow-sm border border-gray-200"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Space size="small">
                          <Tooltip title="View QR Code">
                            <Button
                              type="primary"
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => handleViewQRCode(doc.qrCode)}
                              className="shadow-lg"
                            />
                          </Tooltip>
                          <Tooltip title="Download QR Code">
                            <Button
                              type="primary"
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => downloadQRCode(
                                doc.qrCode,
                                doc.documentType,
                                `${request.lastName}_${request.firstName}`
                              )}
                              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                              className="shadow-lg"
                            />
                          </Tooltip>
                        </Space>
                      </div>
                    </div>
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <p className="text-gray-400 text-sm text-center px-2">No QR Code Available</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Purpose:</span>
                    <p className="font-medium">{doc.purpose}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Copies:</span>
                    <p className="font-medium">{doc.copies}</p>
                  </div>
                  {doc.gradeYear && (
                    <div>
                      <span className="text-gray-500">Grade Year:</span>
                      <p className="font-medium">{doc.gradeYear}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Requested:</span>
                    <p className="font-medium">{formatDate(doc.requestDate || request.createdAt)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Schedule Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Preferred Date:</span>
            <p className="font-medium">{formatDate(request.preferredDate)}</p>
          </div>
          <div>
            <span className="text-gray-500">Preferred Time:</span>
            <p className="font-medium">{request.preferredTime}</p>
          </div>
          <div>
            <span className="text-gray-500">Created At:</span>
            <p className="font-medium">{formatDate(request.createdAt)}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Uploaded Images</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {request.imageUrls?.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Uploaded image ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg shadow-sm"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Space size="small">
                  <Tooltip title="View Image">
                    <Button
                      type="primary"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => setPreviewImage({ visible: true, url })}
                      className="shadow-lg"
                    />
                  </Tooltip>
                  {request.imageIds?.[index] && (
                    <Tooltip title="Image ID">
                      <Tag color="blue">{request.imageIds[index]}</Tag>
                    </Tooltip>
                  )}
                </Space>
              </div>
            </div>
          ))}
          {(!request.imageUrls || request.imageUrls.length === 0) && (
            <div className="text-gray-400 text-sm">No images uploaded</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderEditScheduleForm = () => (
    <Form
      form={editScheduleForm}
      layout="vertical"
    >
      <Form.Item
        name="preferredDate"
        label="Preferred Date"
        rules={[
          { required: true, message: "Preferred date is required" },
        ]}
      >
        <DatePicker
          format="MM-DD-YYYY"
          style={{ width: "100%" }}
          disabledDate={(current) => current && current < moment().startOf('day')} // Disable past dates
          inputReadOnly // Prevent typing in the input field
        />
      </Form.Item>

      <Form.Item
        name="preferredTime"
        label="Preferred Time"
        rules={[
          { required: true, message: "Preferred time is required" },
        ]}
      >
        <Select placeholder="Select a time slot">
          <Option value="06:00-07:00">06:00 AM - 07:00 AM</Option>
          <Option value="07:00-08:00">07:00 AM - 08:00 AM</Option>
          <Option value="08:00-09:00">08:00 AM - 09:00 AM</Option>
          <Option value="09:00-10:00">09:00 AM - 10:00 AM</Option>
          <Option value="10:00-11:00">10:00 AM - 11:00 AM</Option>
          <Option value="11:00-12:00">11:00 AM - 12:00 PM</Option>
          <Option value="13:00-14:00">01:00 PM - 02:00 PM</Option>
          <Option value="14:00-15:00">02:00 PM - 03:00 PM</Option>
        </Select>
      </Form.Item>
    </Form>
  );

  const renderRoleFilters = () => (
    <Space size="small">
      <Button
        type={roleFilter === 'all' ? 'primary' : 'default'}
        onClick={() => setRoleFilter('all')}
        className={`rounded-md px-4 py-2 font-semibold ${roleFilter === 'all' ? 'bg-[#F4A261] border-[#F4A261] text-white' : 'bg-white border-gray-300 text-[#0A2463]'} hover:bg-[#FFD166] hover:border-[#FFD166]`}
      >
        All
      </Button>
      <Button
        type={roleFilter === 'student' ? 'primary' : 'default'}
        onClick={() => setRoleFilter('student')}
        className={`rounded-md px-4 py-2 font-semibold ${roleFilter === 'student' ? 'bg-[#F4A261] border-[#F4A261] text-white' : 'bg-white border-gray-300 text-[#0A2463]'} hover:bg-[#FFD166] hover:border-[#FFD166]`}
      >
        Students Only
      </Button>
      <Button
        type={roleFilter === 'alumni' ? 'primary' : 'default'}
        onClick={() => setRoleFilter('alumni')}
        className={`rounded-md px-4 py-2 font-semibold ${roleFilter === 'alumni' ? 'bg-[#F4A261] border-[#F4A261] text-white' : 'bg-white border-gray-300 text-[#0A2463]'} hover:bg-[#FFD166] hover:border-[#FFD166]`}
      >
        Alumni Only
      </Button>
    </Space>
  );

  const tabItems = [
    { 
      key: "all", 
      label: `All Requests (${rows.length})`
    },
    ...Object.entries(statusConfig).map(([key, { label }]) => ({
      key,
      label: `${label} (${stats[key] || 0})`
    }))
  ];


  const getEasterSunday = (year) => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(year / 4);
    const e = year % 4;
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
      `${year}-01-01`, // New Year's Day
      `${year}-04-09`, // Araw ng Kagitingan
      `${year}-05-01`, // Labor Day
      `${year}-06-12`, // Independence Day
      `${year}-08-26`, // National Heroes Day
      `${year}-11-30`, // Bonifacio Day
      `${year}-12-25`, // Christmas Day
      `${year}-12-30`, // Rizal Day 
      `${year}-12-31`, // New Year's Eve
    ];

    // Add Chinese New Year if available
    const chineseNewYear = [
      '2024-02-10', '2025-01-29', '2026-02-17', '2027-02-06', '2028-01-26',
      '2029-02-13', '2030-02-03', '2031-01-23', '2032-02-11', '2033-01-31'
    ];
    const cny = chineseNewYear.find(date => date.startsWith(year.toString()));
    if (cny) holidays.push(cny);

    // Add EDSA Revolution Anniversary
    holidays.push(`${year}-02-25`);

    // Calculate Easter-related dates
    const easterSunday = getEasterSunday(year);
    
    // Calculate related dates from Easter Sunday
    const dates = [
      {date: new Date(easterSunday), offset: -3, name: 'Maundy Thursday'},
      {date: new Date(easterSunday), offset: -2, name: 'Good Friday'},
      {date: new Date(easterSunday), offset: -1, name: 'Black Saturday'},
      {date: new Date(easterSunday), offset: 0, name: 'Easter Sunday'}
    ];

    // Add Easter-related dates to holidays
    dates.forEach(({date, offset}) => {
      date.setDate(easterSunday.getDate() + offset);
      holidays.push(date.toISOString().split('T')[0]);
    });

    return holidays;
  };

  const currentYear = new Date().getFullYear();
  const philippineHolidays = getPhilippineHolidays(currentYear);


  const isHoliday = (dateString) => {
    return philippineHolidays.includes(dateString);
  };

  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <div className="bg-[#1A365D] min-h-screen p-5 overflow-x-hidden">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-7xl mx-auto"
          >
            {/* Analytics Dashboard */}
            <div className="flex justify-center mb-8">
              <Row gutter={[16, 16]} style={{ width: '100%', maxWidth: '1200px' }}>
                <Col xs={24} sm={12} md={6} lg={6}>
                  <motion.div whileHover={{ scale: 1.02 }}>
                    <Card className="rounded-lg h-full text-center bg-white shadow-md">
                      <Statistic
                        title={<span className="text-base font-bold">Total Requests</span>}
                        value={stats.total}
                        formatter={(value) => <CountUp end={value} duration={1} />}
                        valueStyle={{ color: colors.text, fontSize: '24px', fontWeight: 'bold' }}
                      />
                    </Card>
                  </motion.div>
                </Col>
                
                <Col xs={24} sm={12} md={6} lg={6}>
                  <motion.div whileHover={{ scale: 1.02 }}>
                    <Card className="rounded-lg h-full text-center bg-white shadow-md">
                      <Statistic
                        title={<span className="text-base font-bold">Pending</span>}
                        value={stats.pending}
                        formatter={(value) => <CountUp end={value} duration={1} />}
                        valueStyle={{ 
                          color: statusConfig.pending.color, 
                          fontSize: '24px',
                          fontWeight: 'bold'
                        }}
                      />
                    </Card>
                  </motion.div>
                </Col>

                <Col xs={24} sm={12} md={6} lg={6}>
                  <motion.div whileHover={{ scale: 1.02 }}>
                    <Card className="rounded-lg h-full text-center bg-white shadow-md">
                      <Statistic
                        title={<span className="text-base font-bold">Approved</span>}
                        value={stats.approved}
                        formatter={(value) => <CountUp end={value} duration={1} />}
                        valueStyle={{ 
                          color: statusConfig.approved.color, 
                          fontSize: '24px',
                          fontWeight: 'bold'
                        }}
                      />
                    </Card>
                  </motion.div>
                </Col>
                <Col xs={24} sm={12} md={6} lg={6}>
                  <motion.div whileHover={{ scale: 1.02 }}>
                    <Card className="rounded-lg h-full text-center bg-white shadow-md">
                      <Statistic
                        title={<span className="text-base font-bold">Claimed</span>}
                        value={stats.claimed}
                        formatter={(value) => <CountUp end={value} duration={1} />}
                        valueStyle={{ 
                          color: statusConfig.claimed.color, 
                          fontSize: '24px',
                          fontWeight: 'bold'
                        }}
                      />
                    </Card>
                  </motion.div>
                </Col>

                <Col xs={24} sm={12} md={6} lg={6}>
                  <motion.div whileHover={{ scale: 1.02 }}>
                    <Card className="rounded-lg h-full text-center bg-white shadow-md">
                      <Statistic
                        title={<span className="text-base font-bold">Cancelled</span>}
                        value={stats.cancelled}
                        formatter={(value) => <CountUp end={value} duration={1} />}
                        valueStyle={{ 
                          color: statusConfig.cancelled.color, 
                          fontSize: '24px',
                          fontWeight: 'bold'
                        }}
                      />
                    </Card>
                  </motion.div>
                </Col>

                <Col xs={24} sm={12} md={6} lg={6}>
                  <motion.div whileHover={{ scale: 1.02 }}>
                    <Card className="rounded-lg h-full text-center bg-white shadow-md">
                      <Statistic
                        title={<span className="text-base font-bold">Students</span>}
                        value={stats.students}
                        formatter={(value) => <CountUp end={value} duration={1} />}
                        valueStyle={{ 
                          color: colors.text, 
                          fontSize: '24px',
                          fontWeight: 'bold'
                        }}
                      />
                    </Card>
                  </motion.div>
                </Col>

                <Col xs={24} sm={12} md={6} lg={6}>
                  <motion.div whileHover={{ scale: 1.02 }}>
                    <Card className="rounded-lg h-full text-center bg-white shadow-md">
                      <Statistic
                        title={<span className="text-base font-bold">Alumni</span>}
                        value={stats.alumni}
                        formatter={(value) => <CountUp end={value} duration={1} />}
                        valueStyle={{ 
                          color: colors.text, 
                          fontSize: '24px',
                          fontWeight: 'bold'
                        }}
                      />
                    </Card>
                  </motion.div>
                </Col>
              </Row>
            </div>

            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="max-w-7xl mx-auto"
            >
              <div
                className="
                  bg-white
                  p-5
                  rounded-lg
                  overflow-x-auto
                  shadow-lg
                "
              >
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                  <Tabs 
                    activeKey={activeTab} 
                    onChange={setActiveTab}
                    items={tabItems}
                    type="card"
                    className="w-full"
                    size="large"
                    tabBarStyle={{
                      color: colors.text,
                      marginBottom: '16px',
                      fontSize: '16px'
                    }}
                    tabBarGutter={8}
                  />
                  <div className="w-full sm:w-auto flex items-center gap-2">
                    {renderRoleFilters()}
                    <Input.Search
                      placeholder="Search name, email, LRN, year, document..."
                      allowClear
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="min-w-[220px]"
                    />
                  </div>
                </div>

                <Table 
                  columns={columns} 
                  dataSource={filteredRows} 
                  rowKey="id" 
                  loading={loading}
                  scroll={{ x: 1200 }}
                  pagination={{
                    pageSize: 8,
                    showSizeChanger: true,
                    pageSizeOptions: ['8', '16', '24', '32'],
                    showTotal: (total) => (
                      <span className="text-[#0A2463] text-base">
                        Total {total} requests
                      </span>
                    )
                  }}
                  className="shadow-lg rounded-lg overflow-hidden"
                  rowClassName={(record) =>
                    `bg-white hover:bg-blue-50 transition-colors duration-200
                     ${record.role === 'student' ? 'border-l-4 border-blue-400' : 'border-l-4 border-purple-400'}`
                  }
                />
              </div>
            </motion.div>

          </motion.div>

          {/* Modals */}
          <Modal
            title={
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center">
                  <EyeOutlined className="text-white text-lg" />
                </div>
                <span className="text-blue-700 font-bold text-xl">Request Details</span>
              </div>
            }
            open={isViewModalVisible}
            onCancel={() => setIsViewModalVisible(false)}
            footer={[
              <Button 
                key="back" 
                size="large" 
                onClick={() => setIsViewModalVisible(false)}
                className="bg-blue-700 text-white hover:bg-blue-900"
              >
                Close
              </Button>
            ]}
            closable={false}
            width="90%"
            className="max-w-5xl mx-auto top-5"
            // FIX: Remove deprecated styles.body prop
            // styles.body={undefined}
          >
            {currentRequest && (
              <div className="bg-gray-50 p-6">
                {/* Personal Information Section */}
                <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6 mb-6">
                  <h3 className="text-lg font-bold mb-4 text-[#1D4ED8] border-b-2 border-[#FFD166] pb-2 inline-block">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-[#F0F4F9] p-3 rounded-lg">
                      <span className="text-[#64748B] text-sm">Name:</span>
                      <p className="font-semibold text-[#0A2463]">{`${currentRequest.lastName}, ${currentRequest.firstName} ${currentRequest.middleName || ''}`}</p>
                    </div>
                    <div className="bg-[#F0F4F9] p-3 rounded-lg">
                      <span className="text-[#64748B] text-sm">Role:</span>
                      <p className="font-semibold text-[#0A2463] capitalize">{currentRequest.role}</p>
                    </div>
                    {currentRequest.role === 'student' ? (
                      <>
                        <div className="bg-[#F0F4F9] p-3 rounded-lg">
                          <span className="text-[#64748B] text-sm">LRN:</span>
                          <p className="font-semibold text-[#0A2463]">{currentRequest.lrn}</p>
                        </div>
                        <div className="bg-[#F0F4F9] p-3 rounded-lg">
                          <span className="text-[#64748B] text-sm">Grade Level:</span>
                          <p className="font-semibold text-[#0A2463]">{currentRequest.currentYearLevel}</p>
                        </div>
                      </>
                    ) : (
                      <div className="bg-[#F0F4F9] p-3 rounded-lg">
                        <span className="text-[#64748B] text-sm">Graduation Year:</span>
                        <p className="font-semibold text-[#0A2463]">{currentRequest.graduationYear || 'N/A'}</p>
                      </div>
                    )}
                    {currentRequest.role === 'alumni' && (
                      <div className="bg-[#F0F4F9] p-3 rounded-lg">
                        <span className="text-[#64748B] text-sm">LRN:</span>
                        <p className="font-semibold text-[#0A2463]">{currentRequest.lrn || 'N/A'}</p>
                      </div>
                    )}
                    <div className="bg-[#F0F4F9] p-3 rounded-lg">
                      <span className="text-[#64748B] text-sm">Email:</span>
                      <p className="font-semibold text-[#0A2463]">{currentRequest.email}</p>
                    </div>
                    <div className="bg-[#F0F4F9] p-3 rounded-lg">
                      <span className="text-[#64748B] text-sm">Phone:</span>
                      <p className="font-semibold text-[#0A2463]">{currentRequest.phoneNumber || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Document Requests Section */}
                <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-[#1D4ED8] border-b-2 border-[#FFD166] pb-2 inline-block">
                      Document Requests
                    </h3>
                    <Tag className="bg-[#1D4ED8] text-white">
                      {currentRequest.documents?.length || 0} Documents
                    </Tag>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {currentRequest.documents?.map((doc) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-gradient-to-br from-[#F0F4F9] to-[#E2E8F0] rounded-xl p-4 border border-[#CBD5E1]"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-[#0A2463] text-lg">{doc.documentType}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Tag 
                                color={statusConfig[doc.status]?.color || "default"}
                                className="text-xs font-bold"
                              >
                                {doc.status?.toUpperCase()}
                              </Tag>
                              <span className="text-sm text-[#475569]">
                                {doc.copies} {doc.copies > 1 ? 'copies' : 'copy'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Select
                              value={doc.status}
                              style={{ width: 120 }}
                              onChange={(value) => handleStatusUpdate(doc.id, value)}
                              disabled={updatingStatus}
                              className="status-selector"
                            >
                              {Object.entries(statusConfig).map(([key, { label, color }]) => (
                                <Option key={key} value={key}>
                                  <Tag color={color}>{label}</Tag>
                                </Option>
                              ))}
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div>
                            <span className="text-xs text-[#64748B]">Purpose:</span>
                            <p className="font-medium text-[#0A2463]">{doc.purpose}</p>
                            {/* Show the alumni's "Other" description if applicable */}
                            {doc.purpose === "Other" && doc.otherDescription && (
                              <div className="mt-2">
                                <span className="block text-xs text-[#64748B] mb-1">Specified Purpose / Description:</span>
                                <div className="p-2 border rounded bg-white text-[#0A2463] text-xs min-h-[40px]">
                                  {doc.otherDescription}
                                </div>
                              </div>
                            )}
                          </div>
                          {doc.gradeYear && (
                            <div>
                              <span className="text-xs text-[#64748B]">Grade Year:</span>
                              <p className="font-medium text-[#0A2463]">{doc.gradeYear}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-xs text-[#64748B]">Requested:</span>
                            <p className="font-medium text-[#0A2463]">
                              {formatDate(doc.requestDate || currentRequest.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          {/* Only show QR code buttons for approved or claimed status */}
                          {doc.qrCode && (doc.status === 'approved' || doc.status === 'claimed') ? (
                            <div className="flex items-center gap-2">
                              <Button
                                type="primary"
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => handleViewQRCode(doc.qrCode)}
                                className="bg-[#1D4ED8] hover:bg-[#0A2463]"
                              />
                              <Button
                                type="primary"
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={() => downloadQRCode(
                                  doc.qrCode,
                                  doc.documentType,
                                  `${currentRequest.lastName}_${currentRequest.firstName}`
                                )}
                                className="bg-[#FFD166] hover:bg-[#F4A261] text-[#0A2463]"
                              />
                            </div>
                          ) : (
                            <Tag color="orange" className="text-xs">
                              {doc.status === 'pending' || doc.status === 'cancelled' 
                                ? 'QR Code not available for this status'
                                : 'No QR Code Available'
                              }
                            </Tag>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

              
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6">
                    <h3 className="text-lg font-bold mb-4 text-[#1D4ED8] border-b-2 border-[#FFD166] pb-2 inline-block">
                      Schedule Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-[#F0F4F9] p-3 rounded-lg">
                        <span className="text-[#64748B] text-sm">Preferred Date:</span>
                        <p className="font-semibold text-[#0A2463]">
                          {formatDate(currentRequest.preferredDate)}
                        </p>
                      </div>
                      <div className="bg-[#F0F4F9] p-3 rounded-lg">
                        <span className="text-[#64748B] text-sm">Preferred Time:</span>
                        <p className="font-semibold text-[#0A2463]">
                          {currentRequest.preferredTime || 'Not specified'}
                        </p>
                      </div>
                      <div className="bg-[#F0F4F9] p-3 rounded-lg">
                        <span className="text-[#64748B] text-sm">Created At:</span>
                        <p className="font-semibold text-[#0A2463]">
                          {formatDate(currentRequest.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  
                  {currentRequest.imageUrls?.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6">
                      <h3 className="text-lg font-bold mb-4 text-[#1D4ED8] border-b-2 border-[#FFD166] pb-2 inline-block">
                        Uploaded Images ({currentRequest.imageUrls.length})
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {currentRequest.imageUrls?.map((url, index) => (
                          <motion.div 
                            key={index}
                            whileHover={{ scale: 1.02 }}
                            className="relative group"
                          >
                            <img
                              src={url}
                              alt={`Uploaded image ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg shadow-sm border border-[#E2E8F0]"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <Button
                                type="primary"
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => setPreviewImage({ visible: true, url })}
                                className="bg-[#1D4ED8] hover:bg-[#0A2463] shadow-lg"
                              />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Modal>

          <Modal
            title={
              <div className="text-lg font-semibold text-blue-600 flex items-center">
                <CalendarOutlined className="mr-2" />
                Edit Schedule
              </div>
            }
            open={isEditScheduleModalVisible}
            footer={null} 
            onCancel={() => setIsEditScheduleModalVisible(false)}
            width={600}
            centered
            styles={{ body: {
              padding: 0,
              borderRadius: '0.5rem',
              overflow: 'hidden',
            }}}
          >
            <div className="p-6 bg-white shadow-md">
              {currentRequest && renderEditScheduleForm()}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleUpdateSchedule}
                  disabled={updatingSchedule}
                  className={`px-4 py-2 text-white font-medium rounded-md ${
                    updatingSchedule
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {updatingSchedule ? 'Updating...' : 'Update Schedule'}
                </button>
              </div>
            </div>
          </Modal>

          <Modal
            title="Cancel Request"
            open={cancelModal.visible}
            onCancel={() => setCancelModal({ visible: false, docId: null })}
            onOk={confirmCancel}
            okText="Confirm Cancel"
            confirmLoading={updatingStatus}
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="bg-white rounded-xl shadow-lg p-6 border-l-8 border-[#FFD166] max-w-md mx-auto"
            >
              <p className="mb-3 font-semibold text-lg text-[#0A2463]">Select a reason for cancellation:</p>
              <motion.select
                whileFocus={{ scale: 1.03, boxShadow: "0 0 0 4px #FFD16644" }}
                className="w-full rounded-lg border-2 border-[#1D4ED8] bg-[#F3F4F6] text-[#0A2463] font-medium text-base p-3 focus:ring-2 focus:ring-[#FFD166] transition"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              >
                <option value="" disabled>Select reason</option>
                {commonReasons.map(reason => (
                  <option key={reason} value={reason} className="text-[#1D4ED8]">
                    {reason}
                  </option>
                ))}
              </motion.select>
            </motion.div>
          </Modal>

          <Modal
            open={previewQR.visible}
            footer={null}
            onCancel={() => setPreviewQR({ visible: false, url: null })}
            centered
            width={400}
            styles={{ body: { padding: 0 } }}
            className="qr-preview-modal"
          >
            <div className="p-8 flex flex-col items-center">
              <img 
                src={previewQR.url} 
                alt="QR Code Preview" 
                className="w-64 h-64 object-contain"
              />
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                size="large"
                onClick={() => {
                  if (currentRequest && previewQR.url) {
                    downloadQRCode(
                      previewQR.url,
                      "QR_Code",
                      `${currentRequest.lastName}_${currentRequest.firstName}`
                    );
                  }
                }}
                className="mt-4"
              >
                Download QR Code
              </Button>
            </div>
          </Modal>

          <Modal
            open={previewImage.visible}
            footer={null}
            onCancel={() => setPreviewImage({ visible: false, url: null })}
            width="80%"
            centered
            styles={{ body: { padding: 0 } }}
          >
            <img
              src={previewImage.url}
              alt="Preview"
              style={{ width: '100%', height: 'auto', maxHeight: '80vh', objectFit: 'contain' }}
            />
          </Modal>
        </div>
      </Col>
    </Row>
  );
};

const AdminRequestManagement = () => {
  return <RequestManagement />;
};

export default AdminRequestManagement;