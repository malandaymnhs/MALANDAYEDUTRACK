import { useMemo, Suspense, lazy, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Modal } from 'antd';
import { getAuth, signOut } from 'firebase/auth';
import { ShieldCheck, Activity, Users } from 'lucide-react';
import Footer from '../../../layout/Footer';

const SuperadminUserLogs = lazy(() => import('./SuperadminUserLogs.jsx'));
const AdminManagement = lazy(() => import('./AdminManagement.jsx'));

export default function SuperadminLanding() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [logoutModal, setLogoutModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1280);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    setLogoutModal(false);
    try {
      await signOut(auth);
      navigate('/login');
    } catch {}
  };

  if (isMobile) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A2463]">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-lg w-full text-center border-2 border-blue-900">
          <img src="/logo lang.png" alt="Logo" className="h-20 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-blue-900 mb-4">Access Restricted</h2>
          <p className="text-base text-gray-700 font-medium mb-2">
            Superadmin dashboard is only accessible on laptops and computers.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 font-medium mt-4"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0A2463]">
      <header className="bg-[#0A2463] border-b border-blue-900 shadow-lg px-0 py-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/logo lang.png" alt="Logo" className="h-14 w-14 rounded-full shadow" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-white tracking-tight">Malanday EduTrack</h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30" aria-label="Superadmin Badge">
                    <ShieldCheck className="w-4 h-4" /> Superadmin
                  </span>
                </div>
                <p className="text-blue-200 text-sm mt-1">Centralized controls and high-privilege operations for system oversight.</p>
              </div>
            </div>
            <button
              onClick={() => setLogoutModal(true)}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-blue-200 text-white hover:bg-blue-800 transition"
              aria-label="Logout of Superadmin dashboard"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-6 py-8">
        <section className="bg-blue-950/90 rounded-2xl border border-blue-900 p-6 shadow-xl">
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-white text-xl font-semibold">Superadmin Control Center</h2>
            </div>
            <p className="text-blue-200 text-sm mt-1">Manage administrators and monitor real-time system activities.</p>
          </div>
          <Tabs
            defaultActiveKey="admin"
            className="superadmin-tabs"
            items={[
              {
                key: 'admin',
                label: (
                  <span className="text-white">
                    <Users className="inline w-4 h-4 text-emerald-400 mr-2" /> Admin Management
                  </span>
                ),
                children: (
                  <div className="mt-4">
                    <Suspense fallback={<div className="text-gray-400">Loading admin management…</div>}>
                      <AdminManagement />
                    </Suspense>
                  </div>
                )
              },
              {
                key: 'logs',
                label: (
                  <span className="text-white">
                    <Activity className="inline w-4 h-4 text-emerald-400 mr-2" /> System Logs
                  </span>
                ),
                children: (
                  <div className="mt-4 bg-white rounded-xl">
                    <Suspense fallback={<div className="p-4 text-gray-500">Loading logs…</div>}>
                      <SuperadminUserLogs autoRefreshInterval={60000} expandDescription />
                    </Suspense>
                  </div>
                )
              }
            ]}
          />
        </section>
      </main>

      <Footer />

      <Modal
        open={logoutModal}
        onOk={handleLogout}
        onCancel={() => setLogoutModal(false)}
        okText="Logout"
        cancelText="Cancel"
        centered
        title={<span className="text-blue-900 font-bold">Confirm Logout</span>}
      >
        <div className="text-center py-2">
          <p className="text-base text-blue-900">Are you sure you want to log out of the Superadmin dashboard?</p>
        </div>
      </Modal>
    </div>
  );
}


