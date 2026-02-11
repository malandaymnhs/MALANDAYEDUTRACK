import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "/src/config/firebase.js";
import { signOut } from "firebase/auth";
import { logActivity, ACTIVITY_TYPES } from "../../../../services/activityLogService";
import {
  Loader2,
  LogOut,
  User,
  FileText,
  History,
  Menu,
  ChevronLeft,
  Home,
  Info,
  Bell,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy, deleteDoc } from "firebase/firestore";
import { db } from "../../../../config/firebase";
import StudentProfile from "./StudentProfile";
import StudentRequest from "./StudentRequest";
import StudentTransactionHistory from "./StudentTransactionHistory";

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("history");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);

      if (width < 768) {
        setSidebarOpen(false);
        setSidebarCollapsed(false);
      } else if (width >= 768 && width < 1024) {
        setSidebarOpen(true);
        setSidebarCollapsed(true);
      } else {
        setSidebarOpen(true);
        setSidebarCollapsed(width < 1280);
      }
    };

    handleResize();
    let resizeTimer;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 100);
    };

    window.addEventListener("resize", debouncedResize);
    return () => {
      window.removeEventListener("resize", debouncedResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate("/");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest("#user-menu")) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Real-time notifications listener
  useEffect(() => {
    if (!user?.uid) return;
    const notifRef = collection(db, "notifications");
    const q = query(
      notifRef,
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt
        };
      });
      console.log("📬 Notifications updated:", notifs.length, "unread:", notifs.filter(n => !n.read).length);
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    }, (error) => {
      console.error("❌ Error loading notifications:", error);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const handleLogout = () => setShowLogoutConfirm(true);

  const confirmLogout = async () => {
    try {
      setDropdownOpen(false);
      const current = auth.currentUser;
      try {
        await logActivity({
          type: ACTIVITY_TYPES.LOGOUT,
          userId: current?.uid || null,
          userEmail: current?.email || null,
          role: 'student',
          description: 'User logged out from student dashboard'
        });
      } catch {}
      await signOut(auth);
      navigate("/");
    } catch (err) {
      setError("Failed to log out: " + err.message);
    } finally {
      setShowLogoutConfirm(false);
    }
  };

  const cancelLogout = () => setShowLogoutConfirm(false);
  const toggleSidebarCollapse = () => setSidebarCollapsed(!sidebarCollapsed);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Mark notification as read and navigate
  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await updateDoc(doc(db, "notifications", notif.id), { read: true });
    }
    setNotifPanelOpen(false);
    
    // Handle different notification types
    if (notif.redirectTo) {
      const redirectTo = String(notif.redirectTo).toLowerCase();
      if (redirectTo === "profile") setActiveTab("profile");
      else if (redirectTo === "history" || redirectTo === "request" || redirectTo === "requests") setActiveTab("history");
    } else if (notif.type) {
      const notifType = String(notif.type).toLowerCase();
      if (notifType === "document_status" || notifType === "schedule_update") {
        setActiveTab("history");
      } else if (notifType === "profile" || notifType === "profile_update") {
        setActiveTab("profile");
      }
    } else {

      setActiveTab("history");
    }
  };

  const markAllNotifications = async () => {
    if (!user?.uid || notifications.length === 0) return;
    try {
      const unread = notifications.filter((n) => !n.read);
      await Promise.all(
        unread.map((notif) => updateDoc(doc(db, "notifications", notif.id), { read: true }))
      );
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  const clearAllNotifications = async () => {
    if (!user?.uid || notifications.length === 0) return;
    try {
      await Promise.all(
        notifications.map((notif) => deleteDoc(doc(db, "notifications", notif.id)))
      );
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <p>No user data available. Redirecting...</p>
      </div>
    );
  }

  const navItems = [
    { id: "profile", label: "My Profile", icon: <User size={isMobile ? 18 : 22} /> },
    { id: "requests", label: "Request Documents", icon: <FileText size={isMobile ? 18 : 22} /> },
    { id: "history", label: "Transaction History", icon: <History size={isMobile ? 18 : 22} /> },
  ];

  const getPageTitle = () => {
    switch (activeTab) {
      case "profile": return "My Profile";
      case "requests": return "Request Documents";
      case "history": return "Transaction History";
      default: return "Dashboard";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4169E1]/20 to-[#1E3A8A]/30 font-sans flex overflow-hidden">
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-[#4169E1] to-[#1E3A8A] shadow-2xl flex flex-col transition-all duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        ${sidebarCollapsed ? "w-16" : "w-64"}
        md:translate-x-0`}
      >
        <div className={`flex items-center ${sidebarCollapsed ? "justify-center p-4" : "px-6 py-5"} border-b border-white/20`}>
          <img
            src="/logo lang.png"
            alt="MNHS Logo"
            className={`transition-all duration-300 ${sidebarCollapsed ? "h-8 w-8" : "h-10 w-10"} object-contain`}
          />
          {!sidebarCollapsed && (
            <div className="ml-3">
              <h1 className="text-white font-bold text-lg">Student Portal</h1>
              <p className="text-blue-200 text-xs">MALANDAY EduTrack</p>
            </div>
          )}
          <button
            onClick={toggleSidebarCollapse}
            className="hidden md:flex absolute -right-3 top-6 bg-white rounded-full p-1.5 shadow-lg hover:shadow-xl transition-all duration-200"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft size={16} className={`text-[#4169E1] transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-6">
          <div className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                  ${activeTab === item.id
                    ? "bg-[#FFC72C] text-[#0A2463] shadow-lg"
                    : "text-blue-100 hover:bg-white/10 hover:text-[#FFC72C]"}
                  ${sidebarCollapsed ? "justify-center" : ""}`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!sidebarCollapsed && (
                  <span className="ml-3 truncate">{item.label}</span>
                )}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    {item.label}
                  </div>
                )}
              </button>
            ))}
          </div>
        </nav>
      </aside>

      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}>
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-30">
          <div className="px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSidebar}
                className="md:hidden p-2 rounded-lg text-[#0A2463] hover:bg-gray-100 transition-colors"
                aria-label="Toggle sidebar"
              >
                <Menu size={20} />
              </button>
              <div className="hidden md:block">
                <h1 className="text-xl font-semibold text-[#0A2463]">{getPageTitle()}</h1>
                <p className="text-sm text-gray-500">Student Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  className="relative p-2 rounded-lg text-[#0A2463] hover:bg-gray-100 transition-colors"
                  onClick={() => setNotifPanelOpen(!notifPanelOpen)}
                  aria-label="Notifications"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifPanelOpen && (
                  <div
                    className={`absolute ${
                      isMobile
                        ? "left-1/2 -translate-x-1/2 w-[90vw] transform"
                        : "right-0 w-[18rem]"
                    } mt-2 max-w-[70vw] bg-white rounded-2xl shadow-2xl z-50 border border-gray-200 flex flex-col max-h-[65vh]`}
                  >
                    <div className="flex items-center justify-between mb-2 px-4 pt-4">
                      <h4 className="text-sm font-semibold text-blue-900">Notifications</h4>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500 mr-1">{unreadCount} new</span>
                        <button
                          onClick={markAllNotifications}
                          className="p-1.5 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          aria-label="Mark all read"
                          title="Mark all read"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button
                          onClick={clearAllNotifications}
                          className="p-1.5 rounded text-red-600 hover:text-red-800 hover:bg-red-50"
                          aria-label="Clear all"
                          title="Clear all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100 px-1 pb-2">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-gray-500">
                          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          const notifDate =
                            notif.createdAt instanceof Date
                              ? notif.createdAt
                              : new Date(notif.createdAt);
                          const formattedDate = Number.isNaN(notifDate?.getTime())
                            ? "Just now"
                            : notifDate.toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              });

                          return (
                            <button
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`w-full text-left py-3 px-3 flex items-start gap-3 rounded-lg transition-colors ${
                                !notif.read ? "bg-blue-50/60 hover:bg-blue-100" : "hover:bg-gray-50"
                              }`}
                            >
                              <span
                                className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full ${
                                  notif.read ? "bg-gray-300" : "bg-amber-400"
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 break-words">
                                  {notif.message}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">{formattedDate}</div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate("/")}
                className="p-2 rounded-lg text-[#0A2463] hover:bg-gray-100 transition-colors"
                title="Home"
              >
                <Home size={20} />
              </button>

              <div className="flex items-center gap-2" id="user-menu">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-[#0A2463] truncate max-w-[120px]">
                    {user.fullname
                      ? `${user.fullname.split(" ").slice(-1)[0]}, ${user.fullname.charAt(0)}.`
                      : user.email}
                  </p>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#FFC72C] text-[#0A2463] text-sm font-bold relative transition hover:bg-[#FFC72C]/80"
                    title="User menu"
                  >
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#FFC72C] text-[#0A2463] font-bold">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                    <svg
                      className={`w-3 h-3 transition-transform duration-200 ${
                        dropdownOpen ? "rotate-180" : "rotate-0"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-400 border-2 border-white"></span>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 overflow-hidden border border-gray-200">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b truncate">
                        {user.displayName || user.email}
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="max-w-7xl mx-auto p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {activeTab === "profile" && (
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <User className="w-5 h-5 text-[#4169E1]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-[#0A2463]">My Profile</h2>
                      <p className="text-sm text-gray-600">Manage your personal information</p>
                    </div>
                  </div>
                  <StudentProfile user={user} />
                </div>
              )}
              
              {activeTab === "requests" && (
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                    <div className="p-2 bg-yellow-50 rounded-lg">
                      <FileText className="w-5 h-5 text-[#FFC72C]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-[#0A2463]">Request Documents</h2>
                      <p className="text-sm text-gray-600">Submit new document requests</p>
                    </div>
                  </div>
                  <StudentRequest />
                </div>
              )}
              
              {activeTab === "history" && (
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <History className="w-5 h-5 text-[#1E3A8A]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-[#0A2463]">Transaction History</h2>
                      <p className="text-sm text-gray-600">View your document request history</p>
                    </div>
                  </div>
                  <StudentTransactionHistory />
                </div>
              )}
            </div>
          </div>

          {showLogoutConfirm && (
            <div className="fixed inset-0 bg-blue-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <LogOut className="w-5 h-5 text-blue-700" />
                  </div>
                  <h3 className="text-lg font-medium text-blue-900">Confirm Logout</h3>
                </div>
                <p className="text-sm text-blue-700 mb-6 pl-11">
                  Are you sure you want to log out of your account?
                </p>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={cancelLogout}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmLogout}
                    className="px-4 py-2 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800 flex items-center gap-1"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}