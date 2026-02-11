import { useEffect, useState, useRef } from 'react';
import { Table, Button, Popconfirm, message, Modal, Form, Input, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { collection, getDocs, query, where, updateDoc, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, createUserWithEmailAndPassword, signOut, fetchSignInMethodsForEmail, setPersistence, inMemoryPersistence, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { db, app as primaryApp } from '../../../../config/firebase';
import { ActivityLogger, logActivity, ACTIVITY_TYPES } from '../../../../services/activityLogService';
 

export default function AdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [deletedAdmins, setDeletedAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAuthVisible, setIsAuthVisible] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [authForm] = Form.useForm();
  const auth = getAuth();
  const [editModal, setEditModal] = useState(false);
  const [editForm] = Form.useForm();
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [addForm] = Form.useForm();
  const [superEmail, setSuperEmail] = useState('');
  const [superPassword, setSuperPassword] = useState('');
  const [superUid, setSuperUid] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [adminEmailStatus, setAdminEmailStatus] = useState({ isValid: true, message: '' });
  const [emailTouched, setEmailTouched] = useState(false);
  const [isCheckingAdminEmail, setIsCheckingAdminEmail] = useState(false);
  const emailCheckTimerRef = useRef(null);
  const secondaryAppRef = useRef(null);
  const activeCount = admins.length;
  const deletedCount = deletedAdmins.length;

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const adminQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const snap = await getDocs(adminQuery);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAdmins(data.filter(a => a.status !== 'deleted'));
      setDeletedAdmins(data.filter(a => a.status === 'deleted'));
    } catch (e) {
      console.error(e);
      message.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const ensureSecondaryApp = () => {
    if (secondaryAppRef.current) return secondaryAppRef.current;
    try {
      secondaryAppRef.current = initializeApp(primaryApp.options, 'secondary-admin-create');
    } catch (e) {
      try {
        secondaryAppRef.current = initializeApp(primaryApp.options, `secondary-admin-create-${Date.now()}`);
      } catch (e2) {
        throw e2;
      }
    }
    return secondaryAppRef.current;
  };
  const checkAdminEmailExists = async (email) => {
    const raw = (email || '').trim();
    if (!raw) {
      setAdminEmailStatus({ isValid: false, message: 'Email is required.' });
      return true;
    }
    const emailLower = raw.toLowerCase();
    setIsCheckingAdminEmail(true);
    try {

      try {
        const methods = await fetchSignInMethodsForEmail(auth, emailLower);
        if (methods && methods.length > 0) {
          setAdminEmailStatus({ isValid: false, message: 'This email is already registered.' });
          return true;
        }
      } catch {}

      const usersRef = collection(db, 'users');
      let qs = await getDocs(query(usersRef, where('email', '==', raw)));
      if (!qs.empty) {
        setAdminEmailStatus({ isValid: false, message: 'This email exists in the system.' });
        return true;
      }
      qs = await getDocs(query(usersRef, where('email', '==', emailLower)));
      if (!qs.empty) {
        setAdminEmailStatus({ isValid: false, message: 'This email exists in the system.' });
        return true;
      }
      qs = await getDocs(query(usersRef, where('emailLowercase', '==', emailLower)));
      if (!qs.empty) {
        setAdminEmailStatus({ isValid: false, message: 'This email exists in the system.' });
        return true;
      }
      setAdminEmailStatus({ isValid: true, message: 'Email is available.' });
      return false;
    } catch (e) {
      setAdminEmailStatus({ isValid: false, message: 'Error checking email availability.' });
      return false;
    } finally {
      setIsCheckingAdminEmail(false);
    }
  };

  const openAuthAndRun = (action) => {
    setPendingAction(() => action);
    setIsAuthVisible(true);
    authForm.resetFields();
  };

  const openAddAdmin = () => {
    setAddModal(true);
    addForm.resetFields();

    setAdminEmailStatus({ isValid: true, message: '' });
    setIsCheckingAdminEmail(false);
    setEmailTouched(false);
  };

  const confirmAuth = async () => {
    try {
      setAuthLoading(true);
      const { password } = await authForm.validateFields();
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        message.error('No authenticated superadmin session found');
        return;
      }
      const cred = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, cred);
      setSuperEmail(currentUser.email);
      setSuperPassword(password);
      setSuperUid(currentUser.uid);
      setIsAuthVisible(false);
      if (pendingAction) {
        await pendingAction();
      }
    } catch (e) {
      if (e && e.code) {
        let friendly = 'Password verification failed';
        const code = e.code || '';
        if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') friendly = 'Wrong password. Please try again.';
        else if (code === 'auth/too-many-requests') friendly = 'Too many attempts. Please wait and try again.';
        else if (code === 'auth/user-mismatch' || code === 'auth/user-not-found') friendly = 'Session issue. Please re-login as Superadmin.';
        authForm.setFields([{ name: 'password', errors: [friendly] }]);
      } else if (e && e.errorFields) {
      } else {
        authForm.setFields([{ name: 'password', errors: ['Verification error. Please try again.'] }]);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSoftDelete = async (id) => {
  try {
    setLoading(true);
    await updateDoc(doc(db, 'users', id), {
      status: 'deleted',
      deletedAt: serverTimestamp(),
      deletedBy: auth.currentUser?.uid || null,
    });
    message.success('Admin deleted');
    fetchAdmins();
    await ActivityLogger.accountDeleted(
      auth.currentUser?.uid,
      auth.currentUser?.email,
      {
        deletedUserId: id,
        deletedUserName: admins.find(a => a.id === id)?.firstName + ' ' + admins.find(a => a.id === id)?.lastName,
        deletedUserRole: 'admin',
        reason: 'Soft delete by superadmin',
      }
    );
    try {
      const target = admins.find(a => a.id === id);
      const name = `${target?.firstName || ''} ${target?.lastName || ''}`.trim();
      await logActivity({
        type: ACTIVITY_TYPES.DISABLE_ACCOUNT,
        userId: auth.currentUser?.uid || null,
        userEmail: auth.currentUser?.email || null,
        role: 'superAdmin',
        description: `Admin Account Of (${name}) Disable by SuperAdmin`,
        category: 'admin',
        severity: 'warning',
        metadata: { affectedUserId: id, affectedUserName: name },
      });
    } catch {}
  } catch (e) {
    message.error('Failed to delete');
  } finally {
    setLoading(false);
  }
};

  const handleRestore = async (id) => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'users', id), {
        status: 'active',
        restoredAt: serverTimestamp(),
        restoredBy: auth.currentUser?.uid || null,
      });
      message.success('Admin restored');
      fetchAdmins();
      try {
        const target = deletedAdmins.find(a => a.id === id) || admins.find(a => a.id === id);
        const name = `${target?.firstName || ''} ${target?.lastName || ''}`.trim();
        await logActivity({
          type: ACTIVITY_TYPES.ACCOUNT_RESTORED,
          userId: auth.currentUser?.uid || null,
          userEmail: auth.currentUser?.email || null,
          role: 'superAdmin',
          description: `Admin Account Of (${name}) Restore by SuperAdmin`,
          category: 'admin',
          metadata: { affectedUserId: id, affectedUserName: name },
        });
      } catch {}
    } catch (e) {
      console.error(e);
      message.error('Failed to restore');
    } finally {
      setLoading(false);
    }
  };

