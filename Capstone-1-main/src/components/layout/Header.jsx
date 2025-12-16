import { Link, useNavigate } from "react-router-dom";
import { UserCircle, FileText, Search, Menu, LogOut, Home, Info, LayoutDashboard, Bell } from "lucide-react"; // Dashboard icon
import { auth } from "/src/config/firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { logActivity, ACTIVITY_TYPES } from "../../services/activityLogService";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import VerifyDocument from "../pages/Home/VerifyDocument";
import UserTypeSelection from "../pages/Home/UserTypeSelection"; // Add this import
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "/src/config/firebase.js"; // Make sure you have your Firestore db exported
import { markAllNotificationsAsRead, clearAllNotifications } from "../../services/notificationService";

const Header = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUserTypeOverlay, setShowUserTypeOverlay] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showVerifyOverlay, setShowVerifyOverlay] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const profileDropdownRef = useRef(null);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPopup, setShowNotifPopup] = useState(false);

  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
       
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role || userDoc.data().userType || "student");
        } else {
          setUserRole("student"); // default
        }
      } else {
        setUserRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = userRole === "admin";
  const isSuperAdmin = userRole === "superAdmin";
  const isStudent = userRole === "student";

  
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileDropdownRef]);

  // Load notifications for student users with real-time listener
  useEffect(() => {
    if (!user || !isStudent) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const notifRef = collection(db, "notifications");
    const q = query(
      notifRef,
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate?.() || new Date(docSnap.data().createdAt)
      }));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    }, (error) => {
      console.error('Error loading notifications:', error);
    });

    return () => unsubscribe();
  }, [user, isStudent]);

  const toggleNotifPopup = async () => {
    const next = !showNotifPopup;
    setShowNotifPopup(next);
    if (!showNotifPopup && user && unreadCount > 0) {
      try {
        await markAllNotificationsAsRead(user.uid);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      } catch (e) {
        console.error('Failed to mark notifications read', e);
      }
    }
  };

  // Header-level notification actions (component scope)
  const markAllHeader = async () => {
    try {
      if (!user?.uid) return;
      await markAllNotificationsAsRead(user.uid);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  };

  const clearAllHeader = async () => {
    try {
      if (!user?.uid) return;
      await clearAllNotifications(user.uid);
      setNotifications([]);
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to clear notifications', e);
    }
  };

  // Navigate when clicking a notification entry
  const goToNotification = (n) => {
    try {
      // 1) Direct link wins
      if (n?.link) {
        // Tab-based behavior like StudentDashboard
        if (n.link.startsWith("/studentProfile")) {
          navigate("/studentDashboard?tab=profile");
          return;
        }
        if (n.link.startsWith("/studentRequest")) {
          navigate("/studentDashboard?tab=requests");
          return;
        }
        if (n.link.startsWith("/studentDashboard") || n.link.startsWith("/studentTransactionHistory")) {
          navigate("/studentDashboard?tab=history");
          return;
        }
        if (n.link === "/" || n.link === "/about") {
          navigate(n.link);
          return;
        }
        navigate(n.link);
        return;
      }

      const norm = (s) => (s || "").toString().toLowerCase();
      const type = norm(n?.type);

      // 2) Fallback mapping via redirectTo (tab-based)
      if (n?.redirectTo) {
        const map = {
          profile: "/studentDashboard?tab=profile",
          request: "/studentDashboard?tab=requests",
          requests: "/studentDashboard?tab=requests",
          history: "/studentDashboard?tab=history",
          dashboard: "/studentDashboard?tab=history",
          home: "/",
        };
        const key = norm(n.redirectTo);
        const path = map[key];
        if (path) {
          navigate(path);
          return;
        }
      }
      // 3) Legacy type-based behavior (tab-based)
      if (type === "profile" || type === "profile_update" || type === "profile_update_admin") {
        navigate("/studentDashboard?tab=profile");
      } else if (type === "request" || type === "document_request") {
        navigate("/studentDashboard?tab=requests");
      } else if (type === "history" || type === "document_status" || type === "schedule_update") {
        navigate("/studentDashboard?tab=history");
      } else if (type === "announcement" || type === "event") {
        navigate("/");
      } else {
        // Default fallback: go to History tab
        navigate("/studentDashboard?tab=history");
      }
    } finally {
      setShowNotifPopup(false);
      setMobileMenuOpen(false);
    }
  };

  const handleLoginClick = () => {
    console.log("Login button clicked - navigating to login page");
    setMobileMenuOpen(false);
    navigate("/login");
  };

  const handleStudentRequestDocumentClick = () => {
    console.log("Request Document button clicked - showing user type overlay");
    setMobileMenuOpen(false);
    setShowUserTypeOverlay(true);
  };

  const handleVerifyDocumentClick = () => {
    console.log("Verify Document button clicked - showing verification overlay");
    setMobileMenuOpen(false);
    setShowVerifyOverlay(true);
  };

  const handleNavLinkClick = () => {
    setMobileMenuOpen(false);
    setShowProfileDropdown(false);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      const current = auth.currentUser;
      try {
        await logActivity({
          type: ACTIVITY_TYPES.LOGOUT,
          userId: current?.uid || null,
          userEmail: current?.email || null,
          role: null,
          description: 'User logged out from header',
        });
      } catch {}
      await signOut(auth);
      setShowLogoutConfirm(false);
      setShowProfileDropdown(false);
      console.log("User logged out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  if (loading) {
    return (
      <header className="sticky top-0 z-50 bg-white shadow-md transition-colors duration-300">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-20">
           
            <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white shadow-md transition-colors duration-300">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-20">
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <img 
                src="logo_mnhs-removebg-preview.png" 
                alt="MNHS Logo" 
                className="h-12 w-auto"
              />
              {/* Compact product title to the right of the logo (show only on small screens) */}
              <span className="inline-block sm:hidden px-2 py-1 rounded-md bg-blue-50 text-blue-900 text-xs font-semibold truncate max-w-[120px]">
                Malanday EduTrack
              </span>
              <h1 className="hidden sm:block leading-tight text-blue-900">
                <span className="block text-lg">MALANDAY</span>
                <span className="block text-sm text-blue-600">National High School</span>
              </h1>
            </div>
           
            <nav className="hidden md:flex items-center space-x-4">
            <Link 
              to="/" 
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="px-3 py-2 rounded-md text-sm text-blue-900 hover:bg-blue-50 transition-colors flex items-center gap-1"
            >
              <Home size={16} />
              <span>Home</span>
            </Link>
            <Link 
              to="/about" 
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="px-3 py-2 rounded-md text-sm text-blue-900 hover:bg-blue-50 transition-colors flex items-center gap-1"
            >
              <Info size={16} />
              <span>About</span>
            </Link>
              <button 
                onClick={handleVerifyDocumentClick}
                className="px-3 py-2 rounded-md text-sm text-blue-900 hover:bg-blue-50 transition-colors flex items-center gap-1"
              >
                <Search size={16} />
                Verify Document
              </button>
              {/* Login moved into nav when not authenticated */}
              {!user && (
                <button
                  onClick={handleLoginClick}
                  className="px-3 py-2 rounded-md text-sm text-blue-900 hover:bg-blue-50 transition-colors flex items-center gap-1"
                >
                  <UserCircle size={16} />
                  <span>Login</span>
                </button>
              )}
              
              {user ? (
                <div className="relative flex items-center gap-4" ref={profileDropdownRef}>
                  {/* Student Notification Bell - Desktop (inline) */}
                  {isStudent && (
                    <div className="relative">
                      <button
                        onClick={toggleNotifPopup}
                        className="relative p-2 text-blue-900 hover:bg-blue-50 rounded-full transition-colors"
                        aria-label="Notifications"
                        title="Notifications"
                      >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-amber-400 text-blue-900 text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                      <AnimatePresence>
                        {showNotifPopup && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-gray-800 z-50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold text-blue-900">Notifications</h4>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-500 mr-1">{unreadCount} new</span>
                                <button
                                  onClick={markAllHeader}
                                  className="p-1.5 md:px-2 md:py-1 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                  aria-label="Mark all read"
                                  title="Mark all read"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h11" />
                                  </svg>
                                </button>
                                <button
                                  onClick={clearAllHeader}
                                  className="p-1.5 md:px-2 md:py-1 rounded text-red-600 hover:text-red-800 hover:bg-red-50"
                                  aria-label="Clear all"
                                  title="Clear all"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a2 2 0 012-2h3a2 2 0 012 2m-7 0h8" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <div className="max-h-64 overflow-auto divide-y divide-gray-100">
                              {notifications.length === 0 ? (
                                <div className="py-6 text-center text-xs text-gray-500">No notifications</div>
                              ) : (
                                notifications.slice(0, 8).map(n => (
                                  <button
                                    key={n.id}
                                    onClick={() => goToNotification(n)}
                                    className="w-full text-left py-2 px-1 hover:bg-gray-50 rounded-md focus:outline-none"
                                  >
                                    <div className="flex items-start gap-2">
                                      <span className={`mt-1 inline-block h-2 w-2 rounded-full ${n.read ? 'bg-gray-300' : 'bg-amber-400'}`}></span>
                                      <div className="min-w-0">
                                        <div className="text-xs font-medium text-blue-900 truncate">{n.title}</div>
                                        <div className="text-[11px] leading-snug text-gray-600 break-words">{n.message}</div>
                                        {n.createdAt && (
                                          <div className="mt-0.5 text-[10px] text-gray-400">{new Date(n.createdAt?.toDate?.() || n.createdAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  <button 
                    onClick={toggleProfileDropdown}
                    className="p-2 text-blue-900 hover:bg-blue-50 rounded-full transition-all relative"
                    title="User profile"
                  >
                    <UserCircle size={24} />
                    {user.email && (
                      <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {user.email.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {showProfileDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
                      >
                        <Link 
                          to={isAdmin ? "/adminDashboard" : (isSuperAdmin ? "/superadmin" : "/studentDashboard")}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors flex items-center gap-2"
                          onClick={handleNavLinkClick}
                        >
                          {(isAdmin || isSuperAdmin) ? (
                            <>
                              <LayoutDashboard size={16} />
                              Dashboard
                            </>
                          ) : (
                            <>
                              <UserCircle size={16} />
                              Profile
                            </>
                          )}
                        </Link>
                        <button 
                          onClick={handleLogoutClick}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  onClick={handleStudentRequestDocumentClick}
                  className="ml-2 px-4 py-2 text-sm rounded-md shadow-md transition-all transform hover:scale-105 focus:outline-none focus:ring-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-blue-900 focus:ring-blue-500"
                  aria-label="Request Document"
                >
                  Request Document
                </button>
              )}
            </nav>

            <div className="flex items-center md:hidden gap-2">
              {user ? (
                <div className="relative" ref={profileDropdownRef}>
                  {/* Student Notification Bell - Mobile */}
                  {isStudent && (
                    <div className="inline-block">
                      <button 
                        onClick={toggleNotifPopup}
                        className="relative p-2 text-blue-900 hover:bg-blue-50 rounded-full transition-colors"
                        aria-label="Notifications"
                        title="Notifications"
                      >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-amber-400 text-blue-900 text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                      <AnimatePresence>
                        {showNotifPopup && (
                          <motion.div 
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-2 left-auto mt-2 max-w-[85vw] w-[18rem] bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 text-gray-800 z-50 flex flex-col max-h-[65vh]"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold text-blue-900">Notifications</h4>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-500 mr-1">{unreadCount} new</span>
                                <button
                                  onClick={markAllHeader}
                                  className="p-1.5 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                  aria-label="Mark all read"
                                  title="Mark all read"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h11" />
                                  </svg>
                                </button>
                                <button
                                  onClick={clearAllHeader}
                                  className="p-1.5 rounded text-red-600 hover:text-red-800 hover:bg-red-50"
                                  aria-label="Clear all"
                                  title="Clear all"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a2 2 0 012-2h3a2 2 0 012 2m-7 0h8" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-1">
                              {notifications.length === 0 ? (
                                <div className="py-6 text-center text-xs text-gray-500">No notifications</div>
                              ) : (
                                notifications.slice(0, 8).map(n => (
                                  <button
                                    key={n.id}
                                    onClick={() => goToNotification(n)}
                                    className="w-full text-left py-2 px-1 hover:bg-gray-50 rounded-md focus:outline-none"
                                  >
                                    <div className="flex items-start gap-2">
                                      <span className={`mt-1 inline-block h-2 w-2 rounded-full ${n.read ? 'bg-gray-300' : 'bg-amber-400'}`}></span>
                                      <div className="min-w-0">
                                        <div className="text-xs font-medium text-blue-900 truncate">{n.title}</div>
                                        <div className="text-[11px] leading-snug text-gray-600 break-words">{n.message}</div>
                                        {n.createdAt && (
                                          <div className="mt-0.5 text-[10px] text-gray-400">{new Date(n.createdAt?.toDate?.() || n.createdAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  <button 
                    onClick={toggleProfileDropdown}
                    className="p-2 text-blue-900 hover:bg-blue-50 rounded-full transition-all relative"
                    title="User profile"
                  >
                    <UserCircle size={24} />
                    {user.email && (
                      <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {user.email.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showProfileDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
                      >
                        <Link 
                          to={isAdmin ? "/adminDashboard" : (isSuperAdmin ? "/superadmin" : "/studentDashboard")}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors flex items-center gap-2"
                          onClick={handleNavLinkClick}
                        >
                          {(isAdmin || isSuperAdmin) ? (
                            <>
                              <LayoutDashboard size={16} />
                              Dashboard
                            </>
                          ) : (
                            <>
                              <UserCircle size={16} />
                              Profile
                            </>
                          )}
                        </Link>
                        <button 
                          onClick={handleLogoutClick}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  onClick={handleStudentRequestDocumentClick}
                  className="px-3 py-1.5 text-xs rounded-md shadow-md transition-all transform hover:scale-105 focus:outline-none focus:ring-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-blue-900 focus:ring-blue-500"
                  aria-label="Request Document"
                >
                  Request Document
                </button>
              )}
              
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                className="p-2 rounded-md text-blue-900 hover:bg-blue-50 transition-colors"
                aria-label="Toggle menu"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden bg-white border-t border-gray-100 shadow-lg"
            >
              <div className="container mx-auto px-4 py-3">
                <nav className="flex flex-col space-y-1">
                <Link 
                  to="/" 
                  className="px-3 py-3 rounded-md text-blue-900 hover:bg-blue-50 transition-colors flex items-center justify-between"
                  onClick={handleNavLinkClick}
                >
                  <div className="flex items-center gap-2">
                    <Home size={16} />
                    <span>Home</span>
                  </div>
                  <motion.div whileHover={{ x: 5 }} className="text-blue-500">→</motion.div>
                </Link>

                <Link 
                  to="/about" 
                  className="px-3 py-3 rounded-md text-blue-900 hover:bg-blue-50 transition-colors flex items-center justify-between"
                  onClick={handleNavLinkClick}
                >
                  <div className="flex items-center gap-2">
                    <Info size={16} />
                    <span>About</span>
                  </div>
                  <motion.div whileHover={{ x: 5 }} className="text-blue-500">→</motion.div>
                </Link>

                  <button 
                    onClick={handleVerifyDocumentClick}
                    className="px-3 py-3 rounded-md text-blue-900 hover:bg-blue-50 transition-colors flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Search size={16} />
                      <span>Verify Document</span>
                    </div>
                    <motion.div
                      whileHover={{ x: 5 }}
                      className="text-blue-500"
                    >
                      →
                    </motion.div>
                  </button>
                  
                  {!user && (
                    <button
                      onClick={handleLoginClick}
                      className="px-3 py-3 rounded-md text-blue-900 hover:bg-blue-50 transition-colors flex items-center justify-between w-full text-left"
                    >
                      <div className="flex items-center gap-2">
                        <UserCircle size={16} />
                        <span>Login</span>
                      </div>
                      <motion.div
                        whileHover={{ x: 5 }}
                        className="text-blue-500"
                      >
                        →
                      </motion.div>
                    </button>
                  )}
                </nav>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {showUserTypeOverlay && (
          <div className="fixed inset-0 z-50">
            <UserTypeSelection onClose={() => setShowUserTypeOverlay(false)} />
          </div>
        )}
      </AnimatePresence>

      {showVerifyOverlay && (
        <VerifyDocument onClose={() => setShowVerifyOverlay(false)} />
      )}

      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="p-6">
                <div className="mb-4 flex justify-center">
                  <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                    <LogOut size={32} className="text-red-600" />
                  </div>
                </div>
                <h3 className="text-xl text-center mb-2">Confirm Logout</h3>
                <p className="text-gray-600 text-center mb-6">
                  Are you sure you want to log out of your account?
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={cancelLogout}
                    className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmLogout}
                    className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;