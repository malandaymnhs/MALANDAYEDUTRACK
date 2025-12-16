import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { collection, onSnapshot, orderBy, query, where, limit, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { Alert, DatePicker, Empty, Input, Select, Table, Badge, Button, Space, Tag, Modal, Form, Tooltip } from 'antd';
import { 
  ReloadOutlined, 
  SearchOutlined, 
  ClockCircleOutlined,
  UserOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { ShieldCheck } from 'lucide-react';

const { RangePicker } = DatePicker;
const { confirm } = Modal;

const activityTypeOptions = [
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'successful qr checked', label: 'Successful QR Checked' },
  
  { value: 'request submitted', label: 'Request Submitted' },
  { value: 'request approved', label: 'Request Approved' },
  { value: 'request rejected', label: 'Request Rejected' },
  { value: 'request pending', label: 'Request Pending' },
  { value: 'status updated', label: 'Status Updated' },
  { value: 'profile updated', label: 'Profile Updated' },
  { value: 'document viewed', label: 'Document Viewed' },
  { value: 'announcement created', label: 'Announcement Created' },
  { value: 'announcement updated', label: 'Announcement Updated' },
  { value: 'announcement deleted', label: 'Announcement Deleted' },
  { value: 'event created', label: 'Event Created' },
  { value: 'event updated', label: 'Event Updated' },
  { value: 'event deleted', label: 'Event Deleted' },
  { value: 'student managed', label: 'Student Managed' },
  { value: 'password changed', label: 'Password Changed' },
  { value: 'account deleted', label: 'Account Deleted' },
  { value: 'account restored', label: 'Account Restored' },
  { value: 'permission changed', label: 'Permission Changed' },
  { value: 'publish', label: 'Publish' },
  { value: 'draft', label: 'Draft' },
  { value: 'user update', label: 'User Update' },
  { value: 'update schedule', label: 'Update Schedule' },
  { value: 'update info', label: 'Update Info' },
  { value: 'disable account', label: 'Disable Account' },
  { value: 'permanently deleted', label: 'Permanently Deleted' },
  { value: 'canceled request', label: 'Canceled Request' },
  { value: 'send email', label: 'Send Email' },
  { value: 'edit request', label: 'Edit Request' },
];

const roleOptions = [
  { value: 'student', label: 'Student' },
  { value: 'admin', label: 'Admin' },
  { value: 'superAdmin', label: 'Super Admin' },
  { value: 'alumni', label: 'Alumni' },
];

export default function SuperadminUserLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(undefined);
  const [roleFilter, setRoleFilter] = useState(undefined);
  const [userFilter, setUserFilter] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [sortOrder, setSortOrder] = useState('descend');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [newLogsCount, setNewLogsCount] = useState(0);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteForm] = Form.useForm();
  const [renderTrigger, setRenderTrigger] = useState(0);
  const debounceTimers = useRef({});

  useEffect(() => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'activity_logs'), 
        orderBy('timestamp', 'desc')
      );

      if (typeFilter && roleFilter) {
        q = query(
          collection(db, 'activity_logs'),
          where('type', '==', typeFilter),
          where('role', '==', roleFilter),
          orderBy('timestamp', 'desc')
        );
      } else if (typeFilter) {
        q = query(
          collection(db, 'activity_logs'),
          where('type', '==', typeFilter),
          orderBy('timestamp', 'desc')
        );
      } else if (roleFilter) {
        q = query(
          collection(db, 'activity_logs'),
          where('role', '==', roleFilter),
          orderBy('timestamp', 'desc')
        );
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log(`📊 Firestore Listener triggered: ${snapshot.docs.length} documents received`);
        
        const data = snapshot.docs.map((d) => {
          const docData = d.data();
          let convertedTimestamp;
          if (docData.timestamp?.toDate && typeof docData.timestamp.toDate === 'function') {
            convertedTimestamp = docData.timestamp.toDate();
          } else if (docData.timestamp instanceof Date) {
            convertedTimestamp = docData.timestamp;
          } else if (typeof docData.timestamp === 'number') {
            convertedTimestamp = new Date(docData.timestamp);
          } else if (docData.timestamp?.seconds) {
            convertedTimestamp = new Date(docData.timestamp.seconds * 1000);
          } else {
            convertedTimestamp = new Date();
          }

          if (docData.type === 'request submitted' || docData.type === 'logout') {
            console.log(`🔍 Document ID: ${d.id}`, {
              type: docData.type,
              rawTimestamp: docData.timestamp,
              convertedTimestamp: convertedTimestamp,
              convertedISO: convertedTimestamp.toISOString(),
              email: docData.userEmail
            });
          }
          
          return {
            id: d.id,
            ...docData,
            _timestamp: convertedTimestamp,
            _renderKey: `${d.id}-${convertedTimestamp.getTime()}`
          };
        });

        console.log(`State update triggered with ${data.length} logs`);
        setLogs(data);
        setError(null);
        setLoading(false);
        setLastUpdate(new Date());


        setNewLogsCount(prevCount => {

          return 0;
        });
      }, (err) => {
        console.error('❌ Firestore listener error:', err);

        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up listener:', err);
      setLoading(false);
    }
  }, [typeFilter, roleFilter]);


  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      setRenderTrigger(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    if (logs.length === 0) return [];
    
    const lowerSearch = search.toLowerCase();
    const lowerUserFilter = userFilter.toLowerCase();
    
    return logs.filter((log) => {
      if (typeFilter && log.type !== typeFilter) return false;
      if (roleFilter && log.role !== roleFilter) return false;
      
      if (dateRange) {
        const ts = log._timestamp || (log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp));
        if (!ts || ts < dateRange[0].toDate() || ts > dateRange[1].toDate()) return false;
      }
      
      if (lowerUserFilter) {
        const userEmail = (log.userEmail || '').toLowerCase();
        const userName = (log.userName || '').toLowerCase();
        const userId = (log.userId || '').toLowerCase();
        if (!userEmail.includes(lowerUserFilter) && 
            !userName.includes(lowerUserFilter) && 
            !userId.includes(lowerUserFilter)) {
          return false;
        }
      }
      
      if (lowerSearch) {
        const description = (log.description || '').toLowerCase();
        const userEmail = (log.userEmail || '').toLowerCase();
        const userName = (log.userName || '').toLowerCase();
        const role = (log.role || '').toLowerCase();
        const type = (log.type || '').toLowerCase();
        const category = (log.category || '').toLowerCase();
        
        if (!description.includes(lowerSearch) &&
            !userEmail.includes(lowerSearch) &&
            !userName.includes(lowerSearch) &&
            !role.includes(lowerSearch) &&
            !type.includes(lowerSearch) &&
            !category.includes(lowerSearch)) {
          return false;
        }
      }
      
      return true;
    }).sort((a, b) => {
      const ta = a._timestamp?.getTime() || 0;
      const tb = b._timestamp?.getTime() || 0;
      return sortOrder === 'ascend' ? ta - tb : tb - ta;
    });
  }, [logs, search, typeFilter, roleFilter, userFilter, dateRange, sortOrder]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setTypeFilter(undefined);
    setRoleFilter(undefined);
    setUserFilter('');
    setDateRange(null);
    setSortOrder('descend');
  }, []);

  const forceRefreshListener = useCallback(() => {
    console.log(' Force refreshing listener - clearing and re-fetching all data');
    setLoading(true);
    setLogs([]);
    setRenderTrigger(prev => prev + 1);
  }, []);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'error': return 'orange';
      case 'warning': return 'yellow';
      case 'info': 
      default: return 'blue';
    }
  };

  const getActivityColor = (type) => {
    if (type === 'login') return 'green';
    if (type === 'logout') return 'red';
    if (type === 'publish') return 'green';
    if (type === 'draft') return 'orange';
    if (type === 'user update') return 'blue';
    if (type === 'update schedule') return 'gold';
    if (type === 'update info') return 'blue';
    if (type === 'disable account') return 'red';
    if (type === 'permanently deleted') return 'red';
    if (type === 'canceled request') return 'volcano';
    if (type === 'send email') return 'geekblue';
    if (type === 'edit request') return 'cyan';
    if (type?.includes('approved')) return 'green';
    if (type?.includes('rejected')) return 'red';
    if (type?.includes('request')) return 'blue';
    if (type?.includes('profile')) return 'purple';
    if (type?.includes('tab')) return 'indigo';
    if (type?.includes('announcement')) return 'pink';
    if (type?.includes('event')) return 'teal';
    if (type?.includes('account')) return 'orange';
    return 'gray';
  };

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: '_timestamp',
      key: '_timestamp',
      sorter: (a, b) => (a._timestamp?.getTime?.() || 0) - (b._timestamp?.getTime?.() || 0),
      width: 140,
      render: (val, record) => {
        let d;
        if (record._timestamp instanceof Date) {
          d = record._timestamp;
        } else if (record.timestamp?.toDate && typeof record.timestamp.toDate === 'function') {
          d = record.timestamp.toDate();
        } else if (record.timestamp instanceof Date) {
          d = record.timestamp;
        } else if (typeof record.timestamp === 'number') {
          d = new Date(record.timestamp);
        } else if (record.timestamp?.seconds) {
          d = new Date(record.timestamp.seconds * 1000);
        } else {
          return 'N/A';
        }

        if (record.type === 'request submitted' || record.type === 'logout') {
          console.log(`Rendering ${record.type}: ${d.toISOString()}`);
        }

        const isRecent = Date.now() - d.getTime() < 60000;
        return (
          <div className="flex items-center space-x-1">
            <span className={`text-xs ${isRecent ? 'text-green-600 font-medium' : ''}`}>
              {d.toLocaleDateString()}
            </span>
            <br />
            <span className={`text-xs ${isRecent ? 'text-green-600 font-medium' : ''}`}>
              {d.toLocaleTimeString()}
            </span>
            {isRecent && (
              <Badge status="processing" text="Live" size="small" />
            )}
          </div>
        );
      },
      defaultSortOrder: sortOrder,
    },
    {
      title: 'User',
      key: 'user',
      width: 160,
      render: (_, record) => (
        <div className="space-y-1">
          <div className="font-medium text-sm flex items-center">
            <UserOutlined className="mr-1 text-gray-400 text-xs" />
            {record.userName || 'Unknown User'}
          </div>
          <div className="text-xs text-gray-500 truncate">{record.userEmail || 'No email'}</div>
        </div>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 80,
      render: (role) => (
        <Tag color={
          role === 'admin' ? 'blue' :
          role === 'superAdmin' ? 'purple' :
          role === 'student' ? 'green' :
          role === 'alumni' ? 'orange' :
          'default'
        } size="small">
          {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown'}
        </Tag>
      ),
    },
    {
      title: 'Activity',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type, record) => (
        <div className="space-y-1">
          <Tag color={getActivityColor(type)} size="small">
            {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown'}
          </Tag>
          {record.severity && record.severity !== 'info' && (
            <Tag color={getSeverityColor(record.severity)} size="small">
              {record.severity.toUpperCase()}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 400,
      ellipsis: false,
      render: (description, record) => (
        <div className="whitespace-pre-line break-words text-sm font-medium" style={{ maxWidth: 600 }}>
          {description || 'No description'}
          {record.category && record.category !== 'general' && (
            <span className="ml-2 px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 text-xs">{record.category}</span>
          )}
        </div>
      ),
    },
  ];

  const handleDeleteAllLogs = () => {
    setDeleteModal(true);
    deleteForm.resetFields();
  };

  const confirmDeleteAllLogs = async () => {
    try {
      setDeleteLoading(true);
      const { password } = await deleteForm.validateFields();
      const { getAuth, EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        Modal.error({ title: 'Failed', content: 'No authenticated session found.' });
        setDeleteLoading(false);
        return;
      }
      const cred = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, cred);

      const logsSnapshot = await getDocs(collection(db, 'activity_logs'));
      const deletePromises = logsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      setDeleteModal(false);
      setDeleteLoading(false);
      Modal.success({ title: 'Successful deleted a table logs' });
    } catch (err) {
      setDeleteLoading(false);
      Modal.error({
        title: 'Failed, There is Something wrong',
        content: err?.message || 'Failed to delete all logs. Please try again.',
      });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-semibold text-blue-900">Superadmin System Logs</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">Search, filter, and audit activities across all roles.</p>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold">All Activity Logs</h3>
            <div className="flex items-center space-x-2">
              <ClockCircleOutlined className="text-gray-400" />
              <span className="text-sm text-gray-500">Last updated: {lastUpdate.toLocaleTimeString()}</span>
            </div>
            {newLogsCount > 0 && (
              <Badge count={newLogsCount} size="small" className="bg-green-500" />
            )}
          </div>
          <Space>
          </Space>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input 
              placeholder="Search" 
              allowClear 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              prefix={<SearchOutlined />}
            />
            <Input 
              placeholder="Filter by user/email/ID" 
              allowClear 
              value={userFilter} 
              onChange={(e) => setUserFilter(e.target.value)}
              prefix={<UserOutlined />}
            />
            <Select 
              allowClear 
              placeholder="Activity type" 
              value={typeFilter} 
              onChange={setTypeFilter} 
              options={activityTypeOptions}
              style={{ width: '100%' }}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select 
              allowClear 
              placeholder="User role" 
              value={roleFilter} 
              onChange={setRoleFilter} 
              options={roleOptions}
              style={{ width: '100%' }}
            />
            <RangePicker 
              showTime 
              allowClear 
              value={dateRange} 
              onChange={setDateRange}
              style={{ width: '100%' }}
            />
            <Button onClick={clearFilters} size="small">Clear All Filters</Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {!loading && !error && filtered.length === 0 && (
          <Empty 
            description="No activity logs found" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
        {error && (
          <Alert type="error" message={error} showIcon />
        )}
        <Table
          rowKey={(record) => `${record.id}-${record._timestamp?.getTime?.() || 0}`}
          loading={loading}
          dataSource={filtered}
          columns={columns}
          onChange={(pagination, filters, sorter) => {
            if (sorter && sorter.order) {
              setSortOrder(sorter.order);
            }
          }}
          pagination={{ 
            pageSize: 15, 
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} logs`
          }}
          scroll={{ x: 1000 }}
          size="small"
        />
      </div>

      <Modal
        open={deleteModal}
        title={
          <span>
            <ExclamationCircleOutlined className="text-red-500 mr-2" />
            Security Confirmation
          </span>
        }
        okText="Delete All"
        okType="danger"
        confirmLoading={deleteLoading}
        cancelText="Cancel"
        onOk={confirmDeleteAllLogs}
        onCancel={() => setDeleteModal(false)}
        centered
        destroyOnClose
      >
        <Form form={deleteForm} layout="vertical">
          <Form.Item label="Superadmin Password" name="password" rules={[{ required: true, message: 'Enter your password' }]}> 
            <Input.Password placeholder="Enter your password for confirmation" />
          </Form.Item>
        </Form>
        <div className="text-red-600 mt-2">
          This will permanently delete <b>all</b> system logs. This action cannot be undone.
        </div>
      </Modal>
    </div>
  );
}


