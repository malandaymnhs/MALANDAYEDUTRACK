import { useState, useEffect } from 'react';
import { 
  getAuth, 
  sendEmailVerification, 
  applyActionCode, 
  checkActionCode,
  onAuthStateChanged 
} from 'firebase/auth';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Mail, Clock, RefreshCw, ArrowRight } from 'lucide-react';

export default function EmailVerification() {
  const [user, setUser] = useState(null);
  const [verificationState, setVerificationState] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [mode, setMode] = useState('check');
  const [countdown, setCountdown] = useState(0);

  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('oobCode');
    const modeParam = urlParams.get('mode');
    
    if (code && modeParam === 'verifyEmail') {
      setMode('verify');
      handleVerifyEmail(code);
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendVerificationEmail = async () => {
    if (!user) return;
    
    setVerificationState('sending');
    setErrorMessage('');
    
    try {
      await sendEmailVerification(user);
      setVerificationState('sent');
      setCountdown(60);
    } catch (error) {
      setVerificationState('error');
      setErrorMessage(error.message);
    }
  };

  const handleVerifyEmail = async (code) => {
    setVerificationState('verifying');
    setErrorMessage('');
    
    try {
      await checkActionCode(auth, code);
      await applyActionCode(auth, code);
      setVerificationState('verified');
    } catch (error) {
      setVerificationState('error');
      setErrorMessage(error.message);
    }
  };

  const renderContent = () => {
    if (mode === 'verify') {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="p-8 bg-white shadow-lg rounded-lg max-w-md w-full"
        >
          {verificationState === 'verifying' && (
            <div className="text-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mx-auto mb-4"
              >
                <Clock className="h-16 w-16 text-blue-500" />
              </motion.div>
              <h2 className="text-xl font-semibold mb-2">Verifying your email</h2>
              <p className="text-gray-600">Please wait while we verify your email address...</p>
            </div>
          )}
          
          {verificationState === 'verified' && (
            <div className="text-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.8 }}
                className="mx-auto mb-4"
              >
                <CheckCircle className="h-16 w-16 text-green-500" />
              </motion.div>
              <h2 className="text-xl font-semibold mb-2">Email Verified!</h2>
              <p className="text-gray-600 mb-6">Your email has been successfully verified.</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg flex items-center justify-center mx-auto"
                onClick={() => window.location.href = '/dashboard'}
              >
                Continue to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </motion.button>
            </div>
          )}
          
          {verificationState === 'error' && (
            <div className="text-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.8 }}
                className="mx-auto mb-4"
              >
                <XCircle className="h-16 w-16 text-red-500" />
              </motion.div>
              <h2 className="text-xl font-semibold mb-2">Verification Failed</h2>
              <p className="text-gray-600 mb-2">We couldn&apos;t verify your email address.</p>
              <p className="text-red-500 text-sm mb-6">{errorMessage}</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg"
                onClick={() => window.location.href = '/'}
              >
                Back to Home
              </motion.button>
            </div>
          )}
        </motion.div>
      );
    }
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-8 bg-white shadow-lg rounded-lg max-w-md w-full"
      >
        {!user && (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Not Logged In</h2>
            <p className="text-gray-600 mb-6">Please log in to verify your email address.</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg"
              onClick={() => window.location.href = '/login'}
            >
              Go to Login
            </motion.button>
          </div>
        )}
        
        {user && user.emailVerified && (
          <div className="text-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="mx-auto mb-4"
            >
              <CheckCircle className="h-16 w-16 text-green-500" />
            </motion.div>
            <h2 className="text-xl font-semibold mb-2">Email Already Verified</h2>
            <p className="text-gray-600 mb-6">Your email ({user.email}) is already verified.</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg flex items-center justify-center"
              onClick={() => window.location.href = '/dashboard'}
            >
              Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </motion.button>
          </div>
        )}
        
        {user && !user.emailVerified && (
          <>
            <div className="text-center mb-8">
              <motion.div 
                animate={verificationState === 'sending' ? { rotate: 360 } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mx-auto mb-4"
              >
                <Mail className="h-16 w-16 text-blue-500" />
              </motion.div>
              <h2 className="text-xl font-semibold mb-2">Verify Your Email</h2>
              <p className="text-gray-600">
                Please verify your email address ({user.email}) to continue.
              </p>
            </div>
            
            {verificationState === 'sent' ? (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6"
              >
                <p className="text-green-800 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Verification email sent successfully!
                </p>
                <p className="text-green-700 text-sm mt-2">
                  Please check your inbox and click the verification link.
                </p>
              </motion.div>
            ) : verificationState === 'error' ? (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
              >
                <p className="text-red-800 flex items-center">
                  <XCircle className="h-5 w-5 mr-2" />
                  Error sending verification email
                </p>
                <p className="text-red-700 text-sm mt-2">{errorMessage}</p>
              </motion.div>
            ) : null}
            
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={verificationState === 'sending' || countdown > 0}
              className={`w-full flex items-center justify-center py-3 px-4 rounded-lg font-medium ${
                verificationState === 'sending' || countdown > 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
              onClick={handleSendVerificationEmail}
            >
              {verificationState === 'sending' ? (
                <>
                  <RefreshCw className="animate-spin mr-2 h-5 w-5" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                <>
                  <Clock className="mr-2 h-5 w-5" />
                  Resend in {countdown}s
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-5 w-5" />
                  {verificationState === 'sent' ? 'Resend Verification Email' : 'Send Verification Email'}
                </>
              )}
            </motion.button>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Didn&apos;t receive the email? Check your spam folder or try again in a moment.
              </p>
            </div>
          </>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {renderContent()}
    </div>
  );
}