const handlePermanentDelete = async (id) => {
  try {
    setLoading(true);
    await deleteDoc(doc(db, 'users', id));
    message.success('Admin permanently deleted');
    fetchAdmins();
    await ActivityLogger.accountDeleted(
      auth.currentUser?.uid,
      auth.currentUser?.email,
      {
        deletedUserId: id,
        deletedUserName: deletedAdmins.find(a => a.id === id)?.firstName + ' ' + deletedAdmins.find(a => a.id === id)?.lastName,
        deletedUserRole: 'admin',
        reason: 'Permanent delete by superadmin',
      }
    );
    try {
      const target = deletedAdmins.find(a => a.id === id);
      const name = `${target?.firstName || ''} ${target?.lastName || ''}`.trim();
      await logActivity({
        type: ACTIVITY_TYPES.PERMANENTLY_DELETED,
        userId: auth.currentUser?.uid || null,
        userEmail: auth.currentUser?.email || null,
        role: 'superAdmin',
        description: `Admin Account Of (${name})Permanently Delete by SuperAdmin.`,
        category: 'admin',
        severity: 'warning',
        metadata: { affectedUserId: id, affectedUserName: name },
      });
    } catch {}
  } catch (e) {
    message.error('Failed to permanently delete');
  } finally {
    setLoading(false);
  }
};

  const handleEditAdmin = async (admin) => {
    setEditingAdmin(admin);
    editForm.setFieldsValue({
      firstName: admin.firstName || '',
      lastName: admin.lastName || '',
      middleName: admin.middleName || '',
      contact: admin.contact || '',
      email: admin.email || '',
    });
    setEditModal(true);
  };

