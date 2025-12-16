import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "/src/config/firebase.js";
import { Eye, EyeOff, Mail, Lock, ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "./useAuth";


const fadeInKeyframes = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.type = 'text/css';
  styleEl.appendChild(document.createTextNode(fadeInKeyframes));
  document.head.appendChild(styleEl);
}

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    setMounted(true);
    const storedEmail = localStorage.getItem('rememberedEmail');
    const storedPassword = localStorage.getItem('rememberedPassword');
    if (storedEmail && storedPassword) {
      setEmail(storedEmail);
      setPassword(storedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleRememberMeChange = (checked) => {
    setRememberMe(checked);
    if (!checked) {
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Use the login function from AuthContext which now includes status checking
      await login(email, password);

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }

      // After successful login, check user role and redirect
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const userRole = userData.role;

        if (userRole === "superAdmin") {
          navigate("/superadmin");
        } else if (userRole === "admin") {
          navigate("/adminDashboard");
        } else if (userRole === "student") {
          navigate("/studentDashboard");
        } else {
          navigate("/");
        }
      } else {
        navigate("/");
      }
    } catch (error) {
      // Handle specific error messages from the new authentication system
      if (error.message === 'Account has been deleted.') {
        setError("Account has been deleted.");
      } else if (error.message === 'Account not found.') {
        setError("No account found with this email.");
      } else if (error.message === 'Account is inactive.') {
        setError("This account is inactive.");
      } else if (error.message.includes('temporarily disabled') || error.message.includes('active period has expired')) {
        setError(error.message);
      } else {
        // Handle Firebase authentication errors
        switch (error.code) {
          case 'auth/invalid-email':
            setError("Invalid email format.");
            break;
          case 'auth/user-disabled':
            setError("This account has been disabled.");
            break;
          case 'auth/user-not-found':
            setError("No account found with this email.");
            break;
          case 'auth/wrong-password':
            setError("Incorrect password for this email.");
            break;
          case 'auth/too-many-requests':
            setError("Too many failed login attempts. Please try again later.");
            break;
          case 'auth/network-request-failed':
            setError("Network error. Please check your internet connection.");
            break;
          default:
            setError(error.message || "Login failed");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/campus-aerial.jpg" 
          alt="Background" 
          className="w-full h-full object-cover object-center blur-sm brightness-75"
        />
      </div>

     
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 opacity-10">
          <div className="h-full w-full grid grid-cols-12 gap-4">
            {Array.from({ length: 12 }).map((_, colIndex) => (
              <div key={`col-${colIndex}`} className="h-full border-r border-blue-400">
                {Array.from({ length: 12 }).map((_, rowIndex) => (
                  <div
                    key={`cell-${colIndex}-${rowIndex}`}
                    className="h-24 border-b border-blue-400"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

    
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-blue-500 opacity-10 blur-3xl"></div>
      <div className="absolute top-1/2 -left-24 w-64 h-64 rounded-full bg-indigo-600 opacity-10 blur-3xl"></div>

      <div className="absolute top-6 left-6 z-20 hidden md:block">
        <Link 
          to="/" 
          className="flex items-center justify-center group bg-white/80 hover:bg-white text-blue-600 hover:text-blue-800 backdrop-blur-sm rounded-full p-2 shadow-lg transition-all duration-300 hover:shadow-xl"
        >
          <ChevronLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-0.5" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out">
            <span className="pl-1 pr-1">Back</span>
          </span>
        </Link>
      </div>

  
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div 
          className={`w-full max-w-md transform transition-all duration-500 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <div className="bg-white/90 backdrop-blur-md shadow-xl rounded-2xl p-8 space-y-8 relative">
            
            {/* X Button for Mobile */}
            <div className="absolute top-3 right-3 md:hidden z-10">
              <Link
                to="/"
                className="flex items-center justify-center w-10 h-10 rounded-full text-gray-500 hover:text-white text-2xl hover:bg-red-700 transition-all duration-200 transform hover:scale-110"
                aria-label="Close login"
              >
                &times;
              </Link>
            </div>


            <div className="text-center">
              <img 
                src="logo natin1.png" 
                alt="MNHS Logo" 
                className={`mx-auto h-40 w-auto transition-all duration-700 ${mounted ? "scale-100" : "scale-90"}`}
              />
              <h2 className="mt-6 text-3xl font-bold text-gray-900 tracking-tight">
                Welcome Back
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Sign in to your account
              </p>
            </div>

            {error && (
              <div className="animate-fadeIn rounded-lg bg-red-50 p-4 border-l-4 border-red-500">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              <div className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Mail size={18} className="text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`appearance-none block w-full pl-10 pr-3 py-2.5 border ${
                        error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm`}
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock size={18} className="text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`appearance-none block w-full pl-10 pr-10 py-2.5 border ${
                        error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => handleRememberMeChange(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <Link to="/forgotPassword" className="font-medium text-blue-600 hover:text-blue-800">
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    isLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-3" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;