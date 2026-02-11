import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "/src/config/firebase.js";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "/src/config/firebase.js";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(() => {
    const storedCooldown = localStorage.getItem('passwordResetCooldown');
    if (storedCooldown) {
      const expirationTime = parseInt(storedCooldown, 10);
      const now = Date.now();
      const remainingTime = Math.ceil((expirationTime - now) / 1000);
      return remainingTime > 0 ? remainingTime : 0;
    }
    return 0;
  });

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      const now = Date.now();
      localStorage.setItem('passwordResetCooldown', String(now + cooldown * 1000));
      timer = setInterval(() => {
        setCooldown((prev) => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            localStorage.removeItem('passwordResetCooldown');
          }
          return newValue;
        });
      }, 1000);
    }
    return () => {
      clearInterval(timer);
    };
  }, [cooldown]);

  // Helper: Log activity to Firestore
  const logActivity = async (type, email) => {
    try {
      await addDoc(collection(db, "activity_logs"), {
        type,
        email,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        ip: null // Optionally set IP if available
      });
    } catch (e) {
      // Fail silently
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before trying again`);
      return;
    }

    setError("");
    setSuccess(false);
    setIsLoading(true);

    try {
      // Rate limit: Only allow 1 request per 60 seconds per email
      const logsRef = collection(db, "activity_logs");
      const q = query(
        logsRef,
        where("type", "==", "reset_password"),
        where("email", "==", email)
      );
      const snapshot = await getDocs(q);
      const now = Date.now();
      let recent = false;
      snapshot.forEach((doc) => {
        const ts = doc.data().timestamp?.toMillis?.();
        if (ts && now - ts < 60 * 1000) recent = true;
      });
      if (recent) {
        setError("Please wait before requesting another reset link.");
        setIsLoading(false);
        return;
      }

      // Check if email exists in users collection
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", email));
      const userSnap = await getDocs(userQuery);
      const exists = !userSnap.empty;

      // Log the reset request regardless of existence
      await logActivity("reset_password", email);

      if (!exists) {
        setError("Your email account does not exist on Malanday Edutrack.");
        setIsLoading(false);
        return;
      }

      // If exists, send reset email and show generic success
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
      setEmail("");
      setCooldown(60); // Start 60 second cooldown
    } catch (error) {
      // Log the failed reset request
      await logActivity("reset_password", email);
      setError("Something went wrong. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/login"
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back to Login
          </Link>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <img
              src="logo natin.png"
              alt="MNHS Logo"
              className="mx-auto h-24 w-auto"
            />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Reset Your Password
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Enter your email address to receive a password reset link
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    If an account with this email exists, a password reset link has been sent. Please check your inbox and spam folder.
                  </h3>
                </div>
              </div>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="text-gray-500">📧</span>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`appearance-none block w-full pl-10 pr-3 py-2 border ${
                      error ? "border-red-300" : "border-gray-300"
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="Enter your email"
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || cooldown > 0}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isLoading || cooldown > 0
                    ? "opacity-70 cursor-not-allowed"
                    : ""
                }`}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending...
                  </>
                ) : cooldown > 0 ? (
                  `Wait ${cooldown}s`
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </div>
          </form>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Remember your password?{" "}
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ForgotPasswordPage;