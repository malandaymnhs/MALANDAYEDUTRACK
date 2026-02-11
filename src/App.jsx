import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider } from "./Auth/AuthContext";
import { useAuth } from "./Auth/useAuth";
import PropTypes from 'prop-types';
import AboutPage from "./components/pages/Home/AboutPage.jsx";
import HomePage from "./components/pages/Home/HomePage.jsx";
import AdminDashboard from "./components/pages/Users/Admin/AdminDashboard.jsx";
import AdminAnnouncementsPage from "./components/pages/Users/Admin/AdminAnnouncements.jsx";
import VerifyDocument from "./components/pages/Home/VerifyDocument.jsx";
import EventsPage from "./components/pages/Users/Admin/AdminEventManagement.jsx";
import UserTypeSelection from "./components/pages/Home/UserTypeSelection.jsx";
import StudentRequestDocument from "./components/pages/Home/StudentRequestDocument.jsx";
import StudentRequest from "./components/pages/Users/Student/StudentRequest.jsx";
import StudentProfile from "./components/pages/Users/Student/StudentProfile.jsx";
import AlumniRequestDocument from "./components/pages/Home/AlumniRequestDocument.jsx";
import PrivacyAgreementAlumni from "./Misc/PrivacyAgreementAlumni.jsx";
import StudentDashboard from "./components/pages/Users/Student/StudentDashboard.jsx";
import Login from "./Auth/Login.jsx";
import ForgotPassword from "./Auth/ForgotPassword.jsx";
import SuperadminLanding from "./components/pages/Users/Superadmin/SuperadminLanding.jsx";
import SuperadminUserLogs from "./components/pages/Users/Superadmin/SuperadminUserLogs.jsx";
import './styles/index.css';
import { SuperadminRoute } from "./Routes/SuperadminRoute.jsx";

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-6xl font-bold text-red-500 mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-6">The page you are looking for does not exist or has been moved.</p>
        <a href="/" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
          Go back to home
        </a>
      </div>
    </div>
  );
}

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full text-blue-600" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    if (userRole === 'superAdmin') return <Navigate to="/superadmin" />;
    if (userRole === 'admin') return <Navigate to="/adminDashboard" />;
    if (userRole === 'student') return <Navigate to="/studentDashboard" />;
    return <Navigate to="/" />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string)
};

ProtectedRoute.defaultProps = {
  allowedRoles: []
};


const PublicRoute = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full text-blue-600" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (currentUser) {
    if (userRole === 'superAdmin') return <Navigate to="/superadmin" />;
    if (userRole === 'admin') return <Navigate to="/adminDashboard" />;
    if (userRole === 'student') return <Navigate to="/studentDashboard" />;
  }

  return children;
};

PublicRoute.propTypes = {
  children: PropTypes.node.isRequired
};

function AppRoutes() {
  return (
    <Routes>
      
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/verifyDocument" element={<VerifyDocument />} />
      <Route path="/userTypeSelection" element={<UserTypeSelection />} />
      <Route path="/privacyAgreementAlumni" element={<PrivacyAgreementAlumni />} />

     
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/forgotPassword" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      { /* Registration page removed */ }

     
      <Route path="/studentRequestDocument" element={<PublicRoute><StudentRequestDocument /></PublicRoute>} />
      <Route path="/alumniRequestDocument" element={<PublicRoute><AlumniRequestDocument /></PublicRoute>} />

      
      <Route path="/studentDashboard" element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/studentRequest" element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentRequest />
        </ProtectedRoute>
      } />
      <Route path="/studentProfile" element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentProfile />
        </ProtectedRoute>
      } />

     
      <Route path="/adminDashboard" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/adminAnnouncementsPage" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminAnnouncementsPage />
        </ProtectedRoute>
      } />
      <Route path="/events" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <EventsPage />
        </ProtectedRoute>
      } />

      {/* Superadmin routes */}
      <Route element={<SuperadminRoute />}>
        <Route path="/superadmin" element={<SuperadminLanding />} />
        <Route path="/superadmin/logs" element={<SuperadminUserLogs />} />
      </Route>

      
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