const handleUpdateAdmin = async () => {
  try {
    const values = await editForm.validateFields();
    await updateDoc(doc(db, 'users', editingAdmin.id), {
      ...values,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid || null,
    });
    setEditModal(false);
    setEditingAdmin(null);
    message.success('Successful Update Information');
    fetchAdmins();
    await ActivityLogger.profileUpdated(
      auth.currentUser?.uid,
      auth.currentUser?.email,
      {
        updatedFields: Object.keys(values),
        studentName: `${values.firstName} ${values.lastName}`,
        changes: values,
        action: 'Superadmin updated admin info',
        affectedUserId: editingAdmin.id,
        affectedUserEmail: editingAdmin.email,
      }
    );
    try {
      const name = `${values.firstName || ''} ${values.lastName || ''}`.trim();
      await logActivity({
        type: ACTIVITY_TYPES.UPDATE_INFO,
        userId: auth.currentUser?.uid || null,
        userEmail: auth.currentUser?.email || null,
        role: 'superAdmin',
        description: `Update Information (${name})`,
        category: 'admin',
        metadata: { affectedUserId: editingAdmin.id, affectedUserEmail: editingAdmin.email },
      });
    } catch {}
  } catch (e) {
    message.error('Not Successful due to an Error');
  }
};

  const maskEmail = (email) => {
    if (!email || typeof email !== 'string') return '';
    const parts = String(email).split('@');
    if (parts.length !== 2) return '****';
    const [name, domain] = parts;
    const first = (name || '').slice(0, 1);
    return `${first || ''}****@${domain || ''}`;
  };

  const columns = [
    {
      title: 'Full Name',
      key: 'fullName',
      render: (_, r) => `${r.lastName || ''}, ${r.firstName || ''} ${r.middleName || ''}`.trim(),
    },

    { title: 'Email ', key: 'emailMasked', render: (_, r) => maskEmail(r.email) },
    {
      title: 'Actions', key: 'actions', render: (_, r) => (
        <div className="flex gap-2">

            <Button
              type="text"
              icon={<EditOutlined />}
              aria-label="Edit admin"
              onClick={() => openAuthAndRun(() => handleEditAdmin(r))}
            />

          <Popconfirm title="Delete admin?" onConfirm={() => openAuthAndRun(() => handleSoftDelete(r.id))}>
              <Button danger type="text" icon={<DeleteOutlined />} aria-label="Soft delete admin" />
          </Popconfirm>
        </div>
      )
    }
  ];

  
  const deletedColumns = [
    { title: 'Full Name', key: 'fullName', render: (_, r) => `${r.lastName || ''}, ${r.firstName || ''} ${r.middleName || ''}`.trim() },
    { title: 'Email', key: 'emailMasked', render: (_, r) => maskEmail(r.email) },
    {
      title: 'Actions', key: 'actions', render: (_, r) => (
        <div className="flex gap-2">
            <Button onClick={() => openAuthAndRun(() => handleRestore(r.id))} aria-label="Restore admin">Restore</Button>
          <Popconfirm title="Delete permanently?" onConfirm={() => openAuthAndRun(() => handlePermanentDelete(r.id))}>
              <Button danger aria-label="Permanently delete admin">Delete Permanently</Button>
          </Popconfirm>
        </div>
      )
    }
  ];

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-semibold">Superadmin</h2>
          <p className="text-blue-200 text-sm">Create, update, and manage admin accounts. Actions require Superadmin verification.</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-400/30">Active: {activeCount}</span>
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-200 text-xs border border-red-400/30">Deleted: {deletedCount}</span>
          </div>
        </div>
        <div className="flex gap-2">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openAuthAndRun(openAddAdmin)} aria-label="Add admin">Add Admin</Button>
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <Table rowKey="id" loading={loading} columns={columns} dataSource={admins} pagination={{ pageSize: 10 }} />
      </div>
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="text-gray-800 text-base font-semibold mb-3">Deleted Admins</h3>
        <Table rowKey="id" loading={loading} columns={deletedColumns} dataSource={deletedAdmins} pagination={{ pageSize: 10 }} />
      </div>
    </div>

    <Modal
      title="Superadmin Verification"
      open={isAuthVisible}
      onOk={confirmAuth}
      onCancel={() => setIsAuthVisible(false)}
      okText="Confirm"
      confirmLoading={authLoading}
      maskClosable={false}
      keyboard={false}
    >
      <Form form={authForm} layout="vertical">
        <Form.Item label="Email" tooltip="Using current superadmin email">
          <Input value={auth.currentUser?.email || ''} disabled />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[
          { required: true, message: 'Enter your password' },
          { min: 6, message: 'Password must be at least 6 characters' }
        ]}>
          <Input.Password placeholder="Enter superadmin password" />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      title="Edit Admin Information"
      open={editModal}
      onOk={handleUpdateAdmin}
      onCancel={() => { setEditModal(false); setEditingAdmin(null); }}
      okText="Update"
      destroyOnClose
    >
      <Form form={editForm} layout="vertical">
        <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'Required' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Required' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="middleName" label="Middle Name">
          <Input />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[
          { required: true, message: 'Required' },
          { type: 'email', message: 'Invalid email' }
        ]}>
          <Input disabled />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      title="Add New Admin"
      open={addModal}
      confirmLoading={addLoading}
      onOk={async () => {
        try {
          setAddLoading(true);
          const primaryUid = auth.currentUser?.uid || null;
          const values = await addForm.validateFields();
          const { firstName, lastName, middleName = '', email, password, confirmPassword } = values;
          const emailTrim = (email || '').trim();
          const emailLower = emailTrim.toLowerCase();
          if (password !== confirmPassword) {
            addForm.setFields([
              { name: 'confirmPassword', errors: ['Passwords do not match'] }
            ]);
            message.error('Passwords do not match');
            return;
          }

          try {
            const usersRef = collection(db, 'users');
            let qs = await getDocs(query(usersRef, where('email', '==', emailTrim)));
            if (!qs.empty) {
              addForm.setFields([{ name: 'email', errors: ['Email already exists in the system'] }]);
              message.error('Email already exists');
              return;
            }

            qs = await getDocs(query(usersRef, where('email', '==', emailLower)));
            if (!qs.empty) {
              addForm.setFields([{ name: 'email', errors: ['Email already exists in the system'] }]);
              message.error('Email already exists');
              return;
            }

            qs = await getDocs(query(usersRef, where('emailLowercase', '==', emailLower)));
            if (!qs.empty) {
              addForm.setFields([{ name: 'email', errors: ['Email already exists in the system'] }]);
              message.error('Email already exists');
              return;
            }
          } catch { /* ignore pre-check failure; Firebase Auth will still validate */ }
           const secondaryAuth = getAuth(ensureSecondaryApp());

          try { await setPersistence(secondaryAuth, inMemoryPersistence); } catch {}
          const cred = await createUserWithEmailAndPassword(secondaryAuth, emailLower, password);
          const newUid = cred?.user?.uid;
          if (!newUid) throw new Error('Failed to retrieve new user UID');

          await setDoc(doc(db, 'users', newUid), {
            firstName,
            lastName,
            middleName,
            email: emailTrim,
            emailLowercase: emailLower,
            role: 'admin',
            status: 'active',
            createdAt: serverTimestamp(),
          }, { merge: true });

          try {
            await logActivity({
              type: ACTIVITY_TYPES.USER_UPDATE,
              userId: superUid || null,
              userEmail: superEmail || null,
              role: 'superAdmin',
              description: `Superadmin created admin account for ${firstName} ${lastName}`,
              category: 'admin',
              metadata: { createdUserEmail: email }
            });
          } catch {}

          try { await signOut(secondaryAuth); } catch {}

          await fetchAdmins();
          setAddModal(false);
          addForm.resetFields();

          try {
            if (primaryUid && auth.currentUser?.uid !== primaryUid && superEmail && superPassword) {
              await signInWithEmailAndPassword(auth, superEmail, superPassword);
            }
          } catch {}

          Modal.success({
            title: 'Admin Created',
            content: `${firstName} ${lastName} (${email}) has been created as Admin and can now log in.`,
          });
        } catch (err) {
          const code = err?.code || '';
          if (code === 'auth/email-already-in-use') {
            addForm.setFields([{ name: 'email', errors: ['Email is already in use'] }]);
            message.error('Email is already in use');
          } else if (code === 'auth/weak-password') {
            addForm.setFields([{ name: 'password', errors: ['Password is too weak'] }]);
            message.error('Password is too weak');
          } else {
            const msg = err?.message || 'Failed to create admin account';
            message.error(msg);
          }
        }
      }}
      onCancel={() => { setAddModal(false); addForm.resetFields(); }}
      okText="Create Account"
      destroyOnClose
    >
      <Form form={addForm} layout="vertical">
        <Form.Item
          name="firstName"
          label="First Name"
          rules={[
            { required: true, message: 'Required' },
            { pattern: /^[^0-9]*$/, message: 'Numbers are not allowed in the name' }
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="lastName"
          label="Last Name"
          rules={[
            { required: true, message: 'Required' },
            { pattern: /^[^0-9]*$/, message: 'Numbers are not allowed in the name' }
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="middleName"
          label="Middle Name"
          rules={[{ pattern: /^[^0-9]*$/, message: 'Numbers are not allowed in the name' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email"
          hasFeedback
          validateTrigger={['onChange', 'onBlur']}
          validateDebounce={400}
          validateFirst
          rules={[
            { required: true, message: 'Required' },
            { type: 'email', message: 'Invalid email' },
            { pattern: /@gmail\.com$/i, message: 'Email must be a @gmail.com address' },
            async () => ({
              async validator(_, value) {
                const raw = typeof value === 'string' ? value : '';
                const emailVal = raw.trim();
                const emailLower = emailVal.toLowerCase();
                if (!emailVal) return Promise.resolve();
                try {
                  // Check Firebase Auth for existing sign-in methods (case-insensitive)
                  const methods = await fetchSignInMethodsForEmail(auth, emailLower);
                  if (methods && methods.length > 0) {
                    return Promise.reject(new Error('Email is already in use'));
                  }
                } catch {}
                try {

                  const usersRef = collection(db, 'users');

                  let qs = await getDocs(query(usersRef, where('email', '==', emailVal)));
                  if (!qs.empty) {
                    return Promise.reject(new Error('Email already exists in the system'));
                  }

                  qs = await getDocs(query(usersRef, where('email', '==', emailLower)));
                  if (!qs.empty) {
                    return Promise.reject(new Error('Email already exists in the system'));
                  }

                  qs = await getDocs(query(usersRef, where('emailLowercase', '==', emailLower)));
                  if (!qs.empty) {
                    return Promise.reject(new Error('Email already exists in the system'));
                  }
                } catch {}
                return Promise.resolve();
              }
            })
          ]}
          validateStatus={
            isCheckingAdminEmail
              ? 'validating'
              : emailTouched
                ? (adminEmailStatus.isValid ? 'success' : 'error')
                : undefined
          }
          help={emailTouched && !adminEmailStatus.isValid ? (adminEmailStatus.message || undefined) : undefined}
        >
          <Input onChange={(e) => {
            const v = e.target.value;

            if (emailCheckTimerRef.current) clearTimeout(emailCheckTimerRef.current);
            emailCheckTimerRef.current = setTimeout(() => {

              const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
              if (emailPattern.test(v)) {
                setEmailTouched(true);
                checkAdminEmailExists(v).then((exists) => {
                  if (!exists) {

                    try { addForm.setFields([{ name: 'email', errors: [] }]); } catch {}
                  }
                });
              } else if (v.trim()) {
                setEmailTouched(true);
                setAdminEmailStatus({ isValid: false, message: 'Email must contain "@" and a domain (e.g., .com)' });
              } else {
  
                setAdminEmailStatus({ isValid: true, message: '' });
              }
            }, 350);
          }} onBlur={(e) => {
            setEmailTouched(true);
            if (!e.target.value.trim()) {
              setAdminEmailStatus({ isValid: false, message: 'Email is required.' });
            }
          }} />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: 'Required' },
            { min: 8, message: 'Password must be at least 8 characters' }
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="Confirm Password"
          dependencies={["password"]}
          rules={[
            { required: true, message: 'Please confirm the password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match'));
              }
            })
          ]}
        >
          <Input.Password />
        </Form.Item>
      </Form>
    </Modal>
    </>
  );
}
