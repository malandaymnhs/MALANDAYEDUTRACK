import { useState, useEffect } from "react";
import { auth } from "../../../../config/firebase";
import { getAuth } from "firebase/auth";
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from "framer-motion";
import { Modal, Button } from 'antd';
import { ActivityLogger, ACTIVITY_TYPES } from "../../../../services/activityLogService";
import AdminRequestManagement from "./AdminRequestManagement";
import AdminEventManagement from "./AdminEventManagement";
import StudentManagement from "./AdminStudentManagement";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../config/firebase";


import {
  CalendarIcon, 
  DocumentTextIcon, 
  UserGroupIcon, 
  XMarkIcon,
  WrenchScrewdriverIcon,
  BellIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import AdminAnnouncements from "./AdminAnnouncements";

const DevelopmentPlaceholder = ({ moduleName }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="flex flex-col items-center justify-center p-4 sm:p-8 bg-white rounded-xl shadow-xl text-center border border-blue-100"
  >
    <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 text-blue-700">
      <WrenchScrewdriverIcon />
    </div>
    <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-3">{moduleName} Module</h2>
    <p className="text-sm sm:text-base text-blue-700 mb-6">
      The {moduleName} module is currently under development. Please check back later.
    </p>
    <button 
      className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      onClick={() => console.log(`${moduleName} will be coming soon!`)}
    >
      Go Back
    </button>
  </motion.div>
);

DevelopmentPlaceholder.propTypes = {
  moduleName: PropTypes.string.isRequired
};

const MobileAccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 to-red-100 p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-lg w-full text-center border-2 border-red-200">
        <div className="w-24 h-24 mx-auto mb-6 text-red-500">
          <XMarkIcon />
        </div>
        <h2 className="text-2xl font-bold text-red-800 mb-4">Access Restricted</h2>
        <div className="space-y-3 mb-8">
          <p className="text-base text-gray-700 font-medium">
            Administrative access is restricted to desktop and laptop computers only.
          </p>
          <p className="text-sm text-gray-600">
            For security reasons, the Super Admin and Admin dashboards cannot be accessed on:
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Tablets and iPads</li>
            <li>• Smartphones and mobile devices</li>
            <li>• Small laptop screens (under 1280px width)</li>
          </ul>
          <p className="text-sm text-gray-600 mt-3">
            Please use a desktop computer or large laptop to access administrative functions.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium"
          >
            Return to Home
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminRole, setAdminRole] = useState(""); // <-- Add this line
  const navigate = useNavigate();
  const [moduleLoadErrors, setModuleLoadErrors] = useState({
    users: false,
    dashboard: false,
    announcements: false,
    school: false,
  });

  // Define loadModule function
  const loadModule = (ModuleComponent, moduleName) => {
    try {
      if (moduleLoadErrors[moduleName.toLowerCase().replace(/\s+/g, '')]) {
        return <DevelopmentPlaceholder moduleName={moduleName} />;
      }
      
      return (
        <div className="h-full w-full overflow-auto">
          <ModuleComponent />
        </div>
      );
    } catch (error) {
      console.error(`Error loading ${moduleName} module:`, error);
      setModuleLoadErrors(prev => ({
        ...prev,
        [moduleName.toLowerCase().replace(/\s+/g, '')]: true
      }));
      return <DevelopmentPlaceholder moduleName={moduleName} />;
    }
  };

  // Define handleLogout function
  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Super Admin specific layout - moved to top of component
  /* Super admin layout removed */
  const SuperAdminLayout = () => (
    <div className="hidden">
      {/* Bold, authoritative header */}
      <header className="bg-gray-900 border-b border-gray-800 shadow-2xl">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-14 h-14 bg-gray-800 rounded-xl flex items-center justify-center shadow-lg border border-gray-700">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                
                <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">System Administration & Control</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <button 
                onClick={() => navigate('/')}
                className="px-6 py-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200 flex items-center space-x-3 border border-gray-700 hover:border-gray-600"
              >
                <HomeIcon className="w-5 h-5" />
                <span className="font-medium">Home</span>
              </button>
              
              {/* User profile with prominent Super Admin badge */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-4 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200 border border-gray-700 hover:border-gray-600"
                >
                  <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-white font-bold text-lg border-2 border-gray-600">
                    {adminFirstName ? adminFirstName.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div className="text-left">
                    <div className="text-base font-semibold text-white">{adminFirstName || 'Administrator'}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-900/50 text-blue-200 border border-blue-700/50">
                        <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        SUPER ADMIN
                      </span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* User dropdown menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-gray-900 rounded-xl shadow-2xl border border-gray-700 py-3 z-50">
                    <div className="px-4 py-4 border-b border-gray-700">
                      <div className="text-sm font-semibold text-white">{adminFirstName || 'Administrator'}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Super Administrator</div>
                    </div>
                    <button
                      onClick={() => {
                        setIsLogoutModalOpen(true);
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-all duration-200"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        </header>

      {/* Main content area */}
      <div className="flex">
        <aside className="hidden">
          <div className="p-8">
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-300 mb-3 uppercase tracking-wider">Navigation</h2>
              <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
            </div>
            
            {/* Navigation items for Super Admin */}
            <nav className="space-y-3">
              <button
                onClick={async () => {
                  setActiveTab('users');
                  // Log tab access
                  try {
                    const auth = getAuth();
                    const admin = auth.currentUser;
                    await ActivityLogger.tabAccessed(admin?.uid || null, admin?.email || null, {
                      tabName: 'users',
                      previousTab: activeTab,
                      userRole: adminRole,
                    });
                  } catch (error) {
                    console.error('Error logging tab access:', error);
                  }
                }}
                className={`w-full text-left bg-gray-800 border-l-4 rounded-r-lg shadow-lg ${activeTab==='users' ? 'border-blue-600' : 'border-gray-700'}`}
              >
                <div className="px-6 py-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center border border-blue-700/50">
                      <UserGroupIcon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      
                      <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Manage all user accounts</p>
                    </div>
                  </div>
                </div>
              </button>
              <button
                onClick={async () => {
                  setActiveTab('logs');
                  // Log tab access
                  try {
                    const auth = getAuth();
                    const admin = auth.currentUser;
                    await ActivityLogger.tabAccessed(admin?.uid || null, admin?.email || null, {
                      tabName: 'logs',
                      previousTab: activeTab,
                      userRole: adminRole,
                    });
                  } catch (error) {
                    console.error('Error logging tab access:', error);
                  }
                }}
                className={`w-full text-left bg-gray-800 border-l-4 rounded-r-lg shadow-lg ${activeTab==='logs' ? 'border-blue-600' : 'border-gray-700'}`}
              >
                <div className="px-6 py-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center border border-blue-700/50">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18"/></svg>
                    </div>
                    <div>
                      
                      <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Monitor system activities</p>
                    </div>
                  </div>
                </div>
              </button>
            </nav>
            
            {/* Role indicator */}
            <div className="mt-10 p-6 bg-gray-800 rounded-xl border border-gray-700">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-3 border-2 border-gray-600">
                  <svg className="w-6 h-6 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="hidden">
          <div className="max-w-7xl mx-auto">
            {/* Welcome section */}
            <div className="mb-10">
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 shadow-2xl">
                <div className="flex items-center space-x-6">
                  <div className="w-16 h-16 bg-blue-900/30 rounded-xl flex items-center justify-center border border-blue-700/50">
                    <UserGroupIcon className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Welcome, Super Administrator</h2>
                    <p className="text-gray-400 text-lg">Manage user accounts, permissions, and system access</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Conditional module based on activeTab */}
            {activeTab === 'logs' ? (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl">
                <div className="px-8 py-6 border-b border-gray-800">
                  
                  <p className="text-gray-400 text-sm uppercase tracking-wider mt-1">Real-time activity monitoring</p>
                </div>
                <div className="p-8">
                  
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl">
                <div className="px-8 py-6 border-b border-gray-800">
                  
                  <p className="text-gray-400 text-sm uppercase tracking-wider mt-1">Create, modify, and manage user accounts across the system</p>
                </div>
                <div className="p-8">
                  
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Logout Modal - Dark theme */}
      <Modal
        title={<span className="text-white font-bold">Confirm Sign Out</span>}
        open={isLogoutModalOpen}
        onCancel={() => setIsLogoutModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsLogoutModalOpen(false)} className="bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600">
            Cancel
          </Button>,
          <Button key="logout" type="primary" danger onClick={handleLogout} className="bg-red-700 border-red-600 hover:bg-red-600">
            Sign Out
          </Button>,
        ]}
        styles={{
          body: { padding: '32px', backgroundColor: '#111827' },
          header: { backgroundColor: '#111827', borderBottom: '1px solid #374151' },
          content: { backgroundColor: '#111827', border: '1px solid #374151' }
        }}
      >
        <div className="text-center py-6">
          <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 border-2 border-gray-700">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Sign Out</h3>
          <p className="text-gray-400">Are you sure you want to sign out of the Super Admin Panel?</p>
        </div>
      </Modal>
    </div>
  );
  
  useEffect(() => {
    const checkIfMobile = () => {

      const isSmallDevice = window.innerWidth < 1280;
      setIsMobile(isSmallDevice);
      
      // Log security restriction for developers
      if (isSmallDevice) {
        console.warn('🚫 SECURITY: Admin dashboard access restricted on small devices. Minimum width required: 1280px');
      }
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownOpen && !event.target.closest('.user-dropdown-container')) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userDropdownOpen]);

 
  useEffect(() => {
    const fetchAdminName = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          // Try "admins" collection first
          const adminRef = doc(db, "admins", user.uid);
          const adminSnap = await getDoc(adminRef);
          if (adminSnap.exists()) {
            setAdminFirstName(adminSnap.data().firstName || "");
            setAdminRole(adminSnap.data().role || "admin");
          } else {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              setAdminFirstName(userSnap.data().firstName || "");
              setAdminRole(userSnap.data().role || "admin"); 
            }
          }
        }
      } catch (err) {
        setAdminFirstName("");
        setAdminRole("admin");
      }
    };
    fetchAdminName();
  }, []);

  // Set initial active tab based on admin role
  useEffect(() => {
    if (adminRole === "superAdmin") {
      setActiveTab("users"); // Super Admin lands on User Management
    } else {
      setActiveTab("dashboard"); // Regular Admin lands on Requests
    }
  }, [adminRole]);

  // Ensure Super Admin stays on allowed tabs only
  useEffect(() => {
    if (adminRole === "superAdmin") {
      const allowedTabs = ["users", "logs"];
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab("users");
      }
    }
  }, [adminRole, activeTab]);

  // Check mobile access first - restrict all admin access on mobile devices
  if (isMobile) {
    return <MobileAccessDenied />;
  }

  // Render Super Admin layout if user is Super Admin (only on desktop/laptop)
  if (adminRole === "superAdmin") {
    return <SuperAdminLayout />;
  }

  const renderContent = () => {
    const commonContainerClass = "h-full overflow-y-auto flex flex-col w-full";
    const commonMotionProps = {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.3 }
    };

    // For Super Admin, only allow access to User Management
    if (adminRole === "superAdmin" && activeTab !== "users") {
      setActiveTab("users"); // Redirect to User Management
      return (
        <motion.div {...commonMotionProps} className={commonContainerClass}>
          <div className="bg-white rounded-xl shadow-lg flex-1 border border-blue-100 overflow-y-auto w-full">
            {loadModule(StudentManagement, "User Management")}
          </div>
        </motion.div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <motion.div {...commonMotionProps} className={commonContainerClass}>
            <div className="bg-white rounded-xl shadow-lg flex-1 border border-blue-100 overflow-y-auto w-full">
              <div className="min-h-full w-full">
                <AdminRequestManagement />
              </div>
            </div>
          </motion.div>
        );
      case "announcements":
        return (
          <motion.div {...commonMotionProps} className={commonContainerClass}>
            <div className="bg-white rounded-xl shadow-lg flex-1 border border-blue-100 overflow-y-auto w-full">
              {loadModule(AdminAnnouncements, "School Announcements")}
            </div>
          </motion.div>
        );
      case "school":
        return (
          <motion.div {...commonMotionProps} className={commonContainerClass}>
            <div className="bg-white rounded-xl shadow-lg flex-1 border border-blue-100 overflow-y-auto w-full">
              {loadModule(AdminEventManagement, "School Events")}
            </div>
          </motion.div>
        );
      case "users":
        return (
          <motion.div {...commonMotionProps} className={commonContainerClass}>
            <div className="bg-white rounded-xl shadow-lg flex-1 border border-blue-100 overflow-y-auto w-full">
              {loadModule(StudentManagement, "User Management")}
            </div>
          </motion.div>
        );
      default:
        // Default behavior based on admin role
        if (adminRole === "superAdmin") {
          return (
            <motion.div {...commonMotionProps} className={commonContainerClass}>
              <div className="bg-white rounded-xl shadow-lg flex-1 border border-blue-100 overflow-y-auto w-full">
                {loadModule(StudentManagement, "User Management")}
              </div>
            </motion.div>
          );
        } else {
          return (
            <div className="bg-white rounded-xl shadow-lg h-full overflow-y-auto border border-blue-100 w-full">
              <div className="h-full w-full">
                <AdminRequestManagement />
              </div>
            </div>
          );
        }
    }
  };

  const getPageTitle = () => {
    if (adminRole === "superAdmin") {
      return activeTab === 'logs' ? 'User Logs' : 'User Management';
    }
    
    switch (activeTab) {
      case "dashboard": return "Document Requests";
      case "announcements": return "School Announcements";
      case "school": return "School Events";
      case "users": return "User Management";
      default: return "Admin Dashboard";
    }
  };

  // Define menu items based on admin role
  const getMenuItems = () => {
    if (adminRole === "superAdmin") {
      // Super Admin only sees User Management
      return [
        {
          key: "users",
          icon: <UserGroupIcon className="w-6 h-6" />,
          label: "User Management"
        }
      ];
    } else {
      // Regular Admin sees all tabs
      return [
        {
          key: "dashboard",
          icon: <DocumentTextIcon className="w-5 h-5" />,
          label: "Requests"
        },
        {
          key: "announcements",
          icon: <BellIcon className="w-5 h-5" />,
          label: "Announcements"
        },
        {
          key: "school",
          icon: <CalendarIcon className="w-5 h-5" />,
          label: "Events"
        },
        {
          key: "users",
          icon: <UserGroupIcon className="w-5 h-5" />,
          label: "User Management"
        }
      ];
    }
  };

  const menuItems = getMenuItems();

  if (isMobile) {
    return <MobileAccessDenied />;
  }

  return (
    <div
    className={`
      flex h-screen overflow-hidden
      bg-[#06204F]
      bg-[size:40px_40px]
      admin-dashboard-container
    `}
  >
    
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ damping: 25, stiffness: 200 }}
            className="fixed lg:relative z-30 w-64 h-full bg-gradient-to-b from-blue-900 to-blue-950 text-white shadow-2xl overflow-y-auto"
          >
            <div className="p-5 sm:p-4 flex flex-col h-full">
              
              <div className="flex items-center justify-between mb-6 sm:mb-8 gap-2">
                  <img 
                    src="logo natin1.png" 
                    alt="MNHS Logo" 
                    className="w-50 h-40 object-contain ml-5 rounded-xl"
                  />
              </div>

              {/* Show role indicator for Super Admin */}
              {adminRole === "superAdmin" && (
                <div className="mb-4 px-4 py-3 bg-yellow-600/20 border border-yellow-500/30 rounded-lg">
                  <div className="text-yellow-300 text-sm font-medium text-center">
                    Super Administrator
                  </div>
                  <div className="text-yellow-200 text-xs text-center mt-1">
                    User Management Only
                  </div>
                </div>
              )}

             
              <nav className="flex-1 space-y-1 mt-4">
                {menuItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      // For Super Admin, only allow User Management tab
                      if (adminRole === "superAdmin" && item.key !== "users") {
                        return; // Prevent switching to other tabs
                      }
                      
                      setActiveTab(item.key);
                      if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative ${
                      activeTab === item.key 
                        ? 'bg-blue-800 text-yellow-400 shadow-md' 
                        : 'text-blue-100 hover:bg-blue-800/70 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                    {activeTab === item.key && (
                      <motion.div
                        layoutId="active-tab-indicator"
                        className="absolute right-0 w-1 h-8 bg-yellow-400 rounded-l-md"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      
      <div className="flex-1 flex flex-col min-h-0">
       
        <header className="bg-gradient-to-r from-blue-900 to-blue-800 shadow-lg z-10">
          <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
             
              <div className="flex items-center gap-2 sm:gap-3 ml-2">
                {/* Show appropriate icon based on admin role and active tab */}
                {adminRole === "superAdmin" ? (
                  <UserGroupIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                ) : (
                  (() => {
                    switch (activeTab) {
                      case "dashboard": return <DocumentTextIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />;
                      case "announcements": return <BellIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />;
                      case "school": return <CalendarIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />;
                      case "users": return <UserGroupIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />;
                      default: return <DocumentTextIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />;
                    }
                  })()
                )}
                <h2 className="text-xl sm:text-2xl font-semibold text-white truncate">{getPageTitle()}</h2>
              </div>              
          <div className=" ml-auto px-5 flex items-center gap-2 sm:gap-4">
           
              <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-1 text-white hover:text-yellow-300 transition-colors duration-200"
                title="Home"
              >
                <HomeIcon className="w-5 h-5" />
                <span className="right ">Home</span>
              </button>
            </div>

          
            <div className="relative user-dropdown-container">
              <button 
                className="flex items-center gap-2 text-white hover:text-yellow-300 focus:outline-none transition-colors duration-200"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              >
                <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center text-white-800 font-medium shadow-md">
                  {adminFirstName ? adminFirstName.charAt(0).toUpperCase() : "A"}
                </div>
                <span className="hidden md:block">
                  {adminRole === "superAdmin"
                    ? `Super Admin : ${adminFirstName}`
                    : `Admin : ${adminFirstName}`}
                </span>
                <ChevronDownIcon className="w-4 h-4" />
              </button>

             
              {userDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-48 py-2 bg-white rounded-md shadow-xl z-20 border border-blue-100"
                >
                 
                  <div className="px-4 py-2 text-blue-900">
                    <div className="font-medium">
                      {adminRole === "superAdmin"
                        ? `Super Admin : ${adminFirstName}`
                        : `Admin : ${adminFirstName}`}
                    </div>
                    <div className="text-sm text-blue-600">
                      {adminRole === "superAdmin" ? "Super Administrator" : "Administrator"}
                    </div>
                  </div>
                  
                  
                  <div className="my-2 border-t border-gray-200"></div>
                  
                  
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors duration-200"
                  >
                    <span>Logout</span>
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-0 bg-blue-50/50">
          <div className="h-full max-w-full mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-900/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-xs sm:max-w-md border border-blue-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-full">
              </div>
              <h3 className="text-lg font-medium text-blue-900">Confirm Logout</h3>
            </div>
            <p className="text-sm sm:text-base text-blue-700 mb-6 pl-11">Are you sure you want to log out of the admin dashboard?</p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 transition-colors duration-200 text-sm sm:text-base flex items-center gap-1"
              >
                <span>Logout</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};


const ChevronDownIcon = ({ className }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
};

ChevronDownIcon.propTypes = {
  className: PropTypes.string
};

export default AdminDashboard;