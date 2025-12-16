import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDocs, where, query as firestoreQuery } from "firebase/firestore";
import { sendAnnouncementNotification } from "../../../../services/notificationService";
import { db, auth } from "../../../../config/firebase";
import { 
  Table, Button, Modal, Form, Input, Space, message, 
  Popconfirm, Typography, Card, Divider, Empty, Spin, Switch, Image, Segmented, Tooltip, Tag
} from "antd";
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  SaveOutlined,
  CheckOutlined,
  CloseOutlined
} from "@ant-design/icons";
import { logActivity, ACTIVITY_TYPES } from "../../../../services/activityLogService";
import { CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET } from "../../../../config/cloudinary";

const { TextArea } = Input;
const { Title, Text } = Typography;

const AdminAnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null); // 'YYYY-MM-DD'

 
  const colors = {
    // Aligning to Event palette while retaining subtle distinction
    primary: 'bg-[#4169E1]',
    primaryHover: 'hover:bg-[#014F86]',
    primaryBorder: 'border-[#014F86]',
    primaryText: 'text-[#014F86]',
    accent: 'bg-[#FFC30B]',
    accentHover: 'hover:bg-[#FFB000]',
    accentText: 'text-[#FFC30B]',
    secondary: 'bg-[#014F86]',
    secondaryHover: 'hover:bg-[#01325a]',
    dark: 'bg-[#0f2a4d]',
    light: 'bg-[#F8FAFC]'
  };


  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "announcements"),
      (snapshot) => {
        const updatedAnnouncements = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          key: doc.id,
          createdAt: doc.data().createdAt?.toDate?.() || null,
          updatedAt: doc.data().updatedAt?.toDate?.() || null
        }));
        setAnnouncements(updatedAnnouncements);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching announcements:", error);
        message.error("Failed to load announcements");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Compute filtered announcements (search + status)
  useEffect(() => {
    const q = (searchQuery || "").toLowerCase();
    const next = announcements.filter(a => {
      const statusOk = statusFilter === 'all' || a.status === statusFilter;
      if (!q) return statusOk;
      const hay = [a.title, a.content].filter(Boolean).join(' ').toLowerCase();
      return statusOk && hay.includes(q);
    });
    // Apply date filter if any
    const dateFiltered = selectedDate
      ? next.filter(a => {
          const d = a.createdAt ? new Date(a.createdAt) : null;
          if (!d) return false;
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const key = `${y}-${m}-${day}`;
          return key === selectedDate;
        })
      : next;
    setFilteredAnnouncements(dateFiltered);
  }, [announcements, searchQuery, statusFilter, selectedDate]);

  // Calendar helpers
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
  const fmtYMD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const getCountsByDate = () => {
    const map = {};
    announcements.forEach(a => {
      if (!a.createdAt) return;
      const d = new Date(a.createdAt);
      const key = fmtYMD(d);
      if (!map[key]) map[key] = { total: 0, draft: 0, published: 0 };
      map[key].total += 1;
      if (a.status === 'published') map[key].published += 1; else map[key].draft += 1;
    });
    return map;
  };
  const countsByDate = getCountsByDate();
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const totalCount = announcements.length;
  const draftCount = announcements.filter(a => a.status === 'draft').length;
  const publishedCount = announcements.filter(a => a.status === 'published').length;

  
  const showAddModal = () => {
    setIsEditMode(false);
    setCurrentAnnouncement(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const showEditModal = (record) => {
    setIsEditMode(true);
    setCurrentAnnouncement(record);
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      imageUrl: record.imageUrl || "",
      status: record.status === 'published'
    });
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

 
  const showPreview = () => {
    try {
      const values = form.getFieldsValue();
      
      setPreviewData({
        title: values.title || "Untitled",
        content: values.content || "No content",
        imageUrl: values.imageUrl || "",
        status: values.status ? 'published' : 'draft',
        createdAt: new Date(),
      });
      
      setIsPreviewVisible(true);
    } catch (error) {
      console.error("Error creating preview:", error);
      message.error("Failed to generate preview");
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsModalVisible(false);

      const announcementData = {
        title: values.title,
        content: values.content,
        imageUrl: values.imageUrl || "",
        status: values.status ? 'published' : 'draft',
        updatedAt: serverTimestamp(),
      };

      if (isEditMode && currentAnnouncement) {
        await updateDoc(doc(db, "announcements", currentAnnouncement.id), announcementData);
        message.success("Announcement updated successfully!");

        // Log update
        try {
          const user = auth.currentUser;
          await logActivity({
            type: ACTIVITY_TYPES.ANNOUNCEMENT_UPDATED,
            userId: user?.uid || null,
            userEmail: user?.email || null,
            role: 'admin',
            description: 'Update an Announcement',
            category: 'admin',
            metadata: {
              announcementId: currentAnnouncement.id,
              title: announcementData.title,
            },
          });
          // If status changed as part of edit, log publish/draft
          if (currentAnnouncement.status !== announcementData.status) {
            await logActivity({
              type: announcementData.status === 'published' ? ACTIVITY_TYPES.PUBLISH : ACTIVITY_TYPES.DRAFT,
              userId: user?.uid || null,
              userEmail: user?.email || null,
              role: 'admin',
              description: announcementData.status === 'published' ? 'Published the New Announcement' : 'Hide An Announcement',
              category: 'admin',
              metadata: {
                announcementId: currentAnnouncement.id,
                title: announcementData.title,
              },
            });
          }
        } catch {}
      } else {
        const docRef = await addDoc(collection(db, "announcements"), {
          ...announcementData,
          createdAt: serverTimestamp(),
          author: {
            id: "admin",
            name: "MALANDAY NHS"
          }
        });
        message.success("Announcement added successfully!");

        // Send notification to all students if published
        if (announcementData.status === 'published') {
          const studentsQuery = firestoreQuery(collection(db, 'users'), where('role', '==', 'student'));
          const studentsSnapshot = await getDocs(studentsQuery);
          const notificationPromises = studentsSnapshot.docs.map(studentDoc => {
            const userData = studentDoc.data();
            const userId = userData.uid || studentDoc.id;
            return sendAnnouncementNotification(userId, announcementData.title);
          });
          await Promise.all(notificationPromises);
        }

        // Log create and status
        try {
          const user = auth.currentUser;
          await logActivity({
            type: ACTIVITY_TYPES.ANNOUNCEMENT_CREATED,
            userId: user?.uid || null,
            userEmail: user?.email || null,
            role: 'admin',
            description: 'Added a new Announcement',
            category: 'admin',
            metadata: {
              announcementId: docRef.id,
              title: announcementData.title,
            },
          });
          await logActivity({
            type: announcementData.status === 'published' ? ACTIVITY_TYPES.PUBLISH : ACTIVITY_TYPES.DRAFT,
            userId: user?.uid || null,
            userEmail: user?.email || null,
            role: 'admin',
            description: announcementData.status === 'published' ? 'Published the New Announcement' : 'Hide An Announcement',
            category: 'admin',
            metadata: {
              announcementId: docRef.id,
              title: announcementData.title,
            },
          });
        } catch {}
      }

      setIsModalVisible(false);
      setIsPreviewVisible(false);
      form.resetFields();
    } catch (error) {
      console.error("Error submitting form:", error);
      message.error(`Failed to ${isEditMode ? 'update' : 'create'} announcement: ${error.message}`);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "announcements", id));
      message.success("Announcement deleted successfully!");
      try {
        const user = auth.currentUser;
        await logActivity({
          type: ACTIVITY_TYPES.ANNOUNCEMENT_DELETED,
          userId: user?.uid || null,
          userEmail: user?.email || null,
          role: 'admin',
          description: 'Delete an Announcement',
          category: 'admin',
          metadata: { announcementId: id },
          severity: 'warning',
        });
      } catch {}
    } catch (error) {
      console.error("Error deleting announcement:", error);
      message.error(`Failed to delete announcement: ${error.message}`);
    }
  };

  
  const handleStatusToggle = async (record, checked) => {
    try {
      await updateDoc(doc(db, "announcements", record.id), {
        status: checked ? 'published' : 'draft',
        updatedAt: serverTimestamp()
      });
      message.success(`Announcement ${checked ? 'published' : 'unpublished'} successfully!`);
      try {
        const user = auth.currentUser;
        await logActivity({
          type: checked ? ACTIVITY_TYPES.PUBLISH : ACTIVITY_TYPES.DRAFT,
          userId: user?.uid || null,
          userEmail: user?.email || null,
          role: 'admin',
          description: checked ? 'Published the New Announcement' : 'Hide An Announcement',
          category: 'admin',
          metadata: { announcementId: record.id, title: record.title },
        });
      } catch {}
    } catch (error) {
      console.error("Error updating status:", error);
      message.error("Failed to update announcement status");
    }
  };

  
  const handleViewAnnouncement = (record) => {
    setPreviewData(record);
    setIsPreviewVisible(true);
  };

  
  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  
  // Cloudinary upload handler
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        form.setFieldsValue({ imageUrl: data.secure_url });
        message.success('Image uploaded successfully');
      } else {
        console.error('Cloudinary upload error:', data);
        message.error('Image upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      message.error('Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  
  const columns = [
    {
      title: "Thumbnail",
      dataIndex: "imageUrl",
      key: "thumb",
      width: 100,
      render: (url, record) => (
        url ? (
          <Image src={url} alt={record.title} width={64} height={40} className="rounded object-cover" />
        ) : (
          <div className="w-16 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">N/A</div>
        )
      )
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      sorter: (a, b) => a.title.localeCompare(b.title),
  render: (text) => (
        <Tooltip title={text} placement="topLeft">
          <span className="font-sans font-semibold" style={{ fontWeight: 600 }}>{text}</span>
        </Tooltip>
      )
    },
    {
      title: "Content Snippet",
      dataIndex: "content",
      key: "snippet",
      ellipsis: true,
      render: (text) => {
        const shown = (text || '').length > 120 ? `${text.slice(0, 120)}…` : (text || '-')
        return (
          <Tooltip title={text} placement="topLeft">
            <span className="text-gray-700">{shown}</span>
          </Tooltip>
        );
      }
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
  render: (date) => <span className="text-gray-600 font-sans font-medium" style={{ fontWeight: 500 }}>{formatDate(date)}</span>,
      defaultSortOrder: 'descend',
      sorter: (a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      }
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status, record) => (
        <Switch
          checked={status === 'published'}
          onChange={(checked) => handleStatusToggle(record, checked)}
          checkedChildren={<CheckOutlined />}
          unCheckedChildren={<CloseOutlined />}
        />
      )
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => handleViewAnnouncement(record)}
            title="Preview"
            className={`${colors.primaryText} hover:${colors.primaryText}/80 font-sans font-medium`}
            style={{ fontWeight: 500 }}
          />
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => showEditModal(record)}
            title="Edit"
            className={`${colors.primaryText} hover:${colors.primaryText}/80 font-sans font-medium`}
            style={{ fontWeight: 500 }}
          />
          <Popconfirm
            title="Delete this announcement?"
            okText="Yes"
            cancelText="No"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button 
              icon={<DeleteOutlined />} 
              size="small" 
              danger
              title="Delete"
              className="font-sans font-medium"
              style={{ fontWeight: 500 }}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  
  const EmptyState = () => (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
  <span className="text-gray-500 font-sans font-medium" style={{ fontWeight: 500 }}>
          No announcements found. Create your first announcement!
        </span>
      }
    >
      <Button 
        type="primary" 
        onClick={showAddModal}
        className={`${colors.primary} ${colors.primaryHover}`}
      >
        Create Announcement
      </Button>
    </Empty>
  );

 
  const PreviewModal = () => (
    <Modal
  title={<span className={`${colors.primaryText} font-semibold font-sans`}>Announcement Preview</span>}
      open={isPreviewVisible}
      onCancel={() => setIsPreviewVisible(false)}
      footer={[
        <Button 
          key="close" 
          onClick={() => setIsPreviewVisible(false)}
          className="border-gray-300 hover:border-gray-400"
        >
          Close
        </Button>,
        !isModalVisible && (
          <Button 
            key="edit" 
            type="primary" 
            onClick={() => {
              if (!currentAnnouncement && previewData) {
                form.setFieldsValue({
                  title: previewData.title,
                  content: previewData.content,
                  imageUrl: previewData.imageUrl || "",
                  socialMediaLink: previewData.socialMediaLink || "",
                  status: previewData.status === 'published'
                });
                setIsModalVisible(true);
              }
            }}
            className={`${colors.primary} ${colors.primaryHover}`}
          >
            Edit
          </Button>
        )
      ]}
      width={800}
      className="rounded-lg"
    >
      {previewData && (
  <Card className={`announcement-preview border ${colors.primaryBorder} rounded-lg font-sans font-semibold`}>
          <div className="flex justify-between items-center mb-4">
            <Title level={4} className={`${colors.primaryText} font-sans font-semibold`}>{previewData.title}</Title>
            <Text type="secondary" className="font-sans font-semibold">Status: {previewData.status || 'draft'}</Text>
          </div>
          
          {previewData.imageUrl && (
            <div className="mb-4 flex justify-center">
            <Image
              src={previewData.imageUrl}
              alt={previewData.title}
              height={300}
              className="h-40 w-auto rounded-lg object-cover"
                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3PTWBSGcbGzM6GCKqlIBRV0dHRJFarQ0eUT8LH4BnRU0NHR0UEFVdIlFRV7TzRksomPY8uykTk/zewQfKw/9znv4yvJynLv4uLiV2dBoDiBf4qP3/ARuCRABEFAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghgg0Aj8i0JO4OzsrPv69Wv+hi2qPHr0qNvf39+iI97soRIh4f3z58/u7du3SXX7Xt7Z2enevHmzfQe+oSN2apSAPj09TSrb+XKI/f379+08+A0cNRE2ANkupk+ACNPvkSPcAAEibACyXUyfABGm3yNHuAECRNgAZLuYPgEirKlHu7u7XdyytGwHAd8jjNyng4OD7vnz51dbPT8/7z58+NB9+/bt6jU/TI+AGWHEnrx48eJ/EsSmHzx40L18+fLyzxF3ZVMjEyDCiEDjMYZZS5wiPXnyZFbJaxMhQIQRGzHvWR7XCyOCXsOmiDAi1HmPMMQjDpbpEiDCiL358eNHurW/5SnWdIBbXiDCiA38/Pnzrce2YyZ4//59F3ePLNMl4PbpiL2J0L979+7yDtHDhw8vtzzvdGnEXdvUigSIsCLAWavHp/+qM0BcXMd/q25n1vF57TYBp0a3mUzilePj4+7k5KSLb6gt6ydAhPUzXnoPR0dHl79WGTNCfBnn1uvSCJdegQhLI1vvCk+fPu2ePXt2tZOYEV6/fn31dz+shwAR1sP1cqvLntbEN9MxA9xcYjsxS1jWR4AIa2Ibzx0tc44fYX/16lV6NDFLXH+YL32jwiACRBiEbf5KcXoTIsQSpzXx4N28Ja4BQoK7rgXiydbHjx/P25TaQAJEGAguWy0+2Q8PD6/Ki4R8EVl+bzBOnZY95fq9rj9zAkTI2SxdidBHqG9+skdw43borCXO/ZcJdraPWdv22uIEiLA4q7nvvCug8WTqzQveOH26fodo7g6uFe/a17W3+nFBAkRYENRdb1vkkz1CH9cPsVy/jrhr27PqMYvENYNlHAIesRiBYwRy0V+8iXP8+/fvX11Mr7L7ECueb/r48eMqm7FuI2BGWDEG8cm+7G3NEOfmdcTQw4h9/55lhm7DekRYKQPZF2ArbXTAyu4kDYB2YxUzwg0gi/41ztHnfQG26HbGel/crVrm7tNY+/1btkOEAZ2M05r4FB7r9GbAIdxaZYrHdOsgJ/wCEQY0J74TmOKnbxxT9n3FgGGWWsVdowHtjt9Nnvf7yQM2aZU/TIAIAxrw6dOnAWtZZcoEnBpNuTuObWMEiLAx1HY0ZQJEmHJ3HNvGCBBhY6jtaMoEiJB0Z29vL6ls58vxPcO8/zfrdo5qvKO+d3Fx8Wu8zf1dW4p/cPzLly/dtv9Ts/EbcvGAHhHyfBIhZ6NSiIBTo0LNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiEC/wGgKKC4YMA4TAAAAABJRU5ErkJggg=="
              />
            </div>
          )}
          
          <div className="whitespace-pre-wrap mb-4 text-gray-700 font-sans font-semibold">
            {previewData.content}
          </div>
          
          {/* Social media link removed as requested */}
          
          <hr className="my-3" />
          
          <div className="flex flex-wrap justify-between text-gray-500 text-sm font-sans font-semibold">
            <div>
              <span>Created: {formatDate(previewData.createdAt)}</span>
            </div>
          </div>
        </Card>
      )}
    </Modal>
  );

  return (
  <div className={`announcement-manager p-4 md:p-6 ${colors.light} min-h-screen font-sans font-semibold`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl text-gray-800 font-sans">Announcement Management</h2>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={showAddModal}
          size="large"
          className={`${colors.primary} ${colors.primaryHover} flex items-center gap-2`}
        >
          Add Announcement
        </Button>
      </div>
      
      
      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="text-center">
            <Spin size="large" className={colors.primaryText} />
            <div className="mt-4 text-gray-600 font-sans font-semibold">Loading announcements...</div>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Segmented
                options={[
                  { label: 'All', value: 'all' },
                  { label: 'Draft', value: 'draft' },
                  { label: 'Published', value: 'published' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <div className="flex items-center gap-2 ml-2">
                <Tag color="#4169E1">All: {totalCount}</Tag>
                <Tag color="orange">Draft: {draftCount}</Tag>
                <Tag color="green">Published: {publishedCount}</Tag>
              </div>
            </div>
            <Input.Search
              placeholder="Search title or content..."
              allowClear
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-w-[240px]"
            />
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Table Column */}
            <div className="w-full lg:w-2/3">
              <div className="rounded-2xl shadow-lg border-t-8 border-[#FFC30B] bg-white overflow-hidden font-sans font-semibold">
                <Table 
                  columns={columns}
                  dataSource={filteredAnnouncements}
                  rowKey="id"
                  bordered
                  size="middle"
                  sticky
                  scroll={{ y: 520 }}
                  pagination={{ 
                    pageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50'],
                    showTotal: (total) => `Total ${total} announcements`,
                    className: "px-4 py-2"
                  }}
                  rowClassName={(_, index) =>
                    index % 2 === 0
                      ? "bg-[#F8FAFC] hover:bg-[#E3F0FF] transition-colors duration-150"
                      : "bg-white hover:bg-[#E3F0FF] transition-colors duration-150"
                  }
                  locale={{
                    emptyText: <EmptyState />
                  }}
                  className="rounded-lg"
                />
              </div>
            </div>

            {/* Calendar Column (distinct from Events with day badges) */}
            <div className="w-full lg:w-1/3">
              <div className="bg-white rounded-2xl shadow-lg border border-[#E2E8F0] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] border-b">
                  <button onClick={prevMonth} className="text-[#014F86] hover:text-[#4169E1] font-semibold">←</button>
                  <div className="text-[#014F86] font-bold">
                    {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(currentMonth)}
                  </div>
                  <button onClick={nextMonth} className="text-[#014F86] hover:text-[#4169E1] font-semibold">→</button>
                </div>

                <div className="px-4 py-3">
                  <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                      <div key={d} className="py-1">{d}</div>
                    ))}
                  </div>

                  {(() => {
                    const year = currentMonth.getFullYear();
                    const month = currentMonth.getMonth();
                    const daysInMonth = getDaysInMonth(year, month);
                    const firstDay = getFirstDayOfMonth(year, month);
                    const boxes = [];
                    for (let i = 0; i < firstDay; i++) {
                      boxes.push(<div key={`e-${i}`} className="h-16 border rounded bg-gray-50" />);
                    }
                    for (let day = 1; day <= daysInMonth; day++) {
                      const dateObj = new Date(year, month, day);
                      const key = fmtYMD(dateObj);
                      const counts = countsByDate[key] || { total: 0, draft: 0, published: 0 };
                      const isSelected = selectedDate === key;
                      boxes.push(
                        <button
                          key={`d-${day}`}
                          onClick={() => setSelectedDate(isSelected ? null : key)}
                          className={`h-16 border rounded p-1 text-left transition ${isSelected ? 'bg-[#E3F0FF] border-[#014F86]' : 'bg-white hover:bg-[#F8FAFC]'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-[#014F86]">{day}</span>
                            {counts.total > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FFC30B] text-[#0A2463] font-bold">
                                {counts.total}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex gap-1">
                            {counts.published > 0 && (
                              <span className="text-[10px] px-1 rounded bg-green-100 text-green-700">Pub {counts.published}</span>
                            )}
                            {counts.draft > 0 && (
                              <span className="text-[10px] px-1 rounded bg-orange-100 text-orange-700">Dr {counts.draft}</span>
                            )}
                          </div>
                        </button>
                      );
                    }
                    return <div className="grid grid-cols-7 gap-1">{boxes}</div>;
                  })()}

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> Published</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span> Draft</span>
                    </div>
                    {selectedDate && (
                      <Button size="small" onClick={() => setSelectedDate(null)} className="font-sans">Clear date</Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      
      
      <Modal
        title={<span className={`${colors.primaryText} font-semibold font-sans`}>{isEditMode ? "Edit Announcement" : "Create New Announcement"}</span>}
        open={isModalVisible}
        width={800}
        onCancel={handleCloseModal}
        footer={[
          <Button 
            key="preview" 
            onClick={showPreview}
            className={`flex items-center gap-2 border ml-2 mb-4 ${colors.primaryBorder} ${colors.primaryText} hover:${colors.primaryText}/80`}
          >
            <EyeOutlined /> Preview
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={handleSubmit}
            icon={<SaveOutlined />}
            className={`${colors.primary} ${colors.primaryHover} flex items-center gap-2`}
          >
            {isEditMode ? "Update" : "Save"}
          </Button>
        ]}
        className="rounded-lg"
      >
        <Form
          form={form}
          layout="vertical"
          className="pt-4 font-sans font-semibold"
        >
          <Form.Item
            name="title"
            label={<span className="font-semibold font-sans">Announcement Title</span>}
            rules={[{ required: true, message: 'Please enter a title' }]}
          >
            <Input 
              placeholder="Enter announcement title" 
              maxLength={100}
              showCount
              className="rounded-lg font-sans font-semibold"
            />
          </Form.Item>

          <Form.Item
            name="content"
            label={<span className="font-semibold font-sans">Content</span>}
            rules={[{ required: true, message: 'Please enter announcement content' }]}
          >
            <TextArea 
              placeholder="Enter announcement content..." 
              rows={8}
              showCount
              maxLength={2000}
              className="rounded-lg font-sans font-semibold"
            />
          </Form.Item>

          <Form.Item
            name="imageUrl"
            label={<span className="font-semibold font-sans">Image (Optional)</span>}
          >
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
              />
              {uploadingImage && (
                <div className="text-sm text-gray-500 mt-2">Uploading image...</div>
              )}
              {form.getFieldValue('imageUrl') && (
                <div className="mt-3 flex justify-center">
                  <Image src={form.getFieldValue('imageUrl')} alt="Preview" height={160} className="rounded-lg object-cover" />
                </div>
              )}
            </div>
          </Form.Item>

          <Form.Item
            name="status"
            label={<span className="font-semibold font-sans">Publish Status</span>}
            valuePropName="checked"
            initialValue={false}
          >
            <Switch
              checkedChildren={<CheckOutlined />}
              unCheckedChildren={<CloseOutlined />}
              className="font-sans font-semibold"
            />
          </Form.Item>
        </Form>
      </Modal>
      
      
      <PreviewModal />
    </div>
  );
};

export default AdminAnnouncementsPage;